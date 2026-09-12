'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  GameStateDTO,
  PlayerDTO,
  RoomDTO,
  GameEvent,
  WsEnvelope,
  GameSettings,
  AIPersonality,
  PLAYER_COLORS,
  AVATARS
} from '@snakes/shared';
import { createBoard, executeTurn, decideAIAction } from '@snakes/engine';
import { Board } from '@/components/Board';
import { DiceRoller } from '@/components/DiceRoller';
import { Lobby } from '@/components/Lobby';
import { Reactions } from '@/components/Reactions';
import { ResultsModal } from '@/components/ResultsModal';
import { ReplayViewer } from '@/components/ReplayViewer';
import { sound } from '@/lib/sound';

function PlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const modeParam = searchParams.get('mode') || 'ai';
  const actionParam = searchParams.get('action') || '';
  const roomParam = searchParams.get('room') || '';

  // Local or Online State
  const [isOnline, setIsOnline] = useState(modeParam === 'online' || Boolean(roomParam));
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('local-p1');
  const [playerName, setPlayerName] = useState<string>('Player 1');
  const [myColor, setMyColor] = useState<string>(PLAYER_COLORS[0]);
  const [myAvatar, setMyAvatar] = useState<string>(AVATARS[0]);

  // Game/Room State
  const [room, setRoom] = useState<RoomDTO | null>(null);
  const [gameState, setGameState] = useState<GameStateDTO | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<GameStateDTO | null>(null);
  const [eventLog, setEventLog] = useState<GameEvent[]>([]);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(30);
  const [isRolling, setIsRolling] = useState(false);
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; playerName: string; color: string }[]>([]);
  const [showReplay, setShowReplay] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const localTurnTimerRef = useRef<any>(null);
  const aiTurnTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ============================================================
  // 1. ONLINE MULTIPLAYER WEBSOCKET LIFECYCLE
  // ============================================================
  useEffect(() => {
    if (!isOnline) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setConnected(true);
      setWs(socket);

      // Check if joining or creating room
      if (roomParam) {
        // Auto-join room from URL
        const savedToken = typeof window !== 'undefined' ? localStorage.getItem(`session_${roomParam}`) : null;
        socket.send(JSON.stringify({
          type: 'ROOM_JOIN',
          timestamp: Date.now(),
          payload: {
            roomCode: roomParam,
            playerName,
            avatar: myAvatar,
            color: myColor,
            sessionToken: savedToken || undefined
          }
        }));
      } else if (actionParam === 'create') {
        socket.send(JSON.stringify({
          type: 'ROOM_CREATE',
          timestamp: Date.now(),
          payload: {
            playerName,
            avatar: myAvatar,
            color: myColor
          }
        }));
      }
    };

    socket.onmessage = (raw) => {
      try {
        const envelope: WsEnvelope = JSON.parse(raw.data);
        handleServerMessage(envelope);
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      showToast('Connection lost. Reconnecting...');
    };

    return () => {
      socket.close();
    };
  }, [isOnline, roomParam, actionParam]);

  const handleServerMessage = (envelope: WsEnvelope) => {
    const { type, payload } = envelope;

    switch (type) {
      case 'SESSION_INIT': {
        setMyPlayerId(payload.playerId);
        setSessionToken(payload.sessionToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem(`session_${payload.roomCode}`, payload.sessionToken);
        }
        break;
      }

      case 'ROOM_UPDATE': {
        setRoom(payload.room);
        break;
      }

      case 'GAME_STATE_SNAPSHOT': {
        setGameState(payload.state);
        if (!initialSnapshot) setInitialSnapshot(payload.state);
        if (payload.events) setEventLog(payload.events);
        break;
      }

      case 'GAME_EVENT': {
        const { event, nextState } = payload;
        setEventLog(prev => [...prev, event]);
        setGameState(nextState);

        // Sound & visual triggers
        if (event.type === 'LADDER_TRIGGERED') sound.playLadderClimb();
        if (event.type === 'SNAKE_TRIGGERED') sound.playSnakeSlide();
        if (event.type === 'SPECIAL_TILE_TRIGGERED') sound.playSpecialTile();
        break;
      }

      case 'REACTION_BROADCAST': {
        const p = gameState?.players.find(pl => pl.id === payload.playerId) ||
                  room?.players.find(pl => pl.id === payload.playerId);
        const newReaction = {
          id: `${Date.now()}-${Math.random()}`,
          emoji: payload.emoji,
          playerName: p?.name || 'Player',
          color: p?.color || '#3B82F6'
        };
        setActiveReactions(prev => [...prev.slice(-4), newReaction]);
        setTimeout(() => {
          setActiveReactions(prev => prev.filter(r => r.id !== newReaction.id));
        }, 3000);
        break;
      }

      case 'ERROR': {
        showToast(`⚠️ ${payload.message}`);
        break;
      }
    }
  };

  // ============================================================
  // 2. SINGLE PLAYER AI & LOCAL PASS-AND-PLAY SETUP
  // ============================================================
  useEffect(() => {
    if (isOnline) return;

    if (modeParam === 'ai') {
      setupAIMatch();
    } else if (modeParam === 'local') {
      setupLocalMatch();
    }
  }, [isOnline, modeParam]);

  const setupAIMatch = (aiPersonality: AIPersonality = 'normal' as any) => {
    const board = createBoard('classic-100', false);
    const human: PlayerDTO = {
      id: 'human-1',
      name: 'You (Champion)',
      avatar: 'token-1',
      color: PLAYER_COLORS[0],
      isHost: true,
      isAI: false,
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    };

    const bot: PlayerDTO = {
      id: 'bot-1',
      name: 'AI Strategist',
      avatar: 'token-2',
      color: PLAYER_COLORS[1],
      isHost: false,
      isAI: true,
      aiPersonality: 'strategist',
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    };

    const initial: GameStateDTO = {
      matchId: `offline-ai-${Date.now()}`,
      roomCode: 'OFFLINE',
      status: 'in_progress',
      settings: {
        mode: 'classic',
        boardVariant: 'classic-100',
        maxPlayers: 2,
        turnTimeoutSeconds: 30,
        exactFinalSquare: true,
        consecutiveSixesRule: true,
        allowSpectators: false,
        specialTilesEnabled: false,
        theme: 'neon'
      },
      board,
      players: [human, bot],
      currentTurnIndex: 0,
      currentPlayerId: human.id,
      consecutiveSixesCount: 0,
      turnStartedAt: Date.now(),
      turnExpiresAt: Date.now() + 30000,
      winnerId: null,
      winnerRankings: [],
      lastDiceRoll: null,
      lastDiceRolls: [],
      eventSequenceIndex: 0
    };

    setGameState(initial);
    setInitialSnapshot(JSON.parse(JSON.stringify(initial)));
    setEventLog([]);
    setMyPlayerId(human.id);
  };

  const setupLocalMatch = () => {
    const board = createBoard('classic-100', false);
    const p1: PlayerDTO = {
      id: 'local-p1',
      name: 'Player 1',
      avatar: 'token-1',
      color: PLAYER_COLORS[0],
      isHost: true,
      isAI: false,
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    };

    const p2: PlayerDTO = {
      id: 'local-p2',
      name: 'Player 2',
      avatar: 'token-2',
      color: PLAYER_COLORS[1],
      isHost: false,
      isAI: false,
      isReady: true,
      isConnected: true,
      isSpectator: false,
      position: 0,
      hasShield: false,
      extraTurns: 0,
      hasDoubleDice: false,
      stats: { snakesHit: 0, laddersClimbed: 0, specialTilesHit: 0, turnsTaken: 0, rolls: [] }
    };

    const initial: GameStateDTO = {
      matchId: `offline-local-${Date.now()}`,
      roomCode: 'LOCAL',
      status: 'in_progress',
      settings: {
        mode: 'classic',
        boardVariant: 'classic-100',
        maxPlayers: 2,
        turnTimeoutSeconds: 30,
        exactFinalSquare: true,
        consecutiveSixesRule: true,
        allowSpectators: false,
        specialTilesEnabled: false,
        theme: 'classic'
      },
      board,
      players: [p1, p2],
      currentTurnIndex: 0,
      currentPlayerId: p1.id,
      consecutiveSixesCount: 0,
      turnStartedAt: Date.now(),
      turnExpiresAt: Date.now() + 30000,
      winnerId: null,
      winnerRankings: [],
      lastDiceRoll: null,
      lastDiceRolls: [],
      eventSequenceIndex: 0
    };

    setGameState(initial);
    setInitialSnapshot(JSON.parse(JSON.stringify(initial)));
    setEventLog([]);
    setMyPlayerId(p1.id);
  };

  // ============================================================
  // 3. OFFLINE TURN TICKER & AI AUTOMATION
  // ============================================================
  useEffect(() => {
    if (isOnline || !gameState || gameState.status !== 'in_progress') return;

    const currentP = gameState.players[gameState.currentTurnIndex];
    if (!currentP) return;

    if (currentP.isAI) {
      const decision = decideAIAction({ state: gameState, aiPlayer: currentP });
      aiTurnTimerRef.current = setTimeout(() => {
        handleExecuteRoll();
      }, decision.thinkingDelayMs);
    }

    return () => {
      if (aiTurnTimerRef.current) clearTimeout(aiTurnTimerRef.current);
    };
  }, [gameState?.currentTurnIndex, gameState?.status, isOnline]);

  // Seconds countdown clock
  useEffect(() => {
    if (!gameState || gameState.status !== 'in_progress') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((gameState.turnExpiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [gameState?.turnExpiresAt, gameState?.status]);

  // ============================================================
  // 4. ROLL EXECUTION (CLIENT INTENT -> SERVER/LOCAL ENGINE)
  // ============================================================
  const handleExecuteRoll = () => {
    if (!gameState || gameState.status !== 'in_progress') return;

    if (isOnline) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ROLL_REQUEST', timestamp: Date.now(), payload: {} }));
      }
      return;
    }

    // Local execution via pure @snakes/engine
    setIsRolling(true);
    setTimeout(() => {
      try {
        const result = executeTurn(gameState);
        setGameState(result.nextState);
        setEventLog(prev => [...prev, ...result.events]);

        // Sound triggers
        for (const ev of result.events) {
          if (ev.type === 'LADDER_TRIGGERED') sound.playLadderClimb();
          if (ev.type === 'SNAKE_TRIGGERED') sound.playSnakeSlide();
          if (ev.type === 'SPECIAL_TILE_TRIGGERED') sound.playSpecialTile();
        }

        // Pass & play turn announcement
        if (modeParam === 'local') {
          setMyPlayerId(result.nextState.currentPlayerId);
        }
      } catch (e: any) {
        console.error('Local turn execution failed', e);
      } finally {
        setIsRolling(false);
      }
    }, 600);
  };

  const handleSendReaction = (emoji: string) => {
    if (isOnline && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'SEND_REACTION', timestamp: Date.now(), payload: { emoji } }));
    } else {
      const activeP = gameState?.players.find(p => p.id === myPlayerId);
      const newReaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji,
        playerName: activeP?.name || playerName,
        color: activeP?.color || myColor
      };
      setActiveReactions(prev => [...prev.slice(-4), newReaction]);
      setTimeout(() => {
        setActiveReactions(prev => prev.filter(r => r.id !== newReaction.id));
      }, 3000);
    }
  };

  // Active Player checks
  const activePlayer = gameState?.players[gameState.currentTurnIndex];
  const isMyTurn = modeParam === 'local' ? true : activePlayer?.id === myPlayerId;
  const canRoll = Boolean(gameState && gameState.status === 'in_progress' && isMyTurn && !isRolling);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-amber-500/40 text-amber-300 text-xs px-4 py-2 rounded-full shadow-2xl backdrop-blur-md animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Replay Overlay */}
      {showReplay && initialSnapshot && (
        <ReplayViewer
          initialSnapshot={initialSnapshot}
          events={eventLog}
          onClose={() => setShowReplay(false)}
        />
      )}

      {/* Victory Celebration Modal */}
      {gameState?.status === 'finished' && (
        <ResultsModal
          isOpen={true}
          winner={gameState.players.find(p => p.id === gameState.winnerId) || null}
          players={gameState.players}
          onRematch={() => {
            if (isOnline && ws && room) {
              ws.send(JSON.stringify({ type: 'GAME_START', timestamp: Date.now(), payload: {} }));
            } else {
              setupAIMatch();
            }
          }}
          onReturnToLobby={() => {
            if (room) setGameState(null);
            else router.push('/');
          }}
          onOpenReplay={() => setShowReplay(true)}
        />
      )}

      {/* Top App Header */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 px-4 md:px-6 flex items-center justify-between backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-bold transition-colors px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800"
          >
            ← Home
          </button>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black text-slate-200 uppercase tracking-wider">
              {isOnline ? `Room: ${room?.code || 'Connecting...'}` : modeParam === 'ai' ? '🤖 Play vs AI' : '👥 Pass & Play'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {eventLog.length > 0 && (
            <button
              onClick={() => setShowReplay(true)}
              className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/60 shadow-sm transition-all flex items-center gap-1"
            >
              <span>📼</span> Replay ({eventLog.length})
            </button>
          )}
          <button
            onClick={() => sound.toggleSound()}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs font-bold transition-colors"
            title="Toggle Web Audio"
          >
            🔊
          </button>
        </div>
      </header>

      {/* Main Play View */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 md:p-6 max-w-6xl mx-auto w-full">
        {/* Latest Event Live Ticker */}
        {eventLog.length > 0 && gameState?.status === 'in_progress' && (
          <div className="mb-4 px-4 py-1.5 bg-slate-900/80 border border-slate-700/60 rounded-full shadow-lg backdrop-blur-md text-xs text-amber-300 font-semibold flex items-center gap-2 animate-fadeIn">
            <span className="text-sm">📢</span>
            <span>
              {(() => {
                const lastEv = eventLog[eventLog.length - 1];
                const p = gameState?.players.find(pl => pl.id === (lastEv as any).playerId);
                const name = p?.name || 'Player';
                if (lastEv.type === 'ROLL_RESULT') return `${name} rolled a ${lastEv.totalRoll}!`;
                if (lastEv.type === 'LADDER_TRIGGERED') return `🪜 ${name} climbed a ladder to tile ${lastEv.ladderTop}!`;
                if (lastEv.type === 'SNAKE_TRIGGERED') {
                  return lastEv.absorbedByShield
                    ? `🛡️ Snake bite absorbed by shield for ${name}!`
                    : `🐍 ${name} slid down a snake to tile ${lastEv.snakeTail}!`;
                }
                if (lastEv.type === 'SPECIAL_TILE_TRIGGERED') return `✨ ${name}: ${lastEv.details}`;
                return `${name} completed turn.`;
              })()}
            </span>
          </div>
        )}
        {/* If in Online Lobby */}
        {isOnline && room && room.status === 'waiting' ? (
          <Lobby
            room={room}
            myPlayerId={myPlayerId}
            isHost={room.hostId === myPlayerId}
            onReadyToggle={(ready) => {
              ws?.send(JSON.stringify({ type: 'PLAYER_READY', timestamp: Date.now(), payload: { ready } }));
            }}
            onUpdateSettings={(settings) => {
              ws?.send(JSON.stringify({ type: 'HOST_UPDATE_SETTINGS', timestamp: Date.now(), payload: { settings } }));
            }}
            onAddAI={(personality) => {
              ws?.send(JSON.stringify({ type: 'ADD_AI_BOT', timestamp: Date.now(), payload: { personality } }));
            }}
            onKickPlayer={(targetPlayerId) => {
              ws?.send(JSON.stringify({ type: 'HOST_KICK', timestamp: Date.now(), payload: { targetPlayerId } }));
            }}
            onStartGame={() => {
              ws?.send(JSON.stringify({ type: 'GAME_START', timestamp: Date.now(), payload: {} }));
            }}
            onLeaveRoom={() => router.push('/')}
          />
        ) : gameState ? (
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6">
            {/* Left: The Board */}
            <div className="flex-1 flex flex-col items-center max-w-[620px] w-full">
              <Board
                board={gameState.board}
                players={gameState.players}
                activePlayerId={gameState.currentPlayerId}
                theme={gameState.settings.theme}
              />
            </div>

            {/* Right: Dice Roller, Actions, Quick Reactions & Player Cards */}
            <div className="w-full lg:w-80 flex flex-col gap-4">
              <DiceRoller
                onRoll={handleExecuteRoll}
                canRoll={canRoll}
                isRolling={isRolling}
                lastRoll={gameState.lastDiceRoll}
                lastRolls={gameState.lastDiceRolls}
                secondsRemaining={secondsRemaining}
                totalTurnSeconds={gameState.settings.turnTimeoutSeconds}
                isMyTurn={isMyTurn}
                activePlayerName={activePlayer?.name || 'Player'}
                activePlayerColor={activePlayer?.color || '#EF4444'}
                isDoubleDice={activePlayer?.hasDoubleDice}
              />

              {/* Quick Reactions Bar */}
              <Reactions
                onSendReaction={handleSendReaction}
                activeReactions={activeReactions}
              />

              {/* Roster & Stats Cards */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-3 shadow-lg">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Active Players ({gameState.players.length})
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {gameState.players.map(p => {
                    const isTurn = p.id === gameState.currentPlayerId;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs border ${
                          isTurn
                            ? 'bg-slate-800 border-yellow-500/40 shadow'
                            : 'bg-slate-950/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shadow"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="font-semibold text-slate-200 truncate max-w-[100px]">
                            {p.name}
                          </span>
                          {p.hasShield && <span title="Snake Shield">🛡️</span>}
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
                          <span>Tile {p.position}</span>
                          {isTurn && <span className="text-yellow-400 font-bold animate-pulse">TURN</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="text-sm text-slate-400">Loading arena...</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-sm">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        Preparing arena...
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}

