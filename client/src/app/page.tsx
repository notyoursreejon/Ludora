'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sound } from '@/lib/sound';

export default function HomePage() {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500">
      {/* Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🐍</span>
            <span className="font-black text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              SNAKES & LADDERS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => sound.toggleSound()}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              title="Toggle Audio"
            >
              🔊 Audio
            </button>
            <button
              onClick={() => setShowHowToPlay(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              How to Play
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-12 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <span>✨</span> Modern Real-Time Multiplayer • 2 to 10 Players
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
          Classic Board Game, <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Reimagined for Web.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-10">
          Climb glorious ladders, survive sneaky serpent slides, trigger crazy adventure tiles,
          or battle 5 distinct AI personalities. Easy to learn, thrilling to master.
        </p>

        {/* Primary Action Hub */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
          {/* Create Online Room */}
          <Link
            href="/play?mode=online&action=create"
            onClick={() => sound.playButtonClick()}
            className="group p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl text-slate-950 font-bold shadow-xl shadow-emerald-500/20 hover:scale-[1.03] transition-all flex flex-col items-center text-center"
          >
            <span className="text-3xl mb-2">🌐</span>
            <span className="text-base text-white font-black">Create Online Room</span>
            <span className="text-xs text-emerald-100/90 font-medium mt-1">
              Private 2-10 player room with shareable link
            </span>
          </Link>

          {/* Single Player vs AI */}
          <Link
            href="/play?mode=ai"
            onClick={() => sound.playButtonClick()}
            className="group p-5 bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-3xl text-white font-bold shadow-xl hover:scale-[1.03] transition-all flex flex-col items-center text-center"
          >
            <span className="text-3xl mb-2">🤖</span>
            <span className="text-base font-black">Play vs AI</span>
            <span className="text-xs text-slate-400 font-medium mt-1">
              Test strategies against Casual to Master AI bots
            </span>
          </Link>

          {/* Local Pass & Play */}
          <Link
            href="/play?mode=local"
            onClick={() => sound.playButtonClick()}
            className="group p-5 bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 rounded-3xl text-white font-bold shadow-xl hover:scale-[1.03] transition-all flex flex-col items-center text-center"
          >
            <span className="text-3xl mb-2">👥</span>
            <span className="text-base font-black">Pass & Play</span>
            <span className="text-xs text-slate-400 font-medium mt-1">
              Same device local party mode for 2 to 6 players
            </span>
          </Link>
        </div>

        {/* Join Room Code Widget */}
        <div className="w-full max-w-md p-4 bg-slate-900/70 border border-slate-800 rounded-2xl flex items-center gap-2 mb-12">
          <input
            type="text"
            placeholder="Enter 6-char Room Code (e.g. AB7KQ2)"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono tracking-widest text-center text-white focus:outline-none focus:border-emerald-500"
          />
          <Link
            href={roomCodeInput.length === 6 ? `/play?room=${roomCodeInput}` : '#'}
            onClick={(e) => {
              if (roomCodeInput.length !== 6) e.preventDefault();
              else sound.playButtonClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              roomCodeInput.length === 6
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-md'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            Join Room
          </Link>
        </div>

        {/* Highlight Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl text-left">
          <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <span className="text-emerald-400 font-black text-sm">✓ 100% Authoritative</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Server generates rolls & validates all movements.</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <span className="text-cyan-400 font-black text-sm">✓ Adventure Mode</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Shield, Trap, Boost, Swap & Risk tiles.</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <span className="text-purple-400 font-black text-sm">✓ Reconnection Shield</span>
            <p className="text-[11px] text-slate-400 mt-0.5">30s grace window with AI bot fallback.</p>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <span className="text-amber-400 font-black text-sm">✓ Instant Replay</span>
            <p className="text-[11px] text-slate-400 mt-0.5">Scrub through every match event frame-by-frame.</p>
          </div>
        </div>
      </section>

      {/* How to Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📖</span> Rules & How to Play
              </h3>
              <button
                onClick={() => setShowHowToPlay(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 max-h-80 overflow-y-auto pr-1">
              <div>
                <strong className="text-emerald-400 block mb-0.5">Objective:</strong>
                Be the first player to travel from square 1 to square 100!
              </div>

              <div>
                <strong className="text-emerald-400 block mb-0.5">Movement:</strong>
                Take turns rolling a 6-sided die. Rolling a 6 grants an immediate extra roll! But beware: rolling three consecutive 6s triggers a turn penalty.
              </div>

              <div>
                <strong className="text-amber-400 block mb-0.5">Ladders & Snakes:</strong>
                Landing exactly on the base of a ladder climbs you upward! Landing on a snake head slides you backward down to its tail.
              </div>

              <div>
                <strong className="text-cyan-400 block mb-0.5">Adventure Mode Power-ups:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li><strong className="text-slate-200">🚀 Boost Tile:</strong> Rocket forward +3 squares!</li>
                  <li><strong className="text-slate-200">🛡️ Shield Tile:</strong> Protects against the next snake bite.</li>
                  <li><strong className="text-slate-200">🕳️ Trap Tile:</strong> Knocks you back 3 squares.</li>
                  <li><strong className="text-slate-200">⚖️ Risk Tile:</strong> 50% chance to surge +8 tiles, 50% chance to drop -4 tiles.</li>
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
              className="mt-6 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
            >
              Got it, let's play!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
