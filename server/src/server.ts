import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateRoomSchema,
  JoinRoomSchema,
  UpdateSettingsSchema,
  UpdateProfileSchema,
  QuickReactionSchema,
  LudoCreateRoomSchema,
  LudoJoinRoomSchema,
  LudoRollDiceSchema,
  LudoSelectTokenSchema,
  LudoUsePowerUpSchema,
  WsEnvelope
} from '@snakes/shared';
import { GameRoom } from './room.js';
import { LudoGameRoom } from './ludoRoom.js';
import { sessionManager } from './session.js';
import { matchmakingQueue } from './matchmaking.js';
import { db } from './db.js';

export function createGameServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // In-memory room registry: code -> GameRoom
  const rooms: Map<string, GameRoom> = new Map();
  // In-memory Ludo room registry: code -> LudoGameRoom
  const ludoRooms: Map<string, LudoGameRoom> = new Map();
  // Socket to context lookup: ws -> { playerId, roomCode, gameType, lastMessageAt }
  const socketMetadata: Map<WebSocket, { playerId: string; roomCode?: string; gameType?: 'snakes' | 'ludo'; lastMessageAt: number }> = new Map();

  function generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (rooms.has(code) || ludoRooms.has(code));
    return code;
  }

  // REST Endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      activeSnakesRooms: rooms.size,
      activeLudoRooms: ludoRooms.size,
      timestamp: Date.now()
    });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room.toDTO());
  });

  app.get('/api/ludo/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = ludoRooms.get(code);
    if (!room) {
      return res.status(404).json({ error: 'Ludo room not found' });
    }
    res.json(room.toDTO());
  });

  app.get('/api/matches/:id', (req, res) => {
    const match = db.getMatch(req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match record not found' });
    }
    res.json(match);
  });

  app.get('/api/leaderboard', (req, res) => {
    res.json(db.getLeaderboard(15));
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    const playerId = uuidv4();
    socketMetadata.set(ws, { playerId, lastMessageAt: Date.now() });

    ws.on('message', (raw: string) => {
      try {
        const meta = socketMetadata.get(ws);
        if (!meta) return;

        const now = Date.now();
        meta.lastMessageAt = now;

        const envelope: WsEnvelope = JSON.parse(raw.toString());
        handleClientMessage(ws, meta, envelope);
      } catch (err: any) {
        sendError(ws, 'BAD_REQUEST', err?.message || 'Invalid message format');
      }
    });

    ws.on('close', () => {
      const meta = socketMetadata.get(ws);
      if (meta && meta.roomCode) {
        if (meta.gameType === 'ludo') {
          const ludoRoom = ludoRooms.get(meta.roomCode);
          if (ludoRoom) {
            ludoRoom.removePlayer(meta.playerId);
            if (ludoRoom.connections.size === 0 && ludoRoom.initialPlayers.length === 0) {
              ludoRooms.delete(meta.roomCode);
            }
          }
        } else {
          const room = rooms.get(meta.roomCode);
          if (room) {
            room.removePlayer(meta.playerId);
            if (room.players.length === 0 && room.spectators.length === 0) {
              room.destroy();
              rooms.delete(meta.roomCode);
            }
          }
          matchmakingQueue.leave(meta.playerId);
        }
      }
      socketMetadata.delete(ws);
    });
  });

  function handleClientMessage(
    ws: WebSocket,
    meta: { playerId: string; roomCode?: string; gameType?: 'snakes' | 'ludo' },
    envelope: WsEnvelope
  ): void {
    const { type, payload } = envelope;

    switch (type) {
      case 'ROOM_CREATE': {
        const parsed = CreateRoomSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(ws, 'INVALID_PAYLOAD', 'Invalid room creation payload');
        }

        const code = generateRoomCode();
        const hostId = meta.playerId;
        const room = new GameRoom(code, hostId, parsed.data.settings);
        rooms.set(code, room);
        meta.roomCode = code;

        const sessionToken = sessionManager.createSession(
          hostId,
          code,
          parsed.data.playerName,
          parsed.data.avatar,
          parsed.data.color
        );

        sendSuccess(ws, 'SESSION_INIT', {
          playerId: hostId,
          sessionToken,
          roomCode: code,
          isHost: true
        });

        room.addPlayer(hostId, parsed.data.playerName, parsed.data.avatar, parsed.data.color, ws);
        break;
      }

      case 'ROOM_JOIN': {
        const parsed = JoinRoomSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(ws, 'INVALID_PAYLOAD', 'Invalid join room payload');
        }

        const code = parsed.data.roomCode.toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          return sendError(ws, 'ROOM_NOT_FOUND', `Room ${code} does not exist`);
        }

        let effectivePlayerId = meta.playerId;
        if (parsed.data.sessionToken) {
          const existingSession = sessionManager.getSession(parsed.data.sessionToken);
          if (existingSession && existingSession.roomCode === code) {
            effectivePlayerId = existingSession.playerId;
            meta.playerId = effectivePlayerId;
          }
        }

        meta.roomCode = code;
        const token = sessionManager.getTokenForPlayer(effectivePlayerId) ||
          sessionManager.createSession(
            effectivePlayerId,
            code,
            parsed.data.playerName,
            parsed.data.avatar,
            parsed.data.color
          );

        sendSuccess(ws, 'SESSION_INIT', {
          playerId: effectivePlayerId,
          sessionToken: token,
          roomCode: code,
          isHost: effectivePlayerId === room.hostId
        });

        const result = room.addPlayer(
          effectivePlayerId,
          parsed.data.playerName,
          parsed.data.avatar,
          parsed.data.color,
          ws,
          parsed.data.asSpectator
        );

        if (!result.success) {
          return sendError(ws, 'JOIN_FAILED', result.error || 'Failed to join room');
        }
        break;
      }

      case 'ADD_AI_BOT': {
        if (!meta.roomCode) return sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        const room = rooms.get(meta.roomCode);
        if (!room || room.hostId !== meta.playerId) {
          return sendError(ws, 'FORBIDDEN', 'Only room host can add AI bots');
        }
        const res = room.addAIBot(payload?.personality || 'casual');
        if (!res.success) {
          sendError(ws, 'AI_ADD_FAILED', res.error || 'Could not add AI');
        }
        break;
      }

      case 'HOST_UPDATE_SETTINGS': {
        if (!meta.roomCode) return sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        const parsed = UpdateSettingsSchema.safeParse(payload);
        if (!parsed.success) return sendError(ws, 'INVALID_PAYLOAD', 'Invalid settings format');

        const ok = room.updateSettings(meta.playerId, parsed.data.settings);
        if (!ok) sendError(ws, 'FORBIDDEN', 'Only host can modify game settings');
        break;
      }

      case 'HOST_KICK': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room || room.hostId !== meta.playerId) {
          return sendError(ws, 'FORBIDDEN', 'Only host can kick players');
        }
        const targetId = payload?.targetPlayerId;
        if (targetId && targetId !== room.hostId) {
          const targetWs = room.sockets.get(targetId);
          if (targetWs) {
            sendError(targetWs, 'KICKED', 'You were removed by the host');
          }
          room.removePlayer(targetId);
        }
        break;
      }

      case 'PLAYER_READY': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        room.setReady(meta.playerId, Boolean(payload?.ready));
        break;
      }

      case 'PLAYER_UPDATE_PROFILE': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        const parsed = UpdateProfileSchema.safeParse(payload);
        if (!parsed.success) return sendError(ws, 'INVALID_PAYLOAD', 'Invalid profile update');
        room.updatePlayerProfile(meta.playerId, parsed.data);
        break;
      }


      case 'GAME_START': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        const res = room.startGame(meta.playerId);
        if (!res.success) {
          sendError(ws, 'CANNOT_START', res.error || 'Failed to start game');
        }
        break;
      }

      case 'ROLL_REQUEST': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        const res = room.handleRollRequest(meta.playerId);
        if (!res.success) {
          sendError(ws, 'INVALID_ROLL', res.error || 'Cannot roll at this time');
        }
        break;
      }

      case 'SEND_REACTION': {
        if (!meta.roomCode) return;
        const room = rooms.get(meta.roomCode);
        if (!room) return;
        const parsed = QuickReactionSchema.safeParse(payload);
        if (parsed.success) {
          room.broadcastReaction(meta.playerId, parsed.data.emoji);
        }
        break;
      }

      // ==========================================
      // LUDO WEBSOCKET HANDLERS
      // ==========================================

      case 'LUDO_ROOM_CREATE': {
        const parsed = LudoCreateRoomSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(ws, 'INVALID_PAYLOAD', 'Invalid Ludo room creation payload');
        }

        const code = generateRoomCode();
        const hostId = meta.playerId;
        const ludoRoom = new LudoGameRoom(code, hostId, parsed.data.settings);
        ludoRooms.set(code, ludoRoom);
        meta.roomCode = code;
        meta.gameType = 'ludo';

        sendSuccess(ws, 'LUDO_SESSION_INIT', {
          playerId: hostId,
          roomCode: code,
          isHost: true
        });

        ludoRoom.addPlayer(hostId, parsed.data.playerName, parsed.data.avatar, parsed.data.color);
        ludoRoom.registerSocket(hostId, ws);
        break;
      }

      case 'LUDO_ROOM_JOIN': {
        const parsed = LudoJoinRoomSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(ws, 'INVALID_PAYLOAD', 'Invalid Ludo room join payload');
        }

        const code = parsed.data.roomCode.toUpperCase();
        const ludoRoom = ludoRooms.get(code);
        if (!ludoRoom) {
          return sendError(ws, 'ROOM_NOT_FOUND', `Ludo room ${code} does not exist`);
        }

        meta.roomCode = code;
        meta.gameType = 'ludo';

        const joinResult = ludoRoom.addPlayer(
          meta.playerId,
          parsed.data.playerName,
          parsed.data.avatar,
          parsed.data.preferredColor
        );

        if (!joinResult.success) {
          return sendError(ws, 'JOIN_FAILED', joinResult.error || 'Failed to join Ludo room');
        }

        ludoRoom.registerSocket(meta.playerId, ws);

        sendSuccess(ws, 'LUDO_SESSION_INIT', {
          playerId: meta.playerId,
          roomCode: code,
          isHost: meta.playerId === ludoRoom.hostId
        });
        break;
      }

      case 'LUDO_ADD_AI_BOT': {
        if (!meta.roomCode) return sendError(ws, 'NOT_IN_ROOM', 'Join a room first');
        const ludoRoom = ludoRooms.get(meta.roomCode);
        if (!ludoRoom || ludoRoom.hostId !== meta.playerId) {
          return sendError(ws, 'FORBIDDEN', 'Only room host can add AI bots');
        }

        const personality = payload?.personality || 'strategist';
        const difficulty = payload?.difficulty || 'normal';
        const botName = payload?.name || `Bot (${personality})`;
        const botId = `bot_${uuidv4().substring(0, 6)}`;
        const botAvatar = payload?.avatar || '🤖';

        const res = ludoRoom.addPlayer(botId, botName, botAvatar, undefined, true, difficulty, personality);
        if (!res.success) {
          sendError(ws, 'AI_ADD_FAILED', res.error || 'Could not add AI bot');
        }
        break;
      }

      case 'LUDO_GAME_START': {
        if (!meta.roomCode) return;
        const ludoRoom = ludoRooms.get(meta.roomCode);
        if (!ludoRoom || ludoRoom.hostId !== meta.playerId) {
          return sendError(ws, 'FORBIDDEN', 'Only host can start the game');
        }

        const res = ludoRoom.startGame();
        if (!res.success) {
          sendError(ws, 'CANNOT_START', res.error || 'Cannot start game');
        }
        break;
      }

      case 'LUDO_ROLL_DICE': {
        if (!meta.roomCode) return;
        const ludoRoom = ludoRooms.get(meta.roomCode);
        if (!ludoRoom) return;

        const parsed = LudoRollDiceSchema.safeParse(payload);
        const reqId = parsed.success ? parsed.data.requestId : uuidv4();
        const res = ludoRoom.handleRollDice(meta.playerId, reqId);
        if (!res.success) {
          sendError(ws, 'INVALID_ROLL', res.error || 'Cannot roll dice');
        }
        break;
      }

      case 'LUDO_SELECT_TOKEN': {
        if (!meta.roomCode) return;
        const ludoRoom = ludoRooms.get(meta.roomCode);
        if (!ludoRoom) return;

        const parsed = LudoSelectTokenSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(ws, 'INVALID_TOKEN_SELECTION', 'Missing or invalid token selection');
        }

        const res = ludoRoom.handleSelectToken(meta.playerId, parsed.data.tokenId, parsed.data.requestId);
        if (!res.success) {
          sendError(ws, 'INVALID_MOVE', res.error || 'Cannot move selected token');
        }
        break;
      }

      case 'LUDO_USE_POWERUP': {
        if (!meta.roomCode) return;
        const ludoRoom = ludoRooms.get(meta.roomCode);
        if (!ludoRoom) return;

        const parsed = LudoUsePowerUpSchema.safeParse(payload);
        if (!parsed.success) {
          return sendError(ws, 'INVALID_POWERUP', 'Invalid power-up request');
        }

        const res = ludoRoom.handleUsePowerUp(meta.playerId, parsed.data.powerUp, parsed.data.targetTokenId);
        if (!res.success) {
          sendError(ws, 'POWERUP_FAILED', res.error || 'Failed to use power-up');
        }
        break;
      }

      case 'LUDO_SEND_REACTION': {
        if (!meta.roomCode) return;
        const ludoRoom = ludoRooms.get(meta.roomCode);
        if (!ludoRoom) return;

        const emoji = payload?.emoji || '🎲';
        ludoRoom.sendReaction(meta.playerId, emoji);
        break;
      }

      default:
        sendError(ws, 'UNKNOWN_TYPE', `Unrecognized message type: ${type}`);
    }
  }

  function sendSuccess(ws: WebSocket, type: string, payload: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, timestamp: Date.now(), payload }));
    }
  }

  function sendError(ws: WebSocket, code: string, message: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ERROR', timestamp: Date.now(), payload: { code, message } }));
    }
  }

  return { app, server, wss, rooms, ludoRooms };
}

// Default instance for standalone server execution
const { app, server, rooms, ludoRooms } = createGameServer();
const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  server.listen(PORT, () => {
    console.log(`[Game Server] Authoritative Snakes & Ladders & Ludo Server running on port ${PORT}`);
  });
}

export { app, server, rooms, ludoRooms };
