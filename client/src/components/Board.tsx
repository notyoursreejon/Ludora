'use client';

import React, { useState } from 'react';
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
    bg: 'bg-gradient-to-br from-amber-950/80 via-yellow-950/60 to-amber-950/80 border-amber-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
    cellEven: 'bg-amber-100/90 text-amber-950 border-amber-900/20 shadow-inner',
    cellOdd: 'bg-amber-200/90 text-amber-950 border-amber-900/20 shadow-inner',
    gridBorder: 'border-amber-700/60',
    ladderStroke: '#D97706',
    ladderRail: '#B45309',
    snakeStroke: '#15803D',
    snakeHead: '#166534',
    snakeGlow: 'rgba(34, 197, 94, 0.3)',
  },
  jungle: {
    bg: 'bg-gradient-to-br from-emerald-950/90 via-teal-950/70 to-slate-950 border-emerald-600/40 shadow-[0_20px_50px_rgba(4,120,87,0.2)]',
    cellEven: 'bg-emerald-900/60 text-emerald-100 border-emerald-700/30',
    cellOdd: 'bg-teal-900/70 text-emerald-100 border-emerald-700/30',
    gridBorder: 'border-emerald-700/50',
    ladderStroke: '#F59E0B',
    ladderRail: '#D97706',
    snakeStroke: '#22C55E',
    snakeHead: '#15803D',
    snakeGlow: 'rgba(34, 197, 94, 0.4)',
  },
  neon: {
    bg: 'bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.2)]',
    cellEven: 'bg-slate-900/80 text-cyan-200 border-cyan-500/20 shadow-inner',
    cellOdd: 'bg-slate-850/80 text-cyan-100 border-cyan-500/20 shadow-inner',
    gridBorder: 'border-cyan-500/30',
    ladderStroke: '#38BDF8',
    ladderRail: '#0284C7',
    snakeStroke: '#F43F5E',
    snakeHead: '#E11D48',
    snakeGlow: 'rgba(244, 63, 94, 0.4)',
  },
  space: {
    bg: 'bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 border-purple-500/40 shadow-[0_0_50px_rgba(168,85,247,0.2)]',
    cellEven: 'bg-indigo-950/50 text-purple-200 border-purple-500/20 shadow-inner',
    cellOdd: 'bg-purple-950/60 text-purple-100 border-purple-500/20 shadow-inner',
    gridBorder: 'border-purple-600/30',
    ladderStroke: '#60A5FA',
    ladderRail: '#3B82F6',
    snakeStroke: '#C084FC',
    snakeHead: '#A855F7',
    snakeGlow: 'rgba(192, 132, 252, 0.4)',
  },
  ancient: {
    bg: 'bg-gradient-to-br from-stone-900 via-amber-950/70 to-stone-950 border-amber-600/40 shadow-[0_20px_50px_rgba(217,119,6,0.25)]',
    cellEven: 'bg-yellow-950/40 text-amber-100 border-yellow-700/30 shadow-inner',
    cellOdd: 'bg-amber-950/50 text-amber-200 border-yellow-700/30 shadow-inner',
    gridBorder: 'border-yellow-600/40',
    ladderStroke: '#FBBF24',
    ladderRail: '#D97706',
    snakeStroke: '#EA580C',
    snakeHead: '#C2410C',
    snakeGlow: 'rgba(234, 88, 12, 0.35)',
  }
};

const SPECIAL_TILE_DATA: Record<string, { icon: string; label: string; color: string }> = {
  boost: { icon: '🚀', label: '+3 Boost', color: 'text-cyan-400 bg-cyan-500/20' },
  shield: { icon: '🛡️', label: 'Shield', color: 'text-indigo-300 bg-indigo-500/20' },
  trap: { icon: '🕳️', label: '-3 Trap', color: 'text-rose-400 bg-rose-500/20' },
  risk: { icon: '⚖️', label: 'Risk 50/50', color: 'text-amber-300 bg-amber-500/20' },
  double_dice: { icon: '🎲', label: '2x Dice', color: 'text-purple-300 bg-purple-500/20' },
  swap: { icon: '🔄', label: 'Swap', color: 'text-teal-300 bg-teal-500/20' },
  safe: { icon: '🌿', label: 'Safe', color: 'text-emerald-300 bg-emerald-500/20' },
  bonus_turn: { icon: '⭐', label: 'Free Turn', color: 'text-yellow-300 bg-yellow-500/20' }
};

