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
    setTimeout(() => setAnimating(false), 900);
  };

  const timerProgress = Math.max(0, Math.min(100, (secondsRemaining / (totalTurnSeconds || 30)) * 100));

  const renderSingleDie = (val: number | null, index: number) => {
    const value = val || 1;
    const pips = DICE_PIPS[value] || DICE_PIPS[1];

    return (
      <div
        key={`dice-${index}`}
        className={`w-14 h-14 bg-gradient-to-br from-white to-slate-100 rounded-2xl shadow-xl border border-slate-300 relative flex items-center justify-center transition-transform ${
          animating || isRolling ? 'dice-rolling' : 'hover:scale-105'
        }`}
      >
        <svg className="w-full h-full p-2" viewBox="0 0 100 100">
          {pips.map(([cx, cy], pIdx) => (
            <circle
              key={`pip-${pIdx}`}
              cx={cx}
              cy={cy}
              r="8"
              fill="#0f172a"
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-sm max-w-sm w-full mx-auto">
      {/* Active Player Info & Turn Timer Header */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full ring-2 ring-white/50"
            style={{ backgroundColor: activePlayerColor }}
          />
          <span className="text-sm font-semibold text-slate-200 truncate max-w-[130px]">
            {activePlayerName}
          </span>
          {isMyTurn && (
            <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold rounded-full border border-emerald-500/30">
              YOU
            </span>
          )}
        </div>

        {/* Circular radial or numeric timer badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400 font-medium">Timer:</span>
          <span className={`text-xs font-bold font-mono ${secondsRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
            {secondsRemaining}s
          </span>
        </div>
      </div>

      {/* Progress Bar for Timer */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-300 ${
            secondsRemaining <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${timerProgress}%` }}
        />
      </div>

      {/* Dice Visual Showcase */}
      <div className="flex items-center justify-center gap-3 my-2">
        {lastRolls.length > 1 ? (
          lastRolls.map((r, i) => renderSingleDie(r, i))
        ) : (
          renderSingleDie(lastRoll, 0)
        )}
      </div>

      {/* Total Score display if rolled */}
      {lastRoll !== null && (
        <div className="text-xs font-medium text-slate-400 mt-1 mb-3">
          Rolled: <span className="text-white font-bold text-sm">{lastRoll}</span>
          {isDoubleDice && <span className="ml-1 text-purple-400 font-semibold">(Double Dice!)</span>}
        </div>
      )}

      {/* Roll Action Button */}
      <button
        onClick={handleRollClick}
        disabled={!canRoll || isRolling || animating}
        className={`w-full py-3 px-6 rounded-xl font-bold text-sm tracking-wide uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${
          canRoll && !isRolling && !animating
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 active:scale-95 cursor-pointer'
            : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
        }`}
      >
        <span>🎲</span>
        <span>{animating || isRolling ? 'Rolling...' : isMyTurn ? 'Roll Dice' : `Waiting for ${activePlayerName}`}</span>
      </button>
    </div>
  );
};
