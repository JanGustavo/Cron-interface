import React, { useEffect, useState, useMemo } from 'react';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { StatCard } from './components/Dashboard/StatCard';
import { RecentActivity } from './components/Dashboard/RecentActivity';
import { useUiStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import { useJobsStore } from './store/jobsStore';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { JobModal } from './components/Kanban/JobModal';
import { Logs } from './pages/Logs';
import { LoginGate } from './components/Auth/LoginGate';
import { CreateJobModal } from './components/Kanban/CreateJobModal';
import { ToastHost } from './components/Shared/ToastHost';
import api from './services/api';
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
import type { LogEntry } from './types/logs';


const formatDate = (value?: string | null) => {
  if (!value) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

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

// Mock Page Components to render inside our Layout
// Custom tooltip for composed volume & success rate chart
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

// Premium Dashboard DashboardPage with Recharts Composed Chart
const DashboardPage: React.FC = () => {
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

    if (filteredLogs.length === 0) {
      // Use mock data
      return Array.from({ length: config.count }).map((_, idx) => {
        const d = new Date(now.getTime() - (config.count - 1 - idx) * config.intervalMs);
        const label = config.labelFormat(d);
        const vol = config.mockVolumes[idx];
        const rate = config.mockRates[idx];
        const succ = Math.round((vol * rate) / 100);
        const failedJobs = vol - succ > 0 ? ['Job Exemplo Falhou'] : [];
        return {
          time: label,
          volume: vol,
          successRate: rate,
          successCount: succ,
          failedCount: vol - succ,
          failedJobs,
        };
      });
    }

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
          trend={{ value: "+0.12%", type: 'up' }}
          description="Últimas 24 horas"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Tempo de Resposta Médio"
          value="142ms"
          color="purple"
          trend={{ value: "-14ms", type: 'up' }}
          description="Média geral de webhooks"
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
    </div>
  );
};



const JobsPage: React.FC = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
    <KanbanBoard />
    <JobModal />
  </div>
);

const LogsPage: React.FC = () => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
    <Logs />
  </div>
);

const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <span className="relative inline-flex items-center group">
    <button
      type="button"
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-950/40 text-indigo-300 hover:text-white hover:bg-indigo-900/60 transition-colors"
      aria-label="Mais informacoes"
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    </button>
    <span className="absolute left-1/2 top-full mt-2 w-60 -translate-x-1/2 rounded-lg border border-indigo-500/20 bg-[#0a0d1d]/95 p-2 text-[9px] text-slate-300 shadow-xl opacity-0 pointer-events-none translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200">
      {text}
    </span>
  </span>
);