export const Board: React.FC<BoardProps> = ({
  board,
  players,
  activePlayerId,
  theme = 'neon'
}) => {
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);

  const currentTheme = THEME_STYLES[theme] || THEME_STYLES.neon;
  const cols = board.cols || 10;
  const rows = board.rows || 10;
  const total = board.totalTiles || 100;

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
    const rungsCount = Math.max(3, Math.floor(dist / 4.8));

    const rungs = [];
    for (let i = 1; i < rungsCount; i++) {
      const t = i / rungsCount;
      const rx = fromCoord.xPercent + dx * t;
      const ry = fromCoord.yPercent + dy * t;
      const perpX = (-dy / dist) * 1.6;
      const perpY = (dx / dist) * 1.6;
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

  // Calculate snake visual paths
  const snakePaths = board.snakes.map((snake, idx) => {
    const head = getTileCoordinates(snake.from, cols, rows);
    const tail = getTileCoordinates(snake.to, cols, rows);
    const midX = (head.xPercent + tail.xPercent) / 2 + ((idx % 2 === 0 ? 1 : -1) * 9);
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
    <div className="relative w-full max-w-[620px] aspect-square select-none mx-auto p-1 sm:p-2">
      {/* Outer Card with ambient glow */}
      <div className={`relative w-full h-full rounded-3xl overflow-hidden border-2 p-1.5 backdrop-blur-xl ${currentTheme.bg}`}>
        
        {/* Grid of Cells */}
        <div
          className="w-full h-full grid rounded-2xl overflow-hidden gap-[2px] bg-black/40 p-[2px]"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: rows }).map((_, rIdx) => {
            const rowFromBottom = rows - 1 - rIdx;
            const isOddRow = rowFromBottom % 2 === 1;

            return Array.from({ length: cols }).map((_, cIdx) => {
              const col = isOddRow ? (cols - 1 - cIdx) : cIdx;
              const tileNumber = rowFromBottom * cols + col + 1;
              const isEvenTile = tileNumber % 2 === 0;

              const specialTile = board.specialTiles?.find(t => t.position === tileNumber);
              const isWinTile = tileNumber === total;
              const isStartTile = tileNumber === 1;
              const isHovered = hoveredTile === tileNumber;

              return (
                <div
                  key={`cell-${tileNumber}`}
                  onMouseEnter={() => setHoveredTile(tileNumber)}
                  onMouseLeave={() => setHoveredTile(null)}
                  className={`relative flex flex-col justify-between p-1 rounded-md text-[10px] sm:text-[11px] font-bold transition-all duration-200 ${
                    isEvenTile ? currentTheme.cellEven : currentTheme.cellOdd
                  } ${
                    isWinTile
                      ? '!bg-gradient-to-br !from-amber-400/30 !via-yellow-400/20 !to-amber-500/30 !border-amber-400/80 ring-1 ring-amber-400/50 font-black text-amber-300'
                      : ''
                  } ${isHovered ? 'brightness-125 ring-1 ring-white/40 scale-[1.03] z-20 shadow-lg' : ''}`}
                >
                  {/* Tile Number with subtle glow */}
                  <span className="opacity-75 leading-none font-mono tracking-tighter">
                    {tileNumber}
                  </span>

                  {/* Victory Tile Centerpiece */}
                  {isWinTile && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-lg sm:text-2xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-bounce">
                        🏆
                      </span>
                      <span className="text-[8px] sm:text-[9px] uppercase tracking-widest font-black text-amber-300 drop-shadow">
                        FINISH
                      </span>
                    </div>
                  )}

                  {/* Start Tile Marker */}
                  {isStartTile && (
                    <span className="absolute bottom-1 right-1 text-[8px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-extrabold uppercase tracking-widest border border-emerald-500/40">
                      START
                    </span>
                  )}

                  {/* Special Tile Badge */}
                  {specialTile && !isWinTile && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        className="text-sm sm:text-base drop-shadow-md hover:scale-125 transition-transform"
                        title={specialTile.description}
                      >
                        {SPECIAL_TILE_DATA[specialTile.type]?.icon || '✨'}
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
          {/* Drop Shadows Filter */}
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity="0.6" />
            </filter>
            <linearGradient id="ladderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={currentTheme.ladderStroke} />
              <stop offset="100%" stopColor={currentTheme.ladderRail} />
            </linearGradient>
            <linearGradient id="snakeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={currentTheme.snakeHead} />
              <stop offset="100%" stopColor={currentTheme.snakeStroke} />
            </linearGradient>
          </defs>

          {/* Ladders */}
          {ladderLines.map(l => (
            <g key={l.key} opacity="0.95" filter="url(#shadow)">
              {/* Rails */}
              <line
                x1={l.from.xPercent - 1.3}
                y1={l.from.yPercent}
                x2={l.to.xPercent - 1.3}
                y2={l.to.yPercent}
                stroke="url(#ladderGrad)"
                strokeWidth="0.95"
                strokeLinecap="round"
              />
              <line
                x1={l.from.xPercent + 1.3}
                y1={l.from.yPercent}
                x2={l.to.xPercent + 1.3}
                y2={l.to.yPercent}
                stroke="url(#ladderGrad)"
                strokeWidth="0.95"
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
                  strokeWidth="0.75"
                  strokeLinecap="round"
                />
              ))}
            </g>
          ))}

          {/* Snakes */}
          {snakePaths.map(s => (
            <g key={s.key} filter="url(#shadow)">
              {/* Body Outer Glow */}
              <path
                d={s.path}
                fill="none"
                stroke={currentTheme.snakeGlow}
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Body */}
              <path
                d={s.path}
                fill="none"
                stroke="url(#snakeGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="2 1"
              />
              {/* Snake Head */}
              <circle
                cx={s.head.xPercent}
                cy={s.head.yPercent}
                r="2.4"
                fill={currentTheme.snakeHead}
                stroke="#fff"
                strokeWidth="0.3"
              />
              {/* Snake Eyes with glowing slits */}
              <circle
                cx={s.head.xPercent - 0.75}
                cy={s.head.yPercent - 0.6}
                r="0.5"
                fill="#FEF08A"
              />
              <circle
                cx={s.head.xPercent + 0.75}
                cy={s.head.yPercent - 0.6}
                r="0.5"
                fill="#FEF08A"
              />
              <circle
                cx={s.head.xPercent - 0.75}
                cy={s.head.yPercent - 0.6}
                r="0.25"
                fill="#000"
              />
              <circle
                cx={s.head.xPercent + 0.75}
                cy={s.head.yPercent - 0.6}
                r="0.25"
                fill="#000"
              />
            </g>
          ))}
        </svg>

        {/* Dynamic 3D Glossy Player Tokens (Anti-overlapping layout) */}
        {Array.from(playersByPos.entries()).map(([pos, tilePlayers]) => {
          if (pos <= 0) return null;
          const coords = getTileCoordinates(pos, cols, rows);

          return (
            <div
              key={`token-group-${pos}`}
              className="absolute pointer-events-none z-30 flex items-center justify-center transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)"
              style={{
                left: `${coords.xPercent}%`,
                top: `${coords.yPercent}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="flex flex-wrap items-center justify-center max-w-[48px] max-h-[48px] gap-1">
                {tilePlayers.map(player => {
                  const isActive = player.id === activePlayerId;
                  const tokenSize = tilePlayers.length > 4 ? 'w-4 h-4 text-[7px]' : tilePlayers.length > 1 ? 'w-5 h-5 text-[9px]' : 'w-7 h-7 text-[11px]';

                  return (
                    <div
                      key={player.id}
                      className={`pointer-events-auto rounded-full flex items-center justify-center font-black text-white shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 border-white/90 relative transition-transform hover:scale-125 cursor-pointer ${tokenSize} ${
                        isActive ? 'scale-125 ring-4 ring-amber-400/80 animate-pulse' : ''
                      }`}
                      style={{
                        background: `radial-gradient(circle at 30% 30%, #fff, ${player.color} 60%, #000 100%)`
                      }}
                      title={`${player.name} (Tile ${pos})${player.hasShield ? ' 🛡️ Shielded' : ''}`}
                    >
                      <span className="drop-shadow-md flex items-center justify-center leading-none">
                        {player.avatar && player.avatar.length <= 6
                          ? player.avatar
                          : player.name.charAt(0).toUpperCase()}
                      </span>

                      {player.hasShield && (
                        <span className="absolute -top-1 -right-1 text-[8px] drop-shadow">
                          🛡️
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Off-board Waiting Tokens Dock */}
      {playersByPos.get(0)?.length ? (
        <div className="mt-3 flex items-center gap-2 p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Offboard:</span>
          <div className="flex flex-wrap gap-2">
            {playersByPos.get(0)!.map(player => (
              <div
                key={`offboard-${player.id}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md border border-white/20 transition-transform hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${player.color}, rgba(0,0,0,0.6))`
                }}
              >
                {player.avatar && <span>{player.avatar}</span>}
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
