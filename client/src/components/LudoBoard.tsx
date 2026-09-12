'use client';

import React from 'react';
import {
  LudoGameState,
  LudoLegalMove,
  LudoColor,
  LUDO_COLOR_HEX
} from '@snakes/shared';
import { getBoardLayout, LudoBoardLayout } from '@snakes/ludo-engine';
import { sound } from '../lib/sound';

interface LudoBoardProps {
  gameState: LudoGameState;
  legalMoves: LudoLegalMove[];
  myPlayerId?: string;
  onSelectToken: (tokenId: string) => void;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  gameState,
  legalMoves,
  myPlayerId,
  onSelectToken
}) => {
  const activeColors = gameState.players.map(p => p.color);
  const layout: LudoBoardLayout = getBoardLayout(gameState.settings.boardType, activeColors);

  const legalTokenIds = new Set(legalMoves.map(m => m.tokenId));
  const isClassic = layout.boardType === 'classic-4';
  const viewBoxSize = isClassic ? 600 : 800;

  // Group tokens by their visual position
  interface PlacedToken {
    token: any;
    player: any;
    x: number;
    y: number;
    isLegal: boolean;
  }

  const placedTokens: PlacedToken[] = [];

  gameState.players.forEach(player => {
    const geometry = layout.playerGeometries.get(player.color);
    if (!geometry) return;

    player.tokens.forEach((token, tIdx) => {
      if (token.state === 'FINISHED') return;

      let x = 0;
      let y = 0;

      if (token.state === 'YARD') {
        const yardCoord = geometry.yardCoords[tIdx % geometry.yardCoords.length];
        x = yardCoord.x;
        y = yardCoord.y;
      } else if (token.state === 'TRACK') {
        const cell = layout.allCells.find(c => c.trackIndex === token.position);
        if (cell) {
          x = cell.x;
          y = cell.y;
        }
      } else if (token.state === 'HOME_PATH') {
        const homeCoord = geometry.homePathCoords[Math.min(token.position, geometry.homePathCoords.length - 1)];
        if (homeCoord) {
          x = homeCoord.x;
          y = homeCoord.y;
        }
      }

      placedTokens.push({
        token,
        player,
        x,
        y,
        isLegal: legalTokenIds.has(token.id) && (myPlayerId ? player.id === myPlayerId : true)
      });
    });
  });

  // Calculate stacking offsets for tokens sharing the exact same cell
  const cellClusters = new Map<string, PlacedToken[]>();
  placedTokens.forEach(pt => {
    const key = `${Math.round(pt.x)}_${Math.round(pt.y)}`;
    const cluster = cellClusters.get(key) || [];
    cluster.push(pt);
    cellClusters.set(key, cluster);
  });

  const getStackOffset = (indexInCluster: number, totalInCluster: number) => {
    if (totalInCluster === 1) return { dx: 0, dy: 0, scale: 1 };
    if (totalInCluster === 2) {
      return {
        dx: indexInCluster === 0 ? -8 : 8,
        dy: 0,
        scale: 0.82
      };
    }
    if (totalInCluster === 3) {
      const offsets = [
        { dx: 0, dy: -8 },
        { dx: -7, dy: 7 },
        { dx: 7, dy: 7 }
      ];
      return { ...offsets[indexInCluster % 3], scale: 0.72 };
    }
    // 4+ tokens: 2x2 grid
    const gridOffsets = [
      { dx: -8, dy: -8 },
      { dx: 8, dy: -8 },
      { dx: -8, dy: 8 },
      { dx: 8, dy: 8 }
    ];
    return { ...gridOffsets[indexInCluster % 4], scale: 0.65 };
  };

  const handleTokenClick = (tokenId: string, isLegal: boolean) => {
    if (!isLegal) return;
    sound.playTokenMove();
    onSelectToken(tokenId);
  };

  return (
    <div className="relative w-full max-w-[620px] aspect-square mx-auto select-none">
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700/80 bg-slate-900"
      >
        <defs>
          {/* Radial Gradients for 3D tokens */}
          {Object.entries(LUDO_COLOR_HEX).map(([col, hex]) => (
            <radialGradient key={col} id={`ludo-token-${col}`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="25%" stopColor={hex.light} />
              <stop offset="80%" stopColor={hex.main} />
              <stop offset="100%" stopColor={hex.dark} />
            </radialGradient>
          ))}

          {/* Glow filter for legal moves */}
          <filter id="legal-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ==========================================
            CLASSIC 15x15 BOARD RENDERING
        ========================================== */}
        {isClassic ? (
          <g>
            {/* Background Base */}
            <rect x="0" y="0" width="600" height="600" fill="#f8fafc" />

            {/* 4 Quadrant Yard Bases */}
            {/* Red (Top Left) */}
            <rect x="0" y="0" width="240" height="240" fill="#ef4444" />
            <rect x="30" y="30" width="180" height="180" rx="16" fill="#ffffff" />
            <circle cx="75" cy="75" r="22" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
            <circle cx="165" cy="75" r="22" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
            <circle cx="75" cy="165" r="22" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />
            <circle cx="165" cy="165" r="22" fill="#fee2e2" stroke="#ef4444" strokeWidth="3" />

            {/* Green (Top Right) */}
            <rect x="360" y="0" width="240" height="240" fill="#10b981" />
            <rect x="390" y="30" width="180" height="180" rx="16" fill="#ffffff" />
            <circle cx="435" cy="75" r="22" fill="#d1fae5" stroke="#10b981" strokeWidth="3" />
            <circle cx="525" cy="75" r="22" fill="#d1fae5" stroke="#10b981" strokeWidth="3" />
            <circle cx="435" cy="165" r="22" fill="#d1fae5" stroke="#10b981" strokeWidth="3" />
            <circle cx="525" cy="165" r="22" fill="#d1fae5" stroke="#10b981" strokeWidth="3" />

            {/* Yellow (Bottom Right) */}
            <rect x="360" y="360" width="240" height="240" fill="#f59e0b" />
            <rect x="390" y="390" width="180" height="180" rx="16" fill="#ffffff" />
            <circle cx="435" cy="435" r="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="525" cy="435" r="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="435" cy="525" r="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />
            <circle cx="525" cy="525" r="22" fill="#fef3c7" stroke="#f59e0b" strokeWidth="3" />

            {/* Blue (Bottom Left) */}
            <rect x="0" y="360" width="240" height="240" fill="#3b82f6" />
            <rect x="30" y="390" width="180" height="180" rx="16" fill="#ffffff" />
            <circle cx="75" cy="435" r="22" fill="#dbeafe" stroke="#3b82f6" strokeWidth="3" />
            <circle cx="165" cy="435" r="22" fill="#dbeafe" stroke="#3b82f6" strokeWidth="3" />
            <circle cx="75" cy="525" r="22" fill="#dbeafe" stroke="#3b82f6" strokeWidth="3" />
            <circle cx="165" cy="525" r="22" fill="#dbeafe" stroke="#3b82f6" strokeWidth="3" />

            {/* Central Home Triangle */}
            <polygon points="240,240 300,300 240,360" fill="#ef4444" />
            <polygon points="240,240 300,300 360,240" fill="#10b981" />
            <polygon points="360,240 300,300 360,360" fill="#f59e0b" />
            <polygon points="240,360 300,300 360,360" fill="#3b82f6" />
            <circle cx="300" cy="300" r="16" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <text x="300" y="304" textAnchor="middle" fontSize="12" fill="#78350f" fontWeight="bold">🏆</text>

            {/* Home Run Paths */}
            {/* Red Home Path (Horizontal Right) */}
            {[1, 2, 3, 4, 5].map(step => (
              <rect key={`r_home_${step}`} x={step * 40} y={7 * 40} width="40" height="40" fill="#ef4444" stroke="#b91c1c" strokeWidth="1" />
            ))}
            {/* Green Home Path (Vertical Down) */}
            {[1, 2, 3, 4, 5].map(step => (
              <rect key={`g_home_${step}`} x={7 * 40} y={step * 40} width="40" height="40" fill="#10b981" stroke="#047857" strokeWidth="1" />
            ))}
            {/* Yellow Home Path (Horizontal Left) */}
            {[9, 10, 11, 12, 13].map(step => (
              <rect key={`y_home_${step}`} x={step * 40} y={7 * 40} width="40" height="40" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />
            ))}
            {/* Blue Home Path (Vertical Up) */}
            {[9, 10, 11, 12, 13].map(step => (
              <rect key={`b_home_${step}`} x={7 * 40} y={step * 40} width="40" height="40" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1" />
            ))}

            {/* Perimeter Track Cells */}
            {layout.allCells.map(cell => {
              if (cell.type === 'HOME_PATH' || cell.type === 'HOME_TRIANGLE' || cell.type === 'YARD') return null;

              const isStartGate = cell.type === 'START_GATE';
              const isStar = cell.type === 'SAFE_STAR';

              // Assign start cell colors
              let startBg = '#ffffff';
              if (cell.trackIndex === 0) startBg = '#fee2e2';
              if (cell.trackIndex === 13) startBg = '#d1fae5';
              if (cell.trackIndex === 26) startBg = '#fef3c7';
              if (cell.trackIndex === 39) startBg = '#dbeafe';

              return (
                <g key={cell.id}>
                  <rect
                    x={cell.x - 20}
                    y={cell.y - 20}
                    width="40"
                    height="40"
                    fill={isStartGate ? startBg : '#ffffff'}
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  {isStar && (
                    <text
                      x={cell.x}
                      y={cell.y + 5}
                      textAnchor="middle"
                      fontSize="18"
                      fill="#eab308"
                    >
                      ★
                    </text>
                  )}
                  {isStartGate && (
                    <text
                      x={cell.x}
                      y={cell.y + 4}
                      textAnchor="middle"
                      fontSize="14"
                      fill="#64748b"
                      fontWeight="bold"
                    >
                      ▶
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ) : (
          /* ==========================================
              MEGA 5-10 EXTENDED BOARD RENDERING
          ========================================== */
          <g>
            {/* Radial Base */}
            <circle cx="400" cy="400" r="390" fill="#0f172a" stroke="#334155" strokeWidth="4" />
            <circle cx="400" cy="400" r="290" fill="none" stroke="#1e293b" strokeWidth="48" />

            {/* Center Finish Circle */}
            <circle cx="400" cy="400" r="70" fill="#1e293b" stroke="#475569" strokeWidth="3" />
            <circle cx="400" cy="400" r="35" fill="#f59e0b" stroke="#d97706" strokeWidth="3" />
            <text x="400" y="408" textAnchor="middle" fontSize="22" fill="#451a03" fontWeight="bold">👑</text>

            {/* Home Paths radiating to center */}
            {Array.from(layout.playerGeometries.values()).map(geo => {
              const hex = LUDO_COLOR_HEX[geo.color];
              return (
                <g key={`mega_home_${geo.color}`}>
                  {geo.homePathCoords.map((coord, i) => (
                    <circle
                      key={`hp_${geo.color}_${i}`}
                      cx={coord.x}
                      cy={coord.y}
                      r="14"
                      fill={hex.main}
                      stroke={hex.border}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              );
            })}

            {/* Track Cells */}
            {layout.allCells.map(cell => (
              <g key={cell.id}>
                <circle
                  cx={cell.x}
                  cy={cell.y}
                  r="16"
                  fill={cell.isSafe ? '#334155' : '#1e293b'}
                  stroke={cell.isSafe ? '#fbbf24' : '#475569'}
                  strokeWidth={cell.isSafe ? 2.5 : 1.5}
                />
                {cell.isSafe && (
                  <text x={cell.x} y={cell.y + 4} textAnchor="middle" fontSize="12" fill="#fbbf24">
                    ★
                  </text>
                )}
              </g>
            ))}

            {/* Yard Bases around perimeter */}
            {Array.from(layout.playerGeometries.values()).map(geo => {
              const hex = LUDO_COLOR_HEX[geo.color];
              return (
                <g key={`mega_yard_${geo.color}`}>
                  {geo.yardCoords.map((coord, i) => (
                    <circle
                      key={`yc_${geo.color}_${i}`}
                      cx={coord.x}
                      cy={coord.y}
                      r="14"
                      fill={hex.dark}
                      stroke={hex.border}
                      strokeWidth="2"
                    />
                  ))}
                </g>
              );
            })}
          </g>
        )}

        {/* ==========================================
            3D TOKENS RENDERING WITH SMART STACKING
        ========================================== */}
        {placedTokens.map(pt => {
          const key = `${Math.round(pt.x)}_${Math.round(pt.y)}`;
          const cluster = cellClusters.get(key) || [pt];
          const clusterIdx = cluster.indexOf(pt);
          const { dx, dy, scale } = getStackOffset(clusterIdx, cluster.length);

          const hex = LUDO_COLOR_HEX[pt.token.color as LudoColor] || LUDO_COLOR_HEX.red;
          const tokenRadius = (isClassic ? 15 : 14) * scale;
          const posX = pt.x + dx;
          const posY = pt.y + dy;

          return (
            <g
              key={pt.token.id}
              onClick={() => handleTokenClick(pt.token.id, pt.isLegal)}
              className={`transition-all duration-300 ${
                pt.isLegal ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
              }`}
              style={{ transformOrigin: `${posX}px ${posY}px` }}
            >
              {/* Pulsing ring for legal moves */}
              {pt.isLegal && (
                <circle
                  cx={posX}
                  cy={posY}
                  r={tokenRadius + 6}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  className="animate-pulse"
                  strokeDasharray="4 2"
                />
              )}

              {/* Shield Ring if power-up active */}
              {pt.token.shielded && (
                <circle
                  cx={posX}
                  cy={posY}
                  r={tokenRadius + 4}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.5"
                  strokeDasharray="3 3"
                  className="animate-spin"
                />
              )}

              {/* Drop Shadow */}
              <circle
                cx={posX}
                cy={posY + 3}
                r={tokenRadius}
                fill="rgba(0,0,0,0.4)"
              />

              {/* 3D Glossy Token Body */}
              <circle
                cx={posX}
                cy={posY}
                r={tokenRadius}
                fill={`url(#ludo-token-${pt.token.color})`}
                stroke={pt.isLegal ? '#38bdf8' : hex.border}
                strokeWidth={pt.isLegal ? 2.5 : 1.5}
              />

              {/* Emoji or Piece Icon */}
              <text
                x={posX}
                y={posY + 3.5 * scale}
                textAnchor="middle"
                fontSize={12 * scale}
                className="pointer-events-none select-none"
              >
                {pt.player.avatar || '♟️'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
