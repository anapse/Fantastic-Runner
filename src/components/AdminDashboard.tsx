import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Clock,
  Sparkles,
  Flame,
  Coins,
  Crosshair,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  Search,
  Database,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { fetchAdminDashboardData, AdminDashboardData } from '../game/firebase';

interface Props {
  onBackToGame: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ onBackToGame }) => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchAdminDashboardData();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setErrorMessage(
        'No se pudo conectar con Firestore. Verifica la conexión o las reglas de seguridad.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTop50 = data?.top50.filter((entry) =>
    entry.playerName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 font-sans p-3 sm:p-6 flex flex-col items-center select-none overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12)_0%,transparent_70%)]" />

      {/* Main Container */}
      <div className="relative w-full max-w-5xl flex flex-col gap-6 z-10">
        {/* Top Navbar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-cyan-500/30 backdrop-blur-lg p-4 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToGame}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 px-3 py-2 rounded-2xl text-xs font-black transition-all active:scale-95 shadow-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>IR AL JUEGO</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black italic tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 uppercase">
                  FANTASTIC-RUNNER
                </h1>
                <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ADMIN /admin
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Colección Firestore: <code className="text-cyan-300 font-mono">ranking</code></span>
                <span>•</span>
                <span>ANAPSE GAMES</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-400/60 text-cyan-200 px-3 py-2 rounded-2xl text-xs font-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>ACTUALIZAR</span>
            </button>
          </div>
        </header>

        {/* Global Record Detection Banner */}
        {data && data.hasData && (
          <div className="bg-gradient-to-r from-amber-950/80 via-yellow-950/40 to-slate-900 border-2 border-amber-400/70 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-black tracking-widest text-amber-300">
                    MÁXIMA PUNTUACIÓN REGISTRADA
                  </span>
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>🏆 NUEVO RÉCORD</span>
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-yellow-300">
                  {data.bestScore.toLocaleString()} pts
                  <span className="text-sm font-sans font-bold text-slate-300 ml-2">
                    por <span className="text-cyan-300 font-extrabold">{data.bestPlayer}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400 font-mono">
              <span>Auditoría en tiempo real</span>
              <span className="block text-[10px] text-slate-500">
                Última sincronización: {lastRefreshed.toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* 1. RESUMEN (Summary Cards) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
              RESUMEN DEL RANKING
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total de registros */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>TOTAL REGISTROS</span>
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-300 mt-2">
                {isLoading ? '...' : (data?.totalRecords || 0)}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Partidas en Firestore</span>
            </div>

            {/* Mejor puntuación */}
            <div className="bg-slate-900/80 border border-amber-500/40 p-4 rounded-2xl flex flex-col justify-between shadow-[0_0_20px_rgba(245,158,11,0.1)]">
              <div className="flex items-center justify-between text-amber-300 text-xs font-bold uppercase">
                <span>MEJOR PUNTUACIÓN</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-yellow-300 mt-2">
                {isLoading ? '...' : (data?.bestScore || 0).toLocaleString()}
              </div>
              <span className="text-[10px] text-amber-400/80 mt-1 font-semibold truncate">
                Récord vigente
              </span>
            </div>

            {/* Mejor jugador */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>MEJOR JUGADOR</span>
                <Sparkles className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-200 mt-2 truncate">
                {isLoading ? '...' : (data?.bestPlayer || 'N/A')}
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Líder del TOP 1</span>
            </div>

            {/* Última puntuación registrada */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
                <span>ÚLTIMO REGISTRO</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-2 truncate">
                {isLoading ? '...' : (data?.latestScore || 0).toLocaleString()} pts
              </div>
              <span className="text-[10px] text-slate-400 mt-1 truncate">
                Por {data?.latestPlayer || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. ESTADÍSTICAS DEL JUEGO (Game Metrics) */}
        {data && data.hasData && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-200">
                ESTADÍSTICAS ACUMULADAS DEL JUEGO
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">PARTIDAS</span>
                <span className="text-xl font-black font-mono text-white mt-1 block">
                  {data.totalRecords}
                </span>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-amber-400 uppercase block">TOTAL MONEDAS</span>
                <span className="text-xl font-black font-mono text-amber-300 mt-1 block flex items-center justify-center gap-1">
                  <span>{data.totalCoins.toLocaleString()}</span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </span>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-red-400 uppercase block">TOTAL KILLS</span>
                <span className="text-xl font-black font-mono text-red-400 mt-1 block flex items-center justify-center gap-1">
                  <span>{data.totalKills.toLocaleString()}</span>
                  <Crosshair className="w-4 h-4 text-red-400" />
                </span>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3.5 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-cyan-400 uppercase block">MAYOR DISTANCIA</span>
                <span className="text-xl font-black font-mono text-cyan-300 mt-1 block">
                  {data.maxDistance.toLocaleString()} m
                </span>
              </div>

              <div className="bg-slate-900/70 border border-amber-500/30 p-3.5 rounded-2xl text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold text-yellow-300 uppercase block">MAYOR PUNTUACIÓN</span>
                <span className="text-xl font-black font-mono text-yellow-300 mt-1 block">
                  {data.bestScore.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. TOP 50 RANKING TABLE */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>TOP 50 JUGADORES (SCORE DESC)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clasificación global oficial consultada en directo desde Firestore.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar jugador..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all font-medium"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400">
                <RefreshCw className="w-8 h-8 animate-spin" />
                <span className="text-xs font-mono font-bold">CARGANDO REGISTROS DE FIRESTORE...</span>
              </div>
            ) : errorMessage ? (
              <div className="py-8 text-center text-red-400 text-xs">
                {errorMessage}
              </div>
            ) : filteredTop50.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {searchTerm ? 'No se encontraron jugadores que coincidan con la búsqueda.' : 'No hay registros en la colección ranking todavía.'}
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">POS</th>
                    <th className="py-2.5 px-3">JUGADOR</th>
                    <th className="py-2.5 px-3 text-right">SCORE</th>
                    <th className="py-2.5 px-3 text-right">DISTANCIA</th>
                    <th className="py-2.5 px-3 text-right">MONEDAS</th>
                    <th className="py-2.5 px-3 text-right">FECHA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredTop50.map((entry, idx) => {
                    const pos = idx + 1;
                    const isTop1 = pos === 1;
                    const isTop2 = pos === 2;
                    const isTop3 = pos === 3;

                    return (
                      <tr
                        key={entry.id || idx}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isTop1
                            ? 'bg-amber-950/30 font-bold text-amber-200'
                            : isTop2
                            ? 'bg-slate-800/20 text-slate-200'
                            : isTop3
                            ? 'bg-amber-900/10 text-amber-300'
                            : 'text-slate-300'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold">
                          {isTop1 ? (
                            <span className="flex items-center gap-1 text-amber-300">
                              <span>🥇</span>
                              <span className="text-[10px] bg-amber-500/20 border border-amber-400/40 px-1 rounded">#1</span>
                            </span>
                          ) : isTop2 ? (
                            <span className="flex items-center gap-1 text-slate-300">
                              <span>🥈</span>
                              <span className="text-[10px]">#2</span>
                            </span>
                          ) : isTop3 ? (
                            <span className="flex items-center gap-1 text-amber-400">
                              <span>🥉</span>
                              <span className="text-[10px]">#3</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">#{pos}</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="font-extrabold text-cyan-200">
                            {entry.playerName || 'Anónimo'}
                          </span>
                          {isTop1 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                              Líder
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300 text-sm">
                          {(entry.score || 0).toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                          {entry.distance !== undefined ? `${entry.distance.toLocaleString()}m` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                          {entry.coins !== undefined ? `${entry.coins.toLocaleString()} 🪙` : '—'}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-slate-500 text-[10px]">
                          {entry.createdAt ? (
                            <span className="flex items-center justify-end gap-1">
                              <Calendar className="w-3 h-3 text-slate-600" />
                              <span>{new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Security & Access Protection Footer Notice */}
        <footer className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-slate-300">Reglas de Seguridad Firestore Activas:</span>
              <span className="block text-[11px] text-slate-500">
                Los registros son inmutables (`update, delete: if false`). No es posible la alteración de puntuaciones por visitantes.
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-slate-500">
            Fantastic-Runner • Proyecto Firebase: <code className="text-cyan-400">gen-lang-client-0164582744</code>
          </div>
        </footer>
      </div>
    </div>
  );
};
