import { formatGraceTime } from '../../utils/jobGrace';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

export function JobGraceNotice() {
  const user = useAuthStore(state => state.user);
  const setActiveTab = useUiStore(state => state.setActiveTab);
  const grace = user?.jobGrace;
  const dialog = useRef<HTMLDialogElement>(null);
  const [now, setNow] = useState(() => Date.now());
  const endsAt = grace?.endsAt;
  const excess = Math.max(0, (grace?.activeJobs ?? 0) - (grace?.maxJobs ?? 5));
  const key = `cf_job_grace_seen:${user?.id}:${endsAt}`;

  useEffect(() => {
    if (!endsAt || excess === 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [endsAt, excess]);

  useEffect(() => {
    if (!endsAt || excess === 0 || !dialog.current || dialog.current.open) return;
    let seen = false;
    try { seen = sessionStorage.getItem(key) === '1'; } catch { /* Modal still works without storage. */ }
    if (!seen) dialog.current.showModal();
  }, [endsAt, excess, key]);

  if (!endsAt || excess === 0) return null;
  const remaining = formatGraceTime(endsAt, now);
  const expired = Date.parse(endsAt) <= now;
  const close = () => dialog.current?.close();
  const navigate = (tab: string) => { close(); setActiveTab(tab); };

  return <>
    <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/25 bg-amber-950/95 px-4 py-2 text-sm text-amber-100 md:px-6" role="status">
      <span>Prazo para ajustar seus jobs: <strong className="font-mono tabular-nums">{expired ? 'Aplicando limite…' : remaining}</strong></span>
      <button type="button" onClick={() => dialog.current?.showModal()} className="rounded-lg px-3 py-1 font-semibold underline underline-offset-4 hover:bg-amber-500/10">Ver opções</button>
    </div>
    <dialog ref={dialog} aria-labelledby="job-grace-title" onClose={() => { try { sessionStorage.setItem(key, '1'); } catch { /* Optional preference. */ } }} onClick={event => { if (event.target === event.currentTarget) close(); }} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-indigo-500/30 bg-[#0a0d1d] p-0 text-slate-200 shadow-2xl backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm">
      <div className="p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 id="job-grace-title" className="text-xl font-semibold text-white">48 horas para ajustar seus jobs</h2>
          <button type="button" aria-label="Fechar aviso" onClick={close} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-indigo-950/50 hover:text-white">✕</button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">Seu acesso Pro encerrou. Você tem {grace?.activeJobs} jobs ativos e o plano Free permite {grace?.maxJobs}. Seus jobs continuam rodando durante este prazo para você se organizar.</p>
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-100">Tempo restante</p>
          <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-amber-200">{remaining}</p>
          <p className="mt-2 text-xs text-slate-400">Até {new Date(endsAt).toLocaleString('pt-BR')}</p>
        </div>
        <p className="mt-4 text-sm leading-6">Renove o Pro ou pause {excess} {excess === 1 ? 'job' : 'jobs'} para escolher quais ficam ativos. Ao encerrar o prazo, manteremos os {grace?.maxJobs} jobs ativos mais antigos e pausaremos os demais. Nenhum job será apagado.</p>
        <p className="mt-3 text-sm leading-6 text-slate-400">Esta tolerância vale apenas para os jobs. O chat da IA e os demais recursos Pro já estão bloqueados. Pausar jobs não reinicia o prazo; renovar cancela a contagem.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate('profile')} className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500">Renovar Pro</button>
          <button type="button" onClick={() => navigate('jobs')} className="flex-1 rounded-xl border border-indigo-500/30 px-4 py-3 text-sm font-semibold hover:bg-indigo-950/50">Escolher jobs ativos</button>
        </div>
      </div>
    </dialog>
  </>;
}
