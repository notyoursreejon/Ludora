'use client';

import React, { useState } from 'react';
import { EMOJI_AVATARS, PLAYER_COLORS } from '@snakes/shared';

interface ProfileCustomizerModalProps {
  isOpen: boolean;
  currentName: string;
  currentAvatar: string;
  currentColor: string;
  onSave: (profile: { name: string; avatar: string; color: string }) => void;
  onClose: () => void;
}

export const ProfileCustomizerModal: React.FC<ProfileCustomizerModalProps> = ({
  isOpen,
  currentName,
  currentAvatar,
  currentColor,
  onSave,
  onClose
}) => {
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar || EMOJI_AVATARS[0]);
  const [color, setColor] = useState(currentColor || PLAYER_COLORS[0]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = name.trim() || 'Player';
    onSave({ name: trimmed, avatar, color });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-3xl p-6 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h3 className="text-lg font-black text-white">Customize Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>

        {/* Live Token Preview */}
        <div className="my-5 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Token Preview
          </span>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-xl ring-4 ring-white/40 transition-transform hover:scale-110"
            style={{
              background: `radial-gradient(circle at 30% 30%, #fff, ${color} 65%, #000 100%)`
            }}
          >
            <span className="drop-shadow-md">{avatar}</span>
          </div>
          <span className="text-sm font-bold text-white mt-2">
            {name.trim() || 'Player'}
          </span>
        </div>

        {/* Name Input */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-400 block mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={18}
            placeholder="Enter your name"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Color Palette Selector */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-400 block mb-1.5">
            Player Color
          </label>
          <div className="flex flex-wrap gap-2.5">
            {PLAYER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full shadow-md transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Emoji Avatar Selector */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-400 block mb-1.5">
            Choose Emoji Avatar ({EMOJI_AVATARS.length} available)
          </label>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-44 overflow-y-auto p-2 bg-slate-950/70 rounded-xl border border-slate-800">
            {EMOJI_AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setAvatar(emoji)}
                className={`w-9 h-9 flex items-center justify-center text-xl rounded-xl transition-all ${
                  avatar === emoji
                    ? 'bg-emerald-500/25 border-2 border-emerald-400 scale-110 shadow'
                    : 'hover:bg-slate-800 border border-transparent'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/25"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
