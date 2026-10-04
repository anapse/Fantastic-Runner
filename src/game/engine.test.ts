import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from './engine';
import { DEFAULT_STATS } from './storage';

// Stub global Image for Node environment
(global as any).Image = class {
  onload: (() => void) | null = null;
  src: string = '';
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};

describe('GameEngine - Game Over & Lives Test', () => {
  const createMockCanvas = () => ({
    width: 450,
    height: 800,
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      drawImage: () => {},
      fillText: () => {},
      measureText: () => ({ width: 10 }),
    }),
  } as unknown as HTMLCanvasElement);

  it('should initialize with 3 lives and isGameOver false', () => {
    const canvas = createMockCanvas();
    const engine = new GameEngine(canvas, DEFAULT_STATS, () => {});

    expect(engine.player.lives).toBe(3);
    expect(engine.isGameOver).toBe(false);
  });

  it('should trigger game over and invoke onUIUpdate when lives reach 0', () => {
    const canvas = createMockCanvas();
    const uiUpdateSpy = vi.fn();
    const engine = new GameEngine(canvas, DEFAULT_STATS, uiUpdateSpy);

    // Inflict damage 1: lives 3 -> 2
    (engine as any).player.invulnerableTimer = 0;
    (engine as any).damagePlayer('OBSTACLE');
    expect(engine.player.lives).toBe(2);
    expect(engine.isGameOver).toBe(false);

    // Inflict damage 2: lives 2 -> 1
    (engine as any).player.invulnerableTimer = 0;
    (engine as any).damagePlayer('OBSTACLE');
    expect(engine.player.lives).toBe(1);
    expect(engine.isGameOver).toBe(false);

    // Inflict damage 3: lives 1 -> 0 (GAME OVER)
    (engine as any).player.invulnerableTimer = 0;
    (engine as any).damagePlayer('OBSTACLE');
    expect(engine.player.lives).toBe(0);
    expect(engine.isGameOver).toBe(true);
    expect((engine as any).player.animState).toBe('DEATH');
    expect(uiUpdateSpy).toHaveBeenCalled();

    // Subsequent damage should be ignored (no negative lives, no second Game Over)
    uiUpdateSpy.mockClear();
    (engine as any).player.invulnerableTimer = 0;
    (engine as any).damagePlayer('OBSTACLE');
    expect(engine.player.lives).toBe(0);
    expect(engine.isGameOver).toBe(true);
    expect(uiUpdateSpy).not.toHaveBeenCalled();
  });

  it('should cleanly reset lives to 3 and isGameOver to false on new run', () => {
    const canvas = createMockCanvas();
    const engine = new GameEngine(canvas, DEFAULT_STATS, () => {});

    // Force game over
    (engine as any).player.lives = 1;
    (engine as any).player.invulnerableTimer = 0;
    (engine as any).damagePlayer('OBSTACLE');
    expect(engine.isGameOver).toBe(true);
    expect(engine.player.lives).toBe(0);

    // Reset for new game
    engine.reset(DEFAULT_STATS);
    expect(engine.isGameOver).toBe(false);
    expect(engine.player.lives).toBe(3);
    expect(engine.player.animState).toBe('RUN');
  });
});
