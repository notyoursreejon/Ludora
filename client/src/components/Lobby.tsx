'use client';

import React, { useState } from 'react';
import { RoomDTO, GameSettings, AIPersonality } from '@snakes/shared';

interface LobbyProps {
  room: RoomDTO;
  myPlayerId: string;
  isHost: boolean;
  onReadyToggle: (ready: boolean) => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onAddAI: (personality: AIPersonality) => void;
  onKickPlayer: (playerId: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  myPlayerId,
  isHost,
  onReadyToggle,
  onUpdateSettings,
  onAddAI,
  onKickPlayer,
  onStartGame,
  onLeaveRoom
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedAI, setSelectedAI] = useState<AIPersonality>('casual');

  const myPlayer = room.players.find(p => p.id === myPlayerId);
  const canStart = room.players.length >= 2 && room.players.every(p => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/play?room=${room.code}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md">
      {/* Lobby Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white">Room Lobby</span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono font-bold tracking-wider">
              {room.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Share this room code with friends to join (2 to 10 players).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            {copied ? '✓ Code Copied' : '📋 Copy Code'}
          </button>
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            🔗 Share Link
          </button>
          <button
            onClick={onLeaveRoom}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-colors"
          >
            Leave
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Players Slot List (2 columns on large) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            <span>Players ({room.players.length}/{room.settings.maxPlayers})</span>
            {isHost && room.players.length < room.settings.maxPlayers && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedAI}
                  onChange={(e) => setSelectedAI(e.target.value as AIPersonality)}
                  className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 border border-slate-700"
                >
                  <option value="casual">Casual AI</option>
                  <option value="strategist">Strategist AI</option>
                  <option value="aggressive">Aggressive AI</option>
                  <option value="lucky">Lucky AI</option>
                  <option value="master">Master AI</option>
                </select>
                <button
                  onClick={() => onAddAI(selectedAI)}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-bold border border-emerald-500/40"
                >
                  + Add AI
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {room.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  player.id === myPlayerId
                    ? 'bg-slate-800/80 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-sm shadow-md ring-2 ring-white/20"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate max-w-[110px]">
                        {player.name}
                      </span>
                      {player.isHost && (
                        <span className="text-amber-400 text-[10px]" title="Room Host">
                          👑
                        </span>
                      )}
                      {player.isAI && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded font-mono">
                          BOT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {player.isReady ? (
                        <span className="text-emerald-400 font-semibold">● Ready</span>
                      ) : (
                        <span className="text-amber-400/80 font-medium">○ Waiting</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Kick button for host */}
                {isHost && !player.isHost && (
                  <button
                    onClick={() => onKickPlayer(player.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 text-xs"
                    title="Remove Player"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Ready & Start Action Bar */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            {myPlayer && (
              <button
                onClick={() => onReadyToggle(!myPlayer.isReady)}
                className={`flex-1 py-3 px-6 rounded-2xl font-bold text-xs tracking-wider uppercase transition-all shadow-lg ${
                  myPlayer.isReady
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {myPlayer.isReady ? '✓ Ready (Click to Unready)' : 'Ready Up'}
              </button>
            )}

            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`flex-1 py-3 px-6 rounded-2xl font-black text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-orange-500/25 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                }`}
              >
                <span>🚀</span>
                <span>{canStart ? 'Start Match' : 'Waiting for Players...'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Room Settings Panel */}
        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Game Settings
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Game Mode</label>
            <select
              value={room.settings.mode}
              disabled={!isHost}
              onChange={(e) => onUpdateSettings({ mode: e.target.value as any })}
              className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl p-2.5 border border-slate-800 disabled:opacity-60"
            >
              <option value="classic">Classic Snakes & Ladders</option>
              <option value="adventure">Adventure (Special & Risk Tiles)</option>
            </select>
          </div>

          {/* Board Variant */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Board Size</label>
            <select
              value={room.settings.boardVariant}
              disabled={!isHost}
              onChange={(e) => onUpdateSettings({ boardVariant: e.target.value as any })}
              className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl p-2.5 border border-slate-800 disabled:opacity-60"
            >
              <option value="classic-100">100 Tiles (Standard 10x10)</option>
              <option value="speed-50">50 Tiles (Fast 10x5)</option>
            </select>
          </div>

          {/* Max Players */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Max Players</label>
            <select
              value={room.settings.maxPlayers}
              disabled={!isHost}
              onChange={(e) => onUpdateSettings({ maxPlayers: Number(e.target.value) })}
              className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl p-2.5 border border-slate-800 disabled:opacity-60"
            >
              {[2, 3, 4, 5, 6, 8, 10].map(num => (
                <option key={num} value={num}>{num} Players</option>
              ))}
            </select>
          </div>

          {/* Turn Timer */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Turn Timer</label>
            <select
              value={room.settings.turnTimeoutSeconds}
              disabled={!isHost}
              onChange={(e) => onUpdateSettings({ turnTimeoutSeconds: Number(e.target.value) })}
              className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl p-2.5 border border-slate-800 disabled:opacity-60"
            >
              <option value={15}>15 seconds (Speedy)</option>
              <option value={30}>30 seconds (Standard)</option>
              <option value={45}>45 seconds (Relaxed)</option>
              <option value={60}>60 seconds (Casual)</option>
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs text-slate-400 block mb-1">Board Visual Theme</label>
            <select
              value={room.settings.theme}
              disabled={!isHost}
              onChange={(e) => onUpdateSettings({ theme: e.target.value as any })}
              className="w-full bg-slate-900 text-slate-200 text-xs rounded-xl p-2.5 border border-slate-800 disabled:opacity-60"
            >
              <option value="classic">Vintage Parchment</option>
              <option value="jungle">Emerald Jungle</option>
              <option value="neon">Neon Cyberpunk</option>
              <option value="space">Deep Space</option>
              <option value="ancient">Ancient Gold</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
