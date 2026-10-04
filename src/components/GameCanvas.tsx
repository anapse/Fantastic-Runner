import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/engine';

interface Props {
  engine: GameEngine | null;
}

export const GameCanvas: React.FC<Props> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Swipe / Drag Tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!engine || !canvasRef.current) return;
    engine.canvas = canvasRef.current;
    engine.ctx = canvasRef.current.getContext('2d')!;
  }, [engine]);

  // Convert screen pixels to 450x800 internal Canvas coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 225, y: 350 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Handle Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engine || engine.isGameOver) return;

      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        engine.moveLeft();
      } else if (key === 'arrowright' || key === 'd') {
        engine.moveRight();
      } else if (key === 'arrowup' || key === 'w') {
        engine.jump();
      } else if (key === ' ' || key === 'f' || key === 'j') {
        engine.shoot();
      } else if (key === 'shift' || key === 'e' || key === 'k') {
        engine.dash();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engine]);

  // PC Mouse Controls: moving mouse directs crosshair, clicking fires towards crosshair
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!engine || engine.isGameOver) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    engine.setAimPosition(coords.x, coords.y);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!engine || engine.isGameOver) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    engine.setAimPosition(coords.x, coords.y);
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!engine || !touchStartRef.current || engine.isGameOver) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    engine.setAimPosition(coords.x, coords.y);

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > 30 || absY > 30) {
      if (dy < -30 && absX < 40) engine.jump();
      else if (dy < -30 && dx < -30) engine.jump('LEFT');
      else if (dy < -30 && dx > 30) engine.jump('RIGHT');
      else if (dx < -30) engine.moveLeft();
      else if (dx > 30) engine.moveRight();
    } else if (dt < 350) {
      engine.shoot();
    }

    touchStartRef.current = null;
  };

  // Mobile Touch Controls: dragging finger positions crosshair, tap or on-screen button fires
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!engine || engine.isGameOver) return;
    const t = e.touches[0];
    const coords = getCanvasCoords(t.clientX, t.clientY);
    engine.setAimPosition(coords.x, coords.y);
    touchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      time: Date.now(),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!engine || engine.isGameOver) return;
    const t = e.touches[0];
    const coords = getCanvasCoords(t.clientX, t.clientY);
    engine.setAimPosition(coords.x, coords.y);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!engine || !touchStartRef.current || engine.isGameOver) return;
    const t = e.changedTouches[0];
    const coords = getCanvasCoords(t.clientX, t.clientY);
    engine.setAimPosition(coords.x, coords.y);

    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Swipe Threshold for player navigation
    if (absX > 30 || absY > 30) {
      if (dy < -30 && absX < 40) {
        engine.jump();
      } else if (dy < -30 && dx < -30) {
        engine.jump('LEFT');
      } else if (dy < -30 && dx > 30) {
        engine.jump('RIGHT');
      } else if (dx < -30) {
        engine.moveLeft();
      } else if (dx > 30) {
        engine.moveRight();
      }
    } else if (dt < 300) {
      // Short Tap fires directly towards tapped position
      engine.shoot();
    }

    touchStartRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={450}
      height={800}
      className="w-full h-full object-contain cursor-crosshair touch-none select-none block"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};
