import React from 'react';
import { GameEngine } from '../game/engine';
import { Pause, Heart, Zap, Crosshair, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { sound } from '../game/audio';

interface Props {
  engine: GameEngine;
  onPause: () => void;
}

export const HUDOverlay: React.FC<Props> = ({ engine, onPause }) => {
  const { player, score, distance } = engine;
  const gems = engine.stats.gems || 327;
  const showTouchControls = engine.stats.settings.touchControlMode !== 'GESTURES';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2.5 select-none text-white font-sans z-10">
      {/* TOP HUD BAR - Compact & Responsive to prevent overflow */}
      <div className="flex flex-col w-full gap-1">
        <div className="flex items-center justify-between w-full gap-1">
          {/* Hearts */}
          <div className="flex items-center gap-1 bg-[#0a1120]/90 backdrop-blur-md px-2 py-1 rounded-xl border border-red-500/40 shadow-lg">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Heart
                key={idx}
                className={`w-4 h-4 transition-all duration-300 ${
                  idx < player.lives
                    ? 'fill-red-500 text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.9)] animate-pulse'
                    : 'fill-slate-800 text-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Puntos & Gems Group */}
          <div className="flex items-center gap-1.5">
            {/* PUNTOS */}
            <div className="bg-[#0a1120]/90 backdrop-blur-md px-2.5 py-0.5 rounded-xl border border-yellow-500/50 text-center shadow-lg">
              <span className="block text-[7px] uppercase tracking-wider text-yellow-400 font-extrabold leading-tight">
                PUNTOS
              </span>
              <span className="text-xs font-black font-mono text-yellow-300">
                {score.toLocaleString()}
              </span>
            </div>

            {/* GEMS */}
            <div className="bg-[#0a1120]/90 backdrop-blur-md px-2 py-1 rounded-xl border border-cyan-400/50 flex items-center gap-1 shadow-lg">
              <span className="text-cyan-400 text-xs">💎</span>
              <span className="text-xs font-black font-mono text-cyan-200">
                {gems}
              </span>
            </div>
          </div>

          {/* Pause Button */}
          <button
            onClick={() => {
              sound.playClick();
              onPause();
            }}
            className="pointer-events-auto bg-[#0a1120]/90 hover:bg-[#13223f] active:scale-95 border border-cyan-500/60 p-1.5 rounded-xl text-cyan-300 shadow-lg cursor-pointer transition-all"
          >
            <Pause className="w-4 h-4 fill-cyan-400 text-cyan-400" />
          </button>
        </div>

        {/* DISTANCIA Badge */}
        <div className="self-start bg-[#0a1120]/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-cyan-500/40 text-left shadow-md flex items-center gap-1">
          <span className="text-[8px] uppercase tracking-wider text-cyan-400 font-extrabold">
            DIST:
          </span>
          <span className="text-xs font-black font-mono text-white">
            {Math.floor(distance).toLocaleString()}m
          </span>
        </div>

        {/* Active Powerup Badges */}
        {Object.entries(player.activePowerUps).length > 0 && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {Object.entries(player.activePowerUps).map(([pType, duration]) => (
              <div
                key={pType}
                className="flex items-center gap-1 bg-cyan-950/90 border border-cyan-400 px-2 py-0.5 rounded-lg text-[9px] font-bold text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.4)] animate-pulse"
              >
                <Zap className="w-3 h-3 text-yellow-400" />
                <span>{pType}</span>
                <span className="text-white">({Math.ceil(duration || 0)}s)</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OPTIONAL FLOATING ON-SCREEN BUTTONS */}
      {showTouchControls && (
        <div className="pointer-events-auto flex items-end justify-between w-full mb-1 px-1 opacity-50 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5">
            <button
              onMouseDown={() => engine.moveLeft()}
              onTouchStart={(e) => {
                e.preventDefault();
                engine.moveLeft();
              }}
              className="w-10 h-10 bg-slate-900/70 border border-cyan-400/50 rounded-xl flex items-center justify-center text-cyan-300 active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onMouseDown={() => engine.moveRight()}
              onTouchStart={(e) => {
                e.preventDefault();
                engine.moveRight();
              }}
              className="w-10 h-10 bg-slate-900/70 border border-cyan-400/50 rounded-xl flex items-center justify-center text-cyan-300 active:scale-95"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <button
            onMouseDown={() => engine.jump()}
            onTouchStart={(e) => {
              e.preventDefault();
              engine.jump();
            }}
            className="w-11 h-11 bg-slate-900/70 border border-blue-400/50 rounded-full flex items-center justify-center text-blue-300 active:scale-95"
          >
            <ArrowUp className="w-5 h-5" />
          </button>

          <button
            onMouseDown={() => engine.shoot()}
            onTouchStart={(e) => {
              e.preventDefault();
              engine.shoot();
            }}
            className="w-11 h-11 bg-amber-600/70 border border-amber-300/50 rounded-full flex items-center justify-center text-amber-200 active:scale-95"
          >
            <Crosshair className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
