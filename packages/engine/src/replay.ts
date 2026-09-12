import { GameEvent, GameStateDTO } from '@snakes/shared';
import { reduceGameEvent } from './events.js';

export interface ReplayFrame {
  eventIndex: number;
  event: GameEvent;
  state: GameStateDTO;
}

export class GameReplayEngine {
  private initialSnapshot: GameStateDTO;
  private events: GameEvent[];

  constructor(initialSnapshot: GameStateDTO, events: GameEvent[]) {
    this.initialSnapshot = initialSnapshot;
    this.events = [...events].sort((a, b) => a.sequence - b.sequence);
  }

  get totalEvents(): number {
    return this.events.length;
  }

  /**
   * Generates all historical states by stepping through recorded events.
   */
  buildFrames(): ReplayFrame[] {
    let currentState = this.initialSnapshot;
    const frames: ReplayFrame[] = [];

    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      currentState = reduceGameEvent(currentState, ev);
      frames.push({
        eventIndex: i,
        event: ev,
        state: JSON.parse(JSON.stringify(currentState))
      });
    }

    return frames;
  }
}
