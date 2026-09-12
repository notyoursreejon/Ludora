import { describe, it, expect } from 'vitest';
import { executeTurn } from '../src/rules.js';
import { createBoard } from '../src/board.js';
import { GameReplayEngine } from '../src/replay.js';
import { GameStateDTO, PlayerDTO, GameEvent } from '@snakes/shared';
import { DiceRng } from '../src/dice.js';

class SequentialRng implements DiceRng {
  private count = 0;
  next(): number {
    this.count++;
    // Generates 1, 2, 3, 4, 5, 6 cycling
    return ((this.count % 6)) / 6;
  }
}

describe('Replay Engine', () => {
  it('reconstructs match state perfectly from recorded event log', () => {
    const players: PlayerDTO[] = [
      {
        id: 'p-1',
        name: 'Alice',
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
        name: 'Bob',
        avatar: 'token-2',
        color: '#3B82F6',
        isHost: false,
        isAI: false,
        isReady: true,
        isConnected: true,
        isSpectator: false,
        position: 0,
        hasShield: false,
        extraTurns: 0,
        hasDoubleDice: false,
        stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
      }
    ];

    let state: GameStateDTO = {
      matchId: 'replay-test-match',
      roomCode: 'REPLAY',
      status: 'in_progress',
      settings: {
        mode: 'classic',
        boardVariant: 'classic-100',
        maxPlayers: 2,
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

    const initialSnapshot = JSON.parse(JSON.stringify(state));
    const allEvents: GameEvent[] = [];
    const rng = new SequentialRng();

    // Play 15 turns
    for (let i = 0; i < 15; i++) {
      if (state.status === 'finished') break;
      const res = executeTurn(state, rng);
      state = res.nextState;
      allEvents.push(...res.events);
    }

    expect(allEvents.length).toBeGreaterThan(0);

    // Replay the recorded events
    const replayEngine = new GameReplayEngine(initialSnapshot, allEvents);
    const frames = replayEngine.buildFrames();

    expect(frames.length).toBe(allEvents.length);
    const finalFrame = frames[frames.length - 1];

    // Verify player positions match exactly
    expect(finalFrame.state.players[0].position).toBe(state.players[0].position);
    expect(finalFrame.state.players[1].position).toBe(state.players[1].position);
  });
});
