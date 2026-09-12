import { describe, it, expect } from 'vitest';
import { LudoRuleEngine } from '../src/rules.js';
import { LudoAIEngine } from '../src/ai.js';
import { LudoSettingsSchema } from '@snakes/shared';

describe('LudoAIEngine - Heuristic Decision Making', () => {
  const settings = LudoSettingsSchema.parse({
    boardType: 'classic-4',
    playerCount: 2,
    tokensPerPlayer: 4
  });

  const players = [
    { id: 'ai-1', name: 'Bot Strategist', avatar: '🤖', color: 'red' as const, isHost: true, isAI: true, aiDifficulty: 'hard' as const, aiPersonality: 'strategist' as const },
    { id: 'human-1', name: 'Player 2', avatar: '👤', color: 'green' as const, isHost: false, isAI: false }
  ];

  it('selects move that captures opponent when available', () => {
    const ruleEngine = new LudoRuleEngine(settings, ['red', 'green']);
    const aiEngine = new LudoAIEngine(ruleEngine);
    const state = ruleEngine.createInitialState('game-ai', 'LUDO12', players);

    // AI Token 0 at track 10
    state.players[0].tokens[0].state = 'TRACK';
    state.players[0].tokens[0].position = 10;
    state.players[0].tokens[0].stepCount = 10;

    // AI Token 1 at track 20
    state.players[0].tokens[1].state = 'TRACK';
    state.players[0].tokens[1].position = 20;
    state.players[0].tokens[1].stepCount = 20;

    // Opponent Token at track 14 (not a safe cell, distance = 4 from Token 0)
    state.players[1].tokens[0].state = 'TRACK';
    state.players[1].tokens[0].position = 14;
    state.players[1].tokens[0].stepCount = 1;

    // AI rolls 4
    const legalMoves = ruleEngine.getLegalMoves(state, 'ai-1', 4);
    expect(legalMoves.length).toBeGreaterThanOrEqual(2);

    const chosenMove = aiEngine.selectMove(state, state.players[0], legalMoves);
    expect(chosenMove).toBeDefined();
    // Chosen move should be Token 0 because it captures the opponent on cell 14!
    expect(chosenMove?.tokenId).toBe('ai-1_t0');
    expect(chosenMove?.wouldCapture).toContain('human-1_t0');
  });

  it('selects finishing move when a token is in home stretch', () => {
    const ruleEngine = new LudoRuleEngine(settings, ['red', 'green']);
    const aiEngine = new LudoAIEngine(ruleEngine);
    const state = ruleEngine.createInitialState('game-ai', 'LUDO12', players);

    // Token 0 can finish with roll 1
    state.players[0].tokens[0].state = 'HOME_PATH';
    state.players[0].tokens[0].position = 4;
    state.players[0].tokens[0].stepCount = 55;

    // Token 1 on track
    state.players[0].tokens[1].state = 'TRACK';
    state.players[0].tokens[1].position = 10;
    state.players[0].tokens[1].stepCount = 10;

    const legalMoves = ruleEngine.getLegalMoves(state, 'ai-1', 1);
    const chosenMove = aiEngine.selectMove(state, state.players[0], legalMoves);

    expect(chosenMove).toBeDefined();
    expect(chosenMove?.tokenId).toBe('ai-1_t0');
    expect(chosenMove?.actionType).toBe('FINISH_TOKEN');
  });
});
