import {
  LudoColor,
  LUDO_COLORS,
  LudoGameState,
  LudoSettings,
  LudoPlayer,
  LudoToken,
  LudoLegalMove,
  LudoEvent,
  LudoTurnPhase,
  LudoBoardType
} from '@snakes/shared';
import { getBoardLayout, LudoBoardLayout } from './board.js';

export class LudoRuleEngine {
  public layout: LudoBoardLayout;

  constructor(public settings: LudoSettings, public activeColors: LudoColor[]) {
    this.layout = getBoardLayout(settings.boardType, activeColors);
  }

  /**
   * Total steps required for a token to finish (from yard to home center).
   * For classic 52-cell track: 51 steps on track + 5 steps on home path + 1 finish step = 56 steps.
   */
  public get totalStepsToFinish(): number {
    const geometry = this.layout.playerGeometries.values().next().value;
    const trackSteps = geometry ? geometry.totalTrackSteps : 51;
    return trackSteps + 6; // trackSteps + 5 home path cells + 1 finish
  }

  /**
   * Initialize a new game state.
   */
  public createInitialState(
    gameId: string,
    roomCode: string,
    players: {
      id: string;
      name: string;
      avatar: string;
      color: LudoColor;
      isHost: boolean;
      isAI: boolean;
      aiDifficulty?: any;
      aiPersonality?: any;
    }[]
  ): LudoGameState {
    const ludoPlayers: LudoPlayer[] = players.map(p => {
      const tokens: LudoToken[] = [];
      for (let t = 0; t < this.settings.tokensPerPlayer; t++) {
        tokens.push({
          id: `${p.id}_t${t}`,
          playerId: p.id,
          color: p.color,
          state: 'YARD',
          position: -1,
          stepCount: 0,
          shielded: false
        });
      }

      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        isHost: p.isHost,
        isAI: p.isAI,
        aiDifficulty: p.aiDifficulty,
        aiPersonality: p.aiPersonality,
        isReady: true,
        isConnected: true,
        isSpectator: false,
        tokens,
        finishedTokensCount: 0,
        powerUps: this.settings.mode === 'battle' ? [
          { type: 'SHIELD', count: 1 },
          { type: 'REROLL', count: 1 },
          { type: 'DASH', count: 1 }
        ] : [],
        fortuneTokenAvailable: false,
        consecutiveSixes: 0,
        stats: {
          captures: 0,
          tokensCompleted: 0,
          sixesRolled: 0,
          totalRolls: 0,
          turnsPlayed: 0
        }
      };
    });

