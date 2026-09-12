import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { createGameServer } from '../src/server.js';
import { WsEnvelope } from '@snakes/shared';

const TEST_PORT = 5001;
let testAppInstance: ReturnType<typeof createGameServer>;

function connectClient(): Promise<WebSocket> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
    ws.on('open', () => resolve(ws));
  });
}

function waitForMessage(ws: WebSocket, type: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for message type: ${type}`)), 5000);
    ws.on('message', (raw) => {
      const msg: WsEnvelope = JSON.parse(raw.toString());
      if (msg.type === type) {
        clearTimeout(timeout);
        resolve(msg.payload);
      }
    });
  });
}

beforeAll(async () => {
  testAppInstance = createGameServer();
  await new Promise<void>((resolve) => {
    testAppInstance.server.listen(TEST_PORT, () => resolve());
  });
});

afterAll(async () => {
  testAppInstance.wss.close();
  await new Promise<void>((resolve) => {
    testAppInstance.server.close(() => resolve());
  });
});

describe('Ludo Server Integration', () => {
  it('creates a Ludo room and initializes session', async () => {
    const ws = await connectClient();
    const sessionPromise = waitForMessage(ws, 'LUDO_SESSION_INIT');

    ws.send(JSON.stringify({
      type: 'LUDO_ROOM_CREATE',
      timestamp: Date.now(),
      payload: {
        playerName: 'LudoHost',
        avatar: '🦁',
        color: 'red',
        settings: {
          playerCount: 4,
          mode: 'classic'
        }
      }
    }));

    const session = await sessionPromise;
    expect(session.roomCode).toBeTruthy();
    expect(session.isHost).toBe(true);

    const room = testAppInstance.ludoRooms.get(session.roomCode);
    expect(room).toBeDefined();
    expect(room?.initialPlayers.length).toBe(1);

    ws.close();
  });

  it('allows second player to join, host to add AI, and start match', async () => {
    const hostWs = await connectClient();
    const hostSessionPromise = waitForMessage(hostWs, 'LUDO_SESSION_INIT');

    hostWs.send(JSON.stringify({
      type: 'LUDO_ROOM_CREATE',
      timestamp: Date.now(),
      payload: {
        playerName: 'Host',
        avatar: '👑',
        color: 'red'
      }
    }));
    const hostSession = await hostSessionPromise;

    // Join Player 2
    const p2Ws = await connectClient();
    const p2SessionPromise = waitForMessage(p2Ws, 'LUDO_SESSION_INIT');
    p2Ws.send(JSON.stringify({
      type: 'LUDO_ROOM_JOIN',
      timestamp: Date.now(),
      payload: {
        roomCode: hostSession.roomCode,
        playerName: 'Friend',
        avatar: '🐼',
        preferredColor: 'green'
      }
    }));
    const p2Session = await p2SessionPromise;
    expect(p2Session.roomCode).toBe(hostSession.roomCode);

    // Host adds AI Bot
    const aiAddedPromise = waitForMessage(hostWs, 'LUDO_ROOM_STATE');
    hostWs.send(JSON.stringify({
      type: 'LUDO_ADD_AI_BOT',
      timestamp: Date.now(),
      payload: {
        personality: 'master',
        difficulty: 'hard',
        name: 'Grandmaster AI'
      }
    }));
    const roomStateAfterAI = await aiAddedPromise;
    expect(roomStateAfterAI.initialPlayers.length).toBe(3);

    // Host starts game
    const gameStartPromise = waitForMessage(hostWs, 'LUDO_ROOM_STATE');
    hostWs.send(JSON.stringify({
      type: 'LUDO_GAME_START',
      timestamp: Date.now(),
      payload: {}
    }));

    const gameStartedState = await gameStartPromise;
    expect(gameStartedState.status).toBe('playing');
    expect(gameStartedState.gameState.players.length).toBe(3);
    expect(gameStartedState.gameState.phase).toBe('WAITING_FOR_ROLL');

    hostWs.close();
    p2Ws.close();
  });
});
