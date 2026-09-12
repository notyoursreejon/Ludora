# Ludo Game Rules Specification

## 1. Core Classic Rules

### Starting Roll Requirement
- Tokens begin in the player's colored Yard.
- A player must roll a **6** (or **1** if configured in settings) to move a token from the Yard onto their Start Gate.
- Leaving the yard does not forfeit movement; the token is positioned on the Start Gate ready to advance on subsequent turns.

### Movement & Advancing
- A token advances clockwise around the perimeter track by the exact number of squares rolled on the dice.
- Tokens can pass over other tokens on the track (unless a blocking blockade rule is configured).

### Captures
- When a token lands on a square occupied by an opponent's vulnerable token:
  - The opponent's token is captured and sent immediately back to their Yard (`stepCount = 0`).
  - The capturing player is awarded an **extra roll**.
  - The capturing player's statistic `captures` increments by 1.

### Safe Squares (Immunity from Capture)
- Tokens occupying any of the **8 Safe Squares** (4 Start Gates + 4 Star Squares) are immune to capture:
  - Start Gates: Indices `0, 13, 26, 39` (Classic).
  - Star Squares: Indices `8, 21, 34, 47` (Classic).
- Multiple tokens from different players may peacefully co-exist on safe squares.

### Consecutive Sixes Rule
- Rolling a **6** grants an immediate extra roll.
- If a player rolls **3 consecutive sixes** in a single turn, the turn is penalized and immediately forfeits to the next player.

### Home Path & Exact Finish
- After completing a full circuit of the perimeter track (50 steps from start gate), the token enters the player's private colored Home Path (5 cells).
- **Exact Roll Requirement**: A token must roll the exact remaining distance to enter the Central Finish Triangle. If the roll overshoots the finish, the token cannot move.

---

## 2. Battle Ludo Mode (Optional)

Battle Ludo introduces tactical powers earned during the match:
- 🛡️ **SHIELD**: Protects a token on the track from 1 capture attempt.
- 🎲 **REROLL**: Rerolls the dice once if an unfavorable roll is obtained.
- ⚡ **DASH**: Surges a chosen token forward +2 extra cells.
- 🔄 **RECOVERY**: Revives a token from the yard directly to the start gate without needing a 6.
- 🌟 **Fortune Token (Comeback Mechanic)**: Granted to a player who falls significantly behind (e.g., 3+ tokens in yard while rival has 2+ finished tokens).
