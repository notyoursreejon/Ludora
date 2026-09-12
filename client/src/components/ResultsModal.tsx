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
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen]);

  if (!isOpen || !winner) return null;

  // Sort players by position descending
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === winner.id) return -1;
    if (b.id === winner.id) return 1;
    return b.position - a.position;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
        {/* Victory Trophy & Header */}
        <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-3xl mb-3 shadow-lg shadow-amber-400/20 animate-bounce">
          🏆
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide">
          {winner.name} Wins!
        </h2>
        <p className="text-sm text-slate-400 mt-1 mb-6">
          Victory achieved on square {winner.position}!
        </p>

        {/* Final Standings Table */}
        <div className="w-full bg-slate-950/60 rounded-2xl border border-slate-800 p-3 mb-6 overflow-hidden">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2 text-left">
            Match Standings
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {sortedPlayers.map((p, idx) => (
              <div
                key={p.id}
                className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                  p.id === winner.id
                    ? 'bg-amber-500/15 border border-amber-500/30 font-bold text-amber-200'
                    : 'bg-slate-900/60 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-bold text-slate-500">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="truncate max-w-[120px] font-medium">{p.name}</span>
                </div>

                <div className="flex items-center gap-4 text-slate-400">
                  <span title="Snakes hit">🐍 {p.stats.snakesHit}</span>
                  <span title="Ladders climbed">🪜 {p.stats.laddersClimbed}</span>
                  <span className="font-bold text-white">Tile {p.position}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 w-full">
          {onOpenReplay && (
            <button
              onClick={onOpenReplay}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <span>📼</span> Watch Replay
            </button>
          )}

          {onRematch && (
            <button
              onClick={onRematch}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>🔄</span> Play Again
            </button>
          )}

          {onReturnToLobby && (
            <button
              onClick={onReturnToLobby}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
            >
              <span>🏠</span> Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
