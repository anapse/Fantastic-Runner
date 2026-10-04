import React from 'react';
import { GameEngine } from '../game/engine';
import { RotateCcw, Home, Trophy, Skull, User, CheckCircle2 } from 'lucide-react';
import { sound } from '../game/audio';

interface Props {
  engine: GameEngine;
  playerName: string;
  onRestart: () => void;
  onExitToMenu: () => void;
  onOpenRanking: () => void;
}

export const GameOverModal: React.FC<Props> = ({
  engine,
  playerName,
  onRestart,
  onExitToMenu,
  onOpenRanking,
}) => {
  const { score, distance, coinsCollected, killsCount, stats } = engine;
  const isNewRecord = score > stats.highScore;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md text-white font-sans select-none overflow-y-auto">
      <div className="w-full max-w-xs bg-slate-900 border-2 border-red-500/50 rounded-3xl p-4 flex flex-col items-center gap-3.5 shadow-[0_0_50px_rgba(239,68,68,0.35)] my-auto">
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 bg-red-950/80 rounded-full flex items-center justify-center border border-red-500/50 text-red-400 mb-1 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <Skull className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-400 to-yellow-300 uppercase">
            GAME OVER
          </h2>
          {isNewRecord && (
            <div className="flex items-center gap-1 mt-0.5 bg-amber-500 text-slate-950 font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
              <Trophy className="w-3 h-3" />
              <span>¡NUEVO RÉCORD!</span>
            </div>
          )}
        </div>

        {/* Player Name Tag */}
        <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1 rounded-full text-cyan-200 text-xs font-bold shadow-inner">
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span>JUGADOR:</span>
          <span className="text-white font-extrabold">{playerName}</span>
        </div>

        {/* Score Card Breakdown */}
        <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">PUNTUACIÓN</span>
            <span className="font-mono font-black text-amber-300 text-lg">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="w-full h-px bg-slate-800" />

          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-bold">
            <div className="flex flex-col bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[8px] text-cyan-400 font-mono">DISTANCIA</span>
              <span className="text-white font-mono text-[11px]">{Math.floor(distance)}m</span>
            </div>
            <div className="flex flex-col bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[8px] text-amber-400 font-mono">MONEDAS</span>
              <span className="text-amber-300 font-mono text-[11px]">+{coinsCollected}</span>
            </div>
            <div className="flex flex-col bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <span className="text-[8px] text-red-400 font-mono">BAJAS</span>
              <span className="text-red-300 font-mono text-[11px]">{killsCount}</span>
            </div>
          </div>
        </div>

        {/* Ranking Recorded Status & View Top 50 Button */}
        <div className="w-full bg-slate-950/90 border border-amber-500/40 rounded-2xl p-2 flex flex-col items-center gap-1.5 shadow-inner">
          <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PUNTUACIÓN REGISTRADA EN EL RANKING</span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onOpenRanking();
            }}
            className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>VER RANKING TOP 50</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full mt-0.5">
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REINTENTAR</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onExitToMenu();
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>MENÚ PRINCIPAL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
