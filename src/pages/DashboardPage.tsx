import React, { useEffect, useState } from 'react';
import { StatCard } from '../components/Dashboard/StatCard';
import { RecentActivity } from '../components/Dashboard/RecentActivity';
import { useUiStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { useJobsStore } from '../store/jobsStore';
import api from '../services/api';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { LogEntry } from '../types/logs';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      time: string;
      volume: number;
      successRate: number;
      successCount: number;
      failedCount: number;
      failedJobs?: string[];
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-4 rounded-xl border border-indigo-950/60 bg-slate-950/90 backdrop-blur-md shadow-2xl space-y-2 text-xs select-none">
        <div className="font-bold text-slate-200 border-b border-indigo-950/40 pb-1.5 mb-1.5 flex justify-between items-center gap-6">
          <span>Intervalo: {data.time}</span>
          <span className="text-[10px] text-slate-500 font-normal">Histórico</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-indigo-500" />
              Execuções (Volume):
            </span>
            <span className="font-semibold text-indigo-300">{data.volume} reqs</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Taxa de Sucesso:
            </span>
            <span className="font-semibold text-emerald-400">{data.volume > 0 ? `${data.successRate}%` : '-'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-indigo-950/20 pt-1.5 mt-1 text-[10px] text-slate-500">
            <span>Sucessos: {data.successCount}</span>
            <span>Falhas: {data.failedCount}</span>
          </div>
          {data.failedJobs && data.failedJobs.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-rose-950/30 pt-1.5 mt-1 text-[10px] text-rose-400">
              <span className="font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Jobs com Falha:
              </span>
              <span className="text-slate-400 font-mono pl-2.5 truncate max-w-[240px]">
                {data.failedJobs.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardPage: React.FC = () => {
  const { setCreateModalOpen, setDocsOpen } = useUiStore();
  const { jobs } = useJobsStore();
  const { user } = useAuthStore();
  const [allRecentLogs, setAllRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartFilter, setChartFilter] = useState<'1h' | '24h' | '3d' | '7d' | '30d'>('24h');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRecentLogs = async () => {
      if (jobs.length === 0) return;
      setLoading(true);
      try {
        const fetchPromises = jobs.map(async (job) => {
          try {
            // Fetch 100 executions per job to populate chart and activity feed
            const res = await api.get(`/v1/jobs/${job.id}/executions?limit=100`);
            const data = (res.data || []) as LogEntry[];
            return data.map((log) => ({
              ...log,
              jobName: job.name,
              jobUrl: job.url,
            }));
          } catch (e) {
            console.error(`Erro ao carregar execuções do job ${job.id}`, e);
            return [];
          }
        });
        const results = await Promise.all(fetchPromises);
        const allLogs = results.flat().sort((a, b) => 
          new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
        );
        if (active) {
          setAllRecentLogs(allLogs);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchRecentLogs();
    return () => { active = false; };
  }, [jobs]);

  const activeCount = jobs.filter((j) => j.status === 'active').length;
  const totalExecutions = allRecentLogs.length;
  const successExecutions = allRecentLogs.filter((log) => log.status === 'success').length;
  const successRate = totalExecutions > 0 ? ((successExecutions / totalExecutions) * 100).toFixed(2) : '-';

  const avgResponseTime = (() => {
    const logsWithDuration = allRecentLogs.filter(
      (log) => log.durationMs !== null && log.durationMs !== undefined
    );
    if (logsWithDuration.length === 0) return '-';
    const sum = logsWithDuration.reduce((acc, log) => acc + (log.durationMs || 0), 0);
    return `${Math.round(sum / logsWithDuration.length)}ms`;
  })();

  const plan = user?.plan || 'free';
  const maxJobsLimit = plan === 'paid' ? 20 : 5;
  const isLimitReached = activeCount >= maxJobsLimit;

  // Prepare chart data chronologically (oldest to newest)
  const chartData = (() => {
    const now = new Date();
    
    // 1. Define configuration based on filter
    let config: {
      durationMs: number;
      intervalMs: number;
      count: number;
      labelFormat: (d: Date) => string;
      mockVolumes: number[];
      mockRates: number[];
    };
    
    switch (chartFilter) {
      case '1h':
        config = {
          durationMs: 60 * 60 * 1000,
          intervalMs: 10 * 60 * 1000,
          count: 6,
          labelFormat: (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          mockVolumes: [3, 5, 2, 8, 4, 6],
          mockRates: [100, 100, 50, 100, 100, 100],
        };
        break;
      case '3d':
        config = {
          durationMs: 3 * 24 * 60 * 60 * 1000,
          intervalMs: 12 * 60 * 60 * 1000,
          count: 6,
          labelFormat: (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.getHours().toString().padStart(2, '0') + ':00',
          mockVolumes: [32, 45, 38, 54, 48, 62],
          mockRates: [98, 100, 95, 96, 100, 97],
        };
        break;
      case '7d':
        config = {
          durationMs: 7 * 24 * 60 * 60 * 1000,
          intervalMs: 24 * 60 * 60 * 1000,
          count: 7,
          labelFormat: (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          mockVolumes: [85, 92, 78, 110, 95, 105, 120],
          mockRates: [100, 98, 97, 100, 96, 99, 100],
        };
        break;
      case '30d':
        config = {
          durationMs: 30 * 24 * 60 * 60 * 1000,
          intervalMs: 5 * 24 * 60 * 60 * 1000,
          count: 6,
          labelFormat: (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          mockVolumes: [420, 390, 450, 480, 510, 490],
          mockRates: [99, 98, 99, 97, 99, 100],
        };
        break;
      case '24h':
      default:
        config = {
          durationMs: 24 * 60 * 60 * 1000,
          intervalMs: 4 * 60 * 60 * 1000,
          count: 6,
          labelFormat: (d) => d.getHours().toString().padStart(2, '0') + ':00',
          mockVolumes: [12, 19, 15, 24, 30, 28],
          mockRates: [100, 95, 100, 92, 96, 100],
        };
        break;
    }

    const filteredLogs = allRecentLogs.filter(log => {
      const logTime = new Date(log.triggeredAt).getTime();
      const matchesTime = now.getTime() - logTime <= config.durationMs;
      const matchesJob = selectedJobIds.length === 0 || selectedJobIds.includes(log.jobId);
      return matchesTime && matchesJob;
    });

    const intervals = Array.from({ length: config.count }).map((_, idx) => {
      const d = new Date(now.getTime() - (config.count - 1 - idx) * config.intervalMs);
      const label = config.labelFormat(d);
      return {
        label,
        start: d.getTime() - config.intervalMs,
        end: d.getTime(),
        volume: 0,
        successCount: 0,
        failedJobs: [] as string[],
      };
    });

    filteredLogs.forEach((log) => {
      const logTime = new Date(log.triggeredAt).getTime();
      const target = intervals.find((int) => logTime >= int.start && logTime <= int.end);
      if (target) {
        target.volume += 1;
        if (log.status === 'success') {
          target.successCount += 1;
        } else {
          const jobName = log.jobName || 'Tarefa';
          if (!target.failedJobs.includes(jobName)) {
            target.failedJobs.push(jobName);
          }
        }
      }
    });

    return intervals.map((int) => ({
      time: int.label,
      volume: int.volume,
      successRate: int.volume > 0 ? Math.round((int.successCount / int.volume) * 100) : 100,
      successCount: int.successCount,
      failedCount: int.volume - int.successCount,
      failedJobs: int.failedJobs,
    }));
  })();

  const recentActivities = allRecentLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pulse-slow" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
        
        <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
          Status do Sistema
        </span>
        <h2 className="text-3xl font-extrabold mt-1 text-slate-100">
          Bem-vindo ao <span className="text-gradient-cyber">CronFlow</span>
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-xl">
          Sua plataforma integrada de agendamento e automação serverless. Configure tarefas, receba webhooks e analise histórico com latência sub-milissegundo.
        </p>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setCreateModalOpen(true)}
            disabled={isLimitReached}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all shadow-md cursor-pointer ${
              isLimitReached
                ? 'bg-slate-700 hover:bg-slate-700 border border-slate-600/50 cursor-not-allowed opacity-50'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 neon-glow-primary animate-pulse'
            }`}
            title={isLimitReached ? 'Limite do seu plano atingido (faça upgrade ou pause tarefas)' : 'Criar Nova Tarefa'}
          >
            {isLimitReached ? 'Limite Atingido 🔒' : 'Criar Nova Tarefa'}
          </button>
          <button 
            onClick={() => setDocsOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all cursor-pointer"
          >
            Documentação API
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="p-8 md:p-12 rounded-2xl glass-panel border border-dashed border-indigo-500/20 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-6 py-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none pulse-slow" />
          
          {/* Animated Glow Icon */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <svg className="w-8 h-8 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="space-y-2 max-w-md relative z-10">
            <h3 className="text-lg font-bold text-slate-100 font-mono">Nenhum Job Cadastrado</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você ainda não possui nenhuma tarefa de agendamento ativa neste workspace. Crie seu primeiro job serverless em segundos para monitorar execuções, disparar webhooks e analisar a telemetria.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-600/35 neon-glow-primary hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative z-10 flex items-center gap-2"
          >
            <span>Criar Minha Primeira Tarefa</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Tarefas Ativas"
              value={`${activeCount} / ${maxJobsLimit}`}
              color="indigo"
              description={plan === 'paid' ? 'Plano Pro (20 tarefas máx)' : 'Plano Gratuito (5 tarefas máx)'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Taxa de Sucesso"
              value={successRate === '-' ? '-' : `${successRate}%`}
              color="emerald"
              description={successRate === '-' ? 'Sem execuções registradas' : 'Últimas 24 horas'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Tempo de Resposta Médio"
              value={avgResponseTime}
              color="purple"
              description={avgResponseTime === '-' ? 'Sem execuções registradas' : 'Média geral de webhooks'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>

          {/* Recharts Performance Composed Chart */}
          <div className="p-6 rounded-2xl glass-panel border border-indigo-950/30 relative overflow-hidden space-y-4">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-200">Volume & Taxa de Sucesso</h3>
                <p className="text-xs text-slate-400">Total de requisições disparadas e taxa de entrega por período.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Job Selector Dropdown Filter */}
                <div className="relative select-none">
                  <button
                    type="button"
                    onClick={() => setIsJobFilterOpen(!isJobFilterOpen)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900/80 border border-indigo-950/40 hover:border-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>
                      Jobs: {selectedJobIds.length === 0 ? 'Todos' : `${selectedJobIds.length} selecionados`}
                    </span>
                    <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isJobFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isJobFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsJobFilterOpen(false)} />
                      <div className="absolute right-0 mt-2 w-64 rounded-xl border border-indigo-900/50 bg-[#070913]/95 backdrop-blur-md shadow-2xl p-3 space-y-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex justify-between items-center border-b border-indigo-950/40 pb-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Filtrar por Job</span>
                          <button
                            type="button"
                            onClick={() => setSelectedJobIds([])}
                            className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            Limpar Filtro
                          </button>
                        </div>

                        <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1">
                          {jobs.map((job) => {
                            const checked = selectedJobIds.includes(job.id);
                            return (
                              <label
                                key={job.id}
                                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-indigo-950/20 cursor-pointer select-none text-[11px] font-medium text-slate-300 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    if (checked) {
                                      setSelectedJobIds(selectedJobIds.filter((id) => id !== job.id));
                                    } else {
                                      setSelectedJobIds([...selectedJobIds, job.id]);
                                    }
                                  }}
                                  className="rounded border-indigo-950 text-indigo-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 bg-slate-950"
                                />
                                <span className="truncate flex-1">{job.name}</span>
                              </label>
                            );
                          })}
                          {jobs.length === 0 && (
                            <div className="text-[10px] text-slate-500 italic p-2 text-center">
                              Nenhum job disponível
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Filter Toggle Buttons Group */}
                <div className="flex bg-slate-900/60 border border-indigo-950/40 p-1 rounded-xl gap-0.5 select-none">
                  {[
                    { id: '1h', label: '1 Hora' },
                    { id: '24h', label: '24 Horas' },
                    { id: '3d', label: '3 Dias' },
                    { id: '7d', label: '7 Dias' },
                    { id: '30d', label: '30 Dias' },
                  ].map((filter) => {
                    const active = chartFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => setChartFilter(filter.id as typeof chartFilter)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/20 shadow-md'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                {/* Chart Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 bg-slate-900/40 border border-indigo-950/20 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    Volume (Barra)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    Taxa de Sucesso (Linha)
                  </span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volumeGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b" opacity={0.25} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  {/* Y-Axis Left: Volume of Executions */}
                  <YAxis 
                    yAxisId="left"
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `${v} req`}
                  />
                  {/* Y-Axis Right: Success Rate (%) */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    yAxisId="left"
                    dataKey="volume" 
                    barSize={32}
                    radius={[6, 6, 0, 0]}
                    fill="url(#volumeGlow)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#070913' }}
                    activeDot={{ r: 6, stroke: '#34d399', strokeWidth: 2, fill: '#070913' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity list */}
          {loading && allRecentLogs.length === 0 ? (
            <div className="p-6 rounded-2xl glass-panel border border-indigo-950/40 text-slate-400 text-center text-xs animate-pulse">
              Carregando atividade recente...
            </div>
          ) : (
            <RecentActivity activities={recentActivities} />
          )}
        </>
      )}
    </div>
  );
};
