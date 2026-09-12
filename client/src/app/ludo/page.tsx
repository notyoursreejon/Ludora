'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EMOJI_AVATARS, LUDO_COLORS, LudoColor, LUDO_COLOR_HEX } from '@snakes/shared';
import { sound } from '../../lib/sound';

export default function LudoLandingPage() {
  const router = useRouter();

  const [name, setName] = useState('Player');
  const [avatar, setAvatar] = useState('🦁');
  const [color, setColor] = useState<LudoColor>('red');
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [gameMode, setGameMode] = useState<'classic' | 'battle'>('classic');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'single'>('single');

  // Load and save profile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snakes_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.name) setName(parsed.name);
          if (parsed.avatar) setAvatar(parsed.avatar);
        } catch {}
      }
    }
  }, []);

  const saveProfile = (newName: string, newAvatar: string, newColor: LudoColor) => {
    setName(newName);
    setAvatar(newAvatar);
    setColor(newColor);
    if (typeof window !== 'undefined') {
      localStorage.setItem('snakes_profile', JSON.stringify({ name: newName, avatar: newAvatar, color: newColor }));
    }
  };

  const handleCreateRoom = () => {
    sound.playButtonClick();
    router.push(`/ludo/play?mode=${gameMode}&players=${playerCount}`);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) return;
    sound.playButtonClick();
    router.push(`/ludo/play?room=${joinCode.trim().toUpperCase()}`);
  };

  const handlePlaySingle = () => {
    sound.playButtonClick();
    router.push(`/ludo/play?single=true&players=${playerCount}&mode=${gameMode}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-4 sm:p-8 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎲</span>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-red-400 via-amber-300 to-blue-400 bg-clip-text text-transparent">
              Ludora
            </h1>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Online Multiplayer Ludo (2-10 Players)
            </div>
          </div>
        </div>

        <Link
          href="/"
          className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
        >
          <span>🐍 Snakes & Ladders</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-xl my-auto py-6 flex flex-col gap-6">
        {/* Profile Customizer Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group cursor-pointer">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg border"
              style={{
                backgroundColor: LUDO_COLOR_HEX[color].dark,
                borderColor: LUDO_COLOR_HEX[color].border
              }}
            >
              {avatar}
            </div>
          </div>

          <div className="flex-1 w-full flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Player Profile</span>
              <span className="text-[11px] text-emerald-400 font-semibold">● Ready</span>
            </div>
            <input
              type="text"
              value={name}
              maxLength={20}
              onChange={e => saveProfile(e.target.value, avatar, color)}
              className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-amber-400"
              placeholder="Your Player Name"
            />
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800">
          <button
            type="button"
            onClick={() => { sound.playButtonClick(); setActiveTab('single'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'single'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🤖 Play vs AI
          </button>
          <button
            type="button"
            onClick={() => { sound.playButtonClick(); setActiveTab('create'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🌐 Create Room
          </button>
          <button
            type="button"
            onClick={() => { sound.playButtonClick(); setActiveTab('join'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'join'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🔑 Join Room
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 rounded-3xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-2xl flex flex-col gap-5">
          {activeTab === 'single' && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Number of Players (2 to 10)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 6, 8, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlayerCount(n)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        playerCount === n
                          ? 'bg-amber-500 text-slate-950 shadow-lg'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {n} {n <= 4 ? 'Classic' : 'Mega'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Game Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGameMode('classic')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      gameMode === 'classic'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-sm font-black">🎲 Classic Ludo</div>
                    <div className="text-[11px] text-slate-400 mt-1">Authentic rules, safe stars, exact finish.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGameMode('battle')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      gameMode === 'battle'
                        ? 'bg-purple-500/15 border-purple-400 text-purple-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-sm font-black">⚡ Battle Ludo</div>
                    <div className="text-[11px] text-slate-400 mt-1">Shields, rerolls, dash & comeback tokens!</div>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaySingle}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all active:scale-98 cursor-pointer"
              >
                🎮 Start Single Player Match
              </button>
            </>
          )}

          {activeTab === 'create' && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Lobby Capacity (2 to 10 Human/AI Players)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 6, 8, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlayerCount(n)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        playerCount === n
                          ? 'bg-amber-500 text-slate-950 shadow-lg'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {n} Players
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Game Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGameMode('classic')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      gameMode === 'classic'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-sm font-black">🎲 Classic Ludo</div>
                    <div className="text-[11px] text-slate-400 mt-1">Standard pure ruleset.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGameMode('battle')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      gameMode === 'battle'
                        ? 'bg-purple-500/15 border-purple-400 text-purple-300'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="text-sm font-black">⚡ Battle Ludo</div>
                    <div className="text-[11px] text-slate-400 mt-1">Power-ups enabled.</div>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-98 cursor-pointer"
              >
                🚀 Create Room & Invite Friends
              </button>
            </>
          )}

          {activeTab === 'join' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Enter 6-Character Room Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  maxLength={8}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. L8Q4X2"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 text-center text-xl font-mono font-black text-amber-400 uppercase tracking-widest outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={!joinCode.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-black text-sm uppercase tracking-wider shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enter Room
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 py-3">
        Server-authoritative dice & movement · Anti-cheat protected · Real-time WebSockets
      </footer>
    </div>
  );
}