const HARDCODED_README = `🚀 CronFlow — Plataforma de Agendamento e Automação de Tarefas
## Documentação de Desenvolvimento e Arquitetura do MVP

Bem-vindo ao **CronFlow**! Este guia detalha o funcionamento interno de nosso sistema, desde a arquitetura de múltiplos binários até os fluxos de dados mais complexos.

O CronFlow é uma plataforma SaaS de agendamento de tarefas e disparo de webhooks (um "CronTab em escala como serviço"). O sistema permite que nossos usuários cadastrem requisições HTTP agendadas (via expressões cron) que devem ser executadas com alta precisão, tolerância a falhas e total rastreabilidade.

---

## 🗺️ Visão Geral da Arquitetura (Múltiplos Binários)

Em vez de construirmos um monólito gigante e pesado, o CronFlow foi projetado seguindo o **Princípio da Responsabilidade Única (SRP)** no nível de infraestrutura. O sistema é dividido em **3 processos totalmente independentes** (binários distintos) que rodam lado a lado, comunicando-se através de duas fontes: o banco de dados **PostgreSQL** e o broker de mensagens **Redis**.

### Os 3 Processos Principais:
1. **API (cmd/api)**: REST API construída com Chi Router, Handlers e Services. Responsável pela autenticação via SHA-256 (API Keys). Precisa de alta escalabilidade e baixa latência.
2. **Scheduler (cmd/scheduler)**: O coração do agendamento. Loop de 30s que busca no Postgres tarefas elegíveis, adquire Locks distribuídos no Redis e as enfileira para execução.
3. **Worker (cmd/worker)**: Consome as tarefas do Redis (usando Asynq com até 50 goroutines simultâneas). Executa a requisição HTTP, salva o log e trata retentativas (3x com Backoff Exponencial).

---

## 🗂️ Glossário de Domínio (As Entidades)

*   **User (Usuário)**: Conta principal do cliente cadastrado. Controla qual plano de assinatura (ex: free ou paid) está ativo. Autenticação via API Key.
*   **Project (Projeto/Workspace)**: O ambiente (tenant) isolado de trabalho de um usuário. Suporta múltiplos projetos por usuário.
*   **Job (Tarefa Agendada)**: Contém a expressão cron (schedule), as especificações HTTP (URL, headers, payload), o status (active ou paused) e nextRunAt.
*   **Execution (Histórico/Log)**: Registro imutável de uma tentativa de execução HTTP pelo Worker, incluindo HTTPStatus, DurationMs e AttemptNumber.

---

## 🔄 Fluxos de Execução Passo a Passo

### Loop do Scheduler:
O processo Scheduler executa um ciclo de varredura (chamado de tick) a cada 30 segundos:
- Adquire Lock distribuído no Redis para evitar concorrência.
- Busca no Postgres todos os Jobs ATIVOS onde next_run_at <= NOW.
- Enfileira no Redis e agenda a próxima execução recalculando o cron.`;

const parseMarkdownToReact = (markdown: string) => {
  if (!markdown) return null;
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  
  return lines.map((line, idx) => {
    // Handle code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        const code = codeBlockContent.join('\n');
        codeBlockContent = [];
        return (
          <pre key={idx} className="my-3 p-4 bg-slate-950/80 border border-indigo-500/20 rounded-xl font-mono text-xs text-indigo-300 overflow-x-auto shadow-inner select-all whitespace-pre-wrap">
            <code>{code}</code>
          </pre>
        );
      } else {
        inCodeBlock = true;
        return null;
      }
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      return null;
    }
    
    // Title level 1
    if (line.startsWith('# ')) {
      return (
        <h1 key={idx} className="text-2xl font-black text-slate-100 mt-6 mb-3 tracking-wide flex items-center gap-2 border-b border-indigo-550/20 pb-2">
          {line.replace('# ', '')}
        </h1>
      );
    }
    
    // Title level 2
    if (line.startsWith('## ')) {
      return (
        <h2 key={idx} className="text-lg font-bold text-indigo-400 mt-5 mb-2 tracking-wide">
          {line.replace('## ', '')}
        </h2>
      );
    }
    
    // Title level 3
    if (line.startsWith('### ')) {
      return (
        <h3 key={idx} className="text-base font-bold text-slate-200 mt-4 mb-2">
          {line.replace('### ', '')}
        </h3>
      );
    }
    
    // Horizontal rule
    if (line.trim() === '---') {
      return <hr key={idx} className="my-5 border-t border-indigo-950/50" />;
    }
    
    // Bullet list
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
      const cleanLine = line.trim().slice(2);
      return (
        <ul key={idx} className="list-disc pl-5 my-1 text-sm text-slate-350 leading-relaxed">
          <li>{cleanLine}</li>
        </ul>
      );
    }
    
    // Empty line
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />;
    }
    
    // Standard paragraph
    return (
      <p key={idx} className="text-sm text-slate-300 my-1.5 leading-relaxed">
        {line}
      </p>
    );
  }).filter(el => el !== null);
};

