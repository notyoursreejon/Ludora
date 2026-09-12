import {
  LudoGameState,
  LudoEvent,
  LudoSettings,
  LudoPlayer
} from '@snakes/shared';

export interface ReplayStep {
  stepIndex: number;
  event: LudoEvent;
  stateSnapshot: LudoGameState;
}

export class LudoReplayEngine {
  /**
   * Deep clone a game state snapshot.
   */
  public static cloneState(state: LudoGameState): LudoGameState {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Reconstruct all chronological states from an event log.
   */
  public static buildReplayTimeline(
    initialState: LudoGameState,
    events: LudoEvent[]
  ): ReplayStep[] {
    const timeline: ReplayStep[] = [];
    let currentState = this.cloneState(initialState);

    timeline.push({
      stepIndex: 0,
      event: {
        id: 'initial',
        gameId: initialState.gameId,
        seq: 0,
        timestamp: initialState.lastActionTimestamp,
        type: 'GAME_STARTED',
        payload: {}
      },
      stateSnapshot: this.cloneState(currentState)
    });

    for (let i = 0; i < events.length; i++) {
      const evt = events[i];
      currentState = this.applyEventToState(currentState, evt);
      timeline.push({
        stepIndex: i + 1,
        event: evt,
        stateSnapshot: this.cloneState(currentState)
      });
    }

    return timeline;
  }

  private static applyEventToState(state: LudoGameState, event: LudoEvent): LudoGameState {
    const s = this.cloneState(state);
    s.eventSequence = event.seq;
    s.lastActionTimestamp = event.timestamp;

    switch (event.type) {
      case 'DICE_ROLLED': {
        s.diceState.value = event.payload.value;
        s.diceState.rollsThisTurn.push(event.payload.value);
        s.diceState.rolledAt = event.timestamp;
        s.phase = 'WAITING_FOR_TOKEN_SELECTION';
        break;
      }

      case 'TOKEN_MOVED': {
        const { playerId, tokenId, move } = event.payload;
        const player = s.players.find(p => p.id === playerId);
        if (player) {
          const token = player.tokens.find(t => t.id === tokenId);
          if (token) {
            token.state = move.toState;
            token.position = move.toPosition;
            token.stepCount = move.newStepCount;
          }
        }
        break;
      }

      case 'TOKEN_CAPTURED': {
        const { victimPlayerId, tokenId } = event.payload;
        const victim = s.players.find(p => p.id === victimPlayerId);
        if (victim) {
          const token = victim.tokens.find(t => t.id === tokenId);
          if (token) {
            token.state = 'YARD';
            token.position = -1;
            token.stepCount = 0;
            token.shielded = false;
          }
        }
        break;
      }

      case 'TOKEN_FINISHED': {
        const { playerId, tokenId, finishedTokensCount } = event.payload;
        const player = s.players.find(p => p.id === playerId);
        if (player) {
          player.finishedTokensCount = finishedTokensCount;
          const token = player.tokens.find(t => t.id === tokenId);
          if (token) {
            token.state = 'FINISHED';
            token.position = 999;
          }
        }
        break;
      }

      case 'TURN_STARTED': {
        const { activePlayerId, turnNumber } = event.payload;
        const nextIdx = s.players.findIndex(p => p.id === activePlayerId);
        if (nextIdx !== -1) {
          s.activePlayerIndex = nextIdx;
        }
        s.currentTurnNumber = turnNumber;
        s.phase = 'WAITING_FOR_ROLL';
        s.diceState = {
          value: null,
          rollsThisTurn: [],
          canRollAgain: false,
          rolledAt: null
        };
        s.legalMoves = [];
        break;
      }

      case 'EXTRA_TURN_GRANTED': {
        s.phase = 'WAITING_FOR_ROLL';
        s.diceState = {
          value: null,
          rollsThisTurn: s.diceState.rollsThisTurn,
          canRollAgain: false,
          rolledAt: null
        };
        s.legalMoves = [];
        break;
      }

      case 'PLAYER_RANKED': {
        const { playerId, rank } = event.payload;
        const player = s.players.find(p => p.id === playerId);
        if (player) {
          player.rank = rank;
          if (!s.winnersOrder.includes(playerId)) {
            s.winnersOrder.push(playerId);
          }
        }
        break;
      }

      case 'GAME_FINISHED': {
        s.status = 'finished';
        s.phase = 'ROUND_OVER';
        s.winnersOrder = event.payload.winnersOrder || s.winnersOrder;
        break;
      }

      default:
        break;
    }

    return s;
  }
}
