import crypto from 'crypto';
import { WebSocket } from 'ws';
import {
  LudoSettings,
  LudoSettingsSchema,
  LudoColor,
  LUDO_COLORS,
  LudoGameState,
  LudoPlayer,
  LudoLegalMove,
  LudoEvent,
  WsEnvelope
} from '@snakes/shared';
import { LudoRuleEngine, LudoAIEngine, LudoBattleEngine } from '@snakes/ludo-engine';

export interface LudoClientConnection {
  playerId: string;
  ws?: WebSocket;
  lastActive: number;
}

export class LudoGameRoom {
  public code: string;
  public hostId: string;
  public settings: LudoSettings;
  public status: 'waiting' | 'playing' | 'finished' = 'waiting';
  public createdAt: number = Date.now();

  public connections: Map<string, LudoClientConnection> = new Map();
  public gameState: LudoGameState | null = null;
  public ruleEngine: LudoRuleEngine | null = null;
  public aiEngine: LudoAIEngine | null = null;
  public battleEngine: LudoBattleEngine | null = null;

  public eventLog: LudoEvent[] = [];
  public processedRequestIds: Set<string> = new Set();
  public turnTimer: NodeJS.Timeout | null = null;
  public turnTimeRemaining: number = 30;
  public turnTimerInterval: NodeJS.Timeout | null = null;

  constructor(code: string, hostId: string, initialSettings?: Partial<LudoSettings>) {
    this.code = code;
    this.hostId = hostId;
    this.settings = LudoSettingsSchema.parse(initialSettings || {});
  }

  public get activePlayerCount(): number {
    return this.gameState ? this.gameState.players.length : this.initialPlayers.length;
  }

  // Pre-game player slots
  public initialPlayers: {
    id: string;
    name: string;
    avatar: string;
    color: LudoColor;
    isHost: boolean;
    isAI: boolean;
    aiDifficulty?: any;
    aiPersonality?: any;
    isReady: boolean;
  }[] = [];

  public addPlayer(
    playerId: string,
    name: string,
    avatar: string,
    preferredColor?: LudoColor,
    isAI = false,
    aiDifficulty = 'normal',
    aiPersonality = 'strategist'
  ): { success: boolean; error?: string } {
    if (this.status !== 'waiting') {
      return { success: false, error: 'Match already in progress' };
    }

    if (this.initialPlayers.length >= this.settings.playerCount) {
      return { success: false, error: `Room is full (max ${this.settings.playerCount} players)` };
    }

    // Determine available color
    const takenColors = new Set(this.initialPlayers.map(p => p.color));
    let color: LudoColor = preferredColor && !takenColors.has(preferredColor)
      ? preferredColor
      : LUDO_COLORS.find(c => !takenColors.has(c)) || 'red';

    this.initialPlayers.push({
      id: playerId,
      name,
      avatar,
      color,
      isHost: playerId === this.hostId,
      isAI,
      aiDifficulty,
      aiPersonality,
      isReady: isAI // AI always ready
    });

    this.connections.set(playerId, {
      playerId,
      lastActive: Date.now()
    });

    this.broadcastState();
    return { success: true };
  }

