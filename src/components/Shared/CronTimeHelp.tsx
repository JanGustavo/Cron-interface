import React from 'react';

export const CronTimeHelp: React.FC = () => {
  return (
    <div className="relative inline-flex items-center group">
      <button
        type="button"
        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-indigo-500/20 bg-indigo-950/40 text-indigo-300 hover:text-white hover:bg-indigo-900/60 transition-colors"
        aria-label="Ajuda sobre cron e every"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
        </svg>
      </button>

      <div className="absolute left-1/2 top-full mt-2 w-80 -translate-x-1/2 rounded-xl border border-indigo-500/20 bg-[#0a0d1d]/95 p-3 text-[10px] text-slate-200 shadow-xl opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
        <div className="text-[9px] uppercase tracking-[0.24em] text-slate-500">
          Guia rapido
        </div>

        <div className="mt-2 space-y-2">
          <div className="text-[9px] uppercase tracking-[0.24em] text-cyan-300">Intervalo (every:)</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <code className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-cyan-300">every:15m</code>
              <span className="text-slate-500">a cada 15 min</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-cyan-300">every:2h</code>
              <span className="text-slate-500">a cada 2 h</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-cyan-300">every:1d</code>
              <span className="text-slate-500">todo dia</span>
            </div>
            <div className="text-[9px] text-slate-600">Unidades: m (min), h (hora), d (dia)</div>
          </div>

          <div className="mt-2 border-t border-indigo-950/40 pt-2">
            <div className="text-[9px] uppercase tracking-[0.24em] text-indigo-300">Cron (5 campos)</div>
            <div className="mt-1 text-[9px] font-mono text-slate-500">min hora dia mes dia_semana</div>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <code className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-indigo-300">*/5 * * * *</code>
                <span className="text-slate-500">a cada 5 min</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-indigo-300">0 9 * * 1-5</code>
                <span className="text-slate-500">09:00 seg-sex</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-indigo-300">30 8 1 * *</code>
                <span className="text-slate-500">dia 1 as 08:30</span>
              </div>
              <div className="text-[9px] text-slate-600">* = qualquer valor, respeita o fuso selecionado</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
