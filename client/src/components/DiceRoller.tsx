'use client';

import React, { useState } from 'react';
import { sound } from '../lib/sound';

interface DiceRollerProps {
  onRoll: () => void;
  canRoll: boolean;
  isRolling: boolean;
  lastRoll: number | null;
  lastRolls?: number[];
  secondsRemaining: number;
  totalTurnSeconds: number;
  isMyTurn: boolean;
  activePlayerName: string;
  activePlayerColor: string;
  isDoubleDice?: boolean;
}

const DICE_PIPS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]]
};

export const DiceRoller: React.FC<DiceRollerProps> = ({
  onRoll,
  canRoll,
  isRolling,
  lastRoll,
  lastRolls = [],
  secondsRemaining,
  totalTurnSeconds,
  isMyTurn,
  activePlayerName,
  activePlayerColor,
  isDoubleDice = false
}) => {
  const [animating, setAnimating] = useState(false);

  const handleRollClick = () => {
    if (!canRoll || isRolling || animating) return;
    setAnimating(true);
    sound.playDiceRoll();
    onRoll();
    setTimeout(() => setAnimating(false), 850);
  };

  const timerProgress = Math.max(0, Math.min(100, (secondsRemaining / (totalTurnSeconds || 30)) * 100));

  const renderSingleDie = (val: number | null, index: number) => {
    const value = val || 1;
    const pips = DICE_PIPS[value] || DICE_PIPS[1];

    return (
      <div
        key={`dice-${index}`}
        className={`w-16 h-16 rounded-2xl relative shadow-[0_15px_30px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9)] border-2 border-slate-200/80 flex items-center justify-center transition-all ${
          animating || isRolling
            ? 'dice-rolling scale-110 shadow-emerald-500/40'
            : 'hover:scale-105 hover:-rotate-3'
        }`}
        style={{
          background: 'linear-gradient(145deg, #ffffff, #e2e8f0)'
        }}
      >
        <svg className="w-full h-full p-2.5 drop-shadow-[inset_0_2px_3px_rgba(0,0,0,0.4)]" viewBox="0 0 100 100">
          {pips.map(([cx, cy], pIdx) => (
            <circle
              key={`pip-${pIdx}`}
              cx={cx}
              cy={cy}
              r="8"
              fill={value === 6 ? '#EF4444' : '#0f172a'}
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-5 bg-slate-900/85 rounded-3xl border border-slate-700/60 shadow-2xl backdrop-blur-xl max-w-sm w-full mx-auto relative overflow-hidden">
      {/* Background ambient accent */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: activePlayerColor }}
      />

      {/* Active Player Status Header */}
      <div className="w-full flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-4 h-4 rounded-full shadow-lg ring-2 ring-white/70 animate-pulse"
            style={{ backgroundColor: activePlayerColor }}
          />
          <span className="text-sm font-black text-white truncate max-w-[130px] tracking-tight">
            {activePlayerName}
          </span>
          {isMyTurn && (
            <span className="px-2.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold rounded-full border border-emerald-500/40 shadow-sm animate-bounce-short">
              YOUR TURN
            </span>
          )}
        </div>

        {/* Circular Countdown badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/70 rounded-xl border border-slate-800 shadow-inner">
          <span className="text-[11px] text-slate-400 font-semibold">Time:</span>
          <span className={`text-xs font-mono font-bold ${secondsRemaining <= 5 ? 'text-rose-400 animate-ping' : 'text-amber-400'}`}>
            {secondsRemaining}s
          </span>
        </div>
      </div>

      {/* Linear Turn Progress Bar */}
      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mb-4 p-[1px] border border-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            secondsRemaining <= 5
              ? 'bg-gradient-to-r from-rose-500 to-red-600'
              : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400'
          }`}
          style={{ width: `${timerProgress}%` }}
        />
      </div>

      {/* 3D Dice Showcase */}
      <div className="flex items-center justify-center gap-4 my-3">
        {lastRolls.length > 1 ? (
          lastRolls.map((r, i) => renderSingleDie(r, i))
        ) : (
          renderSingleDie(lastRoll, 0)
        )}
      </div>

      {/* Roll summary tag */}
      {lastRoll !== null && (
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 mb-4 px-3 py-1 bg-slate-950/60 rounded-full border border-slate-800">
          <span>Result:</span>
          <span className="text-white font-extrabold text-sm">{lastRoll}</span>
          {lastRoll === 6 && <span className="text-amber-400 font-bold ml-1">🔥 Extra Roll!</span>}
          {isDoubleDice && <span className="text-purple-400 font-bold ml-1">🎲 2x Dice</span>}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleRollClick}
        disabled={!canRoll || isRolling || animating}
        className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 relative overflow-hidden ${
          canRoll && !isRolling && !animating
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 cursor-pointer ring-2 ring-white/20'
            : 'bg-slate-800/80 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-80'
        }`}
      >
        <span className="text-lg">🎲</span>
        <span>
          {animating || isRolling
            ? 'Rolling Dice...'
            : isMyTurn
            ? 'Roll the Dice'
            : `Waiting for ${activePlayerName}`}
        </span>
      </button>
    </div>
  );
};
