import { WebSocket } from 'ws';
import {
  GameEvent,
  GameSettings,
  GameStateDTO,
  PlayerDTO,
  RoomDTO,
  WsEnvelope,
  AIPersonality,
  PLAYER_COLORS,
  AVATARS
} from '@snakes/shared';
import { createBoard, executeTurn, decideAIAction } from '@snakes/engine';
import { db } from './db.js';

export class GameRoom {
  public code: string;
  public hostId: string;
  public settings: GameSettings;
  public players: PlayerDTO[] = [];
  public spectators: { id: string; name: string }[] = [];
  public sockets: Map<string, WebSocket> = new Map(); // playerId -> ws
  public spectatorSockets: Map<string, WebSocket> = new Map(); // specId -> ws
  public state: GameStateDTO | null = null;
  public eventLog: GameEvent[] = [];
  public status: 'waiting' | 'playing' | 'finished' = 'waiting';
  public createdAt = Date.now();

  private turnTimer: NodeJS.Timeout | null = null;
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private aiThinkingTimer: NodeJS.Timeout | null = null;

  constructor(code: string, hostId: string, initialSettings: Partial<GameSettings> = {}) {
    this.code = code;
    this.hostId = hostId;
    this.settings = {
      mode: 'classic',
      boardVariant: 'classic-100',
      maxPlayers: 4,
      turnTimeoutSeconds: 30,
      exactFinalSquare: true,
      consecutiveSixesRule: true,
      allowSpectators: true,
      specialTilesEnabled: false,
      theme: 'classic',
      ...initialSettings
    };
  }

  addPlayer(
    id: string,
    name: string,
    avatar: string,
    color: string,
    ws: WebSocket,
    isSpectator = false
  ): { success: boolean; error?: string } {
    if (isSpectator) {
      if (!this.settings.allowSpectators) {
        return { success: false, error: 'Spectators not allowed in this room' };
      }
      this.spectators.push({ id, name });
      this.spectatorSockets.set(id, ws);
      this.broadcastRoomUpdate();
      if (this.state) {
        this.sendToSocket(ws, {
          type: 'GAME_STATE_SNAPSHOT',
          timestamp: Date.now(),
          payload: { state: this.state, events: this.eventLog.slice(-10) }
        });
      }
      return { success: true };
    }

    // Check if player is reconnecting
    const existingPlayer = this.players.find(p => p.id === id);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      existingPlayer.disconnectedAt = null;
      this.sockets.set(id, ws);

      // Cancel disconnect grace timer if active
      const dt = this.disconnectTimers.get(id);
      if (dt) {
        clearTimeout(dt);
        this.disconnectTimers.delete(id);
      }

      this.broadcastRoomUpdate();
      if (this.state) {
        this.sendToSocket(ws, {
          type: 'GAME_STATE_SNAPSHOT',
          timestamp: Date.now(),
          payload: { state: this.state, events: this.eventLog.slice(-15) }
        });
      }
      return { success: true };
    }

    if (this.status !== 'waiting') {
      return { success: false, error: 'Match has already started' };
    }

    if (this.players.length >= this.settings.maxPlayers) {
      return { success: false, error: 'Room is at maximum player capacity' };
    }

    // Assign color & avatar if collision
    const usedColors = new Set(this.players.map(p => p.color));
    const availableColor = PLAYER_COLORS.find(c => !usedColors.has(c)) || color;

    const newPlayer: PlayerDTO = {
      id,
      name,
      avatar,
      color: availableColor,
      isHost: id === this.hostId,
      isAI: false,
      isReady: id === this.hostId, // Host is ready by default
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    };

