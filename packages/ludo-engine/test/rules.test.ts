import { describe, it, expect } from 'vitest';
import { LudoRuleEngine } from '../src/rules.js';
import { LudoSettingsSchema } from '@snakes/shared';

describe('LudoRuleEngine - Classic Rules', () => {
  const defaultSettings = LudoSettingsSchema.parse({
    boardType: 'classic-4',
    playerCount: 4,
    tokensPerPlayer: 4,
    startRollRequirement: 6,
    exactHomeFinish: true,
    bonusOnCapture: true
  });

  const players = [
    { id: 'p1', name: 'Alice', avatar: '🦁', color: 'red' as const, isHost: true, isAI: false },
    { id: 'p2', name: 'Bob', avatar: '🦊', color: 'green' as const, isHost: false, isAI: false },
    { id: 'p3', name: 'Charlie', avatar: '🐼', color: 'yellow' as const, isHost: false, isAI: false },
    { id: 'p4', name: 'David', avatar: '🐯', color: 'blue' as const, isHost: false, isAI: false }
  ];

  it('initializes a 4-player game with all tokens in yard', () => {
    const engine = new LudoRuleEngine(defaultSettings, ['red', 'green', 'yellow', 'blue']);
    const state = engine.createInitialState('game-1', 'L8Q4X2', players);

    expect(state.players.length).toBe(4);
    expect(state.status).toBe('playing');
    expect(state.activePlayerIndex).toBe(0);

    for (const player of state.players) {
      expect(player.tokens.length).toBe(4);
      for (const token of player.tokens) {
        expect(token.state).toBe('YARD');
        expect(token.position).toBe(-1);
      }
    }
  });

  it('requires a 6 to leave the yard', () => {
    const engine = new LudoRuleEngine(defaultSettings, ['red', 'green', 'yellow', 'blue']);
    const state = engine.createInitialState('game-1', 'L8Q4X2', players);

    // Roll 5: No legal moves
    const movesWith5 = engine.getLegalMoves(state, 'p1', 5);
    expect(movesWith5.length).toBe(0);

    // Roll 6: Legal move to leave yard to start gate (index 0 for red)
    const movesWith6 = engine.getLegalMoves(state, 'p1', 6);
    expect(movesWith6.length).toBe(4); // Any of the 4 yard tokens can leave
    expect(movesWith6[0].actionType).toBe('LEAVE_YARD');
    expect(movesWith6[0].toPosition).toBe(0); // Red start gate
  });

  it('moves token forward along the track', () => {
    const engine = new LudoRuleEngine(defaultSettings, ['red', 'green', 'yellow', 'blue']);
    const state = engine.createInitialState('game-1', 'L8Q4X2', players);

    // Move token 0 out of yard
    engine.applyMove(state, 'p1', 'p1_t0', 6);
    expect(state.players[0].tokens[0].state).toBe('TRACK');
    expect(state.players[0].tokens[0].position).toBe(0);

    // Roll 4: token advances from 0 to 4
    const moves = engine.getLegalMoves(state, 'p1', 4);
    expect(moves.length).toBe(1);
    expect(moves[0].actionType).toBe('ADVANCE_TRACK');
    expect(moves[0].toPosition).toBe(4);

    engine.applyMove(state, 'p1', 'p1_t0', 4);
    expect(state.players[0].tokens[0].position).toBe(4);
    expect(state.players[0].tokens[0].stepCount).toBe(4);
  });

  it('captures opponent token on vulnerable square and sends victim to yard', () => {
    const engine = new LudoRuleEngine(defaultSettings, ['red', 'green', 'yellow', 'blue']);
    const state = engine.createInitialState('game-1', 'L8Q4X2', players);

    // Red token at track index 5
    state.players[0].tokens[0].state = 'TRACK';
    state.players[0].tokens[0].position = 2;
    state.players[0].tokens[0].stepCount = 2;

    // Green token at track index 5 (not a safe cell: safe cells are 0, 8, 13, 21, 26, 34, 39, 47)
    state.players[1].tokens[0].state = 'TRACK';
    state.players[1].tokens[0].position = 5;
    state.players[1].tokens[0].stepCount = 10;

    // Red rolls 3 to land on index 5
    const moves = engine.getLegalMoves(state, 'p1', 3);
    const targetMove = moves.find(m => m.tokenId === 'p1_t0');
    expect(targetMove).toBeDefined();
    expect(targetMove?.wouldCapture).toContain('p2_t0');

    // Apply capture move
    const result = engine.applyMove(state, 'p1', 'p1_t0', 3);
    expect(result.extraTurnGranted).toBe(true); // capture bonus
    expect(state.players[0].stats.captures).toBe(1);

    // Victim green token sent back to yard
    const victim = state.players[1].tokens[0];
    expect(victim.state).toBe('YARD');
    expect(victim.position).toBe(-1);
    expect(victim.stepCount).toBe(0);
  });

  it('does not capture opponent on safe star cells', () => {
    const engine = new LudoRuleEngine(defaultSettings, ['red', 'green', 'yellow', 'blue']);
    const state = engine.createInitialState('game-1', 'L8Q4X2', players);

    // Red at index 5
    state.players[0].tokens[0].state = 'TRACK';
    state.players[0].tokens[0].position = 5;
    state.players[0].tokens[0].stepCount = 5;

    // Green token at index 8 (which is a safe star cell)
    state.players[1].tokens[0].state = 'TRACK';
    state.players[1].tokens[0].position = 8;
    state.players[1].tokens[0].stepCount = 15;

    // Red rolls 3 to land on index 8
    const moves = engine.getLegalMoves(state, 'p1', 3);
    const targetMove = moves.find(m => m.tokenId === 'p1_t0');
    expect(targetMove).toBeDefined();
    expect(targetMove?.isSafe).toBe(true);
    expect(targetMove?.wouldCapture.length).toBe(0); // Safe square prevents capture!
  });

  it('enforces exact home finish and rejects overshooting rolls', () => {
    const engine = new LudoRuleEngine(defaultSettings, ['red', 'green', 'yellow', 'blue']);
    const state = engine.createInitialState('game-1', 'L8Q4X2', players);

    // In classic, total steps to finish is 56 (track 51 + 5 home path).
    // Place red token at step 54 (home path cell 3, needs 2 to finish at 56)
    const token = state.players[0].tokens[0];
    token.state = 'HOME_PATH';
    token.position = 3;
    token.stepCount = 54;

    // Roll 3: overshoots 56 (54 + 3 = 57) -> Illegal!
    const movesOver = engine.getLegalMoves(state, 'p1', 3);
    expect(movesOver.find(m => m.tokenId === 'p1_t0')).toBeUndefined();

    // Roll 2: Exact finish!
    const movesExact = engine.getLegalMoves(state, 'p1', 2);
    const finishMove = movesExact.find(m => m.tokenId === 'p1_t0');
    expect(finishMove).toBeDefined();
    expect(finishMove?.actionType).toBe('FINISH_TOKEN');
    expect(finishMove?.toState).toBe('FINISHED');

    engine.applyMove(state, 'p1', 'p1_t0', 2);
    expect(token.state).toBe('FINISHED');
    expect(state.players[0].finishedTokensCount).toBe(1);
  });
});
