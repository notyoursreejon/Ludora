'use client';

import React, { useState } from 'react';
import {
  LudoSettings,
  LudoAIPersonality,
  LudoAIDifficulty,
  LUDO_COLOR_HEX,
  LudoColor
} from '@snakes/shared';

interface LudoLobbyProps {
  roomCode: string;
  isHost: boolean;
  myPlayerId?: string;
  players: {
    id: string;
    name: string;
    avatar: string;
    color: LudoColor;
    isHost: boolean;
    isAI: boolean;
    aiPersonality?: string;
  }[];
  settings: LudoSettings;
  onAddBot: (personality: LudoAIPersonality, difficulty: LudoAIDifficulty) => void;
  onStartGame: () => void;
}

export const LudoLobby: React.FC<LudoLobbyProps> = ({
  roomCode,
  isHost,
  myPlayerId,
  players,
  settings,
  onAddBot,
  onStartGame
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<LudoAIPersonality>('strategist');
  const [selectedDifficulty, setSelectedDifficulty] = useState<LudoAIDifficulty>('normal');

  const copyInviteLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/ludo/play?room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddBotClick = () => {
    onAddBot(selectedPersonality, selectedDifficulty);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-6 rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 shadow-2xl flex flex-col gap-6">
      {/* Header & Shareable Room Code */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Match Lobby</div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <span>🎲 Room Code:</span>
            <span className="font-mono text-emerald-400 tracking-widest">{roomCode}</span>
          </h2>
        </div>

        <button
          type="button"
          onClick={copyInviteLink}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span>{copied ? '✅ Copied!' : '🔗 Copy Share Link'}</span>
        </button>
      </div>

      {/* Roster of Players */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>Players Joined ({players.length}/{settings.playerCount})</span>
          <span>{settings.boardType === 'classic-4' ? 'Classic 15x15 Board' : 'Extended Mega Board'}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {players.map((p, idx) => {
            const hex = LUDO_COLOR_HEX[p.color] || LUDO_COLOR_HEX.red;
            const isMe = p.id === myPlayerId;

            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-750/70"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md border"
                    style={{ backgroundColor: hex.dark, borderColor: hex.border }}
                  >
                    {p.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {isMe && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">You</span>}
                    </div>
                    <div className="text-[11px] text-slate-400 capitalize flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hex.main }} />
                      <span>{p.color}</span>
                      {p.isAI && <span className="text-purple-400">· AI ({p.aiPersonality || 'bot'})</span>}
                    </div>
                  </div>
                </div>

                {p.isHost && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Host
                  </span>
                )}
              </div>
            );
          })}

          {/* Empty Player Slots */}
          {Array.from({ length: Math.max(0, settings.playerCount - players.length) }).map((_, i) => (
            <div
              key={`empty_${i}`}
              className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-slate-700/60 text-xs font-semibold text-slate-500"
            >
              Waiting for player...
            </div>
          ))}
        </div>
      </div>

      {/* Host AI Bot Manager */}
      {isHost && players.length < settings.playerCount && (
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex flex-col gap-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🤖 Add Computer AI Opponent</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">AI Personality</label>
              <select
                value={selectedPersonality}
                onChange={e => setSelectedPersonality(e.target.value as LudoAIPersonality)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-amber-400"
              >
                <option value="strategist">🧠 Strategist (Balanced, Safe)</option>
                <option value="aggressor">⚔️ Aggressor (Hunting Captures)</option>
                <option value="runner">🏃 Runner (Lead Token Focus)</option>
                <option value="defender">🛡️ Defender (Safe Zones & Blockades)</option>
                <option value="master">👑 Master (Deep Heuristic)</option>
                <option value="chaos">🎲 Chaos (Unpredictable)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value as LudoAIDifficulty)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 outline-none focus:border-amber-400"
              >
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddBotClick}
            className="w-full py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>+ Add Bot to Room</span>
          </button>
        </div>
      )}

      {/* Start Game Action Bar */}
      <div className="pt-2">
        {isHost ? (
          <button
            type="button"
            onClick={onStartGame}
            disabled={players.length < 2}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl ${
              players.length >= 2
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 active:scale-98 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {players.length >= 2 ? '🚀 Start Match Now' : 'Need At Least 2 Players To Start'}
          </button>
        ) : (
          <div className="text-center py-3 text-xs font-medium text-slate-400 animate-pulse">
            Waiting for host to launch the match...
          </div>
        )}
      </div>
    </div>
  );
};