    return {
      gameId,
      roomCode,
      status: 'playing',
      settings: this.settings,
      players: ludoPlayers,
      activePlayerIndex: 0,
      currentTurnNumber: 1,
      phase: 'WAITING_FOR_ROLL',
      diceState: {
        value: null,
        rollsThisTurn: [],
        canRollAgain: false,
        rolledAt: null
      },
      legalMoves: [],
      winnersOrder: [],
      eventSequence: 0,
      lastActionTimestamp: Date.now()
    };
  }

  /**
   * Calculate all deterministic legal moves for the given player and dice roll.
   */
  public getLegalMoves(state: LudoGameState, playerId: string, diceValue: number): LudoLegalMove[] {
    const player = state.players.find(p => p.id === playerId);
    if (!player || player.rank != null) return [];

    const geometry = this.layout.playerGeometries.get(player.color);
    if (!geometry) return [];

    const moves: LudoLegalMove[] = [];
    const totalTrack = this.layout.totalTrackCells;
    const finishStep = this.totalStepsToFinish;

    for (const token of player.tokens) {
      if (token.state === 'FINISHED') continue;

      // Case 1: Token in YARD
      if (token.state === 'YARD') {
        const canLeave = diceValue === this.settings.startRollRequirement;
        if (canLeave) {
          const targetTrackIndex = geometry.startTrackIndex;
          
          // Check blockade / friendly tokens on start gate
          const friendlyOnCell = player.tokens.filter(
            t => t.state === 'TRACK' && t.position === targetTrackIndex
          );

          if (this.settings.blockadeRule === 'block_pass' && friendlyOnCell.length >= 2) {
            // Blocked by friendly blockade
            continue;
          }

          // Check opponent tokens on start gate
          const opponentTokensOnCell = this.getOpponentTokensOnCell(state, player.id, targetTrackIndex);
          const wouldCapture: string[] = [];

          if (opponentTokensOnCell.length > 0) {
            const isSafe = this.layout.safeTrackIndices.has(targetTrackIndex) && this.settings.safeSquaresCaptureImmune;
            if (!isSafe) {
              // Can capture if not blockaded
              const isOpponentBlockade = this.settings.blockadeRule === 'block_capture' && opponentTokensOnCell.length >= 2;
              if (!isOpponentBlockade) {
                opponentTokensOnCell.forEach(ot => {
                  if (!ot.shielded) wouldCapture.push(ot.id);
                });
              }
            }
          }

          moves.push({
            tokenId: token.id,
            actionType: 'LEAVE_YARD',
            fromState: 'YARD',
            fromPosition: -1,
            toState: 'TRACK',
            toPosition: targetTrackIndex,
            newStepCount: 0,
            wouldCapture,
            isSafe: this.layout.safeTrackIndices.has(targetTrackIndex)
          });
        }
        continue;
      }

      // Case 2: Token on TRACK
      if (token.state === 'TRACK') {
        const projectedStepCount = token.stepCount + diceValue;

        if (projectedStepCount <= geometry.totalTrackSteps) {
          // Still on track
          const targetTrackIndex = (token.position + diceValue) % totalTrack;
          const isSafe = this.layout.safeTrackIndices.has(targetTrackIndex) && this.settings.safeSquaresCaptureImmune;
          const opponentTokens = this.getOpponentTokensOnCell(state, player.id, targetTrackIndex);
          const wouldCapture: string[] = [];

          if (opponentTokens.length > 0 && !isSafe) {
            const isOpponentBlockade = this.settings.blockadeRule === 'block_capture' && opponentTokens.length >= 2;
            if (!isOpponentBlockade) {
              opponentTokens.forEach(ot => {
                if (!ot.shielded) wouldCapture.push(ot.id);
              });
            }
          }

          moves.push({
            tokenId: token.id,
            actionType: 'ADVANCE_TRACK',
            fromState: 'TRACK',
            fromPosition: token.position,
            toState: 'TRACK',
            toPosition: targetTrackIndex,
            newStepCount: projectedStepCount,
            wouldCapture,
            isSafe: this.layout.safeTrackIndices.has(targetTrackIndex)
          });
        } else if (projectedStepCount === finishStep) {
          // Exact finish from track!
          moves.push({
            tokenId: token.id,
            actionType: 'FINISH_TOKEN',
            fromState: 'TRACK',
            fromPosition: token.position,
            toState: 'FINISHED',
            toPosition: 999,
            newStepCount: finishStep,
            wouldCapture: [],
            isSafe: true
          });
        } else if (projectedStepCount < finishStep) {
          // Entering HOME_PATH
          const homeIndex = projectedStepCount - geometry.totalTrackSteps - 1;
          moves.push({
            tokenId: token.id,
            actionType: 'ENTER_HOME_PATH',
            fromState: 'TRACK',
            fromPosition: token.position,
            toState: 'HOME_PATH',
            toPosition: homeIndex,
            newStepCount: projectedStepCount,
            wouldCapture: [],
            isSafe: true
          });
        } else {
          // Overshoots finish
          if (!this.settings.exactHomeFinish) {
            moves.push({
              tokenId: token.id,
              actionType: 'FINISH_TOKEN',
              fromState: 'TRACK',
              fromPosition: token.position,
              toState: 'FINISHED',
              toPosition: 999,
              newStepCount: finishStep,
              wouldCapture: [],
              isSafe: true
            });
          }
        }
        continue;
      }

      // Case 3: Token in HOME_PATH
      if (token.state === 'HOME_PATH') {
        const projectedStepCount = token.stepCount + diceValue;

        if (projectedStepCount === finishStep) {
          // Reached finish center!
          moves.push({
            tokenId: token.id,
            actionType: 'FINISH_TOKEN',
            fromState: 'HOME_PATH',
            fromPosition: token.position,
            toState: 'FINISHED',
            toPosition: 999,
            newStepCount: finishStep,
            wouldCapture: [],
            isSafe: true
          });
        } else if (projectedStepCount < finishStep) {
          // Advances further in home path (0..4)
          const newHomeIndex = projectedStepCount - geometry.totalTrackSteps - 1;
          moves.push({
            tokenId: token.id,
            actionType: 'ADVANCE_HOME_PATH',
            fromState: 'HOME_PATH',
            fromPosition: token.position,
            toState: 'HOME_PATH',
            toPosition: newHomeIndex,
            newStepCount: projectedStepCount,
            wouldCapture: [],
            isSafe: true
          });
        } else {
          // Overshoots home center
          if (!this.settings.exactHomeFinish) {
            moves.push({
              tokenId: token.id,
              actionType: 'FINISH_TOKEN',
              fromState: 'HOME_PATH',
              fromPosition: token.position,
              toState: 'FINISHED',
              toPosition: 999,
              newStepCount: finishStep,
              wouldCapture: [],
              isSafe: true
            });
          }
        }
      }
    }

    return moves;
  }

  /**
   * Helper: Find opponent tokens currently on a specific track cell.
   */
  public getOpponentTokensOnCell(state: LudoGameState, playerId: string, trackIndex: number): LudoToken[] {
    const opponents: LudoToken[] = [];
    for (const p of state.players) {
      if (p.id === playerId) continue;
      for (const t of p.tokens) {
        if (t.state === 'TRACK' && t.position === trackIndex) {
          opponents.push(t);
        }
      }
    }
    return opponents;
  }

  /**
   * Applies a chosen move to the game state and produces atomic events.
   */
  public applyMove(
    state: LudoGameState,
    playerId: string,
    tokenId: string,
    diceValue: number
  ): { newState: LudoGameState; events: LudoEvent[]; extraTurnGranted: boolean } {
    const events: LudoEvent[] = [];
    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    const legalMoves = this.getLegalMoves(state, playerId, diceValue);
    const move = legalMoves.find(m => m.tokenId === tokenId);
    if (!move) throw new Error(`Illegal move attempted for token ${tokenId} with dice ${diceValue}`);

    const token = player.tokens.find(t => t.id === tokenId);
    if (!token) throw new Error(`Token ${tokenId} not found`);

    let extraTurnGranted = diceValue === 6;

    // Apply token position update
    token.state = move.toState;
    token.position = move.toPosition;
    token.stepCount = move.newStepCount;

    events.push({
      id: `evt_${++state.eventSequence}`,
      gameId: state.gameId,
      seq: state.eventSequence,
      timestamp: Date.now(),
      type: 'TOKEN_MOVED',
      payload: {
        playerId,
        tokenId,
        move
      }
    });

    // Resolve Captures
    if (move.wouldCapture.length > 0) {
      for (const capturedTokenId of move.wouldCapture) {
        for (const opponent of state.players) {
          const victim = opponent.tokens.find(t => t.id === capturedTokenId);
          if (victim) {
            victim.state = 'YARD';
            victim.position = -1;
            victim.stepCount = 0;
            victim.shielded = false;

            player.stats.captures++;

            events.push({
              id: `evt_${++state.eventSequence}`,
              gameId: state.gameId,
              seq: state.eventSequence,
              timestamp: Date.now(),
              type: 'TOKEN_CAPTURED',
              payload: {
                capturedByPlayerId: playerId,
                victimPlayerId: opponent.id,
                tokenId: victim.id
              }
            });

            if (this.settings.bonusOnCapture) {
              extraTurnGranted = true;
            }
          }
        }
      }
    }

    // Resolve Token Finished
    if (move.toState === 'FINISHED') {
      player.finishedTokensCount++;
      player.stats.tokensCompleted++;

      events.push({
        id: `evt_${++state.eventSequence}`,
        gameId: state.gameId,
        seq: state.eventSequence,
        timestamp: Date.now(),
        type: 'TOKEN_FINISHED',
        payload: {
          playerId,
          tokenId,
          finishedTokensCount: player.finishedTokensCount
        }
      });

      if (this.settings.bonusOnFinish) {
        extraTurnGranted = true;
      }

      // Check if this player finished all tokens
      if (player.finishedTokensCount === this.settings.tokensPerPlayer && player.rank == null) {
        player.rank = state.winnersOrder.length + 1;
        state.winnersOrder.push(player.id);

        events.push({
          id: `evt_${++state.eventSequence}`,
          gameId: state.gameId,
          seq: state.eventSequence,
          timestamp: Date.now(),
          type: 'PLAYER_RANKED',
          payload: {
            playerId,
            rank: player.rank
          }
        });
      }
    }

    // Check if match should finish
    const unfinishedPlayers = state.players.filter(p => p.rank == null);
    if (unfinishedPlayers.length <= 1) {
      if (unfinishedPlayers.length === 1) {
        const lastPlayer = unfinishedPlayers[0];
        lastPlayer.rank = state.winnersOrder.length + 1;
        state.winnersOrder.push(lastPlayer.id);
      }
      state.status = 'finished';

      events.push({
        id: `evt_${++state.eventSequence}`,
        gameId: state.gameId,
        seq: state.eventSequence,
        timestamp: Date.now(),
        type: 'GAME_FINISHED',
        payload: {
          winnersOrder: state.winnersOrder
        }
      });
    }

    state.lastActionTimestamp = Date.now();
    return { newState: state, events, extraTurnGranted };
  }

  /**
   * Advance to the next player's turn or grant an extra turn.
   */
  public nextTurn(state: LudoGameState, grantExtraTurn: boolean): { newState: LudoGameState; events: LudoEvent[] } {
    const events: LudoEvent[] = [];

    if (state.status === 'finished') {
      state.phase = 'ROUND_OVER';
      return { newState: state, events };
    }

    const currentPlayer = state.players[state.activePlayerIndex];

    if (grantExtraTurn && currentPlayer.rank == null) {
      // Extra turn for current player
      state.phase = 'WAITING_FOR_ROLL';
      state.diceState = {
        value: null,
        rollsThisTurn: state.diceState.rollsThisTurn,
        canRollAgain: false,
        rolledAt: null
      };
      state.legalMoves = [];

      events.push({
        id: `evt_${++state.eventSequence}`,
        gameId: state.gameId,
        seq: state.eventSequence,
        timestamp: Date.now(),
        type: 'EXTRA_TURN_GRANTED',
        payload: {
          playerId: currentPlayer.id
        }
      });
      return { newState: state, events };
    }

    // Turn changes to next active player
    currentPlayer.consecutiveSixes = 0;
    let nextIndex = (state.activePlayerIndex + 1) % state.players.length;
    let iterations = 0;

    // Skip already finished players
    while (state.players[nextIndex].rank != null && iterations < state.players.length) {
      nextIndex = (nextIndex + 1) % state.players.length;
      iterations++;
    }

    if (iterations >= state.players.length) {
      // All players finished
      state.status = 'finished';
      state.phase = 'ROUND_OVER';
      return { newState: state, events };
    }

    state.activePlayerIndex = nextIndex;
    state.currentTurnNumber++;
    state.phase = 'WAITING_FOR_ROLL';
    state.diceState = {
      value: null,
      rollsThisTurn: [],
      canRollAgain: false,
      rolledAt: null
    };
    state.legalMoves = [];

    const nextPlayer = state.players[nextIndex];
    nextPlayer.stats.turnsPlayed++;

    events.push({
      id: `evt_${++state.eventSequence}`,
      gameId: state.gameId,
      seq: state.eventSequence,
      timestamp: Date.now(),
      type: 'TURN_STARTED',
      payload: {
        activePlayerId: nextPlayer.id,
        turnNumber: state.currentTurnNumber
      }
    });

    return { newState: state, events };
  }
}
