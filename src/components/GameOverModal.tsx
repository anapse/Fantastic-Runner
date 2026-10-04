import React, { useState } from 'react';
import { GameEngine } from '../game/engine';
import { RotateCcw, Home, Trophy, Skull, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { sound } from '../game/audio';
import { saveScoreToRanking } from '../game/firebase';
import { addLeaderboardScore } from '../game/storage';

interface Props {
  engine: GameEngine;
  onRestart: () => void;
  onExitToMenu: () => void;
  onOpenRanking: () => void;
}

export const GameOverModal: React.FC<Props> = ({
  engine,
  onRestart,
  onExitToMenu,
  onOpenRanking,
}) => {
  const { score, distance, coinsCollected, killsCount, stats } = engine;
  const isNewRecord = score > stats.highScore;

  // Player name persistence
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('fantastic_runner_last_player_name') || 'Leo Runner';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSaveToRanking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = playerName.trim() || 'Corredor';
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Guardar en Firestore colección 'ranking'
      await saveScoreToRanking({
        playerName: trimmed,
        score,
        distance: Math.floor(distance),
        kills: killsCount,
        coins: coinsCollected,
      });

      // 2. Guardar también en récord local de respaldo
      addLeaderboardScore({
        playerName: trimmed,
        score,
        distance: Math.floor(distance),
        coins: coinsCollected,
      });

      localStorage.setItem('fantastic_runner_last_player_name', trimmed);
      setIsSaved(true);
      sound.playPowerUp();
    } catch (err) {
      console.error('Error saving score to ranking:', err);
      setErrorMessage('No se pudo conectar con Firebase. Puedes reintentar o continuar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-md text-white font-sans select-none overflow-y-auto">
      <div className="w-full max-w-xs bg-slate-900 border-2 border-red-500/50 rounded-3xl p-4 flex flex-col items-center gap-3.5 shadow-[0_0_50px_rgba(239,68,68,0.35)] my-auto">
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="w-11 h-11 bg-red-950/80 rounded-full flex items-center justify-center border border-red-500/50 text-red-400 mb-1">
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

        {/* Firebase Ranking Registration Section */}
        {score > 0 && (
          <div className="w-full bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-2.5 flex flex-col gap-2 shadow-inner">
            {!isSaved ? (
              <form onSubmit={handleSaveToRanking} className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 text-center">
                  REGISTRAR EN RANKING GLOBAL
                </span>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={25}
                    placeholder="Tu nombre o apodo"
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-900 border border-cyan-500/50 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-300 font-bold"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !playerName.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-md active:scale-95 transition-all"
                  >
                    {isSubmitting ? (
                      <span className="animate-spin text-xs">⏳</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>GUARDAR</span>
                      </>
                    )}
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-1 text-[9px] text-red-400 mt-0.5">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <div className="flex items-center gap-1 text-emerald-400 font-black text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡GUARDADO EN EL RANKING!</span>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    onOpenRanking();
                  }}
                  className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/50 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>VER RANKING TOP 50</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 w-full mt-0.5">
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REINTENTAR</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onExitToMenu();
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs uppercase rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span>MENÚ PRINCIPAL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
