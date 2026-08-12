import React from 'react';
type AuthProductPanelProps = {
  onCreateAccount: () => void;
  onExplore?: () => void;
};

const productProofs = [
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Execuções protegidas',
    description: 'SSRF, redirects e webhooks assinados para você automatizar sem abrir uma porta para o ambiente interno.',
    color: 'text-cyan-300',
    surface: 'bg-cyan-400/10 border-cyan-300/20',
  },
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.43 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Falhas que não ficam escondidas',
    description: 'Retries, latência, fila e status de alerta em um fluxo visual que ajuda a agir antes do incidente virar suporte.',
    color: 'text-emerald-300',
    surface: 'bg-emerald-400/10 border-emerald-300/20',
  },
  {
    icon: (
      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-1.813-5.096M9 21h7.5M21 9v1.5M21 15v1.5M3 9v1.5M3 15v1.5M21 12H3m15-9H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V6a3 3 0 00-3-3z" />
      </svg>
    ),
    title: 'Automação com contexto',
    description: 'Use linguagem natural para criar e entender rotinas, sem abandonar o controle técnico sobre cada execução.',
    color: 'text-violet-300',
    surface: 'bg-violet-400/10 border-violet-300/20',
  },
];

export const AuthProductPanel: React.FC<AuthProductPanelProps> = ({ onCreateAccount, onExplore }) => {
  return (
    <aside className="relative hidden min-h-[680px] overflow-hidden rounded-[2rem] border border-indigo-400/20 bg-[#0b1024]/90 p-8 shadow-[0_24px_80px_rgba(8,15,45,0.45)] lg:flex lg:flex-col lg:justify-start lg:gap-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative flex flex-1 flex-col gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-2">
            <img src="/logo.svg" alt="" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="font-mono text-sm font-black uppercase tracking-[0.24em] text-white">CronFlow</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reliable automation control plane</p>
          </div>
        </div>

        <div className="max-w-md space-y-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">Menos silêncio. Mais controle.</p>
          <h2 className="text-3xl font-black leading-tight tracking-tight text-white xl:text-4xl">
            Seus jobs precisam de uma camada de confiança.
          </h2>
          <p className="text-sm leading-6 text-slate-400">
            O CronFlow monitora automações críticas, explica falhas e entrega sinais acionáveis — sem transformar cada cron em mais um servidor para manter.
          </p>
        </div>

        <div className="space-y-3.5">
          {productProofs.map(({ icon, title, description, color, surface }) => (
            <div key={title} className="group flex gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.045]">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${surface} ${color}`}>
                {icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-100">{title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative space-y-3 pt-1">
        <div className="rounded-2xl border border-indigo-300/15 bg-indigo-400/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Fluxo monitorado</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Operacional
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/5 bg-black/20 p-2.5 flex flex-col items-center justify-center">
              <svg className="w-5.5 h-5.5 text-cyan-300 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[10px] font-bold text-slate-200">Agendar</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-2.5 flex flex-col items-center justify-center">
              <svg className="w-5.5 h-5.5 text-violet-300 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <p className="text-[10px] font-bold text-slate-200">Proteger</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-2.5 flex flex-col items-center justify-center">
              <svg className="w-5.5 h-5.5 text-emerald-300 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
              <p className="text-[10px] font-bold text-slate-200">Explicar</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={onCreateAccount} className="group inline-flex items-center gap-2 text-xs font-bold text-white transition-colors hover:text-cyan-200">
            Começar grátis
            <span className="transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </button>
          {onExplore && (
            <button type="button" onClick={onExplore} className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-300">
              Ver como funciona
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
