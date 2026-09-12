'use client';

import React, { useState } from 'react';
import { sound } from '../lib/sound';

interface LudoDiceProps {
  value: number | null;
  isRolling: boolean;
  isMyTurn: boolean;
  canRoll: boolean;
  timeRemaining: number;
  maxTime?: number;
  activeColorHex?: string;
  onRoll: () => void;
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  isRolling,
  isMyTurn,
  canRoll,
  timeRemaining,
  maxTime = 30,
  activeColorHex = '#3B82F6',
  onRoll
}) => {
  const [localShake, setLocalShake] = useState(false);

  const handleClick = () => {
    if (!canRoll || isRolling) return;
    setLocalShake(true);
    sound.playDiceRoll();
    setTimeout(() => setLocalShake(false), 500);
    onRoll();
  };

  // Render dice pips based on number (1 to 6)
  const renderPips = (num: number) => {
    switch (num) {
      case 1:
        return <div className="w-3.5 h-3.5 bg-red-600 rounded-full shadow-inner" />;
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-1.5">
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full self-end" />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1.5">
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full self-center" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full self-end" />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 p-1.5 gap-2 place-items-center">
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="w-2.5 h-2.5 bg-slate-800 rounded-full" />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full relative p-1.5">
            <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 bg-slate-800 rounded-full" />
            <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 bg-slate-800 rounded-full" />
          </div>
        );
      case 6:
        return (
          <div className="w-full h-full grid grid-cols-2 p-1.5 gap-1 place-items-center">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
          </div>
        );
      default:
        return <span className="text-xl font-black text-slate-400">?</span>;
    }
  };

  const timerPercent = Math.max(0, Math.min(100, (timeRemaining / maxTime) * 100));
  const isUrgent = timeRemaining <= 7;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Turn Timer Circular Progress */}
      <div className="relative flex items-center justify-center">
        <svg className="w-24 h-24 -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="42"
            stroke="currentColor"
            strokeWidth="5"
            fill="transparent"
            className="text-slate-700/40"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            stroke={isUrgent ? '#ef4444' : activeColorHex}
            strokeWidth="5"
            fill="transparent"
            strokeDasharray="264"
            strokeDashoffset={264 - (264 * timerPercent) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* 3D Tactile Dice Button */}
        <button
          type="button"
          onClick={handleClick}
          disabled={!canRoll || isRolling}
          aria-label={canRoll ? 'Roll dice' : 'Waiting for turn'}
          className={`absolute w-14 h-14 rounded-2xl bg-gradient-to-b from-white to-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.35),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_5px_rgba(0,0,0,0.15)] flex items-center justify-center border border-slate-200/80 transition-all ${
            canRoll ? 'cursor-pointer hover:scale-105 active:scale-95 ring-4 ring-white/30' : 'cursor-not-allowed opacity-90'
          } ${localShake || isRolling ? 'animate-bounce' : ''}`}
        >
          {renderPips(value || 1)}
        </button>
      </div>

      {/* Action / Status Prompt */}
      <div className="text-center">
        {canRoll ? (
          <button
            onClick={handleClick}
            className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
          >
            🎲 Tap to Roll
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-400">
            {isMyTurn ? 'Select a token to move' : 'Waiting for opponent...'}
          </span>
        )}
        <div className={`text-[11px] font-mono mt-1 ${isUrgent ? 'text-rose-400 font-bold animate-pulse' : 'text-slate-400'}`}>
          {timeRemaining}s remaining
        </div>
      </div>
    </div>
  );
};
