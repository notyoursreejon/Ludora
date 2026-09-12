import {
  GameStateDTO,
  PlayerDTO,
  BoardConfig,
  GameEvent,
  SpecialTileType
} from '@snakes/shared';
import { DiceRng, CryptoRng, rollDice } from './dice.js';

export interface TurnExecutionResult {
  nextState: GameStateDTO;
  events: GameEvent[];
  isGameOver: boolean;
  winnerId: string | null;
}

/**
 * Calculates raw target position considering exact finish bounce-back rules.
 */
export function calculateMoveTarget(
  currentPos: number,
  roll: number,
  totalTiles: number,
  exactFinalSquare = true
): { finalTarget: number; bounced: boolean } {
  const destination = currentPos + roll;
  if (!exactFinalSquare || destination <= totalTiles) {
    return { finalTarget: destination, bounced: false };
  }

  // Overshoot bounce-back: e.g. on 98, roll 4 -> reaches 100 then bounces back 2 to 98
  const overshoot = destination - totalTiles;
  const bouncedPos = totalTiles - overshoot;
  return { finalTarget: Math.max(1, bouncedPos), bounced: true };
}

/**
 * Executes a player turn authoritatively.
 */
export function executeTurn(
  state: GameStateDTO,
  rng: DiceRng = new CryptoRng()
): TurnExecutionResult {
  if (state.status !== 'in_progress') {
    throw new Error('Game is not in progress');
  }

  const events: GameEvent[] = [];
  let seq = state.eventSequenceIndex;
  const matchId = state.matchId;
  const now = Date.now();

  const playerIndex = state.currentTurnIndex;
  const player = { ...state.players[playerIndex] };
  const board = state.board;

  // Determine dice count (Double dice tile effect)
  const diceCount = player.hasDoubleDice ? 2 : 1;
  player.hasDoubleDice = false;

  const { rolls, total: rollTotal } = rollDice(diceCount, rng);

  // Check consecutive sixes
  let consecutiveSixes = state.consecutiveSixesCount;
  const rolledSix = rolls.includes(6) || rollTotal === 6;

  if (rolledSix) {
    consecutiveSixes++;
  } else {
    consecutiveSixes = 0;
  }

  const isThreeSixesPenalty = state.settings.consecutiveSixesRule && consecutiveSixes >= 3;

  // 1. Record Roll Event
  events.push({
    id: `${matchId}-${++seq}`,
    sequence: seq,
    timestamp: now,
    matchId,
    type: 'ROLL_RESULT',
    playerId: player.id,
    diceRolls: rolls,
    totalRoll: rollTotal,
    isExtraTurn: rolledSix && !isThreeSixesPenalty
  });

  player.stats.turnsTaken++;
  player.stats.rolls.push(rollTotal);

  let grantExtraTurn = rolledSix && !isThreeSixesPenalty;
  let isGameOver = false;
  let winnerId = state.winnerId;

  if (isThreeSixesPenalty) {
    // Penalty: turn forfeited, no movement
    consecutiveSixes = 0;
    grantExtraTurn = false;
    events.push({
      id: `${matchId}-${++seq}`,
      sequence: seq,
      timestamp: now,
      matchId,
      type: 'TURN_PENALTY_THREE_SIXES',
      playerId: player.id
    });
  } else {
    // 2. Perform Movement
    const initialPos = player.position;
    const { finalTarget: movePos, bounced } = calculateMoveTarget(
      initialPos,
      rollTotal,
      board.totalTiles,
      state.settings.exactFinalSquare
    );

    events.push({
      id: `${matchId}-${++seq}`,
      sequence: seq,
      timestamp: now,
      matchId,
      type: 'MOVE_STEP',
      playerId: player.id,
      from: initialPos,
      to: movePos,
      bounced
    });

    let currentPos = movePos;

    // 3. Resolve Special Tiles / Snakes / Ladders
    // Check Ladder
    const ladder = board.ladders.find(l => l.from === currentPos);
    if (ladder) {
      events.push({
        id: `${matchId}-${++seq}`,
        sequence: seq,
        timestamp: now,
        matchId,
        type: 'LADDER_TRIGGERED',
        playerId: player.id,
        ladderBase: ladder.from,
        ladderTop: ladder.to
      });
      currentPos = ladder.to;
      player.stats.laddersClimbed++;
    } else {
      // Check Snake
      const snake = board.snakes.find(s => s.from === currentPos);
      if (snake) {
        if (player.hasShield) {
          // Shield absorbs snake bite!
          player.hasShield = false;
          events.push({
            id: `${matchId}-${++seq}`,
            sequence: seq,
            timestamp: now,
            matchId,
            type: 'SNAKE_TRIGGERED',
            playerId: player.id,
            snakeHead: snake.from,
            snakeTail: snake.to,
            absorbedByShield: true
          });
        } else {
          events.push({
            id: `${matchId}-${++seq}`,
            sequence: seq,
            timestamp: now,
            matchId,
            type: 'SNAKE_TRIGGERED',
            playerId: player.id,
            snakeHead: snake.from,
            snakeTail: snake.to,
            absorbedByShield: false
          });
          currentPos = snake.to;
          player.stats.snakesHit++;
        }
      } else {
        // Check Special Adventure Tiles if enabled
        if (state.settings.specialTilesEnabled && board.specialTiles.length > 0) {
          const tile = board.specialTiles.find(t => t.position === currentPos);
          if (tile) {
            const specialResult = resolveSpecialTile(tile.type, currentPos, player, state, rng);
            currentPos = specialResult.resultingPosition;
            if (specialResult.extraTurn) grantExtraTurn = true;

            events.push({
              id: `${matchId}-${++seq}`,
              sequence: seq,
              timestamp: now,
              matchId,
              type: 'SPECIAL_TILE_TRIGGERED',
              playerId: player.id,
              tilePosition: tile.position,
              tileType: tile.type,
              details: specialResult.details,
              resultingPosition: currentPos
            });
            player.stats.specialTilesHit++;
          }
        }
      }
    }

    player.position = currentPos;

    // Check Victory
    if (player.position >= board.totalTiles) {
      player.position = board.totalTiles;
      isGameOver = true;
      winnerId = player.id;
      player.rank = 1;

      events.push({
        id: `${matchId}-${++seq}`,
        sequence: seq,
        timestamp: now,
        matchId,
        type: 'PLAYER_FINISHED',
        playerId: player.id,
        rank: 1
      });

      events.push({
        id: `${matchId}-${++seq}`,
        sequence: seq,
        timestamp: now,
        matchId,
        type: 'GAME_FINISHED',
        winnerId: player.id,
        rankings: [player.id],
        durationMs: now - state.turnStartedAt
      });
    }
  }

  // Update players list
  const updatedPlayers = [...state.players];
  updatedPlayers[playerIndex] = player;

  // Determine next turn index
  let nextTurnIndex = playerIndex;
  if (!grantExtraTurn && !isGameOver) {
    nextTurnIndex = getNextActivePlayerIndex(updatedPlayers, playerIndex);
    consecutiveSixes = 0;
  }

  const nextPlayerId = updatedPlayers[nextTurnIndex].id;

  const nextState: GameStateDTO = {
    ...state,
    status: isGameOver ? 'finished' : 'in_progress',
    players: updatedPlayers,
    currentTurnIndex: nextTurnIndex,
    currentPlayerId: nextPlayerId,
    consecutiveSixesCount: consecutiveSixes,
    turnStartedAt: now,
    turnExpiresAt: now + state.settings.turnTimeoutSeconds * 1000,
    winnerId,
    winnerRankings: isGameOver && winnerId ? [winnerId] : state.winnerRankings,
    lastDiceRoll: rollTotal,
    lastDiceRolls: rolls,
    eventSequenceIndex: seq
  };

  return {
    nextState,
    events,
    isGameOver,
    winnerId
  };
}

