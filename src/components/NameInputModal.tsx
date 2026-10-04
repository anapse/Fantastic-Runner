import React, { useState } from 'react';
import { Play, ArrowLeft, User, AlertCircle } from 'lucide-react';
import { sound } from '../game/audio';

interface Props {
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const NameInputModal: React.FC<Props> = ({
  initialName = '',
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = name.trim();

    if (cleanName.length < 1) {
      setError('Debes ingresar tu nombre o alias para comenzar.');
      return;
    }

    if (cleanName.length > 30) {
      setError('El nombre no puede tener más de 30 caracteres.');
      return;
    }

    sound.playPowerUp();
    onConfirm(cleanName);
  };

  const isNameValid = name.trim().length >= 1 && name.trim().length <= 30;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md text-white font-sans select-none">
      <div className="w-full max-w-xs bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-5 flex flex-col items-center gap-4 shadow-[0_0_50px_rgba(0,240,255,0.3)]">
        {/* Header Icon */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-cyan-950/80 rounded-full flex items-center justify-center border border-cyan-400/50 text-cyan-300 mb-1 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-amber-300 uppercase">
            INGRESA TU NOMBRE
          </h2>
          <span className="text-[10px] text-slate-400 text-center mt-0.5 max-w-[240px]">
            Tu nombre identificará tu récord en el Ranking Global
          </span>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={30}
                placeholder="Escribe tu alias..."
                className="w-full bg-slate-950 border-2 border-cyan-500/40 focus:border-cyan-300 rounded-2xl px-3.5 py-2.5 text-sm text-cyan-100 placeholder-slate-500 focus:outline-none font-bold text-center transition-all shadow-inner"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono">
                {name.trim().length}/30
              </span>
            </div>

            {error && (
              <div className="flex items-center gap-1 text-[10px] text-red-400 px-1 mt-0.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              type="submit"
              disabled={!isNameValid}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>COMENZAR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onCancel();
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs uppercase rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>VOLVER</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
