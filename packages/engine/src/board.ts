import { BoardConfig, BoardVariant, SnakeLadderConfig, SpecialTileConfig } from '@snakes/shared';

// Standard 100-cell classic board snakes and ladders
export const CLASSIC_100_LADDERS: SnakeLadderConfig[] = [
  { from: 4, to: 14 },
  { from: 9, to: 31 },
  { from: 20, to: 38 },
  { from: 28, to: 84 },
  { from: 40, to: 59 },
  { from: 51, to: 67 },
  { from: 63, to: 81 },
  { from: 71, to: 91 }
];

export const CLASSIC_100_SNAKES: SnakeLadderConfig[] = [
  { from: 17, to: 7 },
  { from: 54, to: 34 },
  { from: 62, to: 19 },
  { from: 64, to: 60 },
  { from: 87, to: 24 },
  { from: 93, to: 73 },
  { from: 95, to: 75 },
  { from: 99, to: 78 }
];

// Speed 50-cell board
export const SPEED_50_LADDERS: SnakeLadderConfig[] = [
  { from: 3, to: 16 },
  { from: 12, to: 25 },
  { from: 22, to: 39 },
  { from: 33, to: 47 }
];

export const SPEED_50_SNAKES: SnakeLadderConfig[] = [
  { from: 18, to: 6 },
  { from: 31, to: 14 },
  { from: 43, to: 24 },
  { from: 49, to: 32 }
];

// Adventure Mode Special Tiles (Placed strategically on neutral tiles)
export const ADVENTURE_100_TILES: SpecialTileConfig[] = [
  { position: 8, type: 'boost', description: 'Rocket Surge: +3 tiles!' },
  { position: 23, type: 'shield', description: 'Snake Shield: Absorbs next snake bite!' },
  { position: 35, type: 'trap', description: 'Mud Trap: Knocked back 3 tiles!' },
  { position: 45, type: 'risk', description: 'Risk Tile: 50% +8 or 50% -4!' },
  { position: 58, type: 'double_dice', description: 'Double Dice: Roll 2 dice next turn!' },
  { position: 76, type: 'swap', description: 'Swap Tile: Trade places with nearest rival!' },
  { position: 82, type: 'safe', description: 'Sanctuary: Immune to hazards!' },
  { position: 89, type: 'bonus_turn', description: 'Star Power: Extra turn immediately!' }
];

export function createBoard(variant: BoardVariant = 'classic-100', adventureMode = false): BoardConfig {
  if (variant === 'speed-50') {
    return {
      variant: 'speed-50',
      totalTiles: 50,
      cols: 10,
      rows: 5,
      snakes: SPEED_50_SNAKES,
      ladders: SPEED_50_LADDERS,
      specialTiles: adventureMode ? ADVENTURE_100_TILES.filter(t => t.position < 50) : []
    };
  }

  return {
    variant: 'classic-100',
    totalTiles: 100,
    cols: 10,
    rows: 10,
    snakes: CLASSIC_100_SNAKES,
    ladders: CLASSIC_100_LADDERS,
    specialTiles: adventureMode ? ADVENTURE_100_TILES : []
  };
}

/**
 * Calculates (row, col) in serpentine grid (bottom to top).
 * Row 0 is bottom, col 0 is leftmost.
 * Row 0 (1-10): Left to Right
 * Row 1 (11-20): Right to Left
 * Row 2 (21-30): Left to Right
 * etc.
 */
export function getTileCoordinates(position: number, cols = 10, rows = 10): { row: number; col: number; xPercent: number; yPercent: number } {
  if (position <= 0) {
    // Offboard waiting area (bottom-left offset)
    return { row: 0, col: -1, xPercent: -5, yPercent: 105 };
  }

  const clampedPos = Math.max(1, Math.min(position, cols * rows));
  const rowFromBottom = Math.floor((clampedPos - 1) / cols);
  const isOddRow = rowFromBottom % 2 === 1;

  const col = isOddRow
    ? (cols - 1) - ((clampedPos - 1) % cols)
    : (clampedPos - 1) % cols;

  const row = rowFromBottom;

  // Percentage within the board coordinate space (0-100%)
  const xPercent = ((col + 0.5) / cols) * 100;
  const yPercent = (((rows - 1 - row) + 0.5) / rows) * 100;

  return { row, col, xPercent, yPercent };
}