  public removePlayer(playerId: string): void {
    if (this.status === 'waiting') {
      this.initialPlayers = this.initialPlayers.filter(p => p.id !== playerId);
      this.connections.delete(playerId);
      if (this.hostId === playerId && this.initialPlayers.length > 0) {
        this.hostId = this.initialPlayers[0].id;
        this.initialPlayers[0].isHost = true;
      }
      this.broadcastState();
    } else if (this.status === 'playing' && this.gameState) {
      const player = this.gameState.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = false;
        player.disconnectedAt = Date.now();
        // Convert to AI after timeout or automatically take over
        player.isAI = true;
        player.aiDifficulty = 'normal';
        player.name = `${player.name} (AI)`;
        this.broadcastState();

        // If it was their turn, trigger AI move
        if (this.gameState.players[this.gameState.activePlayerIndex].id === playerId) {
          this.triggerAIIfNeeded();
        }
      }
    }
  }

  public registerSocket(playerId: string, ws: WebSocket): void {
    const conn = this.connections.get(playerId) || { playerId, lastActive: Date.now() };
    conn.ws = ws;
    conn.lastActive = Date.now();
    this.connections.set(playerId, conn);

    if (this.gameState) {
      const player = this.gameState.players.find(p => p.id === playerId);
      if (player) {
        player.isConnected = true;
        player.disconnectedAt = null;
      }
    }

    this.broadcastState();
  }

  public startGame(): { success: boolean; error?: string } {
    if (this.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (this.initialPlayers.length < 2) return { success: false, error: 'Need at least 2 players to start' };

    // Select board layout based on player count
    if (this.initialPlayers.length > 4 && this.settings.boardType === 'classic-4') {
      this.settings.boardType = 'mega-10';
    }

    const activeColors = this.initialPlayers.map(p => p.color);
    this.ruleEngine = new LudoRuleEngine(this.settings, activeColors);
    this.aiEngine = new LudoAIEngine(this.ruleEngine);
    this.battleEngine = new LudoBattleEngine(this.ruleEngine);

    this.gameState = this.ruleEngine.createInitialState(
      `ludo_${this.code}_${Date.now()}`,
      this.code,
      this.initialPlayers
    );

    this.status = 'playing';
    this.resetTurnTimer();
    this.broadcastState();
    this.triggerAIIfNeeded();

    return { success: true };
  }

  public handleRollDice(playerId: string, requestId: string): { success: boolean; error?: string } {
    if (!this.gameState || !this.ruleEngine) return { success: false, error: 'Game not active' };
    if (this.processedRequestIds.has(requestId)) return { success: true }; // Idempotent
    this.processedRequestIds.add(requestId);

    const activePlayer = this.gameState.players[this.gameState.activePlayerIndex];
    if (activePlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    if (this.gameState.phase !== 'WAITING_FOR_ROLL') {
      return { success: false, error: 'Dice already rolled for this turn' };
    }

    // Authoritative Cryptographic Dice Roll (1 to 6)
    const diceValue = crypto.randomInt(1, 7);
    activePlayer.stats.totalRolls++;
    if (diceValue === 6) activePlayer.stats.sixesRolled++;

    this.gameState.diceState.value = diceValue;
    this.gameState.diceState.rollsThisTurn.push(diceValue);
    this.gameState.diceState.rolledAt = Date.now();

    // Check 3 consecutive sixes rule
    if (diceValue === 6) {
      activePlayer.consecutiveSixes++;
      if (activePlayer.consecutiveSixes >= 3 && this.settings.consecutiveSixesBust) {
        // Bust! Turn cancelled
        this.eventLog.push({
          id: `evt_${++this.gameState.eventSequence}`,
          gameId: this.gameState.gameId,
          seq: this.gameState.eventSequence,
          timestamp: Date.now(),
          type: 'THREE_SIXES_PENALTY',
          payload: { playerId, message: '3 consecutive sixes! Turn forfeited.' }
        });

        this.ruleEngine.nextTurn(this.gameState, false);
        this.resetTurnTimer();
        this.broadcastState();
        this.triggerAIIfNeeded();
        return { success: true };
      }
    } else {
      activePlayer.consecutiveSixes = 0;
    }

    // Calculate legal moves
    const legalMoves = this.ruleEngine.getLegalMoves(this.gameState, playerId, diceValue);
    this.gameState.legalMoves = legalMoves;

    this.eventLog.push({
      id: `evt_${++this.gameState.eventSequence}`,
      gameId: this.gameState.gameId,
      seq: this.gameState.eventSequence,
      timestamp: Date.now(),
      type: 'DICE_ROLLED',
      payload: { playerId, value: diceValue }
    });

    if (legalMoves.length === 0) {
      // No legal moves available
      // If rolled 6, grant extra roll; otherwise next turn
      const grantExtra = diceValue === 6;
      this.ruleEngine.nextTurn(this.gameState, grantExtra);
      this.resetTurnTimer();
      this.broadcastState();
      this.triggerAIIfNeeded();
      return { success: true };
    }

    // If exactly 1 legal move, auto-execute after short delay, or wait for client
    this.gameState.phase = 'WAITING_FOR_TOKEN_SELECTION';
    this.resetTurnTimer();
    this.broadcastState();
    this.triggerAIIfNeeded();

    return { success: true };
  }

  public handleSelectToken(playerId: string, tokenId: string, requestId: string): { success: boolean; error?: string } {
    if (!this.gameState || !this.ruleEngine) return { success: false, error: 'Game not active' };
    if (this.processedRequestIds.has(requestId)) return { success: true }; // Idempotent
    this.processedRequestIds.add(requestId);

    const activePlayer = this.gameState.players[this.gameState.activePlayerIndex];
    if (activePlayer.id !== playerId) return { success: false, error: 'Not your turn' };
    if (this.gameState.phase !== 'WAITING_FOR_TOKEN_SELECTION') return { success: false, error: 'Not in token selection phase' };

    const diceValue = this.gameState.diceState.value;
    if (!diceValue) return { success: false, error: 'Dice not rolled' };

    try {
      const { extraTurnGranted, events } = this.ruleEngine.applyMove(this.gameState, playerId, tokenId, diceValue);
      this.eventLog.push(...events);

      // Check comeback events if in Battle mode
      if (this.battleEngine) {
        const comebackEvents = this.battleEngine.evaluateComebackEligibility(this.gameState);
        this.eventLog.push(...comebackEvents);
      }

      // Advance turn or extra roll
      const nextTurnResult = this.ruleEngine.nextTurn(this.gameState, extraTurnGranted);
      this.eventLog.push(...nextTurnResult.events);

      if (this.gameState.status === 'finished') {
        this.status = 'finished';
        this.clearTurnTimer();
      } else {
        this.resetTurnTimer();
      }

      this.broadcastState();
      this.triggerAIIfNeeded();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Invalid move' };
    }
  }

  public handleUsePowerUp(playerId: string, powerUp: any, targetTokenId?: string): { success: boolean; error?: string } {
    if (!this.gameState || !this.battleEngine) return { success: false, error: 'Game not active or Battle mode disabled' };
    try {
      const { events } = this.battleEngine.usePowerUp(this.gameState, playerId, powerUp, targetTokenId);
      this.eventLog.push(...events);
      this.broadcastState();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to use power up' };
    }
  }

  public sendReaction(senderId: string, emoji: string): void {
    const sender = this.gameState?.players.find(p => p.id === senderId) || this.initialPlayers.find(p => p.id === senderId);
    this.broadcast({
      type: 'LUDO_REACTION',
      timestamp: Date.now(),
      payload: {
        playerId: senderId,
        playerName: sender?.name || 'Player',
        emoji,
        timestamp: Date.now()
      }
    });
  }

  // AI execution trigger
  private triggerAIIfNeeded(): void {
    if (!this.gameState || this.gameState.status !== 'playing' || !this.ruleEngine || !this.aiEngine) return;
    const activePlayer = this.gameState.players[this.gameState.activePlayerIndex];
    if (!activePlayer.isAI) return;

    // Simulate human-like reaction time (400-800ms)
    setTimeout(() => {
      if (!this.gameState || this.gameState.status !== 'playing') return;
      const currentActive = this.gameState.players[this.gameState.activePlayerIndex];
      if (currentActive.id !== activePlayer.id) return;

      if (this.gameState.phase === 'WAITING_FOR_ROLL') {
        this.handleRollDice(activePlayer.id, `ai_roll_${Date.now()}`);
      } else if (this.gameState.phase === 'WAITING_FOR_TOKEN_SELECTION') {
        const move = this.aiEngine!.selectMove(this.gameState, activePlayer, this.gameState.legalMoves);
        if (move) {
          this.handleSelectToken(activePlayer.id, move.tokenId, `ai_move_${Date.now()}`);
        } else {
          // If no move can be selected, pass turn
          this.ruleEngine!.nextTurn(this.gameState, false);
          this.resetTurnTimer();
          this.broadcastState();
          this.triggerAIIfNeeded();
        }
      }
    }, 600);
  }

  // Turn Timer Management
  private resetTurnTimer(): void {
    this.clearTurnTimer();
    this.turnTimeRemaining = this.settings.turnTimeoutSeconds;

    this.turnTimerInterval = setInterval(() => {
      this.turnTimeRemaining--;
      if (this.turnTimeRemaining <= 0) {
        this.handleTurnTimeout();
      }
    }, 1000);
  }

  private clearTurnTimer(): void {
    if (this.turnTimerInterval) {
      clearInterval(this.turnTimerInterval);
      this.turnTimerInterval = null;
    }
  }

  private handleTurnTimeout(): void {
    this.clearTurnTimer();
    if (!this.gameState || this.gameState.status !== 'playing') return;

    const activePlayer = this.gameState.players[this.gameState.activePlayerIndex];

    if (this.gameState.phase === 'WAITING_FOR_ROLL') {
      // Auto roll on timeout
      this.handleRollDice(activePlayer.id, `timeout_roll_${Date.now()}`);
    } else if (this.gameState.phase === 'WAITING_FOR_TOKEN_SELECTION') {
      // Auto select move or pass
      if (this.gameState.legalMoves.length > 0 && this.aiEngine) {
        const move = this.aiEngine.selectMove(this.gameState, activePlayer, this.gameState.legalMoves);
        if (move) {
          this.handleSelectToken(activePlayer.id, move.tokenId, `timeout_move_${Date.now()}`);
          return;
        }
      }
      this.ruleEngine?.nextTurn(this.gameState, false);
      this.resetTurnTimer();
      this.broadcastState();
      this.triggerAIIfNeeded();
    }
  }

  public toDTO() {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      settings: this.settings,
      initialPlayers: this.initialPlayers,
      gameState: this.gameState,
      turnTimeRemaining: this.turnTimeRemaining,
      createdAt: this.createdAt
    };
  }

  public broadcastState(): void {
    const dto = this.toDTO();
    this.broadcast({
      type: 'LUDO_ROOM_STATE',
      timestamp: Date.now(),
      payload: dto
    });
  }

  public broadcast(envelope: WsEnvelope): void {
    const data = JSON.stringify(envelope);
    this.connections.forEach(conn => {
      if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(data);
      }
    });
  }
}
