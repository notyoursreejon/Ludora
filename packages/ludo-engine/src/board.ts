import {
  LudoBoardType,
  LudoColor,
  LUDO_COLORS,
  LudoCellType
} from '@snakes/shared';

export interface BoardCellCoord {
  id: string;
  type: LudoCellType;
  color?: LudoColor;
  trackIndex?: number;
  homeIndex?: number;
  x: number; // visual SVG canvas coordinate (0..600 for classic, 0..800 for mega)
  y: number;
  isSafe: boolean;
}

export interface PlayerBoardGeometry {
  color: LudoColor;
  startTrackIndex: number;
  homeEntryTrackIndex: number;
  totalTrackSteps: number;
  yardCoords: { x: number; y: number }[];
  homePathCoords: { x: number; y: number }[];
  homeTriangleCoord: { x: number; y: number };
}

export interface LudoBoardLayout {
  boardType: LudoBoardType;
  playerCount: number;
  totalTrackCells: number;
  safeTrackIndices: Set<number>;
  playerGeometries: Map<LudoColor, PlayerBoardGeometry>;
  allCells: BoardCellCoord[];
}

// ==========================================
// 1. CLASSIC 15x15 BOARD TOPOLOGY (2-4 PLAYERS)
// ==========================================

export function createClassicBoardLayout(activeColors: LudoColor[] = ['red', 'green', 'yellow', 'blue']): LudoBoardLayout {
  const totalTrackCells = 52;
  const safeTrackIndices = new Set<number>([
    0, 8, 13, 21, 26, 34, 39, 47 // 4 Start gates + 4 Star cells
  ]);

  // Standard 15x15 grid mapping to SVG coordinates (600x600, cell size = 40px)
  const cellSize = 40;
  const getXY = (col: number, row: number) => ({
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2
  });

  // Track coordinates for classic 52-cell cross:
  // Starts at Red start (col 1, row 6) and proceeds clockwise around the perimeter arms:
  const classicTrackGridCoords: [number, number][] = [
    // Red arm going right & up (0..4)
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    // Green vertical arm going up (5..10)
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
    // Top turnaround (11..12)
    [7, 0], [8, 0],
    // Green vertical arm going down (13..17) -> Green start at 13 (8, 1)
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    // Yellow horizontal arm going right (18..23)
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
    // Right turnaround (24..25)
    [14, 7], [14, 8],
    // Yellow horizontal arm going left (26..30) -> Yellow start at 26 (13, 8)
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
    // Blue vertical arm going down (31..36)
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    // Bottom turnaround (37..38)
    [7, 14], [6, 14],
    // Blue vertical arm going up (39..43) -> Blue start at 39 (6, 13)
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
    // Red horizontal arm going left (44..49)
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    // Left turnaround (50..51)
    [0, 7], [0, 6]
  ];

  // Map each standard color to their classic start, home entrance, yards, and home columns:
  const classicColorConfigs: Record<string, {
    startIndex: number;
    homeEntryIndex: number;
    yardBase: [number, number];
    homeGrid: [number, number][];
    triangleGrid: [number, number];
  }> = {
    red: {
      startIndex: 0,
      homeEntryIndex: 50,
      yardBase: [0, 0], // Top-Left quadrant (cols 0..5, rows 0..5)
      homeGrid: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
      triangleGrid: [6, 7]
    },
    green: {
      startIndex: 13,
      homeEntryIndex: 11,
      yardBase: [9, 0], // Top-Right quadrant (cols 9..14, rows 0..5)
      homeGrid: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
      triangleGrid: [7, 6]
    },
    yellow: {
      startIndex: 26,
      homeEntryIndex: 24,
      yardBase: [9, 9], // Bottom-Right quadrant (cols 9..14, rows 9..14)
      homeGrid: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
      triangleGrid: [8, 7]
    },
    blue: {
      startIndex: 39,
      homeEntryIndex: 37,
      yardBase: [0, 9], // Bottom-Left quadrant (cols 0..5, rows 9..14)
      homeGrid: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
      triangleGrid: [7, 8]
    }
  };

  const allCells: BoardCellCoord[] = [];
  const playerGeometries = new Map<LudoColor, PlayerBoardGeometry>();

  // Add track cells
  classicTrackGridCoords.forEach((coord, idx) => {
    const isSafe = safeTrackIndices.has(idx);
    const { x, y } = getXY(coord[0], coord[1]);
    allCells.push({
      id: `track_${idx}`,
      type: isSafe ? (idx % 13 === 0 ? 'START_GATE' : 'SAFE_STAR') : 'TRACK',
      trackIndex: idx,
      x,
      y,
      isSafe
    });
  });

  // Setup player geometries
  activeColors.forEach((color, pIdx) => {
    const defaultColorKey = ['red', 'green', 'yellow', 'blue'][pIdx % 4];
    const cfg = classicColorConfigs[defaultColorKey];

    // Yard tokens 2x2 layout in the player's 6x6 quadrant
    const [bx, by] = cfg.yardBase;
    const yardCoords = [
      getXY(bx + 1.5, by + 1.5),
      getXY(bx + 3.5, by + 1.5),
      getXY(bx + 1.5, by + 3.5),
      getXY(bx + 3.5, by + 3.5)
    ];

    const homePathCoords = cfg.homeGrid.map(coord => getXY(coord[0], coord[1]));
    const homeTriangleCoord = getXY(cfg.triangleGrid[0], cfg.triangleGrid[1]);

    playerGeometries.set(color, {
      color,
      startTrackIndex: cfg.startIndex,
      homeEntryTrackIndex: cfg.homeEntryIndex,
      totalTrackSteps: 50,
      yardCoords,
      homePathCoords,
      homeTriangleCoord
    });
  });

  return {
    boardType: 'classic-4',
    playerCount: activeColors.length,
    totalTrackCells,
    safeTrackIndices,
    playerGeometries,
    allCells
  };
}

