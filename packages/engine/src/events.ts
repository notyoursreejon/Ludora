import { GameEvent, GameStateDTO } from '@snakes/shared';

/**
 * Pure state reducer that applies a single deterministic event to a GameState.
 * This guarantees client and server can replay any match event-by-event with 100% fidelity.
 */
export function reduceGameEvent(state: GameStateDTO, event: GameEvent): GameStateDTO {
  const next = { ...state, players: state.players.map(p => ({ ...p, stats: { ...p.stats } })) };

  switch (event.type) {
    case 'ROLL_RESULT': {
      next.lastDiceRoll = event.totalRoll;
      next.lastDiceRolls = event.diceRolls;
      const p = next.players.find(pl => pl.id === event.playerId);
      if (p) {
        p.stats.rolls = [...p.stats.rolls, event.totalRoll];
        p.stats.turnsTaken++;
      }
      break;
    }

    case 'MOVE_STEP': {
      const p = next.players.find(pl => pl.id === event.playerId);
      if (p) {
        p.position = event.to;
      }
      break;
    }

    case 'LADDER_TRIGGERED': {
      const p = next.players.find(pl => pl.id === event.playerId);
      if (p) {
        p.position = event.ladderTop;
        p.stats.laddersClimbed++;
      }
      break;
    }

    case 'SNAKE_TRIGGERED': {
      const p = next.players.find(pl => pl.id === event.playerId);
      if (p) {
        if (!event.absorbedByShield) {
          p.position = event.snakeTail;
          p.stats.snakesHit++;
        } else {
          p.hasShield = false;
        }
      }
      break;
    }

    case 'SPECIAL_TILE_TRIGGERED': {
      const p = next.players.find(pl => pl.id === event.playerId);
      if (p) {
        p.position = event.resultingPosition;
        p.stats.specialTilesHit++;
      }
      break;
    }

    case 'PLAYER_FINISHED': {
      const p = next.players.find(pl => pl.id === event.playerId);
      if (p) {
        p.rank = event.rank;
      }
      break;
    }

    case 'GAME_FINISHED': {
      next.status = 'finished';
      next.winnerId = event.winnerId;
      next.winnerRankings = event.rankings;
      break;
    }
  }

  next.eventSequenceIndex = event.sequence;
  return next;
}
