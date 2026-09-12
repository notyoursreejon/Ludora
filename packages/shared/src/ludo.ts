import { z } from 'zod';

// ==========================================
// 1. LUDO CORE ENUMS & TYPES
// ==========================================

export type LudoColor = 
  | 'red' 
  | 'green' 
  | 'yellow' 
  | 'blue' 
  | 'purple' 
  | 'orange' 
  | 'cyan' 
  | 'pink' 
  | 'lime' 
  | 'amber';

export const LUDO_COLORS: LudoColor[] = [
  'red', 'green', 'yellow', 'blue',
  'purple', 'orange', 'cyan', 'pink', 'lime', 'amber'
];

export const LUDO_COLOR_HEX: Record<LudoColor, { main: string; light: string; dark: string; border: string }> = {
  red: { main: '#ef4444', light: '#f87171', dark: '#b91c1c', border: '#7f1d1d' },
  green: { main: '#10b981', light: '#34d399', dark: '#047857', border: '#064e3b' },
  yellow: { main: '#f59e0b', light: '#fbbf24', dark: '#b45309', border: '#78350f' },
  blue: { main: '#3b82f6', light: '#60a5fa', dark: '#1d4ed8', border: '#1e3a8a' },
  purple: { main: '#8b5cf6', light: '#a78bfa', dark: '#6d28d9', border: '#4c1d95' },
  orange: { main: '#f97316', light: '#fb923c', dark: '#c2410c', border: '#7c2d12' },
  cyan: { main: '#06b6d4', light: '#22d3ee', dark: '#0e7490', border: '#164e63' },
  pink: { main: '#ec4899', light: '#f472b6', dark: '#be185d', border: '#831843' },
  lime: { main: '#84cc16', light: '#a3e635', dark: '#4d7c0f', border: '#365314' },
  amber: { main: '#d97706', light: '#f59e0b', dark: '#92400e', border: '#451a03' },
};

export type LudoBoardType = 'classic-4' | 'mega-10';
export type LudoGameMode = 'classic' | 'battle' | 'quick';
export type LudoTokenState = 'YARD' | 'TRACK' | 'HOME_PATH' | 'FINISHED';
export type LudoPowerUpType = 'SHIELD' | 'REROLL' | 'DASH' | 'SABOTAGE' | 'RECOVERY';
export type LudoAIPersonality = 'strategist' | 'aggressor' | 'runner' | 'defender' | 'chaos' | 'master';
export type LudoAIDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type LudoCellType = 
  | 'YARD' 
  | 'TRACK' 
  | 'START_GATE' 
  | 'SAFE_STAR' 
  | 'HOME_ENTRY' 
  | 'HOME_PATH' 
  | 'HOME_TRIANGLE';

// ==========================================
// 2. TOKEN & PLAYER MODELS
// ==========================================

export interface LudoToken {
  id: string; // e.g., 'p0_t0'
  playerId: string;
  color: LudoColor;
  state: LudoTokenState;
  position: number; // For TRACK: 0..trackLength-1. For HOME_PATH: 0..homePathLength-1. For YARD: -1. For FINISHED: 999.
  stepCount: number; // Total steps moved forward from start gate (0 when in yard or just stepped onto start gate, up to totalStepsToFinish)
  shielded: boolean;
}

export interface LudoPlayerStats {
  captures: number;
  tokensCompleted: number;
  sixesRolled: number;
  totalRolls: number;
  turnsPlayed: number;
}

export interface LudoPlayer {
  id: string;
  name: string;
  avatar: string; // Emoji
  color: LudoColor;
  isHost: boolean;
  isAI: boolean;
  aiDifficulty?: LudoAIDifficulty;
  aiPersonality?: LudoAIPersonality;
  isReady: boolean;
  isConnected: boolean;
  disconnectedAt?: number | null;
  isSpectator: boolean;
  tokens: LudoToken[];
  finishedTokensCount: number;
  rank?: number | null; // 1 = 1st place, 2 = 2nd place, etc.
  powerUps: { type: LudoPowerUpType; count: number }[];
  fortuneTokenAvailable: boolean;
  consecutiveSixes: number;
  stats: LudoPlayerStats;
}

// ==========================================
// 3. SETTINGS SCHEMA
// ==========================================