    this.players.push(newPlayer);
    this.sockets.set(id, ws);
    this.broadcastRoomUpdate();
    return { success: true };
  }

  addAIBot(personality: AIPersonality = 'casual'): { success: boolean; error?: string } {
    if (this.status !== 'waiting') {
      return { success: false, error: 'Match already in progress' };
    }
    if (this.players.length >= this.settings.maxPlayers) {
      return { success: false, error: 'Room is full' };
    }

    const botIndex = this.players.filter(p => p.isAI).length + 1;
    const botId = `bot-${Date.now()}-${botIndex}`;
    const usedColors = new Set(this.players.map(p => p.color));
    const botColor = PLAYER_COLORS.find(c => !usedColors.has(c)) || '#8B5CF6';
    const botAvatar = AVATARS[(botIndex + 3) % AVATARS.length];

    const botPlayer: PlayerDTO = {
      id: botId,
      name: `AI ${personality.charAt(0).toUpperCase() + personality.slice(1)}`,
      avatar: botAvatar,
      color: botColor,
      isHost: false,
      isAI: true,
      aiPersonality: personality,
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    };

    this.players.push(botPlayer);
    this.broadcastRoomUpdate();
    return { success: true };
  }

  removePlayer(id: string): void {
    const p = this.players.find(pl => pl.id === id);
    if (!p) {
      // Check spectators
      this.spectators = this.spectators.filter(s => s.id !== id);
      this.spectatorSockets.delete(id);
      this.broadcastRoomUpdate();
      return;
    }

    if (this.status === 'waiting') {
      this.players = this.players.filter(pl => pl.id !== id);
      this.sockets.delete(id);
      if (id === this.hostId && this.players.length > 0) {
        // Transfer host
        const nextHost = this.players.find(pl => !pl.isAI) || this.players[0];
        this.hostId = nextHost.id;
        nextHost.isHost = true;
        nextHost.isReady = true;
      }
      this.broadcastRoomUpdate();
    } else {
      // In-game disconnect grace period (30s)
      p.isConnected = false;
      p.disconnectedAt = Date.now();
      this.sockets.delete(id);
      this.broadcastRoomUpdate();

      const timer = setTimeout(() => {
        this.handleDisconnectTimeout(id);
      }, 30000);
      this.disconnectTimers.set(id, timer);
    }
  }

  private handleDisconnectTimeout(playerId: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (player && !player.isConnected) {
      // Convert to AI to avoid stalling the game
      player.isAI = true;
      player.aiPersonality = 'casual';
      player.name = `${player.name} (AI Bot)`;
      player.isConnected = true;
      this.broadcastRoomUpdate();

      // If it is currently this player's turn, trigger bot turn
      if (this.state && this.state.currentPlayerId === playerId) {
        this.triggerAITurnIfNeeded();
      }
    }
    this.disconnectTimers.delete(playerId);
  }

  setReady(id: string, ready: boolean): void {
    const p = this.players.find(pl => pl.id === id);
    if (p) {
      p.isReady = ready;
      this.broadcastRoomUpdate();
    }
  }

  updateSettings(hostId: string, settings: Partial<GameSettings>): boolean {
    if (hostId !== this.hostId || this.status !== 'waiting') return false;
    this.settings = { ...this.settings, ...settings };
    if (this.settings.mode === 'adventure') {
      this.settings.specialTilesEnabled = true;
    }
    this.broadcastRoomUpdate();
    return true;
  }

  startGame(hostId: string): { success: boolean; error?: string } {
    if (hostId !== this.hostId) return { success: false, error: 'Only the room host can start the game' };
    if (this.players.length < 2) return { success: false, error: 'Need at least 2 players to start' };
    if (this.players.some(p => !p.isReady)) return { success: false, error: 'All players must be ready' };

    const board = createBoard(this.settings.boardVariant, this.settings.specialTilesEnabled);
    this.status = 'playing';

    const now = Date.now();
    this.state = {
      matchId: `match-${this.code}-${now}`,
      roomCode: this.code,
      status: 'in_progress',
      settings: this.settings,
      board,
      players: this.players,
      currentTurnIndex: 0,
      currentPlayerId: this.players[0].id,
      consecutiveSixesCount: 0,
      turnStartedAt: now,
      turnExpiresAt: now + this.settings.turnTimeoutSeconds * 1000,
      winnerId: null,
      winnerRankings: [],
      lastDiceRoll: null,
      lastDiceRolls: [],
      eventSequenceIndex: 0
    };

    this.eventLog = [
      {
        id: `${this.state.matchId}-0`,
        sequence: 0,
        timestamp: now,
        matchId: this.state.matchId,
        type: 'GAME_STARTED'
      }
    ];

    this.broadcast({
      type: 'GAME_STATE_SNAPSHOT',
      timestamp: now,
      payload: { state: this.state, events: this.eventLog }
    });

    this.startTurnTimer();
    this.triggerAITurnIfNeeded();
    return { success: true };
  }

  handleRollRequest(playerId: string): { success: boolean; error?: string } {
    if (!this.state || this.state.status !== 'in_progress') {
      return { success: false, error: 'Game is not in progress' };
    }
    if (this.state.currentPlayerId !== playerId) {
      return { success: false, error: 'Not your turn!' };
    }

    this.clearTurnTimer();
    const result = executeTurn(this.state);
    this.state = result.nextState;
    this.eventLog.push(...result.events);

    // Broadcast new events and next state
    for (const ev of result.events) {
      this.broadcast({
        type: 'GAME_EVENT',
        timestamp: Date.now(),
        payload: { event: ev, nextState: this.state }
      });
    }

    if (result.isGameOver) {
      this.status = 'finished';
      this.finishMatch();
    } else {
      this.startTurnTimer();
      this.triggerAITurnIfNeeded();
    }

    return { success: true };
  }

  private finishMatch(): void {
    this.clearTurnTimer();
    if (!this.state) return;

    db.recordMatch({
      id: this.state.matchId,
      roomCode: this.code,
      startedAt: this.state.turnStartedAt,
      endedAt: Date.now(),
      winnerId: this.state.winnerId || undefined,
      durationSec: Math.floor((Date.now() - this.createdAt) / 1000),
      totalTurns: this.state.eventSequenceIndex,
      finalState: this.state,
      events: this.eventLog
    });
  }

  private triggerAITurnIfNeeded(): void {
    if (!this.state || this.state.status !== 'in_progress') return;

    const currentP = this.state.players[this.state.currentTurnIndex];
    if (!currentP || !currentP.isAI) return;

    if (this.aiThinkingTimer) clearTimeout(this.aiThinkingTimer);

    const decision = decideAIAction({ state: this.state, aiPlayer: currentP });
    this.aiThinkingTimer = setTimeout(() => {
      this.handleRollRequest(currentP.id);
    }, decision.thinkingDelayMs);
  }

  private startTurnTimer(): void {
    this.clearTurnTimer();
    const timeoutMs = this.settings.turnTimeoutSeconds * 1000;

    this.turnTimer = setTimeout(() => {
      if (this.state && this.state.status === 'in_progress') {
        // Timeout: auto roll on behalf of active player
        this.handleRollRequest(this.state.currentPlayerId);
      }
    }, timeoutMs);
  }

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  broadcastReaction(playerId: string, emoji: string): void {
    this.broadcast({
      type: 'REACTION_BROADCAST',
      timestamp: Date.now(),
      payload: { playerId, emoji, timestamp: Date.now() }
    });
  }

  toDTO(): RoomDTO {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      settings: this.settings,
      players: this.players,
      spectators: this.spectators,
      createdAt: this.createdAt
    };
  }

  broadcastRoomUpdate(): void {
    this.broadcast({
      type: 'ROOM_UPDATE',
      timestamp: Date.now(),
      payload: { room: this.toDTO() }
    });
  }

  broadcast(msg: WsEnvelope): void {
    const raw = JSON.stringify(msg);
    for (const ws of this.sockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
    for (const ws of this.spectatorSockets.values()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  sendToSocket(ws: WebSocket, msg: WsEnvelope): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  destroy(): void {
    this.clearTurnTimer();
    if (this.aiThinkingTimer) clearTimeout(this.aiThinkingTimer);
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
  }
}
