# Production-Quality Online Multiplayer Ludo: Architecture & Design

## 1. System Overview

The application is built on a modern TypeScript monorepo architecture with a strict separation between:
1. **Pure Game Engine (`packages/ludo-engine`)**: Deterministic, framework-agnostic rules, legal move calculations, board layouts, and AI heuristics.
2. **Shared Contracts (`packages/shared`)**: Shared data models, Zod validation schemas, and WebSocket event definitions.
3. **Authoritative Backend (`server`)**: Real-time WebSocket server, room lifecycle manager, cryptographic randomness, turn timers, anti-cheat validation, and session recovery.
4. **Responsive Frontend (`client`)**: Next.js 14 App Router, SVG responsive boards (Classic 15x15 and Mega 5-10 Extended), 3D dice physics, Web Audio API sound synthesizer, and reaction overlays.

```mermaid
graph TB
    subgraph Client ["Next.js Responsive Client"]
        Lobby[Lobby & Room Manager]
        ClassicBoard[Classic 15x15 SVG Board (2-4p)]
        ExtendedBoard[Extended Mega SVG Board (5-10p)]
        Dice3D[3D Animated Physics Dice]
        AudioSynth[Web Audio API Sound Synth]
        Reactions[Quick Reaction Overlay]
    end

    subgraph CoreEngine ["Pure Ludo Game Engine (@snakes/ludo-engine)"]
        BoardGen[Classic & Mega Board Layout Generator]
        MoveCalc[Deterministic Legal Move Calculator]
        CaptureEngine[Capture & Blockade Rules]
        BattleEngine[Power-Ups & Comeback Engine]
        AIEngine[AI Personalities: Strategist, Aggressor, Runner, Master]
        ReplayEngine[Event Reconstruction Engine]
    end

    subgraph Server ["Authoritative Backend (server)"]
        WSServer[WebSocket Gateway]
        AntiCheat[Anti-Cheat & Rate Limiter]
        RoomManager[Room Lifecycle & 6-Char Code Gen]
        SessionStore[Reconnection & Grace Window]
        TurnTimer[Server-Enforced Turn Countdown]
    end

    Client <-->|WebSocket JSON Envelopes| Server
    Server --> CoreEngine
```

---

## 2. Board Topology & Scaling

### A. Classic 15x15 Board (2 to 4 Players)
- Standard 52-cell cross track.
- 4 Colored Quadrants (Red, Green, Yellow, Blue).
- 4 Start gates (cells 0, 13, 26, 39).
- 4 Star safe cells (cells 8, 21, 34, 47).
- 5 Colored steps down each home path.
- 1 Central finish triangle per player.
- Total steps to finish = 50 steps on track + 5 steps down home lane + 1 finish step = 56 steps.

### B. Extended Mega Board (5 to 10 Players)
- Rather than crowding players on a 4-player board, a parametric radial/polygonal track is constructed with $N$ player sectors ($N \in [5, 10]$).
- Each player has their dedicated Start Gate, Safe Star Cell, Home Lane, and Yard.
- Scales cleanly across screen dimensions without token clipping.

---

## 3. Server Authority & Anti-Cheat

The browser is treated as an untrusted rendering terminal. The client never determines:
- Dice rolls (generated cryptographically on server via `crypto.randomInt(1, 7)`).
- Move validity or legal options (calculated deterministically by `LudoRuleEngine.getLegalMoves`).
- Captures or finishes (evaluated by `LudoRuleEngine.applyMove`).
- Turn sequences or timers (enforced by `LudoGameRoom` intervals).

Duplicate actions and double clicks are protected by unique `requestId` tracking and idempotent request processing.
