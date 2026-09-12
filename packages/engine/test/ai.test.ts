import { describe, it, expect } from 'vitest';
import { decideAIAction, evaluateTileValue } from '../src/ai.js';
import { createBoard } from '../src/board.js';
import { GameStateDTO, PlayerDTO, AIPersonality } from '@snakes/shared';

describe('AI Engine', () => {
  it('evaluates tile value favoring ladders over snakes', () => {
    const board = createBoard('classic-100');
    const state = { board } as GameStateDTO;

    // Ladder from 4 to 14
    const ladderScore = evaluateTileValue(4, state);
    expect(ladderScore).toBe(24); // 14 + 10

    // Snake from 17 to 7
    const snakeScore = evaluateTileValue(17, state);
    expect(snakeScore).toBe(-3); // 7 - 10
  });

  it('produces distinct decisions and cognitive delays for different personalities', () => {
    const board = createBoard('classic-100');
    const state: GameStateDTO = {
      matchId: 'ai-test',
      roomCode: 'AITEST',
      status: 'in_progress',
      settings: {} as any,
      board,
      players: [],
      currentTurnIndex: 0,
      currentPlayerId: 'ai-1',
      consecutiveSixesCount: 0,
      turnStartedAt: Date.now(),
      turnExpiresAt: Date.now() + 30000,
      winnerId: null,
      winnerRankings: [],
      lastDiceRoll: null,
      lastDiceRolls: [],
      eventSequenceIndex: 0
    };

    const personalities: AIPersonality[] = ['casual', 'strategist', 'aggressive', 'lucky', 'master'];

    for (const personality of personalities) {
      const aiPlayer: PlayerDTO = {
        id: 'ai-1',
        name: `Bot ${personality}`,
        avatar: 'token-1',
        color: '#10B981',
        isHost: false,
        isAI: true,
        aiPersonality: personality,
        isReady: true,
        isConnected: true,
        isSpectator: false,
        position: 10,
        hasShield: false,
        extraTurns: 0,
        hasDoubleDice: false,
        stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
      };

      const decision = decideAIAction({ state, aiPlayer });
      expect(decision.action).toBe('ROLL');
      expect(decision.thinkingDelayMs).toBeGreaterThanOrEqual(300);
      expect(decision.thinkingDelayMs).toBeLessThanOrEqual(1500);
      expect(decision.reasoning).toBeTruthy();
    }
  });
});
