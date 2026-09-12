# Ludo Network Protocol Specification

## 1. Transport & Envelopes

All client-server messages are serialized as JSON over standard WebSockets (`ws://` or `wss://`):

```typescript
export interface WsEnvelope<T = any> {
  type: string;
  timestamp: number;
  payload: T;
}
```

---

## 2. Client-to-Server Actions

### `LUDO_ROOM_CREATE`
Creates a new private Ludo room with custom settings.
```json
{
  "type": "LUDO_ROOM_CREATE",
  "timestamp": 1726110000000,
  "payload": {
    "playerName": "Host",
    "avatar": "🦁",
    "color": "red",
    "settings": {
      "playerCount": 4,
      "mode": "classic",
      "boardType": "classic-4",
      "turnTimeoutSeconds": 30
    }
  }
}
```

### `LUDO_ROOM_JOIN`
Joins an existing room using a 6-character room code.
```json
{
  "type": "LUDO_ROOM_JOIN",
  "timestamp": 1726110001000,
  "payload": {
    "roomCode": "L8Q4X2",
    "playerName": "Friend",
    "avatar": "🐼",
    "preferredColor": "green"
  }
}
```

### `LUDO_ADD_AI_BOT`
(Host only) Adds an AI bot to an open player slot.
```json
{
  "type": "LUDO_ADD_AI_BOT",
  "timestamp": 1726110002000,
  "payload": {
    "personality": "master",
    "difficulty": "hard",
    "name": "Grandmaster AI"
  }
}
```

### `LUDO_GAME_START`
(Host only) Starts the match.
```json
{
  "type": "LUDO_GAME_START",
  "timestamp": 1726110003000,
  "payload": {}
}
```

### `LUDO_ROLL_DICE`
Requests an authoritative dice roll.
```json
{
  "type": "LUDO_ROLL_DICE",
  "timestamp": 1726110004000,
  "payload": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### `LUDO_SELECT_TOKEN`
Selects a token to move from calculated legal moves.
```json
{
  "type": "LUDO_SELECT_TOKEN",
  "timestamp": 1726110005000,
  "payload": {
    "tokenId": "p1_t0",
    "requestId": "660e8400-e29b-41d4-a716-446655440000"
  }
}
```

### `LUDO_USE_POWERUP`
Activates a Battle Ludo power-up.
```json
{
  "type": "LUDO_USE_POWERUP",
  "timestamp": 1726110006000,
  "payload": {
    "powerUp": "SHIELD",
    "targetTokenId": "p1_t0",
    "requestId": "770e8400-e29b-41d4-a716-446655440000"
  }
}
```

### `LUDO_SEND_REACTION`
Broadcasts an ephemeral emoji reaction.
```json
{
  "type": "LUDO_SEND_REACTION",
  "timestamp": 1726110007000,
  "payload": {
    "emoji": "🔥"
  }
}
```

---

## 3. Server-to-Client Broadcast Events

- `LUDO_SESSION_INIT`: Confirms player ID, room code, and host status.
- `LUDO_ROOM_STATE`: Authoritative snapshot containing players, game phase, active turn, dice state, legal moves, and turn countdown.
- `LUDO_REACTION`: Real-time floating reaction event with player attribution.
- `ERROR`: Standardized error envelope (`code`, `message`).
