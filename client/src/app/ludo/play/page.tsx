'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  LudoGameState,
  LudoLegalMove,
  LudoPowerUpType,
  LUDO_COLOR_HEX,
  LudoSettingsSchema
} from '@snakes/shared';
import { LudoRuleEngine, LudoAIEngine } from '@snakes/ludo-engine';
import { LudoBoard } from '../../../components/LudoBoard';
import { LudoDice } from '../../../components/LudoDice';
import { LudoBattleBar } from '../../../components/LudoBattleBar';
import { LudoLobby } from '../../../components/LudoLobby';
import { sound } from '../../../lib/sound';

function LudoPlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const roomCodeParam = searchParams.get('room');
  const modeParam = searchParams.get('mode') || 'classic';
  const isSinglePlayer = searchParams.get('single') === 'true';

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [roomState, setRoomState] = useState<any>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; name: string }[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  // Offline single-player local engine fallback
  const localEngineRef = useRef<LudoRuleEngine | null>(null);
  const localAIRef = useRef<LudoAIEngine | null>(null);

  // Initialize profile from localStorage
  const [localProfile, setLocalProfile] = useState({
    name: 'Player',
    avatar: '🦁',
    color: 'red'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('snakes_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setLocalProfile(parsed);
        } catch {}
      }
    }
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    if (isSinglePlayer) {
      // Setup local single-player offline match
      const pCount = parseInt(searchParams.get('players') || '4', 10);
      const settings = LudoSettingsSchema.parse({
        boardType: pCount > 4 ? 'mega-10' : 'classic-4',
        playerCount: pCount,
        mode: modeParam as any
      });

      const colors = ['red', 'green', 'yellow', 'blue', 'purple', 'orange', 'cyan', 'pink', 'lime', 'amber'].slice(0, pCount);
      const engine = new LudoRuleEngine(settings, colors as any);
      localEngineRef.current = engine;
      localAIRef.current = new LudoAIEngine(engine);

      const humanId = 'human-1';
      setMyPlayerId(humanId);

      const players = [
        { id: humanId, name: localProfile.name || 'You', avatar: localProfile.avatar || '🦁', color: colors[0] as any, isHost: true, isAI: false },
        ...colors.slice(1).map((c, i) => ({
          id: `bot-${i}`,
          name: `Bot ${i + 1}`,
          avatar: ['🤖', '🦊', '🐼', '🐯', '🧙‍♂️', '🥷', '👾', '👑', '🐉'][i % 9],
          color: c as any,
          isHost: false,
          isAI: true,
          aiDifficulty: 'hard' as const,
          aiPersonality: ['strategist', 'aggressor', 'runner', 'defender', 'master'][i % 5] as any
        }))
      ];

      const initialState = engine.createInitialState('local-game', 'LOCAL', players);
      setRoomState({
        code: 'LOCAL',
        status: 'playing',
        settings,
        initialPlayers: players,
        gameState: initialState,
        turnTimeRemaining: 30
      });

      return;
    }

    // Online Multiplayer WebSocket Connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = process.env.NEXT_PUBLIC_SERVER_URL || `${protocol}//${window.location.hostname}:4000`;
    const socket = new WebSocket(host);

    socket.onopen = () => {
      if (roomCodeParam) {
        // Join existing room
        socket.send(JSON.stringify({
          type: 'LUDO_ROOM_JOIN',
          timestamp: Date.now(),
          payload: {
            roomCode: roomCodeParam,
            playerName: localProfile.name || 'Player',
            avatar: localProfile.avatar || '🦁',
            preferredColor: localProfile.color as any
          }
        }));
      } else {
        // Create new room
        socket.send(JSON.stringify({
          type: 'LUDO_ROOM_CREATE',
          timestamp: Date.now(),
          payload: {
            playerName: localProfile.name || 'Player',
            avatar: localProfile.avatar || '🎲',
            color: localProfile.color as any,
            settings: {
              mode: modeParam as any
            }
          }
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'LUDO_SESSION_INIT') {
          setMyPlayerId(msg.payload.playerId);
        } else if (msg.type === 'LUDO_ROOM_STATE') {
          setRoomState(msg.payload);
        } else if (msg.type === 'LUDO_REACTION') {
          const reaction = {
            id: `rx_${Date.now()}_${Math.random()}`,
            emoji: msg.payload.emoji,
            name: msg.payload.playerName
          };
          setFloatingReactions(prev => [...prev.slice(-6), reaction]);
          setTimeout(() => {
            setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
          }, 2500);
        }
      } catch {}
    };

    setWs(socket);
    return () => socket.close();
  }, [roomCodeParam, isSinglePlayer]);

  // Handle dice roll
  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    if (isSinglePlayer && roomState?.gameState && localEngineRef.current) {
      setTimeout(() => {
        const s = JSON.parse(JSON.stringify(roomState.gameState)) as LudoGameState;
        const roll = Math.floor(Math.random() * 6) + 1;
        s.diceState.value = roll;
        s.diceState.rollsThisTurn.push(roll);
        const legal = localEngineRef.current!.getLegalMoves(s, myPlayerId, roll);
        s.legalMoves = legal;
        if (legal.length === 0) {
          localEngineRef.current!.nextTurn(s, roll === 6);
        } else {
          s.phase = 'WAITING_FOR_TOKEN_SELECTION';
        }
        setRoomState((prev: any) => ({ ...prev, gameState: s }));
        setIsRolling(false);
      }, 400);
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'LUDO_ROLL_DICE',
        timestamp: Date.now(),
        payload: { requestId: `roll_${Date.now()}` }
      }));
      setTimeout(() => setIsRolling(false), 500);
    }
  };

  // Handle token movement selection
  const handleSelectToken = (tokenId: string) => {
    if (isSinglePlayer && roomState?.gameState && localEngineRef.current) {
      const s = JSON.parse(JSON.stringify(roomState.gameState)) as LudoGameState;
      const dice = s.diceState.value || 6;
      try {
        const { extraTurnGranted } = localEngineRef.current.applyMove(s, myPlayerId, tokenId, dice);
        localEngineRef.current.nextTurn(s, extraTurnGranted);
        setRoomState((prev: any) => ({ ...prev, gameState: s }));
        triggerLocalAI(s);
      } catch {}
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'LUDO_SELECT_TOKEN',
        timestamp: Date.now(),
        payload: {
          tokenId,
          requestId: `sel_${Date.now()}`
        }
      }));
    }
  };

  // Local AI trigger for offline mode
  const triggerLocalAI = (state: LudoGameState) => {
    if (!localEngineRef.current || !localAIRef.current || state.status !== 'playing') return;
    const activeP = state.players[state.activePlayerIndex];
    if (!activeP.isAI) return;

    setTimeout(() => {
      const s = JSON.parse(JSON.stringify(state)) as LudoGameState;
      const roll = Math.floor(Math.random() * 6) + 1;
      s.diceState.value = roll;
      const legal = localEngineRef.current!.getLegalMoves(s, activeP.id, roll);
      if (legal.length > 0) {
        const chosen = localAIRef.current!.selectMove(s, activeP, legal);
        if (chosen) {
          const { extraTurnGranted } = localEngineRef.current!.applyMove(s, activeP.id, chosen.tokenId, roll);
          localEngineRef.current!.nextTurn(s, extraTurnGranted);
          setRoomState((prev: any) => ({ ...prev, gameState: s }));
          triggerLocalAI(s);
          return;
        }
      }
      localEngineRef.current!.nextTurn(s, roll === 6);
      setRoomState((prev: any) => ({ ...prev, gameState: s }));
      triggerLocalAI(s);
    }, 700);
  };

  // Host starts game
  const handleStartGame = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'LUDO_GAME_START',
        timestamp: Date.now(),
        payload: {}
      }));
    }
  };

  // Host adds bot
  const handleAddBot = (personality: any, difficulty: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'LUDO_ADD_AI_BOT',
        timestamp: Date.now(),
        payload: { personality, difficulty }
      }));
    }
  };

  // Use Battle power up
  const handleUsePowerUp = (powerUp: LudoPowerUpType) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'LUDO_USE_POWERUP',
        timestamp: Date.now(),
        payload: { requestId: `pu_${Date.now()}`, powerUp }
      }));
    }
  };

  // Send quick reaction
  const handleSendReaction = (emoji: string) => {
    sound.playButtonClick();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'LUDO_SEND_REACTION',
        timestamp: Date.now(),
        payload: { emoji }
      }));
    }
  };

  // Trigger celebration confetti on finish
  useEffect(() => {
    if (roomState?.gameState?.status === 'finished') {
      sound.playVictory();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }
  }, [roomState?.gameState?.status]);

  if (!roomState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="text-4xl animate-bounce mb-3">🎲</div>
        <div className="text-sm font-bold text-slate-400">Connecting to Ludora Arena...</div>
      </div>
    );
  }

  // Waiting in pre-match lobby
  if (roomState.status === 'waiting') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
        <LudoLobby
          roomCode={roomState.code}
          isHost={roomState.hostId === myPlayerId}
          myPlayerId={myPlayerId}
          players={roomState.initialPlayers || []}
          settings={roomState.settings}
          onAddBot={handleAddBot}
          onStartGame={handleStartGame}
        />
      </div>
    );
  }

  const gameState: LudoGameState = roomState.gameState;
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer?.id === myPlayerId;
  const canRoll = isMyTurn && gameState.phase === 'WAITING_FOR_ROLL';
  const activeColorHex = activePlayer ? LUDO_COLOR_HEX[activePlayer.color].main : '#3b82f6';
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-2 sm:p-4 relative overflow-hidden">
      {/* Floating Reactions Overlay */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 shadow-xl animate-bounce backdrop-blur"
          >
            <span className="text-2xl">{r.emoji}</span>
            <span className="text-xs font-bold text-slate-300">{r.name}</span>
          </div>
        ))}
      </div>

      {/* Top Match Bar */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 backdrop-blur border border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/ludo')}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
          >
            ← Exit
          </button>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {roomState.code === 'LOCAL' ? 'Single Player' : `Room: ${roomState.code}`}
            </div>
            <div className="text-xs font-black text-white">Turn #{gameState.currentTurnNumber}</div>
          </div>
        </div>

        {/* Current Turn Badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-lg"
          style={{
            borderColor: activeColorHex,
            backgroundColor: `${activeColorHex}15`
          }}
        >
          <span className="text-lg">{activePlayer?.avatar || '🎲'}</span>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Turn</div>
            <div className="text-xs font-black" style={{ color: activeColorHex }}>
              {isMyTurn ? '🌟 Your Turn!' : `${activePlayer?.name}'s Turn`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Board Arena */}
      <div className="w-full my-auto flex flex-col items-center justify-center py-2">
        <LudoBoard
          gameState={gameState}
          legalMoves={gameState.legalMoves}
          myPlayerId={myPlayerId}
          onSelectToken={handleSelectToken}
        />
      </div>

      {/* Bottom Controls */}
      <div className="w-full max-w-2xl mx-auto flex flex-col gap-3 pb-2">
        {/* Dice & Turn Timer */}
        <LudoDice
          value={gameState.diceState.value}
          isRolling={isRolling}
          isMyTurn={isMyTurn}
          canRoll={canRoll}
          timeRemaining={roomState.turnTimeRemaining || 30}
          activeColorHex={activeColorHex}
          onRoll={handleRollDice}
        />

        {/* Battle & Reaction Bar */}
        <LudoBattleBar
          player={myPlayer}
          isMyTurn={isMyTurn}
          isBattleMode={gameState.settings.mode === 'battle'}
          onUsePowerUp={handleUsePowerUp}
          onSendReaction={handleSendReaction}
        />
      </div>

      {/* Victory Celebration Modal */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl text-center flex flex-col gap-4">
            <div className="text-5xl">🏆</div>
            <h2 className="text-2xl font-black text-amber-400">Match Completed!</h2>

            <div className="flex flex-col gap-2 my-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Final Standings</div>
              {gameState.winnersOrder.map((pid, rank) => {
                const p = gameState.players.find(pl => pl.id === pid);
                return (
                  <div
                    key={pid}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-amber-400">#{rank + 1}</span>
                      <span className="text-xl">{p?.avatar}</span>
                      <span className="font-bold text-sm text-white">{p?.name}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{p?.stats.captures} Captures</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => router.push('/ludo')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LudoPlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="text-3xl animate-bounce mb-2">🎲</div>
        <div className="text-xs text-slate-400 font-bold">Loading match...</div>
      </div>
    }>
      <LudoPlayContent />
    </Suspense>
  );
}
