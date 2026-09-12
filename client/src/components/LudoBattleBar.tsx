'use client';

import React from 'react';
import { LudoPowerUpType, LudoPlayer } from '@snakes/shared';
import { sound } from '../lib/sound';

interface LudoBattleBarProps {
  player?: LudoPlayer;
  isMyTurn: boolean;
  isBattleMode: boolean;
  onUsePowerUp: (type: LudoPowerUpType) => void;
  onSendReaction: (emoji: string) => void;
}

export const LudoBattleBar: React.FC<LudoBattleBarProps> = ({
  player,
  isMyTurn,
  isBattleMode,
  onUsePowerUp,
  onSendReaction
}) => {
  const reactions = ['😂', '😱', '🔥', '🏆', '😭', '😈', '👏', '🎉'];

  const powerUpIcons: Record<LudoPowerUpType, { label: string; icon: string; desc: string }> = {
    SHIELD: { label: 'Shield', icon: '🛡️', desc: 'Protect token from 1 capture' },
    REROLL: { label: 'Reroll', icon: '🎲', desc: 'Roll dice again' },
    DASH: { label: 'Dash', icon: '⚡', desc: '+2 movement surge' },
    SABOTAGE: { label: 'Sabotage', icon: '💣', desc: 'Trap an opponent' },
    RECOVERY: { label: 'Recovery', icon: '🔄', desc: 'Revive token from yard' }
  };

  const handlePowerUpClick = (type: LudoPowerUpType) => {
    sound.playPowerUp();
    onUsePowerUp(type);
  };

  return (
    <div className="w-full max-w-[620px] mx-auto flex flex-col gap-2.5">
      {/* Battle Power-Up Tray (only if in Battle Mode) */}
      {isBattleMode && player && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/80 backdrop-blur border border-purple-500/30 shadow-lg">
          <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡ Power-Ups</span>
          </div>

          <div className="flex items-center gap-2">
            {player.powerUps.map(pu => {
              const info = powerUpIcons[pu.type];
              if (!info) return null;
              const hasCharges = pu.count > 0;

              return (
                <button
                  key={pu.type}
                  type="button"
                  onClick={() => handlePowerUpClick(pu.type)}
                  disabled={!hasCharges || !isMyTurn}
                  title={`${info.desc} (${pu.count} left)`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    hasCharges && isMyTurn
                      ? 'bg-purple-600/80 hover:bg-purple-500 text-white shadow-md shadow-purple-500/30 active:scale-95 cursor-pointer'
                      : 'bg-slate-800/60 text-slate-500 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className="text-base">{info.icon}</span>
                  <span>{pu.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Reaction Bar */}
      <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-slate-900/60 backdrop-blur border border-slate-800">
        <span className="text-[11px] font-medium text-slate-400 mr-1 hidden sm:inline">React:</span>
        {reactions.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            className="w-8 h-8 rounded-lg hover:bg-slate-800 flex items-center justify-center text-lg transition-transform hover:scale-125 active:scale-95 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
