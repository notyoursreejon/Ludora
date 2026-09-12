import { describe, it, expect } from 'vitest';
import { createBoard, getTileCoordinates } from '../src/board.js';

describe('Board Engine', () => {
  it('should generate classic 100 board correctly', () => {
    const board = createBoard('classic-100');
    expect(board.totalTiles).toBe(100);
    expect(board.cols).toBe(10);
    expect(board.rows).toBe(10);
    expect(board.snakes.length).toBeGreaterThan(0);
    expect(board.ladders.length).toBeGreaterThan(0);

    // Validate ladder integrity: base < top, neither is 0 or > 100
    for (const ladder of board.ladders) {
      expect(ladder.from).toBeLessThan(ladder.to);
      expect(ladder.from).toBeGreaterThan(1);
      expect(ladder.to).toBeLessThanOrEqual(100);
    }

    // Validate snake integrity: head > tail
    for (const snake of board.snakes) {
      expect(snake.from).toBeGreaterThan(snake.to);
      expect(snake.to).toBeGreaterThan(0);
      expect(snake.from).toBeLessThan(100); // 100 shouldn't be a snake head
    }
  });

  it('should generate speed 50 board correctly', () => {
    const board = createBoard('speed-50');
    expect(board.totalTiles).toBe(50);
    expect(board.rows).toBe(5);
    for (const ladder of board.ladders) {
      expect(ladder.to).toBeLessThanOrEqual(50);
    }
  });

  it('should map serpentine coordinates accurately', () => {
    // Tile 1: Row 0, Col 0 (bottom-left)
    const t1 = getTileCoordinates(1, 10, 10);
    expect(t1.row).toBe(0);
    expect(t1.col).toBe(0);

    // Tile 10: Row 0, Col 9 (bottom-right)
    const t10 = getTileCoordinates(10, 10, 10);
    expect(t10.row).toBe(0);
    expect(t10.col).toBe(9);

    // Tile 11: Row 1, Col 9 (second row right side, moves left)
    const t11 = getTileCoordinates(11, 10, 10);
    expect(t11.row).toBe(1);
    expect(t11.col).toBe(9);

    // Tile 20: Row 1, Col 0 (second row left side)
    const t20 = getTileCoordinates(20, 10, 10);
    expect(t20.row).toBe(1);
    expect(t20.col).toBe(0);

    // Tile 100: Row 9, Col 0 (top row leftmost if rows are alternating)
    const t100 = getTileCoordinates(100, 10, 10);
    expect(t100.row).toBe(9);
    expect(t100.col).toBe(0);
  });
});
