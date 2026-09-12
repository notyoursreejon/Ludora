'use client';

import React from 'react';
import { BoardConfig, PlayerDTO } from '@snakes/shared';
import { getTileCoordinates } from '@snakes/engine';

interface BoardProps {
  board: BoardConfig;
  players: PlayerDTO[];
  activePlayerId?: string;
  theme?: 'classic' | 'jungle' | 'neon' | 'space' | 'ancient';
}

const THEME_STYLES = {
  classic: {
    bg: 'bg-amber-950/40 border-amber-800/60',
    cellEven: 'bg-amber-100/90 text-amber-950 border-amber-300/40',
    cellOdd: 'bg-amber-200/90 text-amber-950 border-amber-300/40',
    gridBorder: 'border-amber-700/60',
    ladderStroke: '#D97706',
    snakeStroke: '#15803D',
    snakeHead: '#166534',
  },
  jungle: {
    bg: 'bg-emerald-950/50 border-emerald-800/60',
    cellEven: 'bg-emerald-900/60 text-emerald-100 border-emerald-700/40',
    cellOdd: 'bg-teal-900/70 text-emerald-100 border-emerald-700/40',
    gridBorder: 'border-emerald-700/60',
    ladderStroke: '#F59E0B',
    snakeStroke: '#22C55E',
    snakeHead: '#15803D',
  },
  neon: {
    bg: 'bg-slate-950 border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
    cellEven: 'bg-slate-900/80 text-cyan-200 border-cyan-500/30',
    cellOdd: 'bg-slate-800/80 text-cyan-100 border-cyan-500/30',
    gridBorder: 'border-cyan-500/40',
    ladderStroke: '#06B6D4',
    snakeStroke: '#EC4899',
    snakeHead: '#DB2777',
  },
  space: {
    bg: 'bg-indigo-950/60 border-purple-800/60 shadow-[0_0_30px_rgba(147,51,234,0.15)]',
    cellEven: 'bg-indigo-900/40 text-purple-200 border-purple-500/30',
    cellOdd: 'bg-purple-950/60 text-purple-100 border-purple-500/30',
    gridBorder: 'border-purple-600/40',
    ladderStroke: '#38BDF8',
    snakeStroke: '#A855F7',
    snakeHead: '#9333EA',
  },
  ancient: {
    bg: 'bg-yellow-950/50 border-yellow-700/60',
    cellEven: 'bg-yellow-900/40 text-amber-100 border-yellow-600/30',
    cellOdd: 'bg-amber-950/50 text-amber-200 border-yellow-600/30',
    gridBorder: 'border-yellow-600/40',
    ladderStroke: '#FBBF24',
    snakeStroke: '#B45309',
    snakeHead: '#92400E',
  }
};

const SPECIAL_TILE_ICONS: Record<string, string> = {
  boost: '🚀',
  shield: '🛡️',
  trap: '🕳️',
  risk: '⚖️',
  double_dice: '🎲🎲',
  swap: '🔄',
  safe: '🌿',
  bonus_turn: '⭐'
};

