import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { createGameServer } from '../src/server.js';
import { WsEnvelope } from '@snakes/shared';

const TEST_PORT = 4999;
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

describe('Multiplayer Server Integration', () => {
  it('creates a room and initializes session', async () => {
    const ws = await connectClient();
    const sessionPromise = waitForMessage(ws, 'SESSION_INIT');

    ws.send(JSON.stringify({
      type: 'ROOM_CREATE',
      timestamp: Date.now(),
      payload: { playerName: 'HostPlayer', avatar: 'token-1', color: '#EF4444' }
    }));

    const session = await sessionPromise;
    expect(session.roomCode).toBeTruthy();
    expect(session.isHost).toBe(true);
    expect(session.sessionToken).toBeTruthy();

    const room = testAppInstance.rooms.get(session.roomCode);
    expect(room).toBeDefined();
    expect(room?.players.length).toBe(1);

    ws.close();
  });

  it('allows second player to join and start game', async () => {
    const hostWs = await connectClient();
    const hostSessionPromise = waitForMessage(hostWs, 'SESSION_INIT');

    hostWs.send(JSON.stringify({
      type: 'ROOM_CREATE',
      timestamp: Date.now(),
      payload: { playerName: 'Host', avatar: 'token-1', color: '#EF4444' }
    }));
    const hostSession = await hostSessionPromise;

    // Second player joins
    const p2Ws = await connectClient();
    const p2SessionPromise = waitForMessage(p2Ws, 'SESSION_INIT');
    p2Ws.send(JSON.stringify({
      type: 'ROOM_JOIN',
      timestamp: Date.now(),
      payload: {
        roomCode: hostSession.roomCode,
        playerName: 'Guest2',
        avatar: 'token-2',
        color: '#3B82F6'
      }
    }));
    const p2Session = await p2SessionPromise;
    expect(p2Session.roomCode).toBe(hostSession.roomCode);

    // Player 2 marks ready and wait for room update
    const roomUpdatePromise = waitForMessage(hostWs, 'ROOM_UPDATE');
    p2Ws.send(JSON.stringify({
      type: 'PLAYER_READY',
      timestamp: Date.now(),
      payload: { ready: true }
    }));
    await roomUpdatePromise;

    // Host starts game
    const gameStartPromise = waitForMessage(hostWs, 'GAME_STATE_SNAPSHOT');
    hostWs.send(JSON.stringify({
      type: 'GAME_START',
      timestamp: Date.now(),
      payload: {}
    }));

    const snapshot = await gameStartPromise;
    expect(snapshot.state.status).toBe('in_progress');
    expect(snapshot.state.players.length).toBe(2);

    hostWs.close();
    p2Ws.close();
  });
});
