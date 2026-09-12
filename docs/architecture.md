# System Architecture: Modern Multiplayer Snakes & Ladders

## 1. High-Level Topology

```
                  ┌────────────────────────────────────────┐
                  │          Web Clients (Desktop/Mobile)  │
                  │   Next.js 14+ / React / Tailwind CSS   │
                  │   Scalable Vector Board & Web Audio    │
                  └──────────────▲──────────▲──────────────┘
                                 │          │
                 HTTP REST / SSE │          │ WebSocket (JSON RPC)
                                 │          │
                  ┌──────────────▼──────────▼──────────────┐
                  │       Authoritative Node.js Server     │
                  │   - Connection & Session Auth Manager  │
                  │   - Room Orchestrator (2-10 players)   │
                  │   - Pure Game Engine Execution Engine  │
                  │   - Matchmaking & Disconnect Workers   │
                  └──────────────▲──────────▲──────────────┘
                                 │          │
                 ORM / Queries   │          │ In-Memory State
                                 │          │
                  ┌──────────────▼──────────▼──────────────┐
                  │       PostgreSQL / SQLite Database     │
                  │   - Users & Guests                     │
                  │   - Matches & Detailed Event Streams   │
                  │   - Player Stats & Leaderboard         │
                  └────────────────────────────────────────┘
```

## 2. Core Architectural Principles

1. **Absolute Server Authority**:
   - The client never dictates dice numbers, token coordinates, turn switches, or game ends.
   - The client only submits action intents (`ROLL_REQUEST`, `DECISION_REQUEST`, `EMOTE`).
   - The server validates permissions, rolls the cryptographically-secure random seed, applies board transformations, emits an immutable chronological event stream, and updates authoritative state.

2. **Deterministic Event-Driven State Machine**:
   - State evolves purely as `State(t+1) = Reducer(State(t), Event)`.
   - Every movement is represented as an ordered event chain (`ROLL_RESULT` → `MOVE_STEP` → `LANDING` → `SNAKE_TRIGGERED` / `LADDER_TRIGGERED` → `TURN_COMPLETED`).
   - Enables zero-drift client interpolation, instant reconnection catch-up, and full game replays.

3. **Multiplayer Scalability & Concurrency (2–10 Players)**:
   - Rooms support variable player capacity (2 to 10 players) + unlimited spectators.
   - Room codes use human-readable base-32 alphanumeric strings (e.g. `AB7KQ2`) without ambiguous characters (`0/O`, `1/I/L`).
   - Turn timeouts (default 30s) automatically trigger default moves (auto-roll) to guarantee matches never freeze.

4. **Resilient Reconnection Engine**:
   - Each player receives an ephemeral `sessionToken` upon joining.
   - If the WebSocket drops (e.g. network glitch, tab reload, mobile backgrounding), the player has a 30-second grace countdown.
   - During grace, other players see a "Disconnected (Reconnecting...)" indicator.
   - Upon reconnecting with `sessionToken`, the full authoritative `GameState` and recent event sequence are sent immediately.
   - If grace expires, the slot is replaced by an AI bot or forfeited to keep the match moving.

5. **Pure Framework-Independent Game Engine**:
   - The core game logic (`packages/engine`) has zero React, DOM, or Node HTTP dependencies.
   - Can run on the server, in a web worker, or in automated CLI test harnesses.