export const Board: React.FC<BoardProps> = ({
  board,
  players,
  activePlayerId,
  theme = 'neon'
}) => {
  const currentTheme = THEME_STYLES[theme] || THEME_STYLES.neon;
  const cols = board.cols || 10;
  const rows = board.rows || 10;
  const total = board.totalTiles || 100;

  // Generate tiles array 1..total
  const tileIndices = Array.from({ length: total }, (_, i) => i + 1);

  // Group players by position
  const playersByPos = new Map<number, PlayerDTO[]>();
  for (const p of players) {
    if (p.isSpectator) continue;
    const list = playersByPos.get(p.position) || [];
    list.push(p);
    playersByPos.set(p.position, list);
  }

  // Calculate ladder visual segments
  const ladderLines = board.ladders.map((ladder, idx) => {
    const fromCoord = getTileCoordinates(ladder.from, cols, rows);
    const toCoord = getTileCoordinates(ladder.to, cols, rows);
    const dx = toCoord.xPercent - fromCoord.xPercent;
    const dy = toCoord.yPercent - fromCoord.yPercent;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const rungsCount = Math.max(3, Math.floor(dist / 5));

    const rungs = [];
    for (let i = 1; i < rungsCount; i++) {
      const t = i / rungsCount;
      const rx = fromCoord.xPercent + dx * t;
      const ry = fromCoord.yPercent + dy * t;
      // Perpendicular vector for rung width
      const perpX = (-dy / dist) * 1.5;
      const perpY = (dx / dist) * 1.5;
      rungs.push({
        x1: rx - perpX,
        y1: ry - perpY,
        x2: rx + perpX,
        y2: ry + perpY
      });
    }

    return {
      key: `ladder-${idx}`,
      from: fromCoord,
      to: toCoord,
      rungs
    };
  });

  // Calculate snake visual curved paths
  const snakePaths = board.snakes.map((snake, idx) => {
    const head = getTileCoordinates(snake.from, cols, rows);
    const tail = getTileCoordinates(snake.to, cols, rows);
    // Control point for curved snake body
    const midX = (head.xPercent + tail.xPercent) / 2 + ((idx % 2 === 0 ? 1 : -1) * 8);
    const midY = (head.yPercent + tail.yPercent) / 2;
    const path = `M ${head.xPercent} ${head.yPercent} Q ${midX} ${midY} ${tail.xPercent} ${tail.yPercent}`;

    return {
      key: `snake-${idx}`,
      head,
      tail,
      path
    };
  });

  return (
    <div className="relative w-full max-w-[650px] aspect-square select-none mx-auto">
      {/* Board Outer Container */}
      <div className={`relative w-full h-full rounded-2xl overflow-hidden border-2 shadow-2xl ${currentTheme.bg}`}>
        
        {/* Grid of Cells */}
        <div
          className="w-full h-full grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {/* Render cells in visually top-to-bottom order */}
          {Array.from({ length: rows }).map((_, rIdx) => {
            const rowFromBottom = rows - 1 - rIdx;
            const isOddRow = rowFromBottom % 2 === 1;

            return Array.from({ length: cols }).map((_, cIdx) => {
              const col = isOddRow ? (cols - 1 - cIdx) : cIdx;
              const tileNumber = rowFromBottom * cols + col + 1;
              const isEvenTile = (tileNumber) % 2 === 0;

              // Check special tile
              const specialTile = board.specialTiles?.find(t => t.position === tileNumber);
              const isWinTile = tileNumber === total;
              const isStartTile = tileNumber === 1;

              return (
                <div
                  key={`cell-${tileNumber}`}
                  className={`relative flex flex-col justify-between p-1 border text-[11px] font-bold transition-colors ${
                    isEvenTile ? currentTheme.cellEven : currentTheme.cellOdd
                  } ${isWinTile ? '!bg-amber-400/20 !border-amber-400 font-extrabold text-amber-300' : ''}`}
                >
                  {/* Tile Number */}
                  <span className="opacity-80 leading-none">
                    {tileNumber}
                  </span>

                  {/* Tile Labels / Special Icons */}
                  {isWinTile && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xl animate-bounce">🏆</span>
                    </div>
                  )}

                  {isStartTile && (
                    <span className="absolute bottom-1 right-1 text-[9px] text-emerald-400 font-bold uppercase">
                      Start
                    </span>
                  )}

                  {specialTile && !isWinTile && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-sm drop-shadow-md" title={specialTile.description}>
                        {SPECIAL_TILE_ICONS[specialTile.type] || '✨'}
                      </span>
                    </div>
                  )}
                </div>
              );
            });
          })}
        </div>

        {/* SVG Overlay for Vector Snakes & Ladders */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Ladders */}
          {ladderLines.map(l => (
            <g key={l.key} opacity="0.92">
              {/* Left Rail */}
              <line
                x1={l.from.xPercent - 1.2}
                y1={l.from.yPercent}
                x2={l.to.xPercent - 1.2}
                y2={l.to.yPercent}
                stroke={currentTheme.ladderStroke}
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              {/* Right Rail */}
              <line
                x1={l.from.xPercent + 1.2}
                y1={l.from.yPercent}
                x2={l.to.xPercent + 1.2}
                y2={l.to.yPercent}
                stroke={currentTheme.ladderStroke}
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              {/* Rungs */}
              {l.rungs.map((r, rIdx) => (
                <line
                  key={`rung-${rIdx}`}
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke={currentTheme.ladderStroke}
                  strokeWidth="0.6"
                />
              ))}
            </g>
          ))}

          {/* Snakes */}
          {snakePaths.map(s => (
            <g key={s.key} opacity="0.95">
              {/* Shadow */}
              <path
                d={s.path}
                fill="none"
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Snake Body */}
              <path
                d={s.path}
                fill="none"
                stroke={currentTheme.snakeStroke}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="2 1"
              />
              {/* Snake Head */}
              <circle
                cx={s.head.xPercent}
                cy={s.head.yPercent}
                r="2.2"
                fill={currentTheme.snakeHead}
              />
              {/* Snake Eyes */}
              <circle
                cx={s.head.xPercent - 0.7}
                cy={s.head.yPercent - 0.6}
                r="0.45"
                fill="#FEF08A"
              />
              <circle
                cx={s.head.xPercent + 0.7}
                cy={s.head.yPercent - 0.6}
                r="0.45"
                fill="#FEF08A"
              />
            </g>
          ))}
        </svg>

        {/* Dynamic Player Tokens (Multi-player non-overlapping stacking) */}
        {Array.from(playersByPos.entries()).map(([pos, tilePlayers]) => {
          if (pos <= 0) return null; // Waiting offboard rendered separately
          const coords = getTileCoordinates(pos, cols, rows);

          return (
            <div
              key={`token-group-${pos}`}
              className="absolute pointer-events-none z-20 flex items-center justify-center transition-all duration-500 ease-out"
              style={{
                left: `${coords.xPercent}%`,
                top: `${coords.yPercent}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="flex flex-wrap items-center justify-center max-w-[46px] max-h-[46px] gap-1">
                {tilePlayers.map(player => {
                  const isActive = player.id === activePlayerId;
                  const tokenSize = tilePlayers.length > 4 ? 'w-4 h-4 text-[8px]' : tilePlayers.length > 1 ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]';

                  return (
                    <div
                      key={player.id}
                      className={`pointer-events-auto rounded-full flex items-center justify-center font-black text-white shadow-lg border-2 border-white/90 transition-transform ${tokenSize} ${
                        isActive ? 'scale-125 ring-2 ring-yellow-400 ring-offset-1 ring-offset-slate-900 animate-pulse' : ''
                      }`}
                      style={{ backgroundColor: player.color }}
                      title={`${player.name} (Tile ${pos})${player.hasShield ? ' 🛡️ Shielded' : ''}`}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Off-Board Waiting Area for New Players */}
      {playersByPos.get(0)?.length ? (
        <div className="mt-3 flex items-center gap-2 p-2 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Offboard:</span>
          <div className="flex flex-wrap gap-1.5">
            {playersByPos.get(0)!.map(player => (
              <div
                key={`offboard-${player.id}`}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow"
                style={{ backgroundColor: player.color }}
              >
                <span>{player.name}</span>
                {player.id === activePlayerId && <span className="animate-ping text-[8px]">●</span>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
