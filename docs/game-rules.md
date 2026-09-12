# Game Rules Specification: Modern Multiplayer Snakes & Ladders

## 1. Classic Mode Rules

- **Board Dimension**: 10x10 Grid (100 tiles) or 10x5 Grid (Speed 50 tiles).
- **Starting Position**: All players begin at position `0` (off-board).
- **Board Entry**:
  - *Standard*: A roll of any value moves the player onto the board (position = roll).
  - *Strict (Configurable)*: Requires a roll of `1` or `6` to enter square `1`.
- **Movement**:
  - Roll a standard six-sided die (values 1–6).
  - Move forward step-by-step by the dice value.
- **Ladders (Ascent)**:
  - If a player lands exactly on the base of a ladder, they immediately climb up to the top tile.
  - Landing on the top of a ladder does not move the player downward.
- **Snakes (Descent)**:
  - If a player lands exactly on the head of a snake, they immediately slide down to the tail tile.
  - Landing on the tail of a snake does not move the player upward.
- **Consecutive Sixes Rule**:
  - Rolling a 6 grants an immediate extra roll.
  - *Anti-Camping Rule*: Rolling three consecutive 6s cancels the third move and ends the turn.
- **Winning Condition**:
  - *Exact Finish (Default)*: Player must land precisely on square 100 (or final tile). If roll exceeds target distance, the player bounces backward by the remaining steps (e.g. from 98, roll 4 -> moves to 100 then bounces back to 98).
  - *Overshoot Wins (Alternative)*: Any roll that meets or exceeds the target square wins.

---

## 2. Adventure Mode (Special Tiles)

Adventure mode spices up the classic loop with interactive, strategic tiles without bloating the game:

1. **Boost Tile (🚀)**:
   - Grants +2 to +4 bonus forward steps upon landing.
2. **Trap Tile (🕳️)**:
   - Snares the player, knocking them back -2 to -4 steps.
3. **Shield Tile (🛡️)**:
   - Grants a Snake Immunity Shield. The next snake encountered is completely absorbed (breaks the shield without sliding down). Max 1 shield per player.
4. **Double-Dice Tile (🎲🎲)**:
   - Next roll rolls two dice and sums them (up to 12).
5. **Risk Tile (⚖️)**:
   - 50% chance to surge forward +8 tiles, 50% chance to drop back -4 tiles.
6. **Swap Tile (🔄)**:
   - Exchanges positions with the nearest ahead opponent (if none ahead, swap with nearest behind).
7. **Safe Tile (🌿)**:
   - Immune to adverse tile hazards and board-wide chaos events while standing on it.
8. **Bonus Turn Tile (⭐)**:
   - Immediately grants another turn after landing.

---

## 3. Turn Progression & Timeout Management

- **Active Turn Indicator**: The current player's avatar and name glow, with an animated radial countdown timer (default: 30s).
- **Timeout Action**:
  - If timer expires, the server automatically rolls the dice on behalf of the player.
  - If a player times out twice consecutively without interaction, they are marked as AFK and auto-skipped or delegated to an AI bot.