export const LudoSettingsSchema = z.object({
  boardType: z.enum(['classic-4', 'mega-10']).default('classic-4'),
  playerCount: z.number().int().min(2).max(10).default(4),
  tokensPerPlayer: z.number().int().min(2).max(4).default(4),
  startRollRequirement: z.union([z.literal(6), z.literal(1)]).default(6),
  consecutiveSixesBust: z.boolean().default(true), // 3 consecutive sixes forfeits turn
  bonusOnCapture: z.boolean().default(true), // extra turn on capturing opponent
  bonusOnFinish: z.boolean().default(true), // extra turn on finishing a token
  safeSquaresCaptureImmune: z.boolean().default(true),
  exactHomeFinish: z.boolean().default(true), // must roll exact number to enter center
  blockadeRule: z.enum(['none', 'block_capture', 'block_pass']).default('block_capture'),
  turnTimeoutSeconds: z.number().int().min(5).max(120).default(30),
  mode: z.enum(['classic', 'battle', 'quick']).default('classic'),
  theme: z.enum(['classic', 'royal', 'cyber', 'jungle', 'space']).default('classic')
});

export type LudoSettings = z.infer<typeof LudoSettingsSchema>;

// ==========================================
// 4. LEGAL MOVES & ACTIONS
// ==========================================

export type LudoMoveActionType = 
  | 'LEAVE_YARD' 
  | 'ADVANCE_TRACK' 
  | 'ENTER_HOME_PATH' 
  | 'ADVANCE_HOME_PATH' 
  | 'FINISH_TOKEN';

export interface LudoLegalMove {
  tokenId: string;
  actionType: LudoMoveActionType;
  fromState: LudoTokenState;
  fromPosition: number;
  toState: LudoTokenState;
  toPosition: number;
  newStepCount: number;
  wouldCapture: string[]; // IDs of opponent tokens that would be captured
  isSafe: boolean;
}

// ==========================================
// 5. GAME STATE
// ==========================================

export type LudoTurnPhase = 'WAITING_FOR_ROLL' | 'WAITING_FOR_TOKEN_SELECTION' | 'RESOLVING_ANIMATION' | 'ROUND_OVER';

export interface LudoDiceState {
  value: number | null;
  rollsThisTurn: number[];
  canRollAgain: boolean;
  rolledAt: number | null;
}

export interface LudoGameState {
  gameId: string;
  roomCode: string;
  status: 'waiting' | 'playing' | 'finished';
  settings: LudoSettings;
  players: LudoPlayer[];
  activePlayerIndex: number;
  currentTurnNumber: number;
  phase: LudoTurnPhase;
  diceState: LudoDiceState;
  legalMoves: LudoLegalMove[];
  winnersOrder: string[]; // player IDs in order of finish
  eventSequence: number;
  lastActionTimestamp: number;
}

// ==========================================
// 6. EVENT DEFINITIONS
// ==========================================

export type LudoEventType = 
  | 'ROOM_CREATED'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'PLAYER_READY'
  | 'GAME_STARTED'
  | 'TURN_STARTED'
  | 'DICE_ROLL_REQUESTED'
  | 'DICE_ROLLED'
  | 'LEGAL_MOVES_CALCULATED'
  | 'TOKEN_MOVED'
  | 'TOKEN_CAPTURED'
  | 'EXTRA_TURN_GRANTED'
  | 'THREE_SIXES_PENALTY'
  | 'TOKEN_ENTERED_HOME'
  | 'TOKEN_FINISHED'
  | 'POWERUP_USED'
  | 'TURN_TIMEOUT'
  | 'PLAYER_RANKED'
  | 'GAME_FINISHED'
  | 'REACTION_SENT';

export interface LudoEvent<T = any> {
  id: string;
  gameId: string;
  seq: number;
  timestamp: number;
  type: LudoEventType;
  payload: T;
}

// ==========================================
// 7. CLIENT TO SERVER SCHEMAS
// ==========================================

export const LudoCreateRoomSchema = z.object({
  playerName: z.string().min(1).max(20),
  avatar: z.string().min(1).max(10).default('🎲'),
  color: z.enum([
    'red', 'green', 'yellow', 'blue', 'purple',
    'orange', 'cyan', 'pink', 'lime', 'amber'
  ]).default('red'),
  settings: LudoSettingsSchema.partial().optional()
});

export const LudoJoinRoomSchema = z.object({
  roomCode: z.string().min(4).max(8),
  playerName: z.string().min(1).max(20),
  avatar: z.string().min(1).max(10).default('🦁'),
  preferredColor: z.enum([
    'red', 'green', 'yellow', 'blue', 'purple',
    'orange', 'cyan', 'pink', 'lime', 'amber'
  ]).optional(),
  asSpectator: z.boolean().default(false)
});

export const LudoRollDiceSchema = z.object({
  requestId: z.string().uuid()
});

export const LudoSelectTokenSchema = z.object({
  requestId: z.string().uuid(),
  tokenId: z.string()
});

export const LudoUsePowerUpSchema = z.object({
  requestId: z.string().uuid(),
  powerUp: z.enum(['SHIELD', 'REROLL', 'DASH', 'SABOTAGE', 'RECOVERY']),
  targetTokenId: z.string().optional()
});
