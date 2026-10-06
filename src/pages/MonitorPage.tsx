import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useJobsStore } from '../store/jobsStore';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useEntitlements } from '../hooks/useEntitlements';
import { JobMonitorRulesPanel } from '../components/Kanban/JobMonitorRulesPanel';
import { GlobalMonitorPanel } from '../components/Kanban/GlobalMonitorPanel';
import type { MonitorRule } from '../types/monitoring';
import type { JobLog } from '../types/jobs';

type IconProps = { className?: string };
const Icon = ({ className, children }: IconProps & { children: React.ReactNode }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const ShieldCheck = (props: IconProps) => <Icon {...props}><path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z" /><path d="m8 12 3 3 5-6" /></Icon>;
const Search = (props: IconProps) => <Icon {...props}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></Icon>;
const ArrowRight = (props: IconProps) => <Icon {...props}><path d="M4 12h16m-6-6 6 6-6 6" /></Icon>;
const RefreshCw = (props: IconProps) => <Icon {...props}><path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5" /></Icon>;
const SlidersHorizontal = (props: IconProps) => <Icon {...props}><path d="M3 6h4m4 0h10M3 12h10m4 0h4M3 18h4m4 0h10M7 3v6m6 0v6m-6 0v6" /></Icon>;

interface Prefill { jobId?: string; logId?: string }
const errorText = (error: unknown) => (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Não foi possível carregar o monitoramento.';

export const MonitorPage: React.FC = () => {
  const jobs = useJobsStore((state) => state.jobs);
  const fetchJobs = useJobsStore((state) => state.fetchJobs);
  const projectId = useAuthStore((state) => state.activeProject?.id);
  const { isPro, logsRetentionDays } = useEntitlements();
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const setJobModalOpen = useUiStore((state) => state.setJobModalOpen);
  const setActiveJob = useJobsStore((state) => state.setActiveJob);
  const [tab, setTab] = useState<'jobs' | 'metrics'>('jobs');
  const [rules, setRules] = useState<MonitorRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState('');
  const [prefill, setPrefill] = useState<Prefill>({});
  const [selectedId, setSelectedId] = useState('');
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const selectedJob = jobs.find((job) => job.id === selectedId);
  const refreshRules = useCallback(() => setRetry((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    api.get<MonitorRule[]>('/v1/monitor/rules', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setRules(data || []);
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(errorText(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    void fetchJobs();
    return () => controller.abort();
  }, [projectId, retry, fetchJobs]);

  useEffect(() => {
    setSelectedId(''); setPrefill({}); setRules([]); setLogs([]); setLogsError('');
  }, [projectId]);

  useEffect(() => {
    const consume = (value: Prefill) => {
      if (value.jobId) { setSelectedId(value.jobId); setPrefill(value); setTab('jobs'); }
    };
    try {
      const stored = localStorage.getItem('cf_prefill_rule');
      if (stored) { localStorage.removeItem('cf_prefill_rule'); consume(JSON.parse(stored)); }
    } catch { /* Ignore an obsolete or malformed prefill. */ }
    const listener = (event: Event) => consume((event as CustomEvent<Prefill>).detail || {});
    window.addEventListener('cf_open_monitor_page', listener);
    return () => window.removeEventListener('cf_open_monitor_page', listener);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLogs([]); setLogsError('');
    if (!selectedId) { setLogsLoading(false); return () => controller.abort(); }
    setLogsLoading(true);
    api.get<JobLog[]>(`/v1/jobs/${selectedId}/executions?limit=30`, { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) setLogs(data || []);
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setLogsError(errorText(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLogsLoading(false); });
    return () => controller.abort();
  }, [selectedId, projectId, retry]);

  const jobRules = rules.filter((rule) => rule.jobId);
  const activeRules = rules.filter((rule) => rule.isEnabled);
  const requiredCount = activeRules.filter((rule) => rule.mode === 'require_success').length;
  const monitoredCount = new Set(jobRules.filter((rule) => rule.isEnabled).map((rule) => rule.jobId)).size;
  const filteredJobs = useMemo(() => jobs.filter((job) => `${job.name} ${job.url}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [jobs, search]);

  return <div className="min-w-0 space-y-6 animate-in fade-in duration-300">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300"><ShieldCheck className="h-5 w-5" /></span><h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">Validação de resultados</h1><span className="rounded-full border border-indigo-950/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{isPro ? 'Pro' : 'Free · 1 condição'}</span></div><p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">Defina o resultado esperado de cada tarefa e teste suas condições com uma resposta real.</p></div>
      <button type="button" onClick={() => setActiveTab('logs')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-950/60 bg-slate-950/30 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-indigo-500/40">Ver histórico <ArrowRight className="h-3.5 w-3.5" /></button>
    </header>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[['Jobs acompanhados', monitoredCount], ['Condições ativas', activeRules.length], ['Obrigatórias para sucesso', requiredCount]].map(([label, count]) => <div key={label} className="glass-panel min-w-0 rounded-2xl border border-indigo-950/40 px-5 py-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-slate-100">{loading ? '—' : count}</p></div>)}
    </div>
    <div className="flex flex-col justify-between gap-3 border-b border-indigo-950/40 sm:flex-row sm:items-center">
      <div role="tablist" aria-label="Origem da validação" className="flex gap-5"><button type="button" role="tab" aria-selected={tab === 'jobs'} onClick={() => setTab('jobs')} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === 'jobs' ? 'border-indigo-400 text-indigo-200' : 'border-transparent text-slate-500'}`}>Jobs HTTP</button><button type="button" role="tab" aria-selected={tab === 'metrics'} onClick={() => setTab('metrics')} className={`border-b-2 px-1 pb-3 text-sm font-semibold ${tab === 'metrics' ? 'border-indigo-400 text-indigo-200' : 'border-transparent text-slate-500'}`}>Métricas via API</button></div><p className="pb-3 text-xs text-slate-500">Retenção do seu plano: {logsRetentionDays} dias de logs</p>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300"><span>{error}</span><button type="button" onClick={refreshRules} className="text-xs font-semibold">Tentar novamente</button></div>}
    {tab === 'metrics' ? error ? null : loading ? <p className="p-6 text-sm text-slate-500">Carregando condições…</p> : <GlobalMonitorPanel rules={rules.filter((rule) => !rule.jobId)} totalRules={rules.length} onChange={refreshRules} /> : <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <section aria-label="Selecionar job" className="glass-panel min-w-0 self-start overflow-hidden rounded-2xl border border-indigo-950/40">
        <div className="space-y-3 border-b border-indigo-950/40 p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-200">Suas tarefas</h2><span className="text-xs text-slate-500">{jobs.length}</span></div><label className="relative block"><span className="sr-only">Buscar tarefa</span><Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" /><input className="w-full min-w-0 rounded-xl border border-indigo-950/50 bg-slate-950/50 py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500" placeholder="Buscar por nome ou URL" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
        <div className="max-h-72 overflow-y-auto p-2 lg:max-h-[620px]">{filteredJobs.length ? filteredJobs.map((job) => {
          const count = jobRules.filter((rule) => rule.jobId === job.id && rule.isEnabled).length;
          return <button type="button" key={job.id} aria-pressed={selectedId === job.id} onClick={() => { setSelectedId(job.id); setPrefill({}); }} className={`mb-1 w-full min-w-0 rounded-xl border p-3 text-left transition-colors ${selectedId === job.id ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-transparent hover:bg-indigo-950/20'}`}><span className="block truncate text-sm font-semibold text-slate-200">{job.name}</span><span className="mt-1 block truncate font-mono text-[10px] text-slate-500">{job.url}</span><span className="mt-2 block text-[11px] text-slate-400">{count ? `${count} ${count === 1 ? 'condição ativa' : 'condições ativas'}` : 'Sem condições'}{job.lastRunStatus === 'validation_failed' && <span className="ml-2 text-amber-300">· Resultado inválido</span>}</span></button>;
        }) : <p className="px-3 py-6 text-xs leading-relaxed text-slate-500">{jobs.length ? 'Nenhuma tarefa encontrada.' : 'Crie uma tarefa para configurar sua validação.'}</p>}</div>
      </section>
      <section className="glass-panel min-w-0 rounded-2xl border border-indigo-950/40 p-5 sm:p-6">
        {selectedJob ? <><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Resultado da tarefa</p><h2 className="mt-1 break-words text-lg font-semibold text-slate-100">{selectedJob.name}</h2><p className="mt-1 break-all font-mono text-xs text-slate-500">{selectedJob.httpMethod} {selectedJob.url}</p></div><button type="button" onClick={() => { setActiveJob(selectedJob); setJobModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-indigo-950/60 px-3 py-2 text-xs text-slate-300"><SlidersHorizontal className="h-3.5 w-3.5" />Detalhes do job</button></div>{logsLoading && <p role="status" className="mb-4 text-xs text-slate-500">Carregando respostas registradas…</p>}{logsError && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-xs text-amber-300"><span>As respostas não puderam ser carregadas. Você pode colar uma amostra.</span><button type="button" onClick={refreshRules} className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" />Tentar novamente</button></div>}<JobMonitorRulesPanel key={`${projectId}:${selectedJob.id}`} job={selectedJob} logs={logs} initialLogId={prefill.logId || logs.find((log) => log.httpStatus && log.responseBody)?.id} onRulesChanged={refreshRules} /></> : <div className="flex min-h-80 flex-col items-center justify-center px-4 py-10 text-center"><ShieldCheck className="mb-4 h-10 w-10 text-indigo-400/60" /><h2 className="text-base font-semibold text-slate-200">Selecione uma tarefa para validar seu resultado</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">Escolha um job ao lado para configurar as condições de sucesso, acompanhar o payload e testar sem disparar a execução.</p><button type="button" onClick={() => setActiveTab('jobs')} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-indigo-300">Gerenciar tarefas <ArrowRight className="h-3.5 w-3.5" /></button></div>}
      </section>
    </div>}
  </div>;
};
