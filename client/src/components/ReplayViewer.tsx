'use client';

import React, { useState, useEffect } from 'react';
import { GameEvent, GameStateDTO } from '@snakes/shared';
import { GameReplayEngine, ReplayFrame } from '@snakes/engine';
import { Board } from './Board';

interface ReplayViewerProps {
  initialSnapshot: GameStateDTO;
  events: GameEvent[];
  onClose: () => void;
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({
  initialSnapshot,
  events,
  onClose
}) => {
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1);

  useEffect(() => {
    const engine = new GameReplayEngine(initialSnapshot, events);
    const generated = engine.buildFrames();
    setFrames(generated);
    setCurrentFrameIndex(0);
  }, [initialSnapshot, events]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && frames.length > 0) {
      timer = setInterval(() => {
        setCurrentFrameIndex(prev => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playSpeed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playSpeed, frames.length]);

  const activeFrame = frames[currentFrameIndex];
  const currentState = activeFrame ? activeFrame.state : initialSnapshot;
  const currentEvent = activeFrame ? activeFrame.event : null;

  const formatEventText = (ev: GameEvent | null) => {
    if (!ev) return 'Match Start';
    switch (ev.type) {
      case 'ROLL_RESULT': {
        const p = currentState.players.find(pl => pl.id === ev.playerId);
        return `${p?.name || 'Player'} rolled a ${ev.totalRoll}!`;
      }
      case 'MOVE_STEP': {
        const p = currentState.players.find(pl => pl.id === ev.playerId);
        return `${p?.name || 'Player'} stepped to tile ${ev.to}${ev.bounced ? ' (bounced back!)' : ''}`;
      }
      case 'LADDER_TRIGGERED': {
        const p = currentState.players.find(pl => pl.id === ev.playerId);
        return `🪜 ${p?.name || 'Player'} climbed ladder from ${ev.ladderBase} to ${ev.ladderTop}!`;
      }
      case 'SNAKE_TRIGGERED': {
        const p = currentState.players.find(pl => pl.id === ev.playerId);
        return ev.absorbedByShield
          ? `🛡️ Shield absorbed snake bite for ${p?.name || 'Player'}!`
          : `🐍 ${p?.name || 'Player'} slid down snake from ${ev.snakeHead} to ${ev.snakeTail}!`;
      }
      case 'SPECIAL_TILE_TRIGGERED': {
        return `✨ Tile ${ev.tilePosition}: ${ev.details}`;
      }
      case 'GAME_FINISHED': {
        const p = currentState.players.find(pl => pl.id === ev.winnerId);
        return `🏆 ${p?.name || 'Player'} won the match!`;
      }
      default:
        return ev.type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-between p-4 overflow-y-auto">
      {/* Header bar */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">📼</span>
          <span className="font-bold text-slate-100 text-sm">Match Replay</span>
          <span className="text-xs text-slate-500">
            (Event {currentFrameIndex + 1} of {frames.length})
          </span>
        </div>

        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
        >
          Exit Replay ✕
        </button>
      </div>

      {/* Main Board view */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 w-full">
        <div className="max-w-[520px] w-full">
          <Board
            board={currentState.board}
            players={currentState.players}
            activePlayerId={currentState.currentPlayerId}
            theme={currentState.settings.theme}
          />
        </div>

        {/* Current Event Announcement banner */}
        <div className="mt-3 px-4 py-2 bg-slate-900/90 border border-slate-700 rounded-full text-xs font-medium text-amber-300 shadow-lg">
          {formatEventText(currentEvent)}
        </div>
      </div>

      {/* Scrubbing & Playback Controls */}
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        {/* Timeline Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, frames.length - 1)}
          value={currentFrameIndex}
          onChange={(e) => {
            setIsPlaying(false);
            setCurrentFrameIndex(Number(e.target.value));
          }}
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mb-3"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex(prev => Math.max(0, prev - 1));
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              title="Step Back"
            >
              ⏮️
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow"
            >
              {isPlaying ? '⏸️ Pause' : '▶️ Play'}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex(prev => Math.min(frames.length - 1, prev + 1));
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
              title="Step Forward"
            >
              ⏭️
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Speed:</span>
            {[1, 2, 4].map(s => (
              <button
                key={s}
                onClick={() => setPlaySpeed(s)}
                className={`px-2 py-1 rounded-lg font-mono ${
                  playSpeed === s ? 'bg-slate-700 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
