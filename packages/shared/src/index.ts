import { z } from 'zod';

// ==========================================
// 1. GAME MODES & VARIANTS
// ==========================================

export type GameMode = 'classic' | 'adventure' | 'speed';
export type BoardVariant = 'classic-100' | 'speed-50';
export type AIPersonality = 'casual' | 'strategist' | 'aggressive' | 'lucky' | 'master';
export type SpecialTileType = 
  | 'boost' 
  | 'trap' 
  | 'shield' 
  | 'double_dice' 
  | 'risk' 
  | 'swap' 
  | 'safe' 
  | 'bonus_turn';

export interface SnakeLadderConfig {
  from: number;
  to: number;
}

export interface SpecialTileConfig {
  position: number;
  type: SpecialTileType;
  description: string;
}

export interface BoardConfig {
  variant: BoardVariant;
  totalTiles: number; // 100 or 50
  cols: number; // 10
  rows: number; // 10 or 5
  snakes: SnakeLadderConfig[];
  ladders: SnakeLadderConfig[];
  specialTiles: SpecialTileConfig[];
}

// ==========================================
// 2. SETTINGS
// ==========================================

export const GameSettingsSchema = z.object({
  mode: z.enum(['classic', 'adventure', 'speed']).default('classic'),
  boardVariant: z.enum(['classic-100', 'speed-50']).default('classic-100'),
  maxPlayers: z.number().int().min(2).max(10).default(4),
  turnTimeoutSeconds: z.number().int().min(5).max(120).default(30),
  exactFinalSquare: z.boolean().default(true),
  consecutiveSixesRule: z.boolean().default(true), // 3 sixes cancels turn
  allowSpectators: z.boolean().default(true),
  specialTilesEnabled: z.boolean().default(false),
  theme: z.enum(['classic', 'jungle', 'neon', 'space', 'ancient']).default('classic')
});

export type GameSettings = z.infer<typeof GameSettingsSchema>;

// ==========================================
// 3. PLAYERS & STATE
// ==========================================

export interface PlayerStats {
  snakesHit: number;
  laddersClimbed: number;
  specialTilesHit: number;
  turnsTaken: number;
  rolls: number[];
}

