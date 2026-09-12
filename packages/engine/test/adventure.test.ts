import { describe, it, expect } from 'vitest';
import { executeTurn } from '../src/rules.js';
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
    return (val - 0.5) / 6;
  }
}

function createAdventureTestState(): GameStateDTO {
  const players: PlayerDTO[] = [
    {
      id: 'p-1',
      name: 'Hero',
      avatar: 'token-1',
      color: '#EF4444',
      isHost: true,
      isAI: false,
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    },
    {
      id: 'p-2',
      name: 'Rival',
      avatar: 'token-2',
      color: '#3B82F6',
      isHost: false,
      isAI: false,
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 80,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    }
  ];

  return {
    matchId: 'adv-match-1',
    roomCode: 'ADV001',
    status: 'in_progress',
    settings: {
      mode: 'adventure',
      boardVariant: 'classic-100',
      maxPlayers: 4,
      turnTimeoutSeconds: 30,
      exactFinalSquare: true,
      consecutiveSixesRule: true,
      allowSpectators: true,
      specialTilesEnabled: true,
      theme: 'classic'
    },
    board: createBoard('classic-100', true),
    players,
    currentTurnIndex: 0,
    currentPlayerId: 'p-1',
    consecutiveSixesCount: 0,
    turnStartedAt: Date.now(),
    turnExpiresAt: Date.now() + 30000,
    winnerId: null,
    winnerRankings: [],
    lastDiceRoll: null,
    lastDiceRolls: [],
    eventSequenceIndex: 0
  };
}

describe('Adventure Mode Mechanics', () => {
  it('Shield tile absorbs the next snake bite', () => {
    const state = createAdventureTestState();
    // Special tile 23 is shield tile
    state.players[0].position = 20;
    const rng = new MockRng([3]); // Lands on 23 (Shield)
    const res1 = executeTurn(state, rng);

    expect(res1.nextState.players[0].hasShield).toBe(true);
    expect(res1.events.some(e => e.type === 'SPECIAL_TILE_TRIGGERED')).toBe(true);

    // Now advance to snake head at 54 (slides to 34)
    res1.nextState.players[0].position = 51;
    res1.nextState.currentTurnIndex = 0; // force player 0 turn for test
    const rng2 = new MockRng([3]); // Lands on 54 (Snake)
    const res2 = executeTurn(res1.nextState, rng2);

    // Shield should absorb: player stays at 54, does NOT slide down to 34!
    expect(res2.nextState.players[0].position).toBe(54);
    expect(res2.nextState.players[0].hasShield).toBe(false); // Shield consumed
    const snakeEv = res2.events.find(e => e.type === 'SNAKE_TRIGGERED');
    expect(snakeEv).toBeDefined();
    expect((snakeEv as any).absorbedByShield).toBe(true);
  });

  it('Swap tile trades places with nearest ahead rival', () => {
    const state = createAdventureTestState();
    // Special tile 76 is Swap tile. Player 2 is ahead at position 80.
    state.players[0].position = 73;
    const rng = new MockRng([3]); // 73 + 3 = 76 (Swap)
    const result = executeTurn(state, rng);

    // Player 1 should now be at 80, and Player 2 should be back at 76
    expect(result.nextState.players[0].position).toBe(80);
    expect(result.nextState.players[1].position).toBe(76);
  });
});
