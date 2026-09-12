import { describe, it, expect } from 'vitest';
import { calculateMoveTarget, executeTurn } from '../src/rules.js';
import { createBoard } from '../src/board.js';
import { GameStateDTO, PlayerDTO } from '@snakes/shared';
import { DiceRng } from '../src/dice.js';

class MockRng implements DiceRng {
  private values: number[];
  private idx = 0;
  constructor(values: number[]) {
    this.values = values;
  }
  next(): number {
    const val = this.values[this.idx % this.values.length];
    this.idx++;
    // Returns float such that Math.floor(float * 6) + 1 === val
    return (val - 0.5) / 6;
  }
}

function createTestState(playersCount = 2, customProps: Partial<GameStateDTO> = {}): GameStateDTO {
  const players: PlayerDTO[] = Array.from({ length: playersCount }, (_, i) => ({
    id: `p-${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: 'token-1',
    color: '#EF4444',
    isHost: i === 0,
    isAI: false,
    isReady: true,
    isConnected: true,
    isSpectator: false,
    position: 0,
    hasShield: false,
    extraTurns: 0,
    hasDoubleDice: false,
    stats: {
      snakesHit: 0,
      laddersClimbed: 0,
      specialTilesHit: 0,
      turnsTaken: 0,
      rolls: []
    }
  }));

  return {
    matchId: 'test-match-1',
    roomCode: 'TEST01',
    status: 'in_progress',
    settings: {
      mode: 'classic',
      boardVariant: 'classic-100',
      maxPlayers: 4,
      turnTimeoutSeconds: 30,
      exactFinalSquare: true,
      consecutiveSixesRule: true,
      allowSpectators: true,
      specialTilesEnabled: false,
      theme: 'classic'
    },
    board: createBoard('classic-100', false),
    players,
    currentTurnIndex: 0,
    currentPlayerId: players[0].id,
    consecutiveSixesCount: 0,
    turnStartedAt: Date.now(),
    turnExpiresAt: Date.now() + 30000,
    winnerId: null,
    winnerRankings: [],
    lastDiceRoll: null,
    lastDiceRolls: [],
    eventSequenceIndex: 0,
    ...customProps
  };
}

describe('Rules Engine', () => {
  it('calculates exact square bounce correctly', () => {
    // Current pos 97, roll 3 -> lands on 100
    const exact = calculateMoveTarget(97, 3, 100, true);
    expect(exact.finalTarget).toBe(100);
    expect(exact.bounced).toBe(false);

    // Current pos 97, roll 5 -> reaches 100, bounces back 2 to 98
    const bounce = calculateMoveTarget(97, 5, 100, true);
    expect(bounce.finalTarget).toBe(98);
    expect(bounce.bounced).toBe(true);

    // If exactFinalSquare is disabled, roll 5 on 97 gives 102
    const noExact = calculateMoveTarget(97, 5, 100, false);
    expect(noExact.finalTarget).toBe(102);
  });

  it('climbs a ladder when landing on ladder base', () => {
    const state = createTestState();
    // Ladder base is at 4 -> to 14
    // Start at 0, roll 4
    const mockRng = new MockRng([4]);
    const result = executeTurn(state, mockRng);

    expect(result.nextState.players[0].position).toBe(14);
    expect(result.events.some(e => e.type === 'LADDER_TRIGGERED')).toBe(true);
    expect(result.nextState.players[0].stats.laddersClimbed).toBe(1);
  });

  it('slides down a snake when landing on snake head', () => {
    const state = createTestState();
    // Snake head is at 17 -> to 7
    // Set player position to 15, roll 2 -> lands on 17
    state.players[0].position = 15;
    const mockRng = new MockRng([2]);
    const result = executeTurn(state, mockRng);

    expect(result.nextState.players[0].position).toBe(7);
    expect(result.events.some(e => e.type === 'SNAKE_TRIGGERED')).toBe(true);
    expect(result.nextState.players[0].stats.snakesHit).toBe(1);
  });

  it('grants an extra turn upon rolling a 6', () => {
    const state = createTestState(2);
    const mockRng = new MockRng([6]);
    const result = executeTurn(state, mockRng);

    // Turn should still belong to player 0
    expect(result.nextState.currentTurnIndex).toBe(0);
    expect(result.nextState.currentPlayerId).toBe(state.players[0].id);
    expect(result.nextState.consecutiveSixesCount).toBe(1);
  });

  it('penalizes 3 consecutive sixes and switches turn', () => {
    const state = createTestState(2, { consecutiveSixesCount: 2 });
    const mockRng = new MockRng([6]);
    const result = executeTurn(state, mockRng);

    // 3rd six in a row: penalty, cancels turn and switches to player 1
    expect(result.nextState.currentTurnIndex).toBe(1);
    expect(result.nextState.currentPlayerId).toBe(state.players[1].id);
    expect(result.nextState.consecutiveSixesCount).toBe(0);
    expect(result.events.some(e => e.type === 'TURN_PENALTY_THREE_SIXES')).toBe(true);
  });

  it('declares winner when exact final square is reached', () => {
    const state = createTestState(2);
    state.players[0].position = 96;
    const mockRng = new MockRng([4]);
    const result = executeTurn(state, mockRng);

    expect(result.isGameOver).toBe(true);
    expect(result.winnerId).toBe(state.players[0].id);
    expect(result.nextState.status).toBe('finished');
  });
});
