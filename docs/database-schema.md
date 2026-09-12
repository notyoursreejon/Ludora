# Database Schema & Persistence Strategy

## 1. Schema Diagram (Prisma ORM Compatible)

```prisma
datasource db {
  provider = "sqlite" // Easily switches to "postgresql" for cloud deployment
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String       @id @default(uuid())
  username      String       @unique
  displayName   String
  avatar        String       @default("token-1")
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  stats         PlayerStats?
  matchPlayers  MatchPlayer[]
}

model Room {
  id            String       @id @default(uuid())
  code          String       @unique
  hostId        String
  mode          String       @default("classic")
  maxPlayers    Int          @default(4)
  isPrivate     Boolean      @default(true)
  status        String       @default("waiting") // waiting, playing, finished
  settingsJson  String
  createdAt     DateTime     @default(now())
  matches       Match[]
}

model Match {
  id            String        @id @default(uuid())
  roomId        String?
  room          Room?         @relation(fields: [roomId], references: [id])
  boardVariant  String        @default("classic-100")
  gameMode      String        @default("classic")
  startedAt     DateTime      @default(now())
  endedAt       DateTime?
  winnerId      String?
  durationSec   Int?
  totalTurns    Int           @default(0)
  eventsJson    String        // Complete chronological event sequence for deterministic replay
  players       MatchPlayer[]
}

model MatchPlayer {
  id            String       @id @default(uuid())
  matchId       String
  match         Match        @relation(fields: [matchId], references: [id], onDelete: Cascade)
  userId        String?
  user          User?        @relation(fields: [userId], references: [id])
  playerName    String
  color         String
  avatar        String
  isAI          Boolean      @default(false)
  aiPersonality String?
  finalRank     Int?
  finalPosition Int          @default(0)
  snakesHit     Int          @default(0)
  laddersClimbed Int         @default(0)
  tilesTraveled Int          @default(0)
}

model PlayerStats {
  id             String      @id @default(uuid())
  userId         String      @unique
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  gamesPlayed    Int         @default(0)
  gamesWon       Int         @default(0)
  snakesHit      Int         @default(0)
  laddersClimbed Int         @default(0)
  bestStreak     Int         @default(0)
  currentStreak  Int         @default(0)
}
```
