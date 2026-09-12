import {
  LudoGameState,
  LudoPlayer,
  LudoPowerUpType,
  LudoEvent
} from '@snakes/shared';
import { LudoRuleEngine } from './rules.js';

export class LudoBattleEngine {
  constructor(private ruleEngine: LudoRuleEngine) {}

  /**
   * Apply a power-up to the game state.
   */
  public usePowerUp(
    state: LudoGameState,
    playerId: string,
    powerUpType: LudoPowerUpType,
    targetTokenId?: string
  ): { newState: LudoGameState; events: LudoEvent[] } {
    const events: LudoEvent[] = [];
    const player = state.players.find(p => p.id === playerId);
    if (!player) throw new Error(`Player ${playerId} not found`);

    // Check inventory
    const powerUpItem = player.powerUps.find(p => p.type === powerUpType);
    if (!powerUpItem || powerUpItem.count <= 0) {
      throw new Error(`Player ${player.name} has no ${powerUpType} power-ups available`);
    }

    powerUpItem.count--;

    switch (powerUpType) {
      case 'SHIELD': {
        if (!targetTokenId) throw new Error('Target token required for SHIELD');
        const token = player.tokens.find(t => t.id === targetTokenId);
        if (!token || token.state !== 'TRACK') {
          throw new Error('Can only shield tokens currently on track');
        }
        token.shielded = true;
        events.push({
          id: `evt_${++state.eventSequence}`,
          gameId: state.gameId,
          seq: state.eventSequence,
          timestamp: Date.now(),
          type: 'POWERUP_USED',
          payload: {
            playerId,
            powerUp: 'SHIELD',
            tokenId: targetTokenId
          }
        });
        break;
      }

      case 'REROLL': {
        // Clear current dice value so player can roll again
        state.diceState.value = null;
        state.phase = 'WAITING_FOR_ROLL';
        state.legalMoves = [];
        events.push({
          id: `evt_${++state.eventSequence}`,
          gameId: state.gameId,
          seq: state.eventSequence,
          timestamp: Date.now(),
          type: 'POWERUP_USED',
          payload: {
            playerId,
            powerUp: 'REROLL'
          }
        });
        break;
      }

      case 'DASH': {
        if (!targetTokenId) throw new Error('Target token required for DASH');
        const token = player.tokens.find(t => t.id === targetTokenId);
        if (!token || token.state !== 'TRACK') {
          throw new Error('Can only dash tokens on track');
        }
        // Advance token 2 cells forward if possible
        const geometry = this.ruleEngine.layout.playerGeometries.get(player.color);
        if (geometry) {
          const totalTrack = this.ruleEngine.layout.totalTrackCells;
          token.position = (token.position + 2) % totalTrack;
          token.stepCount += 2;
        }
        events.push({
          id: `evt_${++state.eventSequence}`,
          gameId: state.gameId,
          seq: state.eventSequence,
          timestamp: Date.now(),
          type: 'POWERUP_USED',
          payload: {
            playerId,
            powerUp: 'DASH',
            tokenId: targetTokenId,
            newPosition: token.position
          }
        });
        break;
      }

      case 'RECOVERY': {
        // Recover a token from yard to start gate
        const yardToken = player.tokens.find(t => t.state === 'YARD');
        if (!yardToken) {
          throw new Error('No tokens in yard to recover');
        }
        const geometry = this.ruleEngine.layout.playerGeometries.get(player.color);
        if (geometry) {
          yardToken.state = 'TRACK';
          yardToken.position = geometry.startTrackIndex;
          yardToken.stepCount = 0;
        }
        events.push({
          id: `evt_${++state.eventSequence}`,
          gameId: state.gameId,
          seq: state.eventSequence,
          timestamp: Date.now(),
          type: 'POWERUP_USED',
          payload: {
            playerId,
            powerUp: 'RECOVERY',
            tokenId: yardToken.id
          }
        });
        break;
      }

      default:
        break;
    }

    return { newState: state, events };
  }

  /**
   * Check and grant comeback "Fortune Token" for players falling far behind.
   */
  public evaluateComebackEligibility(state: LudoGameState): LudoEvent[] {
    const events: LudoEvent[] = [];
    if (state.settings.mode !== 'battle') return events;

    const maxProgress = Math.max(...state.players.map(p => p.finishedTokensCount));

    for (const player of state.players) {
      if (player.rank != null) continue;
      // If leading player has finished >= 2 tokens while this player has finished 0 and has 3+ tokens in yard:
      if (maxProgress >= 2 && player.finishedTokensCount === 0 && !player.fortuneTokenAvailable) {
        const yardCount = player.tokens.filter(t => t.state === 'YARD').length;
        if (yardCount >= 3) {
          player.fortuneTokenAvailable = true;
          player.powerUps.push({ type: 'RECOVERY', count: 1 });
          events.push({
            id: `evt_${++state.eventSequence}`,
            gameId: state.gameId,
            seq: state.eventSequence,
            timestamp: Date.now(),
            type: 'POWERUP_USED',
            payload: {
              playerId: player.id,
              powerUp: 'FORTUNE_AWARDED',
              message: `${player.name} received a Comeback Fortune Token!`
            }
          });
        }
      }
    }

    return events;
  }
}
