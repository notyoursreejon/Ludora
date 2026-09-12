# Testing Strategy & Quality Assurance

## 1. Multi-Layer Testing Pyramid

```
                ┌────────────────────────┐
                │   End-to-End Testing   │ Playwright Browser E2E:
                │   Full Match Simulation│ Lobby -> Roll -> Reconnect -> Victory
                └───────────▲────────────┘
                            │
                ┌───────────▼────────────┐
                │   Multiplayer Server   │ 2-10 Player Concurrency,
                │   Integration Tests    │ Timeout Auto-Roll, Disconnects
                └───────────▲────────────┘
                            │
                ┌───────────▼────────────┐
                │    Core Game Engine    │ Pure Rules, Exact Bounces,
                │    Deterministic Units │ Snakes, Ladders, Replay Log
                └────────────────────────┘
```

## 2. Test Suites

1. **Engine Test Suite**:
   - `test/engine/board.test.ts`: Board generation, coordinate calculations, snake & ladder mapping integrity (no infinite loops, tail < head, base < top).
   - `test/engine/rules.test.ts`: Moving forward, bouncing from square 100 on exact roll rule, extra turn on 6, three sixes penalty rule.
   - `test/engine/adventure.test.ts`: Shield absorbing snake, Risk tile 50/50 outcomes, swap tile swapping with ahead player.
   - `test/engine/replay.test.ts`: Event log replay recreation matching the final state perfectly.
   - `test/engine/ai.test.ts`: AI decision heuristics across Casual, Strategist, Aggressive, Lucky, Master.

2. **Server Integration Suite**:
   - `test/server/room.test.ts`: Room creation, joining up to 10 players, host transfer on exit, spectator slot assignment.
   - `test/server/turns.test.ts`: Turn rotation, timer ticks, auto-roll fallback on timeout.
   - `test/server/reconnect.test.ts`: Disconnect detection, 30s grace window, re-connection with sessionToken restoring player position and turn status.

3. **Security & Anti-Cheat Suite**:
   - Malicious client message injection (e.g. attempting to send `ROLL_RESULT` or `SET_POSITION`).
   - Rate limiting spamming `ROLL_REQUEST`.
   - Out-of-turn roll requests rejection.
