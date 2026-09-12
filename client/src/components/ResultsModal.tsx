'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PlayerDTO } from '@snakes/shared';
import { sound } from '../lib/sound';

interface ResultsModalProps {
  isOpen: boolean;
  winner: PlayerDTO | null;
  players: PlayerDTO[];
  onRematch?: () => void;
  onReturnToLobby?: () => void;
  onOpenReplay?: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  isOpen,
  winner,
  players,
  onRematch,
  onReturnToLobby,
  onOpenReplay
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playVictory();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.55 },
        colors: ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6']
      });
    }
  }, [isOpen]);

  if (!isOpen || !winner) return null;

  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === winner.id) return -1;
    if (b.id === winner.id) return 1;
    return b.position - a.position;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow ambient background behind trophy */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Victory Trophy */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/30 to-yellow-500/10 border-2 border-amber-400/50 flex items-center justify-center text-4xl mb-4 shadow-xl shadow-amber-500/20 animate-bounce">
          🏆
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-amber-400 mb-1">
          Match Completed
        </span>
        <h2 className="text-3xl font-black text-white tracking-tight">
          {winner.name} Wins!
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 mb-6">
          Victory achieved on square {winner.position} with {winner.stats.turnsTaken} turns!
        </p>

        {/* Standings List */}
        <div className="w-full bg-slate-950/80 rounded-2xl border border-slate-800 p-3 mb-6 shadow-inner">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-2 text-left">
            Final Standings
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-all ${
                  p.id === winner.id
                    ? 'bg-amber-500/15 border border-amber-500/40 font-bold text-amber-200 shadow-sm'
                    : 'bg-slate-900/60 border border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center font-black text-xs text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <div
                    className="w-4 h-4 rounded-full shadow-sm ring-1 ring-white/30"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate max-w-[130px] font-semibold text-white">
                    {p.name}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                  <span title="Snakes hit">🐍 {p.stats.snakesHit}</span>
                  <span title="Ladders climbed">🪜 {p.stats.laddersClimbed}</span>
                  <span className="font-extrabold text-white font-mono text-xs">Tile {p.position}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="flex-1 py-3.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <span>📼</span> Watch Replay
            </button>
          )}

          {onRematch && (
            <button
              onClick={onRematch}
              className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-1.5 active:scale-95 ring-1 ring-white/30"
            >
              <span>🔄</span> Play Again
            </button>
          )}

          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="flex-1 py-3.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all border border-slate-700 flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <span>🏠</span> Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