export interface PlayerDTO {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isAI: boolean;
  aiPersonality?: AIPersonality;
  isReady: boolean;
  isConnected: boolean;
  disconnectedAt?: number | null;
  isSpectator: boolean;
  position: number; // 0 = offboard, 1..100
  hasShield: boolean;
  extraTurns: number;
  hasDoubleDice: boolean;
  rank?: number | null;
  stats: PlayerStats;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface RoomDTO {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: GameSettings;
  players: PlayerDTO[];
  spectators: { id: string; name: string }[];
  createdAt: number;
}

export interface GameStateDTO {
  matchId: string;
  roomCode: string;
  status: 'lobby' | 'in_progress' | 'finished';
  settings: GameSettings;
  board: BoardConfig;
  players: PlayerDTO[];
  currentTurnIndex: number;
  currentPlayerId: string;
  consecutiveSixesCount: number;
  turnStartedAt: number;
  turnExpiresAt: number;
  winnerId: string | null;
  winnerRankings: string[]; // Player IDs in order of finish
  lastDiceRoll: number | null;
  lastDiceRolls: number[]; // For double-dice
  eventSequenceIndex: number;
}

// ==========================================
// 4. DETERMINISTIC GAME EVENTS
// ==========================================

export type GameEventType =
  | 'GAME_CREATED'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'PLAYER_READY'
  | 'GAME_STARTED'
  | 'TURN_STARTED'
  | 'ROLL_REQUESTED'
  | 'ROLL_RESULT'
  | 'MOVE_STARTED'
  | 'MOVE_STEP'
  | 'LANDING'
  | 'SNAKE_TRIGGERED'
  | 'LADDER_TRIGGERED'
  | 'SPECIAL_TILE_TRIGGERED'
  | 'EXTRA_TURN_GRANTED'
  | 'TURN_PENALTY_THREE_SIXES'
  | 'TURN_TIMEOUT'
  | 'PLAYER_DISCONNECTED'
  | 'PLAYER_RECONNECTED'
  | 'PLAYER_FINISHED'
  | 'GAME_FINISHED';

export interface BaseGameEvent {
  id: string;
  sequence: number;
  timestamp: number;
  matchId: string;
  type: GameEventType;
}

export interface RollResultEvent extends BaseGameEvent {
  type: 'ROLL_RESULT';
  playerId: string;
  diceRolls: number[];
  totalRoll: number;
  isExtraTurn: boolean;
}

export interface MoveStepEvent extends BaseGameEvent {
  type: 'MOVE_STEP';
  playerId: string;
  from: number;
  to: number;
  bounced?: boolean;
}

export interface SnakeTriggeredEvent extends BaseGameEvent {
  type: 'SNAKE_TRIGGERED';
  playerId: string;
  snakeHead: number;
  snakeTail: number;
  absorbedByShield: boolean;
}

export interface LadderTriggeredEvent extends BaseGameEvent {
  type: 'LADDER_TRIGGERED';
  playerId: string;
  ladderBase: number;
  ladderTop: number;
}

export interface SpecialTileTriggeredEvent extends BaseGameEvent {
  type: 'SPECIAL_TILE_TRIGGERED';
  playerId: string;
  tilePosition: number;
  tileType: SpecialTileType;
  details: string;
  resultingPosition: number;
}

export interface GameFinishedEvent extends BaseGameEvent {
  type: 'GAME_FINISHED';
  winnerId: string;
  rankings: string[];
  durationMs: number;
}

export type GameEvent =
  | RollResultEvent
  | MoveStepEvent
  | SnakeTriggeredEvent
  | LadderTriggeredEvent
  | SpecialTileTriggeredEvent
  | GameFinishedEvent
  | (BaseGameEvent & { [key: string]: any });

// ==========================================
// 5. WEBSOCKET NETWORK CONTRACTS
// ==========================================

export interface WsEnvelope<T = any> {
  type: string;
  requestId?: string;
  timestamp: number;
  payload: T;
}

// Client -> Server
export const CreateRoomSchema = z.object({
  playerName: z.string().min(1).max(20),
  avatar: z.string().default('token-1'),
  color: z.string().default('#EF4444'),
  settings: GameSettingsSchema.partial().optional()
});

export const JoinRoomSchema = z.object({
  roomCode: z.string().length(6),
  playerName: z.string().min(1).max(20),
  avatar: z.string().default('token-1'),
  color: z.string().default('#3B82F6'),
  sessionToken: z.string().optional(),
  asSpectator: z.boolean().optional()
});

export const UpdateSettingsSchema = z.object({
  settings: GameSettingsSchema.partial()
});

export const QuickReactionSchema = z.object({
  emoji: z.string().min(1).max(10)
});

export const QUICK_REACTIONS = ['😂', '😱', '🎉', '😭', '🔥', '🐍', '🪜', '🚀', '💀'] as const;

export const PLAYER_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1'  // Indigo
] as const;

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(20).optional(),
  avatar: z.string().min(1).max(30).optional(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/).optional()
});


// Rich collection of Emoji Avatars available to all players
export const EMOJI_AVATARS = [
  // Animals & Beasts
  '🦊', '🐉', '🐯', '🦁', '🐸', '🐼', '🐰', '🐱', '🐶', '🦄',
  '🦅', '🦉', '🐺', '🐵', '🐨', '🐙', '🦈', '🦋', '🦖', '🐢',
  // Fantasy, Sci-Fi & Magic
  '👾', '🤖', '🧙‍♂️', '🥷', '👑', '🚀', '⚡', '🔥', '🎲', '🎯',
  '💎', '⭐', '🌟', '🛡️', '⚔️', '🔮', '🏆', '🎮', '🛸', '👻',
  // Expressions & Personas
  '😎', '🥳', '🤩', '🤠', '😈', '👽', '💀', '🤡', '🍕', '🌮'
] as const;

export const AVATARS = EMOJI_AVATARS;

export * from './ludo.js';

