# Feature Roadmap & Release Milestones

## Phase 1: Foundations & Architecture (Completed)
- [x] Master architecture specification (`docs/architecture.md`)
- [x] Game rules definition (`docs/game-rules.md`)
- [x] Network protocol RFC (`docs/network-protocol.md`)
- [x] Database schema (`docs/database-schema.md`)
- [x] API contracts & DTOs (`docs/api-contract.md`)
- [x] Testing strategy (`docs/testing-strategy.md`)

## Phase 2: Core Engine & Shared Schemas
- [ ] Implement `packages/shared` with Zod validation schemas and WebSocket event types.
- [ ] Implement `packages/engine` with pure rules, board generators (100 & 50), collision resolvers, and deterministic event stream.
- [ ] Unit test suite covering all engine rules, bounce logic, adventure tiles, and replay reconstruction.

## Phase 3: Real-Time Server & Persistence
- [ ] Authoritative WebSocket server (`server/src/server.ts`).
- [ ] Room Manager (2–10 players, Spectator slots, Host controls).
- [ ] Matchmaking queue.
- [ ] Session Reconnection Manager with 30s grace window and AI fallback.
- [ ] Prisma/SQLite database layer with match records and event logging.

## Phase 4: AI Opponents
- [ ] 5 Distinct Personalities: Casual, Strategist, Aggressive, Lucky, Master.
- [ ] Configurable thinking delay (300ms–1200ms) executed server-side.

## Phase 5: Next.js Client & Interactive UX
- [ ] Responsive SVG/Canvas Board rendering with themes (Classic, Jungle, Neon/Cyber, Space).
- [ ] 10-player token stacking grid (anti-clipping algorithm).
- [ ] 3D animated dice roller with roll physics feel.
- [ ] Web Audio API synthesized sound effects.
- [ ] Quick reactions bar (`😂`, `😱`, `🎉`, `🐍`, `🪜`) with floating bubble animations.
- [ ] Single Player vs AI, Pass-and-Play, Private Room lobby, Spectator mode, Replay viewer, and Results screen.

## Phase 6: Verification, Polish & CI/CD
- [ ] Integration tests & multiplayer load simulation.
- [ ] Production build and zero-warning type checks.
- [ ] README with setup, commands, and deployment guides.
