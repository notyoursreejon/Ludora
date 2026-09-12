'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { sound } from '@/lib/sound';
import { PLAYER_COLORS, EMOJI_AVATARS } from '@snakes/shared';
import { ProfileCustomizerModal } from '@/components/ProfileCustomizerModal';

export default function HomePage() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const [playerAvatar, setPlayerAvatar] = useState<string>(EMOJI_AVATARS[0]);
  const [playerColor, setPlayerColor] = useState<string>(PLAYER_COLORS[0]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedName = localStorage.getItem('snakes_player_name');
      const savedAvatar = localStorage.getItem('snakes_player_avatar');
      const savedColor = localStorage.getItem('snakes_player_color');
      if (savedName) setPlayerName(savedName);
      if (savedAvatar) setPlayerAvatar(savedAvatar);
      if (savedColor) setPlayerColor(savedColor);
    }
  }, []);

  const handleSaveProfile = (profile: { name: string; avatar: string; color: string }) => {
    setPlayerName(profile.name);
    setPlayerAvatar(profile.avatar);
    setPlayerColor(profile.color);
    if (typeof window !== 'undefined') {
      localStorage.setItem('snakes_player_name', profile.name);
      localStorage.setItem('snakes_player_avatar', profile.avatar);
      localStorage.setItem('snakes_player_color', profile.color);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 relative overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl drop-shadow-[0_0_12px_rgba(34,197,94,0.6)]">🐍</span>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              LUDORA · SNAKES & LADDERS
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/ludo"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition-all shadow-md flex items-center gap-1.5"
            >
              <span>🎲 Play Ludora (Ludo)</span>
            </Link>
            <button
              onClick={() => sound.toggleSound()}
              className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur transition-colors"
            >
              🔊 Audio
            </button>
            <button
              onClick={() => setShowHowToPlay(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold transition-all shadow-sm"
            >
              Rules & Guide
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 max-w-5xl mx-auto z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-sm backdrop-blur">
          <span className="animate-spin text-sm">✨</span> Real-Time Multiplayer • 2 to 10 Players • Server-Authoritative
        </div>

        <h1 className="text-4xl sm:text-7xl font-black tracking-tight text-white mb-5 leading-tight">
          The Classic Game, <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
            Elevated & Reimagined.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mb-6 leading-relaxed">
          Climb radiant ladders, survive serpent drop-offs, trigger dynamic adventure tiles,
          or test your mettle against 5 distinct AI personalities.
        </p>

        {/* Player Profile Quick Customizer Widget */}
        <div className="mb-10 inline-flex items-center gap-3 p-2 pr-4 bg-slate-900/90 border border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-xl hover:border-cyan-500/50 transition-all">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md ring-2 ring-white/30"
            style={{
              background: `radial-gradient(circle at 30% 30%, #fff, ${playerColor} 70%, #000 100%)`
            }}
          >
            <span className="drop-shadow">{playerAvatar}</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Playing as
            </span>
            <span className="text-sm font-black text-white">
              {playerName}
            </span>
          </div>
          <button
            onClick={() => setShowProfileModal(true)}
            className="ml-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition-colors"
          >
            ✏️ Change
          </button>
        </div>

        {/* Profile Customizer Modal */}
        <ProfileCustomizerModal
          isOpen={showProfileModal}
          currentName={playerName}
          currentAvatar={playerAvatar}
          currentColor={playerColor}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
        />

        {/* Primary Action Modes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl mb-8">
          {/* Create Online Room */}
          <Link
            href="/play?mode=online&action=create"
            onClick={() => sound.playButtonClick()}
            className="group relative p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 rounded-3xl text-slate-100 font-bold shadow-xl shadow-emerald-500/10 hover:scale-[1.03] transition-all flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all" />
            <span className="text-4xl mb-3 drop-shadow">🌐</span>
            <span className="text-lg font-black text-white">Create Online Room</span>
            <span className="text-xs text-slate-400 font-normal mt-1.5 leading-normal">
              Private 2-10 player match with shareable room code & link.
            </span>
            <span className="mt-4 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
              Host Match →
            </span>
          </Link>

          {/* Single Player vs AI */}
          <Link
            href="/play?mode=ai"
            onClick={() => sound.playButtonClick()}
            className="group relative p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/30 hover:border-cyan-500/60 rounded-3xl text-slate-100 font-bold shadow-xl hover:scale-[1.03] transition-all flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl group-hover:bg-cyan-500/30 transition-all" />
            <span className="text-4xl mb-3 drop-shadow">🤖</span>
            <span className="text-lg font-black text-white">Play vs AI</span>
            <span className="text-xs text-slate-400 font-normal mt-1.5 leading-normal">
              Sharpen your tactics against Casual, Strategist, or Master AI bots.
            </span>
            <span className="mt-4 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-bold border border-cyan-500/30">
              Single Player →
            </span>
          </Link>

          {/* Local Pass & Play */}
          <Link
            href="/play?mode=local"
            onClick={() => sound.playButtonClick()}
            className="group relative p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-purple-500/30 hover:border-purple-500/60 rounded-3xl text-slate-100 font-bold shadow-xl hover:scale-[1.03] transition-all flex flex-col items-center text-center overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all" />
            <span className="text-4xl mb-3 drop-shadow">👥</span>
            <span className="text-lg font-black text-white">Pass & Play</span>
            <span className="text-xs text-slate-400 font-normal mt-1.5 leading-normal">
              Party mode for 2 to 6 players on a shared screen or tablet.
            </span>
            <span className="mt-4 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold border border-purple-500/30">
              Local Party →
            </span>
          </Link>
        </div>

        {/* Join Room Code Input */}
        <div className="w-full max-w-md p-3.5 bg-slate-900/80 border border-slate-700/60 rounded-2xl flex items-center gap-2 mb-12 shadow-2xl backdrop-blur-xl">
          <input
            type="text"
            placeholder="Room Code (e.g. AB7KQ2)"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono tracking-widest text-center text-white focus:outline-none focus:border-emerald-500 uppercase"
          />
          <Link
            href={roomCodeInput.length === 6 ? `/play?room=${roomCodeInput}` : '#'}
            onClick={(e) => {
              if (roomCodeInput.length !== 6) e.preventDefault();
              else sound.playButtonClick();
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all ${
              roomCodeInput.length === 6
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            Join
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full max-w-4xl text-left">
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <span className="text-emerald-400 font-black text-sm block mb-1">🛡️ Anti-Cheat Authority</span>
            <p className="text-xs text-slate-400">Server calculates rolls, token movement, and validation.</p>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <span className="text-cyan-400 font-black text-sm block mb-1">✨ Adventure Tiles</span>
            <p className="text-xs text-slate-400">Boost, Shield, Trap, Double Dice, and 50/50 Risk tiles.</p>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <span className="text-purple-400 font-black text-sm block mb-1">⚡ Reconnect Grace</span>
            <p className="text-xs text-slate-400">30-second disconnect buffer with seamless AI bot takeover.</p>
          </div>
          <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-sm">
            <span className="text-amber-400 font-black text-sm block mb-1">📼 Interactive Replay</span>
            <p className="text-xs text-slate-400">Review every turn, snake slide, and ladder climb in HD.</p>
          </div>
        </div>
      </section>

      {/* Rules Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>📖</span> Rules & How to Play
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-300 max-h-96 overflow-y-auto pr-1">
              <div>
                <strong className="text-emerald-400 block mb-0.5">Objective:</strong>
                Be the first player to travel from square 1 to square 100!
              </div>

              <div>
                <strong className="text-emerald-400 block mb-0.5">Movement & Sixes:</strong>
                Take turns rolling a 6-sided die. Rolling a 6 grants an immediate extra roll! Rolling three consecutive 6s triggers a penalty, canceling the roll and ending your turn.
              </div>

              <div>
                <strong className="text-amber-400 block mb-0.5">Ladders & Snakes:</strong>
                Landing on a ladder base immediately climbs you to the top! Landing on a snake head slides you backward down to its tail.
              </div>

              <div>
                <strong className="text-cyan-400 block mb-0.5">Adventure Mode Power-ups:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong className="text-slate-200">🚀 Boost Tile:</strong> Rocket forward +3 squares!</li>
                  <li><strong className="text-slate-200">🛡️ Shield Tile:</strong> Protects against the next snake bite.</li>
                  <li><strong className="text-slate-200">🕳️ Trap Tile:</strong> Knocks you back 3 squares.</li>
                  <li><strong className="text-slate-200">⚖️ Risk Tile:</strong> 50% chance to jump +8 tiles or drop -4 tiles.</li>
                  <li><strong className="text-slate-200">🔄 Swap Tile:</strong> Trade places with your closest rival ahead!</li>
                </ul>
              </div>

              <div>
                <strong className="text-purple-400 block mb-0.5">Exact Finish Rule:</strong>
                You must land precisely on square 100. If your roll overshoots, your token bounces backward by the extra steps!
              </div>
            </div>

            <button
              onClick={() => setShowHowToPlay(false)}
              className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg"
            >
              Let's Play!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
