import React from 'react';
type AuthProductPanelProps = {
  onCreateAccount: () => void;
  onExplore?: () => void;
};

const productProofs = [
  {
    icon: '◈',
    title: 'Execuções protegidas',
    description: 'SSRF, redirects e webhooks assinados para você automatizar sem abrir uma porta para o ambiente interno.',
    color: 'text-cyan-300',
    surface: 'bg-cyan-400/10 border-cyan-300/20',
  },
  {
    icon: '◌',
    title: 'Falhas que não ficam escondidas',
    description: 'Retries, latência, fila e status de alerta em um fluxo visual que ajuda a agir antes do incidente virar suporte.',
    color: 'text-emerald-300',
    surface: 'bg-emerald-400/10 border-emerald-300/20',
  },
  {
    icon: '✦',
    title: 'Automação com contexto',
    description: 'Use linguagem natural para criar e entender rotinas, sem abandonar o controle técnico sobre cada execução.',
    color: 'text-violet-300',
    surface: 'bg-violet-400/10 border-violet-300/20',
  },
];

export const AuthProductPanel: React.FC<AuthProductPanelProps> = ({ onCreateAccount, onExplore }) => {
  return (
    <aside className="relative hidden min-h-[680px] overflow-hidden rounded-[2rem] border border-indigo-400/20 bg-[#0b1024]/90 p-8 shadow-[0_24px_80px_rgba(8,15,45,0.45)] lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative space-y-8">
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

        <div className="space-y-3">
          {productProofs.map(({ icon, title, description, color, surface }) => (
            <div key={title} className="group flex gap-3 rounded-2xl border border-white/5 bg-white/[0.025] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.045]">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${surface}`}>
                <span className={`text-sm font-black ${color}`} aria-hidden="true">{icon}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-100">{title}</h3>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative space-y-4">
        <div className="rounded-2xl border border-indigo-300/15 bg-indigo-400/[0.06] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Fluxo monitorado</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Operacional
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3">
              <span className="mx-auto mb-1.5 block text-sm font-black text-cyan-300" aria-hidden="true">◌</span>
              <p className="text-[10px] font-bold text-slate-200">Agendar</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3">
              <span className="mx-auto mb-1.5 block text-sm font-black text-violet-300" aria-hidden="true">◈</span>
              <p className="text-[10px] font-bold text-slate-200">Proteger</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 px-2 py-3">
              <span className="mx-auto mb-1.5 block text-sm font-black text-emerald-300" aria-hidden="true">✓</span>
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