const ProfilePage: React.FC = () => {
  const { user, activeProject, projects, token } = useAuthStore();
  const { jobs } = useJobsStore();
  const { setActiveTab, setCreateModalOpen, showToast, setDocsOpen } = useUiStore();
  const [securityTab, setSecurityTab] = useState<'keys' | 'webhooks' | 'sessions' | 'twoFactor'>('keys');

  const userEmail = user?.email || 'admin@cronflow.sh';
  const userHandle = userEmail.split('@')[0] || 'cronflow';
  const avatarLabel = userHandle.slice(0, 2).toUpperCase();
  const memberSince = formatDate(user?.createdAt);
  const workspaceName = activeProject?.name || 'Projeto Pessoal';
  const plan = user?.plan || 'free';
  const isProPlan = plan === 'paid';

  const activeKey = token?.accessToken || localStorage.getItem('cf_token') || '';
  const maskedKey = activeKey ? `${activeKey.slice(0, 8)}...${activeKey.slice(-4)}` : 'cf_live_demo';
  const [globalWebhook, setGlobalWebhook] = useState(() => localStorage.getItem('cf_global_webhook') || '');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const webhookConfigured = globalWebhook.trim().length > 0;

  const handleUpdateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cf_global_webhook', globalWebhook.trim());
    setUpdateSuccess(true);
    showToast('Webhook atualizado com sucesso.', 'success');
    setTimeout(() => setUpdateSuccess(false), 2000);
  };
  const memberDays = useMemo(() => {
    if (!user?.createdAt) return 0;
    const nowTime = new Date().getTime();
    const createdTime = new Date(user.createdAt).getTime();
    return Math.max(1, Math.floor((nowTime - createdTime) / 86400000));
  }, [user]);

  const workspaceJobs = activeProject
    ? jobs.filter((job) => job.projectId === activeProject.id)
    : jobs;

  const activeJobs = workspaceJobs.filter((job) => job.status === 'active').length;
  const pausedJobs = workspaceJobs.filter((job) => job.status === 'paused').length;
  const failingJobs = workspaceJobs.filter((job) => job.status === 'failing').length;
  const maxJobsLimit = isProPlan ? 20 : 5;
  const jobsUsagePercent = maxJobsLimit > 0 ? Math.min(100, Math.round((activeJobs / maxJobsLimit) * 100)) : 0;

  const profileStats = [
    {
      label: 'Projetos',
      value: projects.length.toString().padStart(2, '0'),
      helper: 'Workspaces vinculados à conta',
    },
    {
      label: 'Jobs ativos',
      value: activeJobs.toString().padStart(2, '0'),
      helper: 'Em execução no workspace atual',
    },
    {
      label: 'Jobs pausados',
      value: pausedJobs.toString().padStart(2, '0'),
      helper: 'Disponíveis para reativação',
    },
    {
      label: 'Jobs em falha',
      value: failingJobs.toString().padStart(2, '0'),
      helper: 'Precisam de atenção imediata',
    },
  ];

  const handleCopyPrimaryKey = () => {
    if (!activeKey) {
      showToast('Nenhuma chave ativa encontrada.', 'warning');
      return;
    }
    try {
      navigator.clipboard.writeText(activeKey);
      showToast('Chave copiada para a area de transferencia.', 'success');
    } catch (err) {
      console.error('Falha ao copiar chave', err);
      showToast('Nao foi possivel copiar a chave.', 'error');
    }
  };

  const handleCreateJob = () => {
    setActiveTab('jobs');
    setCreateModalOpen(true);
  };

  const handleOpenSettings = () => setSecurityTab('keys');
  const handleOpenWebhooks = () => setSecurityTab('webhooks');
  const handleOpenJobs = () => setActiveTab('jobs');
  const handleOpenLogs = () => setActiveTab('logs');
  const handleOpenDocs = () => setDocsOpen(true);

  const handleOpenSupport = () => {
    const email = 'jandersongustavo01@gmail.com';
    const subject = encodeURIComponent('[CronFlow] Suporte - Solicitação de Atendimento');
    const body = encodeURIComponent(
      'Olá Janderson,\n\n' +
      'Gostaria de solicitar suporte referente ao CronFlow.\n\n' +
      '[Descreva seu problema, dúvida ou sugestão aqui]\n\n' +
      'Atenciosamente,\n' +
      'Equipe CronFlow'
    );
    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
    const gmailUrl = `https://mail.google.com/mail/?extsrc=mailto&url=${encodeURIComponent(mailto)}`;
    window.open(gmailUrl, '_blank');
  };

  const onboardingSteps = [
    {
      id: 'connect-api',
      title: 'Conectar API Key',
      done: Boolean(activeKey),
      detail: activeKey ? `Feito em ${memberSince}` : 'Conecte sua chave para autenticar as requisicoes.',
    },
    {
      id: 'first-job',
      title: 'Criar primeira tarefa',
      done: workspaceJobs.length > 0,
      detail: workspaceJobs.length > 0 ? `${workspaceJobs.length}/1 criada` : '0/1 criada',
      action: {
        label: 'Criar tarefa',
        onClick: handleCreateJob,
      },
    },
    {
      id: 'webhook',
      title: 'Configurar webhook',
      done: webhookConfigured,
      detail: webhookConfigured ? 'Webhook configurado' : 'Nao configurado',
      action: {
        label: 'Ir',
        onClick: handleOpenWebhooks,
      },
    },
    {
      id: 'manual-trigger',
      title: 'Disparar execucao manual',
      done: false,
      detail: 'Teste o fluxo disparando um job manualmente.',
      action: {
        label: 'Abrir jobs',
        onClick: handleOpenJobs,
      },
    },
  ];

  const completedSteps = onboardingSteps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedSteps / onboardingSteps.length) * 100);

  const quickStatStyles: Record<string, string> = {
    indigo: 'border-indigo-500/20 bg-indigo-500/10',
    emerald: 'border-emerald-500/20 bg-emerald-500/10',
    amber: 'border-amber-500/20 bg-amber-500/10',
    cyan: 'border-cyan-500/20 bg-cyan-500/10',
    slate: 'border-slate-700/40 bg-slate-950/40',
  };

  const quickStats = [
    {
      label: 'Plano',
      value: isProPlan ? 'PRO' : 'FREE',
      helper: isProPlan ? 'Limite 20 jobs' : 'Limite 5 jobs',
      tone: isProPlan ? 'indigo' : 'slate',
    },
    {
      label: 'API Keys',
      value: activeKey ? '1 ativa' : '0 ativa',
      helper: activeKey ? 'Pronta para uso' : 'Configure em Settings',
      tone: activeKey ? 'emerald' : 'amber',
    },
    {
      label: 'Uso de jobs',
      value: `${activeJobs}/${maxJobsLimit}`,
      helper: `${jobsUsagePercent}% do limite`,
      tone: jobsUsagePercent >= 90 ? 'amber' : 'cyan',
    },
    {
      label: 'Membro ha',
      value: memberDays ? `${memberDays} dias` : 'hoje',
      helper: `Desde ${memberSince}`,
      tone: 'slate',
    },
    {
      label: 'Workspace',
      value: workspaceName,
      helper: `${projects.length} projeto${projects.length === 1 ? '' : 's'}`,
      tone: 'indigo',
      title: workspaceName,
    },
    {
      label: 'Status',
      value: 'Ativo',
      helper: 'Sessao autenticada',
      tone: 'emerald',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-indigo-400">
          Perfil & Acesso
        </span>
        <h2 className="text-2xl md:text-3xl font-black tracking-wide text-slate-100">
          Conta, workspace e segurança
        </h2>
        <p className="text-sm text-slate-400 max-w-3xl">
          A tela foi alinhada à visão do CronFlow: múltiplos projetos por usuário, API Keys por projeto e contexto do workspace ativo sempre visível.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <div
            className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-[#0a0d1d] to-cyan-500/10 p-6 md:p-7 shadow-[0_0_45px_rgba(99,102,241,0.18)] transition-all duration-300 hover:border-indigo-400/60 hover:shadow-[0_0_65px_rgba(99,102,241,0.25)] animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: '40ms' }}
          >
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 opacity-90" />
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/25 to-cyan-500/10 text-xl font-black text-indigo-200 shadow-[0_0_28px_rgba(99,102,241,0.20)]">
                  {avatarLabel}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-indigo-400">
                      Conta CronFlow
                    </span>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                      Ativa
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
                        isProPlan
                          ? 'border-indigo-500/20 bg-indigo-500/15 text-indigo-300'
                          : 'border-slate-700/50 bg-slate-900/40 text-slate-400'
                      }`}
                    >
                      {isProPlan ? 'PRO' : 'FREE'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-100">{userEmail}</h3>

                  <p className="max-w-2xl text-sm text-slate-400 leading-relaxed">
                    Membro ativo desde {memberSince}. Esta conta opera sob a arquitetura multitenant do CronFlow, garantindo isolamento total por projeto, controle integrado de workspaces e observabilidade em tempo real dos seus disparos de agendamentos.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      Workspace: <strong className="text-indigo-200">{workspaceName}</strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/50 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-300 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <strong className="text-slate-200">{projects.length}</strong> projeto{projects.length === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <strong className="text-cyan-200">{workspaceJobs.length}</strong> job{workspaceJobs.length === 1 ? '' : 's'} no workspace
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('jobs')}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 neon-glow-primary min-w-[132px]"
                >
                  Ver Jobs
                </button>
                <button
                  type="button"
                  onClick={() => setSecurityTab('keys')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all"
                >
                  Gerenciar Chaves
                </button>
              </div>
            </div>
          </div>

          <div
            className="rounded-2xl glass-panel border border-indigo-950/30 p-6 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-200">Visao geral da conta</h3>
              <InfoTip text="Resumo rapido do plano, chaves e uso atual do workspace." />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Indicadores essenciais para tomada de decisao rapida.
            </p>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-3 gap-3">
              {quickStats.map((stat, index) => (
                <div
                  key={stat.label}
                  title={stat.title || stat.value}
                  style={{ animationDelay: `${140 + index * 40}ms` }}
                  className={`rounded-2xl border p-3 transition-all duration-300 hover:bg-slate-900/60 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20 animate-in fade-in slide-in-from-bottom-4 ${quickStatStyles[stat.tone]}`}
                >
                  <div className="text-[9px] uppercase tracking-[0.24em] text-slate-500">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-100 truncate">
                    {stat.value}
                  </div>
                  {stat.helper && (
                    <div className="mt-1 text-[9px] text-slate-500">{stat.helper}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {profileStats.map((stat, index) => (
              <div
                key={stat.label}
                style={{ animationDelay: `${200 + index * 60}ms` }}
                className="rounded-2xl glass-panel border border-indigo-950/30 p-4 transition-all duration-300 hover:bg-slate-900/60 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20 animate-in fade-in slide-in-from-bottom-4"
              >
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {stat.label}
                </span>
                <div className="mt-3 text-2xl font-black text-slate-100">{stat.value}</div>
                <p className="mt-1 text-xs text-slate-400">{stat.helper}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-2xl glass-panel border border-indigo-950/30 p-6 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: '320ms' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-200">Projetos vinculados</h3>
                <p className="text-xs text-slate-400">
                  Cada workspace mantém isolamento total e sua própria API Key.
                </p>
              </div>
              <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-300">
                Workspace
              </span>
            </div>

            <div className="mt-5 grid gap-3">
              {projects.length > 0 ? (
                projects.map((project) => {
                  const isActiveProject = activeProject?.id === project.id;

                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-all duration-300 hover:bg-indigo-950/40 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20 ${
                        isActiveProject
                          ? 'border-indigo-500/30 bg-indigo-500/10'
                          : 'border-indigo-950/30 bg-slate-950/30'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-100">{project.name}</p>
                        <p className="text-xs text-slate-500">Criado em {formatDate(project.createdAt)}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] ${
                            isActiveProject
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                              : 'border border-slate-700/50 bg-slate-900/50 text-slate-400'
                          }`}
                        >
                          {isActiveProject ? 'Ativo' : 'Secundário'}
                        </span>
                        <span className="text-[10px] text-slate-500">ID {project.id}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-indigo-950/30 bg-slate-950/20 p-5 text-sm text-slate-500">
                  Nenhum projeto encontrado no estado atual.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div
            className="rounded-2xl glass-panel border border-indigo-950/30 p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: '160ms' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-200">Seguranca & Acesso</h3>
                  <InfoTip text="Organize chaves, webhooks e controles de sessao do workspace." />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Centralize chaves, webhooks, sessoes e recursos de seguranca do workspace.
                </p>
              </div>

              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${
                isProPlan
                  ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
              }`}>
                {isProPlan ? 'PRO' : 'MVP'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-1">
              {[
                { id: 'keys', label: 'API Keys' },
                { id: 'webhooks', label: 'Webhooks' },
                { id: 'sessions', label: 'Sessoes' },
                { id: 'twoFactor', label: '2FA' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSecurityTab(tab.id as 'keys' | 'webhooks' | 'sessions' | 'twoFactor')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-[0.24em] transition-all ${
                    securityTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-indigo-950/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-indigo-950/30 bg-[#0a0d1d]/80 p-4">
              {securityTab === 'keys' && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                        API Keys ({activeKey ? '1 ativa' : '0 ativa'})
                      </span>
                      <p className="mt-1 text-xs text-slate-400">
                        Use no header Authorization: Bearer em cada request.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenSettings}
                      className="px-3 py-1.5 text-[10px] uppercase font-bold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-950/70 rounded-xl border border-indigo-900/40 transition-all"
                    >
                      Gerenciar
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-200">Chave principal</p>
                          <p className="text-[10px] font-mono text-indigo-300">{maskedKey}</p>
                          <p className="text-[9px] text-slate-500">Criada: {memberSince}</p>
                        </div>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                          Producao
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCopyPrimaryKey}
                          className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-200 bg-slate-800/50 hover:bg-slate-800/80 rounded-xl border border-slate-700/40 transition-all"
                        >
                          Copiar
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Em breve"
                          className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/40 opacity-60 cursor-not-allowed"
                        >
                          Rotar
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Em breve"
                          className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/40 opacity-60 cursor-not-allowed"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between rounded-2xl border border-indigo-950/40 bg-slate-950/30 p-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-200">Chave de teste</p>
                        <p className="text-[10px] font-mono text-slate-500">cf_test_demo_4c2a</p>
                        <p className="text-[9px] text-slate-600">Gerada automaticamente</p>
                      </div>
                      <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Teste
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast('Geração de chaves em breve.', 'info')}
                    className="w-full px-4 py-2 text-[10px] uppercase font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-500/30"
                  >
                    Gerar nova chave
                  </button>
                </div>
              )}

              {securityTab === 'webhooks' && (
                <form onSubmit={handleUpdateWebhook} className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                        Webhook de alerta padrao
                      </span>
                      <InfoTip text="Usado quando um job falha 3 vezes seguidas." />
                    </div>
                    <p className="text-xs text-slate-400">
                      Configure uma URL padrao para notificacoes de falha do workspace.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="url"
                      placeholder="https://sua-api.com/alertas-webhook"
                      value={globalWebhook}
                      onChange={(e) => setGlobalWebhook(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-slate-300 text-xs focus:outline-none focus:border-indigo-500/40"
                    />
                    <button
                      type="submit"
                      className={`px-4 py-2.5 text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer ${
                        updateSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white neon-glow-primary'
                      }`}
                    >
                      {updateSuccess ? 'Salvo! ✓' : 'Atualizar'}
                    </button>
                  </div>

                  <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Status</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${
                        webhookConfigured
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                      }`}>
                        {webhookConfigured ? 'Ativo' : 'Pendente'}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-indigo-300 break-all">
                      {webhookConfigured ? globalWebhook : 'Nao configurado'}
                    </div>
                  </div>
                </form>
              )}

              {securityTab === 'sessions' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Sessoes ativas</span>
                    <p className="mt-1 text-xs text-slate-400">
                      Controle de acesso por dispositivo e contexto de login.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Sessao atual</p>
                      <p className="mt-2 text-xs font-semibold text-slate-200">{userEmail}</p>
                      <p className="mt-1 text-[10px] text-slate-500">Ultimo acesso: {formatDate(new Date().toISOString())}</p>
                    </div>
                    <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Workspace</p>
                      <p className="mt-2 text-xs font-semibold text-slate-200">{workspaceName}</p>
                      <p className="mt-1 text-[10px] text-slate-500">Status: Ativo</p>
                    </div>
                  </div>
                </div>
              )}

              {securityTab === 'twoFactor' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">2FA</span>
                    <p className="mt-1 text-xs text-slate-400">
                      Proteja sua conta com verificacao adicional em duas etapas.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">Disponivel em breve</span>
                    <button
                      type="button"
                      disabled
                      className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/40 opacity-60 cursor-not-allowed"
                    >
                      Em breve
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="rounded-2xl glass-panel border border-indigo-950/30 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: '240ms' }}
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-200">Seu Roadmap CronFlow</h3>
                <InfoTip text="Complete os passos minimos para liberar o fluxo completo de execucoes." />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Conclua os passos essenciais para ativar todo o potencial do workspace.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-slate-500">
                <span>Progresso</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-950/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {onboardingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between rounded-2xl border border-indigo-950/30 bg-slate-950/30 px-4 py-3 transition-all duration-300 hover:bg-slate-900/50 hover:border-indigo-500/40"
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20'
                        : 'bg-indigo-950/40 text-indigo-300 border border-indigo-950/50'
                    }`}>
                      {step.done ? 'OK' : index + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-100">{step.title}</p>
                      <p className="text-[10px] text-slate-500">{step.detail}</p>
                    </div>
                  </div>

                  {step.done ? (
                    <span className="text-[10px] font-bold uppercase text-emerald-300">Concluido</span>
                  ) : step.action ? (
                    <button
                      type="button"
                      onClick={step.action.onClick}
                      className="px-3 py-1.5 text-[10px] uppercase font-bold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-950/70 rounded-xl border border-indigo-900/40 transition-all"
                    >
                      {step.action.label}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl glass-panel border border-indigo-950/30 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: '320ms' }}
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-200">Acoes rapidas</h3>
              <InfoTip text="Atalhos para tarefas, logs e configuracoes essenciais." />
            </div>
            <p className="text-xs text-slate-400">
              Pule direto para o que importa sem sair do perfil.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCreateJob}
                className="px-4 py-2 text-[10px] uppercase font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30"
              >
                Criar tarefa
              </button>
              <button
                type="button"
                onClick={handleOpenLogs}
                className="px-4 py-2 text-[10px] uppercase font-bold text-cyan-300 bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-500/20 rounded-xl transition-all"
              >
                Ver logs
              </button>
              <button
                type="button"
                onClick={handleOpenSettings}
                className="px-4 py-2 text-[10px] uppercase font-bold text-emerald-300 bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-500/20 rounded-xl transition-all"
              >
                Gerar chave
              </button>
              <button
                type="button"
                onClick={handleOpenWebhooks}
                className="px-4 py-2 text-[10px] uppercase font-bold text-amber-300 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/20 rounded-xl transition-all"
              >
                Configurar
              </button>
              <button
                type="button"
                onClick={handleOpenSupport}
                className="px-4 py-2 text-[10px] uppercase font-bold text-violet-300 bg-violet-950/30 hover:bg-violet-950/60 border border-violet-500/20 rounded-xl transition-all"
              >
                Suporte
              </button>
              <button
                type="button"
                onClick={handleOpenDocs}
                className="px-4 py-2 text-[10px] uppercase font-bold text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/60 border border-indigo-500/20 rounded-xl transition-all"
              >
                Docs
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const parseJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const App: React.FC = () => {
  const { activeTab, setActiveTab, isDocsOpen, setDocsOpen, setJobModalOpen } = useUiStore();
  const { isAuthenticated, login, logout } = useAuthStore();
  const { fetchJobs, jobs, setActiveJob } = useJobsStore();
  const [authChecking, setAuthChecking] = useState(true);

  // Global Docs State
  const [docsMarkdown, setDocsMarkdown] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    const handleFetchDocs = async () => {
      if (!isDocsOpen || docsMarkdown) return;
      
      setLoadingDocs(true);
      try {
        const res = await fetch('https://raw.githubusercontent.com/JanGustavo/Cron/master/README.md');
        if (res.ok) {
          const text = await res.text();
          setDocsMarkdown(text);
        } else {
          throw new Error('Failed to fetch');
        }
      } catch (err) {
        console.error('Failed to fetch raw README, using fallback:', err);
        setDocsMarkdown(HARDCODED_README);
      } finally {
        setLoadingDocs(false);
      }
    };

    handleFetchDocs();
  }, [isDocsOpen, docsMarkdown]);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('cf_token');
      if (savedToken) {
        try {
          // Set temporary localstorage for api interceptor
          localStorage.setItem('cf_token', savedToken);
          
          // Test saved token against backend
          const response = await api.get('/v1/jobs');
          const jobs = response.data || [];
          const extractedProjectId = jobs[0]?.projectId || '0fe9fb93-3fa0-44b6-b5d8-a5c5b62148a1';

          const decoded = parseJwt(savedToken);
          const email = decoded?.email || 'admin@cronflow.sh';
          const userId = decoded?.user_id || 'user-admin';
          const plan = decoded?.plan || 'free';
          const projectId = decoded?.project_id || extractedProjectId;
          const iat = decoded?.iat;
          const userCreatedAt = iat ? new Date(iat * 1000).toISOString() : new Date().toISOString();

          login(
            { id: userId, email: email, plan: plan, createdAt: userCreatedAt },
            { accessToken: savedToken, refreshToken: '', tokenType: 'Bearer', expiresIn: 86400 },
            [{ id: projectId, userId: userId, name: 'Projeto Principal', createdAt: userCreatedAt }]
          );
        } catch (err) {
          console.error('Auto login verification failed', err);
          logout();
        }
      }
      setAuthChecking(false);
    };

    checkAuth();
  }, [login, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchJobs();
      // Poll every 10 seconds to keep task lists fresh
      const interval = setInterval(() => {
        fetchJobs();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchJobs]);

  useEffect(() => {
    if (isAuthenticated && jobs.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const jobIdFromUrl = params.get('jobId');
      if (jobIdFromUrl) {
        const targetJob = jobs.find((j) => j.id === jobIdFromUrl);
        if (targetJob) {
          setActiveTab('jobs');
          setActiveJob(targetJob);
          setJobModalOpen(true);

          // Clean up the URL parameter cleanly so it doesn't open on reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    }
  }, [isAuthenticated, jobs, setActiveJob, setJobModalOpen, setActiveTab]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070913] flex flex-col justify-center items-center select-none font-mono">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff006e]/5 rounded-full blur-3xl" />
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950/40 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,217,255,0.2)] mb-4 z-10 animate-pulse">
          <svg className="w-9 h-9 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase z-10 animate-pulse">Carregando Sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginGate />;
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'jobs':
        return <JobsPage />;
      case 'logs':
        return <LogsPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <ProfilePage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <DashboardLayout>
        {renderActivePage()}
        <CreateJobModal />
      </DashboardLayout>
      <ToastHost />

      {/* Global Docs Modal */}
      {isDocsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-indigo-500/30 bg-[#0a0d1d]/95 p-6 md:p-8 shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden transition-all duration-300">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 opacity-90" />
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-indigo-950/40">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/20 shadow-lg text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 tracking-wide">Documentação do CronFlow</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Conectado ao GitHub (live)</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setDocsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
                title="Fechar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pr-2 my-6 space-y-4 custom-scrollbar text-slate-350 select-text max-h-[58vh]">
              {loadingDocs ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 uppercase tracking-widest animate-pulse">Buscando README.md do GitHub...</p>
                </div>
              ) : (
                parseMarkdownToReact(docsMarkdown)
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-indigo-950/40">
              <button
                onClick={() => setDocsOpen(false)}
                className="px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/90 rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
