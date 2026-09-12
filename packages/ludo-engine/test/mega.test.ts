import { describe, it, expect } from 'vitest';
import { LudoRuleEngine } from '../src/rules.js';
import { LudoAIEngine } from '../src/ai.js';
import { LudoSettingsSchema, LudoColor } from '@snakes/shared';

describe('LudoRuleEngine - Mega 5-10 Player Extended Boards', () => {
  const tenColors: LudoColor[] = [
    'red', 'green', 'yellow', 'blue', 'purple',
    'orange', 'cyan', 'pink', 'lime', 'amber'
  ];

  it('generates a valid 10-player board topology with dedicated starting gates and safe stars', () => {
    const settings = LudoSettingsSchema.parse({
      boardType: 'mega-10',
      playerCount: 10,
      tokensPerPlayer: 2
    });

    const engine = new LudoRuleEngine(settings, tenColors);
    expect(engine.layout.totalTrackCells).toBe(80); // 10 sectors * 8 cells
    expect(engine.layout.playerGeometries.size).toBe(10);

    for (let i = 0; i < 10; i++) {
      const color = tenColors[i];
      const geo = engine.layout.playerGeometries.get(color);
      expect(geo).toBeDefined();
      expect(geo?.startTrackIndex).toBe(i * 8);
      expect(geo?.yardCoords.length).toBe(4);
      expect(geo?.homePathCoords.length).toBe(5);
    }
  });

  it('simulates a complete multi-turn 6-player game without getting stuck', () => {
    const sixColors = tenColors.slice(0, 6);
    const settings = LudoSettingsSchema.parse({
      boardType: 'mega-10',
      playerCount: 6,
      tokensPerPlayer: 2,
      startRollRequirement: 6
    });

    const engine = new LudoRuleEngine(settings, sixColors);
    const players = sixColors.map((c, idx) => ({
      id: `bot-${idx}`,
      name: `Bot ${c}`,
      avatar: '🤖',
      color: c,
      isHost: idx === 0,
      isAI: true,
      aiDifficulty: 'normal' as const
    }));

    const state = engine.createInitialState('sim-mega', 'MEGA6X', players);
    const ai = new LudoAIEngine(engine);

    // Simulate 100 turns
    for (let turn = 0; turn < 100 && state.status !== 'finished'; turn++) {
      const currentPlayer = state.players[state.activePlayerIndex];
      // Simulate rolling a dice between 1 and 6
      const roll = ((turn * 7) % 6) + 1;
      const legalMoves = engine.getLegalMoves(state, currentPlayer.id, roll);

      if (legalMoves.length > 0) {
        const move = ai.selectMove(state, currentPlayer, legalMoves);
        if (move) {
          const { extraTurnGranted } = engine.applyMove(state, currentPlayer.id, move.tokenId, roll);
          engine.nextTurn(state, extraTurnGranted);
          continue;
        }
      }

      engine.nextTurn(state, roll === 6);
    }

    expect(state.currentTurnNumber).toBeGreaterThan(10);
  });
});