/**
 * Finds next eligible connected/active player.
 */
export function getNextActivePlayerIndex(players: PlayerDTO[], currentIndex: number): number {
  const total = players.length;
  for (let i = 1; i <= total; i++) {
    const idx = (currentIndex + i) % total;
    const p = players[idx];
    if (!p.isSpectator && (p.rank === undefined || p.rank === null)) {
      return idx;
    }
  }
  return currentIndex;
}

/**
 * Resolves special tile effects in Adventure Mode.
 */
function resolveSpecialTile(
  type: SpecialTileType,
  pos: number,
  player: PlayerDTO,
  state: GameStateDTO,
  rng: DiceRng
): { resultingPosition: number; details: string; extraTurn?: boolean } {
  switch (type) {
    case 'boost': {
      const boostAmount = Math.floor(rng.next() * 3) + 2; // +2 to +4
      const nextPos = Math.min(state.board.totalTiles, pos + boostAmount);
      return { resultingPosition: nextPos, details: `Boosted forward +${boostAmount} tiles!` };
    }
    case 'trap': {
      const trapAmount = 3;
      const nextPos = Math.max(1, pos - trapAmount);
      return { resultingPosition: nextPos, details: `Fell into a trap! Knocked back ${trapAmount} tiles.` };
    }
    case 'shield': {
      player.hasShield = true;
      return { resultingPosition: pos, details: `Acquired Snake Immunity Shield! Next snake will be absorbed.` };
    }
    case 'double_dice': {
      player.hasDoubleDice = true;
      return { resultingPosition: pos, details: `Power-up: Double Dice active for your next turn!` };
    }
    case 'risk': {
      const isLucky = rng.next() >= 0.5;
      if (isLucky) {
        const nextPos = Math.min(state.board.totalTiles, pos + 8);
        return { resultingPosition: nextPos, details: `Risk Won! Surged forward +8 tiles!` };
      } else {
        const nextPos = Math.max(1, pos - 4);
        return { resultingPosition: nextPos, details: `Risk Failed! Slipped backward -4 tiles.` };
      }
    }
    case 'swap': {
      // Find nearest ahead opponent
      const rivals = state.players.filter(p => p.id !== player.id && !p.isSpectator);
      const ahead = rivals.filter(p => p.position > pos).sort((a, b) => a.position - b.position);
      if (ahead.length > 0) {
        const target = ahead[0];
        const swapPos = target.position;
        target.position = pos;
        return { resultingPosition: swapPos, details: `Position Swapped with ${target.name} (moved to ${swapPos})!` };
      }
      return { resultingPosition: pos, details: `No rivals ahead to swap with.` };
    }
    case 'bonus_turn': {
      return { resultingPosition: pos, details: `Star Power! Extra turn awarded!`, extraTurn: true };
    }
    case 'safe':
    default:
      return { resultingPosition: pos, details: `Resting in sanctuary.` };
  }
}
