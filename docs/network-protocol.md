# Real-Time Network Protocol Specification

## 1. Transport & Framing

- Communication is over standard WebSocket (WSS in production).
- Message envelopes are JSON objects strictly validated with Zod schemas.

```typescript
export interface WsEnvelope<T = any> {
  type: string;
  requestId?: string; // For request-response correlation
  timestamp: number;
  payload: T;
}
```

---

## 2. Client to Server Messages

| Type | Payload | Description |
|---|---|---|
| `ROOM_CREATE` | `{ playerName: string, avatar: string, color: string, settings?: GameSettings }` | Create a new private room. |
| `ROOM_JOIN` | `{ roomCode: string, playerName: string, avatar: string, color: string, sessionToken?: string, asSpectator?: boolean }` | Join room or re-attach existing session. |
| `ROOM_LEAVE` | `{ roomCode: string }` | Gracefully exit room. |
| `HOST_KICK` | `{ targetPlayerId: string }` | Host ejects player before game start. |
| `HOST_UPDATE_SETTINGS`| `{ settings: Partial<GameSettings> }` | Host alters board type, timer, or rules. |
| `PLAYER_READY` | `{ ready: boolean }` | Toggle ready status in lobby. |
| `GAME_START` | `{}` | Host initiates match start. |
| `ROLL_REQUEST` | `{}` | Current turn player requests authoritative dice roll. |
| `SEND_REACTION` | `{ emoji: string }` | Broadcast an in-game quick reaction (`😂`, `😱`, `🎉`, `🐍`, `🪜`, etc.). |
| `MATCHMAKING_JOIN` | `{ playerName: string, mode: "classic" \| "adventure", playerCount: number }` | Enter public queue. |
| `MATCHMAKING_CANCEL`| `{}` | Leave queue. |

---

## 3. Server to Client Messages

| Type | Payload | Description |
|---|---|---|
| `SESSION_INIT` | `{ playerId: string, sessionToken: string, roomCode: string }` | Sent on room entry for reconnect authentication. |
| `ROOM_UPDATE` | `{ room: RoomDTO }` | Full room snapshot (player roster, ready states, settings). |
| `GAME_STATE_SNAPSHOT` | `{ state: GameStateDTO, events: GameEvent[] }` | Authoritative match state sent on start or reconnection. |
| `GAME_EVENT` | `{ event: GameEvent, nextState: GameStateDTO }` | Real-time event (Roll, Movement, Snake, Ladder, Win). |
| `TURN_TIMER_TICK` | `{ secondsRemaining: number, playerId: string }` | Radial timer sync. |
| `REACTION_BROADCAST` | `{ playerId: string, emoji: string, timestamp: number }` | Shows floating emoji on player avatar. |
| `ERROR` | `{ code: string, message: string }` | Structured error notifications (e.g. `NOT_YOUR_TURN`, `ROOM_FULL`). |
