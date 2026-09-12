# 🎲👑 Ludora: Modern Online Multiplayer Ludo & Board Games Platform

**Ludora** is a production-quality, responsive, server-authoritative multiplayer board game platform supporting **2 to 10 players**, single-player vs AI opponents with multiple heuristics and difficulty levels, private rooms with 6-character codes, shareable links, real-time WebSockets synchronization, Battle Ludo power-up mechanics, Web Audio API sound synthesis, and full match replays.

### Available Games:
1. **Ludo Arena (`/ludo`)**: Classic 15x15 (2-4 players) & Mega Extended (5-10 players) Ludo, Battle Mode power-ups, safe stars, and exact finish rules.
2. **Snakes & Ladders (`/`)**: Classic 100 & Speed 50 boards with adventure tiles and 3D token physics.

---

## ✨ Features

- **Real-Time Multiplayer (2–10 Players)**: Server-authoritative WebSocket state synchronization.
- **Single-Player vs AI Bots**: Play against AI with 5 distinct personality heuristics:
  - `Casual`: Relaxed, unpredictable rolls.
  - `Strategist`: Probability-based risk evaluation.
  - `Aggressive`: High-variance aggressive seeker.
  - `Lucky`: Playful and spontaneous.
  - `Master`: Minimax/EV finish probability optimizer.
- **Local Pass-and-Play**: 2 to 6 players on a single device with automated turn rotation.
- **Adventure Mode & Special Tiles**:
  - 🚀 **Boost Tile**: Surges +2 to +4 squares forward.
  - 🛡️ **Shield Tile**: Absorbs the next snake bite without penalty.
  - 🕳️ **Trap Tile**: Knocks the player back 3 squares.
  - ⚖️ **Risk Tile**: 50% chance to jump +8 tiles or drop -4 tiles.
  - 🔄 **Swap Tile**: Trades places with the nearest ahead opponent!
  - 🎲🎲 **Double Dice**: Roll 2 dice on the next turn.
- **Reconnection Resilience**:
  - Ephemeral 32-byte cryptographic session tokens.
  - 30-second disconnect grace period with automatic state reconstruction.
  - Replaces abandoned players with AI bots so matches never stall.
- **Deterministic Match Replay**:
  - Every game event is logged with immutable sequence IDs.
  - Interactive scrubber with Play/Pause, Step Forward/Back, and 1x/2x/4x speeds.
- **Quick Reactions**:
  - Send real-time floating emojis (`😂`, `😱`, `🎉`, `😭`, `🔥`, `🐍`, `🪜`, `🚀`, `💀`).
- **Responsive Scalable Board**:
  - High-contrast SVG board supporting 5 themes: *Classic*, *Emerald Jungle*, *Neon Cyberpunk*, *Deep Space*, and *Ancient Gold*.
  - 10-player token stacking grid preventing visual overlaps.
- **Zero-Dependency Sound Effects**:
  - Built-in Web Audio API synthesizer for dice rattling, ladder ascents, snake descents, and victory fanfares.

---

## 🏗️ Project Architecture

```
├── packages/
│   ├── shared/     # Shared DTOs, Zod schemas, socket contracts & types
│   └── engine/     # Pure TypeScript game engine, boards, rules, AI & replay
├── server/         # Authoritative Node.js HTTP + WebSocket server & rooms
├── client/         # Next.js 14+ frontend with Tailwind CSS & SVG Board
└── docs/           # Specifications, network protocols, architecture, schemas
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+

### 2. Installation
```bash
# Clone the repository and install all workspace dependencies
npm install
```

### 3. Build Shared Packages
```bash
npm run build --workspace=@snakes/shared
npm run build --workspace=@snakes/engine
```

### 4. Running the Tests
```bash
# Run pure game engine unit tests (14 tests covering rules, bounces, AI, adventure tiles, replay)
npm run test:engine

# Run server integration tests
npm run test:server
```

### 5. Running the Application Locally
In two terminal tabs:

**Terminal 1: Start Game Server**
```bash
npm run dev:server
# Server starts on http://localhost:4000 (WebSocket on ws://localhost:4000)
```

**Terminal 2: Start Next.js Client**
```bash
npm run dev:client
# Web app runs on http://localhost:3000
```

Open your browser at **http://localhost:3000** to start playing!

---

## 🛡️ Security & Anti-Cheat

- **Server-Authoritative Dice**: official dice values are generated on the server using cryptographic randomness (`crypto.getRandomValues`).
- **Input Validation**: Network messages are strictly verified with Zod schemas.
- **Turn & Sequence Guards**: Client action requests are checked against the active player ID and current turn sequence to prevent out-of-turn or replayed moves.

---

## 📜 License
MIT License
