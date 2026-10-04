import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Globe, HardDrive, AlertCircle } from 'lucide-react';
import { sound } from '../game/audio';
import { fetchTopRanking, RankingEntry } from '../game/firebase';
import { loadLeaderboard } from '../game/storage';
import { LeaderboardEntry } from '../game/types';

interface Props {
  onClose: () => void;
}

export const RankingModal: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<'ONLINE' | 'LOCAL'>('ONLINE');
  const [onlineRanking, setOnlineRanking] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localLeaderboard = loadLeaderboard();

  const loadOnlineData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchTopRanking(50);
      setOnlineRanking(data);
    } catch (err) {
      console.warn('Could not load online ranking:', err);
      setErrorMessage('No se pudo conectar con el servidor de ranking.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOnlineData();
  }, []);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between p-3.5 bg-slate-950/95 backdrop-blur-md text-white font-sans select-none overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5">
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="flex items-center gap-1 bg-slate-900 border border-cyan-500/40 px-2.5 py-1.5 rounded-xl text-cyan-300 font-bold text-xs hover:bg-slate-800 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>VOLVER</span>
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-lg font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 uppercase">
            TOP 50 RANKING
          </h2>
          <span className="text-[9px] text-cyan-400 font-mono tracking-widest">
            {tab === 'ONLINE' ? 'GLOBAL • FIRESTORE' : 'LOCAL • DISPOSITIVO'}
          </span>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            if (tab === 'ONLINE') loadOnlineData();
          }}
          title="Actualizar ranking"
          disabled={isLoading}
          className="p-1.5 bg-slate-900 border border-cyan-500/40 rounded-xl text-cyan-300 hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs: ONLINE (Firebase) vs LOCAL */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => {
            sound.playClick();
            setTab('ONLINE');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all ${
            tab === 'ONLINE'
              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>GLOBAL (ONLINE)</span>
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setTab('LOCAL');
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-black transition-all ${
            tab === 'LOCAL'
              ? 'bg-amber-500/20 border border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>LOCAL</span>
        </button>
      </div>

      {/* Table Column Headers */}
      <div className="flex items-center justify-between px-3 py-1 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-7 text-center">POS</span>
          <span>JUGADOR</span>
        </div>
        <span>PUNTUACIÓN</span>
      </div>

      {/* Content Body */}
      <div className="flex-1 my-2 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
        {tab === 'ONLINE' ? (
          <>
            {isLoading ? (
              <div className="my-auto flex flex-col items-center justify-center gap-2 py-8 text-cyan-300">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <span className="text-xs font-bold font-mono tracking-wider">CARGANDO TOP 50 GLOBAL...</span>
              </div>
            ) : errorMessage ? (
              <div className="my-auto flex flex-col items-center justify-center gap-3 p-4 bg-red-950/40 border border-red-500/40 rounded-2xl text-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-red-300">{errorMessage}</span>
                  <span className="text-[10px] text-slate-400 mt-1">Revisa tu conexión a internet o consulta los récords locales.</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={loadOnlineData}
                    className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-400/50 rounded-lg text-xs font-bold"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={() => setTab('LOCAL')}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold"
                  >
                    Ver Récords Locales
                  </button>
                </div>
              </div>
            ) : onlineRanking.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Trophy className="w-10 h-10 text-amber-400/60" />
                <span className="text-sm font-extrabold text-slate-200">¡Ranking Global Vacío!</span>
                <span className="text-xs text-slate-400 max-w-xs">
                  Completa una partida y sé el primero en inmortalizar tu nombre en el TOP 50.
                </span>
              </div>
            ) : (
              onlineRanking.map((entry, idx) => {
                const position = idx + 1;
                let rankBadge = `${position}`;
                let rankStyle = 'bg-slate-900/80 border-slate-800 text-slate-300';

                if (position === 1) {
                  rankBadge = '🥇';
                  rankStyle = 'bg-amber-950/70 border-amber-400/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]';
                } else if (position === 2) {
                  rankBadge = '🥈';
                  rankStyle = 'bg-slate-800/90 border-slate-300 text-slate-100 shadow-[0_0_10px_rgba(226,232,240,0.2)]';
                } else if (position === 3) {
                  rankBadge = '🥉';
                  rankStyle = 'bg-amber-900/50 border-amber-600 text-amber-300';
                }

                const displayName = (entry.playerName || 'Anónimo').trim() || 'Anónimo';
                const formattedScore = (typeof entry.score === 'number' ? entry.score : 0).toLocaleString();
                const formattedDate = entry.createdAt
                  ? new Date(entry.createdAt).toLocaleDateString()
                  : undefined;

                return (
                  <div
                    key={entry.id || idx}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${rankStyle}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center font-black text-xs">
                        {rankBadge}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-xs text-cyan-200 tracking-wide">
                          {displayName}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {entry.distance !== undefined ? `${entry.distance}m` : ''}
                          {entry.coins !== undefined ? ` • ${entry.coins} 🪙` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-amber-300 text-sm">
                        {formattedScore}
                      </span>
                      {formattedDate && (
                        <span className="block text-[8px] text-slate-400 font-mono">
                          {formattedDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          localLeaderboard.map((entry: LeaderboardEntry, idx: number) => {
            const position = idx + 1;
            let rankBadge = `${position}`;
            let rankStyle = 'bg-slate-900/80 border-slate-800 text-slate-300';

            if (position === 1) {
              rankBadge = '🥇';
              rankStyle = 'bg-amber-950/70 border-amber-400/80 text-amber-200';
            } else if (position === 2) {
              rankBadge = '🥈';
              rankStyle = 'bg-slate-800/90 border-slate-300 text-slate-100';
            } else if (position === 3) {
              rankBadge = '🥉';
              rankStyle = 'bg-amber-900/50 border-amber-600 text-amber-300';
            }

            return (
              <div
                key={entry.id || idx}
                className={`p-2.5 rounded-xl border flex items-center justify-between ${rankStyle}`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/40 flex items-center justify-center font-black text-xs">
                    {rankBadge}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-amber-200 tracking-wide">
                      {entry.playerName || 'Corredor'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {entry.distance}m • {entry.coins} 🪙
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-yellow-300 text-sm">
                    {entry.score.toLocaleString()}
                  </span>
                  <span className="block text-[8px] text-slate-400 font-mono">{entry.date}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-[10px] text-cyan-400/60 uppercase tracking-widest font-mono border-t border-slate-800 pt-2">
        MÁXIMAS PUNTUACIONES • ANAPSE GAMES
      </div>
    </div>
  );
};
