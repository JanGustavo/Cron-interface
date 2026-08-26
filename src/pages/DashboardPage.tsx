import React, { useEffect, useState, useCallback } from 'react';
import { StatCard } from '../components/Dashboard/StatCard';
import { RecentActivity } from '../components/Dashboard/RecentActivity';
import { useUiStore } from '../store/uiStore';
import { useJobsStore } from '../store/jobsStore';
import api from '../services/api';
import { useEntitlements } from '../hooks/useEntitlements';
import { PixModal } from '../components/Shared/PixModal';
import { LogDetail } from '../components/Logs/LogDetail';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
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
      avgLatency?: number;
      maxLatency?: number;
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
          {data.avgLatency !== undefined && data.avgLatency > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-purple-500" />
                Latência Média:
              </span>
              <span className="font-semibold text-purple-300">{data.avgLatency}ms</span>
            </div>
          )}
          {data.maxLatency !== undefined && data.maxLatency > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-cyan-500" />
                Latência Máxima:
              </span>
              <span className="font-semibold text-cyan-300">{data.maxLatency}ms</span>
            </div>
          )}
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
  const { setCreateModalOpen, setDocsOpen, showToast, setLogModalOpen } = useUiStore();
  const { jobs, isLoading: isLoadingJobs } = useJobsStore();
  const [allRecentLogs, setAllRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isPageLoading = isLoadingJobs || (jobs.length > 0 && loading && allRecentLogs.length === 0);
  const [chartFilter, setChartFilter] = useState<'1h' | '24h' | '3d' | '7d' | '30d'>('24h');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedErrorCategory, setSelectedErrorCategory] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<'overview' | 'latency' | 'errors' | 'queue'>('overview');

  interface QueueMetrics {
    queues: {
      name: string;
      size: number;
      pending: number;
      active: number;
      scheduled: number;
      retry: number;
      archived: number;
      paused: boolean;
    }[];
  }
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const fetchQueueMetrics = useCallback(async () => {
    setLoadingQueue(true);
    try {
      const res = await api.get('/v1/metrics/queue');
      setQueueMetrics(res.data);
    } catch (err) {
      console.error('Failed to fetch queue metrics', err);
      showToast('Falha ao obter dados da fila Redis.', 'error');
    } finally {
      setLoadingQueue(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (activeMetric === 'queue') {
      const timer = setTimeout(() => {
        fetchQueueMetrics();
      }, 0);
      const interval = setInterval(fetchQueueMetrics, 5000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [activeMetric, fetchQueueMetrics]);

  const fetchRecentLogs = useCallback(async (active = true) => {
    if (jobs.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasError(false);
    try {
      // Calculate start date for last 30 days to optimize database scan and minimize payload size
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await api.get(`/v1/executions?limit=1000&start_date=${startDate}`, { timeout: 15000 });
      const rawLogs = (res.data?.data || []) as LogEntry[];
      
      // Map jobName and jobUrl using the local jobs list
      const mappedLogs = rawLogs.map((log) => {
        const job = jobs.find((j) => j.id === log.jobId);
        return {
          ...log,
          jobName: job ? job.name : 'Job Removido',
          jobUrl: job ? job.url : '',
        };
      });

      if (active) {
        setAllRecentLogs(mappedLogs);
      }
    } catch (err) {
      console.error('Failed to fetch global executions for dashboard', err);
      if (active) {
        setHasError(true);
      }
    } finally {
      if (active) setLoading(false);
    }
  }, [jobs]);

  useEffect(() => {
    let active = true;
    fetchRecentLogs(active);
    return () => { active = false; };
  }, [fetchRecentLogs]);

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

  const errorBreakdown = (() => {
    const categories = {
      ssrf: [] as LogEntry[],
      timeout: [] as LogEntry[],
      dns: [] as LogEntry[],
      http5xx: [] as LogEntry[],
      http4xx: [] as LogEntry[],
      others: [] as LogEntry[],
    };
    allRecentLogs.forEach((log) => {
      if (log.status === 'failed') {
        const msg = (log.responseBody || '').toLowerCase();
        if (msg.includes('ssrf')) categories.ssrf.push(log);
        else if (msg.includes('timeout') || msg.includes('deadline')) categories.timeout.push(log);
        else if (msg.includes('lookup') || msg.includes('dns') || msg.includes('no such host')) categories.dns.push(log);
        else if (log.httpStatus && log.httpStatus >= 500) categories.http5xx.push(log);
        else if (log.httpStatus && log.httpStatus >= 400) categories.http4xx.push(log);
        else categories.others.push(log);
      }
    });
    return categories;
  })();

  const { maxJobs, isPro, currentJobsCount } = useEntitlements();
  const isProPlan = isPro;
  const globalMaxLimit = maxJobs;
  const createdJobsCount = currentJobsCount;
  const isLimitReached = createdJobsCount >= globalMaxLimit;

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
      // Cria a data correspondente
      const d = new Date(now.getTime() - (config.count - 1 - idx) * config.intervalMs);
      
      // Normaliza a data para evitar acumulo por frações de segundos ou minutos
      if (chartFilter === '30d' || chartFilter === '7d') {
        d.setHours(0, 0, 0, 0); // Alinha no começo do dia correspondente
      } else if (chartFilter === '3d' || chartFilter === '24h') {
        d.setMinutes(0, 0, 0); // Alinha no começo da hora correspondente
      }
      
      const label = config.labelFormat(d);
      
      // Define a janela de tempo de forma contígua
      let end = d.getTime();
      if (idx === config.count - 1) {
        end = Math.max(end, now.getTime());
      }
      const start = end - config.intervalMs;
      
      return {
        label,
        start,
        end,
        volume: 0,
        successCount: 0,
        failedJobs: [] as string[],
        durations: [] as number[],
      };
    });

    filteredLogs.forEach((log) => {
      const logTime = new Date(log.triggeredAt).getTime();
      // Mapeia no intervalo correto com limite inclusivo
      const target = intervals.find((int) => logTime > int.start && logTime <= int.end);
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
        if (log.durationMs !== null && log.durationMs !== undefined) {
          target.durations.push(log.durationMs);
        }
      }
    });

    return intervals.map((int) => {
      const avg = int.durations.length > 0
        ? Math.round(int.durations.reduce((a, b) => a + b, 0) / int.durations.length)
        : 0;
      const max = int.durations.length > 0 ? Math.max(...int.durations) : 0;
      return {
        time: int.label,
        volume: int.volume,
        successRate: int.volume > 0 ? Math.round((int.successCount / int.volume) * 100) : 100,
        successCount: int.successCount,
        failedCount: int.volume - int.successCount,
        failedJobs: int.failedJobs,
        avgLatency: avg,
        maxLatency: max,
      };
    });
  })();

  const isChartEmpty = chartData.every((d) => d.volume === 0);

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
          Sua plataforma integrada de agendamento e automação serverless. Configure tarefas, receba webhooks e analise o histórico com agendamento previsível.
        </p>
        
        <div className="flex gap-3 mt-6">
          <button
            id="tour-btn-create"
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
          <button 
            onClick={() => {
              navigator.clipboard.writeText('jandersongustavo1@gmail.com');
              showToast('E-mail de contato copiado para a área de transferência! 📋', 'success');
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all cursor-pointer flex items-center gap-1.5"
            title="Copiar e-mail de contato"
          >
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Contato
          </button>
          <button 
            onClick={() => setIsPixModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/45 border border-indigo-500/20 hover:border-indigo-400/40 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Apoiar o projeto via PIX"
          >
            <span className="animate-[pulse-heart_1.8s_ease-in-out_infinite]">💜</span>
            Apoia-se
          </button>
        </div>
      </div>

      {!isLoadingJobs && jobs.length === 0 ? (
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
              id="tour-stat-jobs"
              title="Tarefas Cadastradas"
              value={`${createdJobsCount} / ${globalMaxLimit}`}
              color="indigo"
              isLoading={isPageLoading}
              description={isProPlan ? 'Plano Pro (50 tarefas máx por workspace)' : 'Plano Gratuito (5 tarefas máx por workspace)'}
              tooltip="O número de tarefas criadas em relação ao limite total do seu plano de workspace."
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
              isLoading={isPageLoading}
              description={successRate === '-' ? 'Sem execuções registradas' : 'Últimas 24 horas'}
              tooltip="O percentual de requisições HTTP disparadas com sucesso (código menor que 500)."
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
              isLoading={isPageLoading}
              description={avgResponseTime === '-' ? 'Sem execuções registradas' : 'Média geral de webhooks'}
              tooltip="A latência média de resposta dos seus servidores de webhook ao receber o agendamento."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          </div>

          {/* Recharts Performance Composed Chart */}
          <div className="p-6 rounded-2xl glass-panel border border-indigo-950/30 relative overflow-hidden space-y-5">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between border-b border-indigo-950/20 pb-4 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Métricas & Telemetria</span>
                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 font-bold uppercase">
                    Gráfico Interativo
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhe a quantidade de requisições enviadas, o tempo de resposta do seu servidor e a taxa de sucesso.
                </p>
              </div>

              {/* Segmented Metric Selector */}
              <div className="flex bg-[#04060f]/60 p-1 rounded-xl border border-indigo-950/80 self-start select-none">
                <button
                  type="button"
                  onClick={() => setActiveMetric('overview')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeMetric === 'overview'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Volume
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric('latency')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeMetric === 'latency'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Latência
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric('errors')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeMetric === 'errors'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Erros
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMetric('queue')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeMetric === 'queue'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fila Redis
                </button>
              </div>
            </div>

            {/* Quick Metrics Guide Banner */}
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs select-none">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="text-indigo-400 font-bold">💡 Entendendo as Métricas:</span>
                <span className="text-[11px] text-slate-400">
                  {activeMetric === 'overview' && 'As barras roxas/azuis mostram o total de requisições. A linha verde indica a % de sucesso dos disparos.'}
                  {activeMetric === 'latency' && 'A área roxa indica a latência média de resposta da sua API. A linha ciano pontilhada indica os picos máximos.'}
                  {activeMetric === 'errors' && 'As barras vermelhas registram disparos que retornaram erro (HTTP 4xx/5xx ou falha de rede).'}
                  {activeMetric === 'queue' && 'Status das filas Redis de processamento assíncrono de tarefas em tempo real.'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                Total: <strong className="text-indigo-300 font-mono">{totalExecutions} reqs</strong>
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
                      <div className="absolute left-0 mt-2 w-64 rounded-xl border border-indigo-900/50 bg-[#070913]/95 backdrop-blur-md shadow-2xl p-3 space-y-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
              </div>

              {/* Dynamic Chart Legends */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 bg-slate-900/40 border border-indigo-950/20 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-slate-400 select-none">
                {activeMetric === 'overview' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                      Volume (Barra)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      Taxa de Sucesso (Linha)
                    </span>
                  </>
                )}
                {activeMetric === 'latency' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                      Média (Área)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-0.5 bg-cyan-400 border border-dashed border-cyan-400" />
                      Pico Máximo (Linha)
                    </span>
                  </>
                )}
                {activeMetric === 'errors' && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    Requisições Falhas (Barra)
                  </span>
                )}
                {activeMetric === 'queue' && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Monitoramento da Fila (Redis)
                  </span>
                )}
              </div>
            </div>

            {/* Dynamic Charts Container */}
            <div className="pt-2">
              {activeMetric === 'queue' ? (
                <div className="space-y-4">
                  {loadingQueue && !queueMetrics ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
                      <div className="w-6 h-6 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-2" />
                      Lendo filas do Redis...
                    </div>
                  ) : !queueMetrics || queueMetrics.queues.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-slate-500 text-xs">
                      Nenhuma fila ativa detectada no Redis.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2">
                      {queueMetrics.queues.map((q) => (
                        <div key={q.name} className="p-4 rounded-xl border border-indigo-950/40 bg-[#04060f]/60 hover:bg-[#04060f]/90 transition-all space-y-3 relative group overflow-hidden">
                          {/* Top row */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fila: {q.name}</span>
                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border ${
                              q.paused
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            }`}>
                              {q.paused ? 'Pausada' : 'Ativa'}
                            </span>
                          </div>

                          {/* Stat Grid */}
                          <div className="grid grid-cols-2 gap-2 text-left">
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-500 uppercase font-semibold">Pendentes</p>
                              <p className="text-sm font-bold text-indigo-300 font-mono">{q.pending}</p>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-500 uppercase font-semibold">Ativas</p>
                              <p className="text-sm font-bold text-emerald-400 font-mono">{q.active}</p>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-500 uppercase font-semibold">Agendadas</p>
                              <p className="text-sm font-bold text-purple-400 font-mono">{q.scheduled}</p>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-500 uppercase font-semibold">Retentativas</p>
                              <p className="text-sm font-bold text-rose-400 font-mono">{q.retry}</p>
                            </div>
                          </div>

                          {/* Total count */}
                          <div className="flex items-center justify-between border-t border-indigo-950/20 pt-2.5 mt-1 text-[9px] text-slate-500">
                            <span>Total de Tarefas</span>
                            <span className="font-bold text-slate-350 font-mono">{q.size}</span> 
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : hasError ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-rose-500/20 bg-rose-950/5 min-h-[260px] text-center space-y-4">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-xs font-bold text-slate-250 font-mono">Erro ao carregar telemetria</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Não foi possível carregar os dados de telemetria (timeout ou erro de conexão). Reduzimos a amostragem inicial para otimizar o carregamento.
                    </p>
                    <button
                      onClick={() => fetchRecentLogs(true)}
                      className="mt-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all cursor-pointer"
                    >
                      Tentar Novamente 🔄
                    </button>
                  </div>
                </div>
              ) : isPageLoading ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-indigo-500/10 bg-[#04060f]/30 min-h-[260px] text-center space-y-4 select-none animate-pulse">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400">
                    <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-xs font-bold text-slate-350 font-mono">Processando telemetria...</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Carregando logs de execução e preparando gráficos de telemetria.
                    </p>
                  </div>
                </div>
              ) : isChartEmpty ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-indigo-500/10 bg-[#04060f]/30 min-h-[260px] text-center space-y-4 select-none">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400">
                    <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-xs font-bold text-slate-350 font-mono">Sem dados no período</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                      Nenhum disparo de webhook foi registrado para as tarefas selecionadas no intervalo de tempo de {chartFilter}. Certifique-se de que os agendamentos estão ativos e aguarde as execuções começarem.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {activeMetric === 'overview' && (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height={256}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="volumeGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.25}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="4 4" stroke="#334155" opacity={0.4} />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={{ stroke: '#334155' }} />
                          <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} req`} />
                          <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar yAxisId="left" dataKey="volume" barSize={32} radius={[6, 6, 0, 0]} fill="url(#volumeGlow)" />
                          <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={3} dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#070913' }} activeDot={{ r: 7, stroke: '#34d399', strokeWidth: 3, fill: '#070913' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeMetric === 'latency' && (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height={256}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="latencyGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b" opacity={0.25} />
                          <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}ms`} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="avgLatency" stroke="#a855f7" strokeWidth={3} fill="url(#latencyGlow)" />
                          <Line type="monotone" dataKey="maxLatency" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {activeMetric === 'errors' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      <div className="lg:col-span-2 h-64">
                        <ResponsiveContainer width="100%" height={256}>
                          <ComposedChart data={chartData} margin={{ top: 10, right: -5, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e1b4b" opacity={0.25} />
                            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} err`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="failedCount" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={24} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-2.5 bg-[#050716]/65 p-4 rounded-2xl border border-indigo-950/40 select-none text-left">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">Classificação dos Erros</h4>
                          {selectedErrorCategory && (
                            <button
                              onClick={() => setSelectedErrorCategory(null)}
                              className="text-[9px] text-slate-500 hover:text-slate-355 font-mono font-semibold cursor-pointer"
                            >
                              Limpar filtro
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: 'SSRF Bloqueado', count: errorBreakdown.ssrf.length, logs: errorBreakdown.ssrf, color: 'bg-rose-500', icon: '🛡️', key: 'ssrf' },
                            { label: 'Timeouts / Deadlines', count: errorBreakdown.timeout.length, logs: errorBreakdown.timeout, color: 'bg-amber-500', icon: '⏱️', key: 'timeout' },
                            { label: 'Resolução DNS / Host', count: errorBreakdown.dns.length, logs: errorBreakdown.dns, color: 'bg-cyan-500', icon: '🌐', key: 'dns' },
                            { label: 'Erros do Servidor (5xx)', count: errorBreakdown.http5xx.length, logs: errorBreakdown.http5xx, color: 'bg-purple-500', icon: '🔥', key: 'http5xx' },
                            { label: 'Erros do Cliente (4xx)', count: errorBreakdown.http4xx.length, logs: errorBreakdown.http4xx, color: 'bg-yellow-500', icon: '⚠️', key: 'http4xx' },
                            { label: 'Outros Erros', count: errorBreakdown.others.length, logs: errorBreakdown.others, color: 'bg-slate-500', icon: '⚙️', key: 'others' },
                          ].map((item, idx) => {
                            const totalFailed = Object.values(errorBreakdown).reduce((sum, list) => sum + list.length, 0);
                            const pct = totalFailed > 0 ? Math.round((item.count / totalFailed) * 100) : 0;
                            const isExpanded = selectedErrorCategory === item.key;
                            return (
                              <div key={idx} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedErrorCategory(isExpanded ? null : item.key)}
                                  className="w-full flex items-center justify-between text-[10px] text-slate-400 font-semibold hover:text-white transition-colors cursor-pointer text-left focus:outline-none"
                                >
                                  <span className="flex items-center gap-1.5">
                                    <span>{item.icon}</span>
                                    <span className={isExpanded ? 'text-rose-450 font-bold' : 'text-slate-350'}>{item.label}</span>
                                  </span>
                                  <span className="font-mono text-slate-450 flex items-center gap-1.5">
                                    <span>{item.count} ({pct}%)</span>
                                    <span className="text-[8px] text-slate-500">{isExpanded ? '▼' : '▶'}</span>
                                  </span>
                                </button>
                                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-indigo-950/20">
                                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>

                                {/* Collapsible execution list */}
                                {isExpanded && (
                                  <div className="mt-2 pl-3 py-1.5 border-l border-indigo-950/60 max-h-40 overflow-y-auto space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                                    {item.logs.length === 0 ? (
                                      <p className="text-[9px] text-slate-600 italic">Nenhuma falha neste grupo.</p>
                                    ) : (
                                      item.logs.map((log) => (
                                        <div
                                          key={log.id}
                                          onClick={() => setLogModalOpen(true, log.id)}
                                          className="p-1.5 bg-indigo-950/20 border border-indigo-950/50 hover:border-cyan-500/30 rounded-lg cursor-pointer hover:bg-indigo-950/40 transition-all text-left"
                                        >
                                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-200">
                                            <span className="truncate max-w-[120px]">{log.jobName || 'Tarefa'}</span>
                                            <span className="text-slate-500 font-mono">
                                              {(() => {
                                                const d = new Date(log.triggeredAt);
                                                const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                                const offset = d.getTimezoneOffset();
                                                const hours = Math.floor(Math.abs(offset) / 60);
                                                const sign = offset <= 0 ? '+' : '-';
                                                return `${time} (GMT${sign}${hours})`;
                                              })()}
                                            </span>
                                          </div>
                                          <p className="text-[8px] text-rose-400 font-mono truncate max-w-[195px] mt-0.5">
                                            {log.responseBody || 'Sem resposta'}
                                          </p>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Recent Activity list */}
          <RecentActivity activities={recentActivities} isLoading={isPageLoading} />
        </>
      )}
      <PixModal isOpen={isPixModalOpen} onClose={() => setIsPixModalOpen(false)} />
      <LogDetail logs={allRecentLogs} />
    </div>
  );
};
