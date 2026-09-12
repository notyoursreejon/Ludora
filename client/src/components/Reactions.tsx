'use client';

import React, { useState } from 'react';
import { QUICK_REACTIONS } from '@snakes/shared';

interface ReactionsProps {
  onSendReaction: (emoji: string) => void;
  activeReactions?: { id: string; emoji: string; playerName: string; color: string }[];
}

export const Reactions: React.FC<ReactionsProps> = ({
  onSendReaction,
  activeReactions = []
}) => {
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const handleClick = (emoji: string) => {
    setLastClicked(emoji);
    onSendReaction(emoji);
    setTimeout(() => setLastClicked(null), 300);
  };

  return (
    <div className="relative">
      {/* Floating Animated Reaction Particles */}
      <div className="fixed bottom-24 right-8 pointer-events-none flex flex-col-reverse gap-2 z-50">
        {activeReactions.map(r => (
          <div
            key={r.id}
            className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-full shadow-2xl animate-float backdrop-blur-md"
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
            <span className="text-xs text-slate-300 font-medium">{r.playerName}:</span>
            <span className="text-xl animate-bounce">{r.emoji}</span>
          </div>
        ))}
      </div>

      {/* Quick Reaction Bar */}
      <div className="flex items-center justify-center gap-1.5 p-2 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-lg backdrop-blur-sm overflow-x-auto max-w-full">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            className={`w-9 h-9 flex items-center justify-center text-lg rounded-xl hover:bg-slate-800 active:scale-125 transition-transform ${
              lastClicked === emoji ? 'scale-125 bg-slate-700' : ''
            }`}
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