// ==========================================
// 2. MEGA EXTENDED BOARD TOPOLOGY (5-10 PLAYERS)
// ==========================================

export function createMegaBoardLayout(activeColors: LudoColor[]): LudoBoardLayout {
  const N = Math.max(5, Math.min(10, activeColors.length));
  const cellsPerSector = 8; // 8 track cells per player sector
  const totalTrackCells = N * cellsPerSector; // e.g. 40 to 80 cells
  const safeTrackIndices = new Set<number>();

  const centerX = 400;
  const centerY = 400;
  const trackRadius = 290;
  const homePathOuterRadius = 240;
  const homePathInnerRadius = 80;
  const yardRadius = 350;

  const playerGeometries = new Map<LudoColor, PlayerBoardGeometry>();
  const allCells: BoardCellCoord[] = [];

  // Generate safe cells and player geometry
  activeColors.slice(0, N).forEach((color, i) => {
    const startIndex = i * cellsPerSector;
    const starIndex = (startIndex + 4) % totalTrackCells;
    const homeEntryIndex = (startIndex - 1 + totalTrackCells) % totalTrackCells;

    safeTrackIndices.add(startIndex);
    safeTrackIndices.add(starIndex);

    // Center angle of this player's quadrant / sector
    const sectorAngle = (2 * Math.PI * i) / N - Math.PI / 2;

    // Yard positions around outer perimeter
    const yardCoords = [-0.15, -0.05, 0.05, 0.15].map(offset => {
      const angle = sectorAngle + offset;
      return {
        x: centerX + yardRadius * Math.cos(angle),
        y: centerY + yardRadius * Math.sin(angle)
      };
    });

    // Home path radiating inwards towards center
    const homePathCoords: { x: number; y: number }[] = [];
    for (let step = 0; step < 5; step++) {
      const r = homePathOuterRadius - step * ((homePathOuterRadius - homePathInnerRadius) / 5);
      homePathCoords.push({
        x: centerX + r * Math.cos(sectorAngle),
        y: centerY + r * Math.sin(sectorAngle)
      });
    }

    // Central home goal
    const homeTriangleCoord = {
      x: centerX + 35 * Math.cos(sectorAngle),
      y: centerY + 35 * Math.sin(sectorAngle)
    };

    playerGeometries.set(color, {
      color,
      startTrackIndex: startIndex,
      homeEntryTrackIndex: homeEntryIndex,
      totalTrackSteps: totalTrackCells - 1,
      yardCoords,
      homePathCoords,
      homeTriangleCoord
    });
  });

  // Generate track coordinates evenly spaced in circle/decagon
  for (let idx = 0; idx < totalTrackCells; idx++) {
    const angle = (2 * Math.PI * idx) / totalTrackCells - Math.PI / 2;
    const isSafe = safeTrackIndices.has(idx);
    const x = centerX + trackRadius * Math.cos(angle);
    const y = centerY + trackRadius * Math.sin(angle);

    allCells.push({
      id: `mega_track_${idx}`,
      type: isSafe ? (idx % cellsPerSector === 0 ? 'START_GATE' : 'SAFE_STAR') : 'TRACK',
      trackIndex: idx,
      x,
      y,
      isSafe
    });
  }

  return {
    boardType: 'mega-10',
    playerCount: N,
    totalTrackCells,
    safeTrackIndices,
    playerGeometries,
    allCells
  };
}

export function getBoardLayout(boardType: LudoBoardType, colors: LudoColor[]): LudoBoardLayout {
  if (boardType === 'classic-4' && colors.length <= 4) {
    return createClassicBoardLayout(colors);
  }
  return createMegaBoardLayout(colors);
}
