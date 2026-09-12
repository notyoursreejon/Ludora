# API Contracts & Shared TypeScript DTOs

## 1. Core Domain Types

```typescript
export type GameMode = 'classic' | 'adventure' | 'speed';
export type BoardVariant = 'classic-100' | 'speed-50';
export type AIPersonality = 'casual' | 'strategist' | 'aggressive' | 'lucky' | 'master';

export interface GameSettings {
  mode: GameMode;
  boardVariant: BoardVariant;
  maxPlayers: number; // 2 to 10
  turnTimeoutSeconds: number; // e.g. 30
  exactFinalSquare: boolean; // default true
  consecutiveSixesRule: boolean; // 3 sixes cancels turn
  allowSpectators: boolean;
  specialTilesEnabled: boolean;
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
  isSpectator: boolean;
  position: number;
  hasShield?: boolean;
  extraTurns?: number;
  stats: {
    snakesHit: number;
    laddersClimbed: number;
    specialTilesHit: number;
    turnsTaken: number;
    rolls: number[];
  };
}

export interface GameStateDTO {
  matchId: string;
  roomCode: string;
  status: 'lobby' | 'in_progress' | 'finished';
  settings: GameSettings;
  players: PlayerDTO[];
  currentTurnIndex: number;
  currentPlayerId: string;
  consecutiveSixesCount: number;
  turnStartedAt: number;
  turnExpiresAt: number;
  winnerId: string | null;
  winnerRankings: string[]; // Order of winners/standings
  lastDiceRoll: number | null;
  lastDiceRolls: number[]; // For double-dice
  eventSequenceIndex: number;
}
```

## 2. REST Endpoints

- `GET /api/health` - Server health, active rooms count, uptime.
- `GET /api/rooms/:code` - Room status check.
- `GET /api/match/:id/replay` - Fetch recorded match event stream for replay playback.
- `GET /api/leaderboard` - Public win rates and ladder climb statistics.
