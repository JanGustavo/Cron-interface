import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Brush,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { LogEntry } from '../types/logs';

export type TimeRangeFilter = '1h' | '6h' | '24h' | '3d' | '7d' | '30d';
export type GranularityFilter = 'auto' | '5m' | '15m' | '1h' | '3h' | '6h' | '1d';
export type ChartStyleType = 'bar' | 'area' | 'line';
export type MetricViewType = 'overview' | 'latency' | 'errors' | 'queue';

export interface ChartBucketData {
  index: number;
  time: string;
  fullRange: string;
  startTime: number;
  endTime: number;
  volume: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgLatency: number;
  maxLatency: number;
  failedJobs: string[];
  logs: LogEntry[];
}

interface BackendBucket {
  bucketTime: string;
  volume: number;
  successCount: number;
  failedCount: number;
  avgLatency: number;
  maxLatency: number;
  failedJobs: string[];
}

interface BackendSummary {
  totalVolume: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgLatency: number;
  maxLatency: number;
}

interface BackendErrors {
  ssrf: number;
  timeout: number;
  dns: number;
  http5xx: number;
  http4xx: number;
  others: number;
}

interface TelemetryApiResponse {
  buckets: BackendBucket[];
  summary: BackendSummary;
  errors: BackendErrors;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartBucketData;
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-4 rounded-2xl border border-indigo-950/80 bg-[#070918]/95 backdrop-blur-md shadow-2xl space-y-2.5 text-xs select-none min-w-64 max-w-sm">
        <div className="font-bold text-slate-100 border-b border-indigo-950/60 pb-2 flex justify-between items-center gap-4">
          <span className="font-mono text-cyan-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {data.fullRange || data.time}
          </span>
          <span className="text-[9px] text-slate-400 font-mono bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-500/20">
            Bucket #{data.index + 1}
          </span>
        </div>

        <div className="space-y-1.5 font-sans">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded bg-indigo-500" />
              Volume Total:
            </span>
            <span className="font-mono font-bold text-indigo-200">{data.volume} reqs</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sucessos (HTTP &lt; 400):
            </span>
            <span className="font-mono font-bold text-emerald-400">{data.successCount} reqs</span>
          </div>

          {data.failedCount > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Falhas:
              </span>
              <span className="font-mono font-bold text-rose-400">{data.failedCount} reqs</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              Taxa de Sucesso:
            </span>
            <span className="font-mono font-bold text-teal-300">
              {data.volume > 0 ? `${data.successRate}%` : '-'}
            </span>
          </div>

          {data.avgLatency > 0 && (
            <div className="flex items-center justify-between gap-4 border-t border-indigo-950/30 pt-1.5 mt-1">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-purple-500" />
                Latência Média:
              </span>
              <span className="font-mono font-bold text-purple-300">{data.avgLatency}ms</span>
            </div>
          )}

          {data.maxLatency > 0 && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded bg-cyan-400" />
                Pico Máximo:
              </span>
              <span className="font-mono font-bold text-cyan-300">{data.maxLatency}ms</span>
            </div>
          )}

          {data.failedJobs && data.failedJobs.length > 0 && (
            <div className="flex flex-col gap-1 border-t border-rose-950/40 pt-2 mt-1 text-[10px] text-rose-400 bg-rose-950/10 p-2 rounded-lg">
              <span className="font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                Tarefas com Falha no Período:
              </span>
              <span className="text-slate-300 font-mono pl-2 truncate">
                {data.failedJobs.join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-indigo-950/40 pt-2 mt-1 text-[10px] text-indigo-400 flex items-center justify-center gap-1 italic">
          <span>💡 Clique na coluna para filtrar execuções</span>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardPage: React.FC = () => {
  const { setCreateModalOpen, setDocsOpen, showToast } = useUiStore();
  const { jobs, isLoading: isLoadingJobs } = useJobsStore();
  
  // Telemetry & Activity States
  const [telemetryData, setTelemetryData] = useState<TelemetryApiResponse | null>(null);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [drilldownLogs, setDrilldownLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isPageLoading = isLoadingJobs || (jobs.length > 0 && loading && !telemetryData);

  // Filter & View State
  const [chartFilter, setChartFilter] = useState<TimeRangeFilter>('7d');
  const [granularity, setGranularity] = useState<GranularityFilter>('auto');
  const [chartStyle, setChartStyle] = useState<ChartStyleType>('bar');
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedErrorCategory, setSelectedErrorCategory] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState<MetricViewType>('overview');
  
  // Interactive Drill-down & Series Controls
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(null);
  const [isBrushEnabled, setIsBrushEnabled] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Series visibility toggles (Legend)
  const [seriesVisible, setSeriesVisible] = useState({
    success: true,
    failed: true,
    rate: true,
    avgLatency: true,
    maxLatency: true,
  });

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

  // Fetch telemetry aggregated data directly from backend SQL engine
  const fetchTelemetry = useCallback(async (active = true) => {
    if (jobs.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setHasError(false);
    try {
      const jobIdsParam = selectedJobIds.length > 0 ? `&job_ids=${selectedJobIds.join(',')}` : '';
      const res = await api.get<TelemetryApiResponse>(
        `/v1/executions/telemetry?time_range=${chartFilter}&granularity=${granularity}${jobIdsParam}`,
        { timeout: 15000 }
      );
      if (active && res.data) {
        setTelemetryData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch telemetry for dashboard', err);
      if (active) {
        setHasError(true);
      }
    } finally {
      if (active) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [jobs, chartFilter, granularity, selectedJobIds]);

  // Fetch recent executions for live feed & modal logs
  const fetchRecentLogs = useCallback(async (active = true) => {
    if (jobs.length === 0) return;
    try {
      const res = await api.get('/v1/executions?limit=50', { timeout: 10000 });
      const rawLogs = (res.data?.data || []) as LogEntry[];
      const mappedLogs = rawLogs.map((log) => {
        const job = jobs.find((j) => j.id === log.jobId);
        return {
          ...log,
          jobName: job ? job.name : 'Job Removido',
          jobUrl: job ? job.url : '',
        };
      });

      if (active) {
        setRecentLogs(mappedLogs);
      }
    } catch (err) {
      console.error('Failed to fetch recent executions', err);
    }
  }, [jobs]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchTelemetry(true);
    fetchRecentLogs(true);
    if (activeMetric === 'queue') {
      fetchQueueMetrics();
    }
  };

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      fetchTelemetry(active);
      fetchRecentLogs(active);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [fetchTelemetry, fetchRecentLogs]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      fetchTelemetry(true);
      fetchRecentLogs(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchTelemetry, fetchRecentLogs]);

  // Entitlements
  const { maxJobs, isPro, currentJobsCount } = useEntitlements();
  const isProPlan = isPro;
  const globalMaxLimit = maxJobs;
  const createdJobsCount = currentJobsCount;
  const isLimitReached = createdJobsCount >= globalMaxLimit;

  // =========================================================================
  // CONTINUOUS MULTI-RESOLUTION TIME BUCKET ENGINE
  // =========================================================================
  const chartData = useMemo<ChartBucketData[]>(() => {
    const now = new Date();
    const nowTime = now.getTime();

    // 1. Determine duration in ms
    let durationMs: number;
    switch (chartFilter) {
      case '1h':
        durationMs = 60 * 60 * 1000;
        break;
      case '6h':
        durationMs = 6 * 60 * 60 * 1000;
        break;
      case '3d':
        durationMs = 3 * 24 * 60 * 60 * 1000;
        break;
      case '7d':
        durationMs = 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        durationMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case '24h':
      default:
        durationMs = 24 * 60 * 60 * 1000;
        break;
    }

    // 2. Determine bucket interval in ms
    let intervalMs: number;
    if (granularity === 'auto') {
      switch (chartFilter) {
        case '1h':
          intervalMs = 5 * 60 * 1000; // 5 min -> 12 buckets
          break;
        case '6h':
          intervalMs = 15 * 60 * 1000; // 15 min -> 24 buckets
          break;
        case '24h':
          intervalMs = 60 * 60 * 1000; // 1 hora -> 24 buckets
          break;
        case '3d':
          intervalMs = 3 * 60 * 60 * 1000; // 3 horas -> 24 buckets
          break;
        case '7d':
          intervalMs = 24 * 60 * 60 * 1000; // 1 dia -> 7 buckets diários
          break;
        case '30d':
          intervalMs = 24 * 60 * 60 * 1000; // 1 dia -> 30 buckets diários
          break;
        default:
          intervalMs = 60 * 60 * 1000;
      }
    } else {
      switch (granularity) {
        case '5m':
          intervalMs = 5 * 60 * 1000;
          break;
        case '15m':
          intervalMs = 15 * 60 * 1000;
          break;
        case '1h':
          intervalMs = 60 * 60 * 1000;
          break;
        case '3h':
          intervalMs = 3 * 60 * 60 * 1000;
          break;
        case '6h':
          intervalMs = 6 * 60 * 60 * 1000;
          break;
        case '1d':
          intervalMs = 24 * 60 * 60 * 1000;
          break;
        default:
          intervalMs = 60 * 60 * 1000;
      }
    }

    const startTime = nowTime - durationMs;
    const bucketCount = Math.max(1, Math.ceil(durationMs / intervalMs));

    // 3. Build gapless, continuous intervals
    const buckets: ChartBucketData[] = Array.from({ length: bucketCount }).map((_, idx) => {
      const bStart = startTime + idx * intervalMs;
      const bEnd = idx === bucketCount - 1 ? nowTime : bStart + intervalMs;
      const dStart = new Date(bStart);
      const dEnd = new Date(bEnd);

      // Short X-Axis label
      let label: string;
      if (intervalMs <= 15 * 60 * 1000) {
        label = dEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (intervalMs <= 60 * 60 * 1000) {
        label = dEnd.getHours().toString().padStart(2, '0') + 'h';
      } else if (durationMs <= 3 * 24 * 60 * 60 * 1000) {
        const weekday = dEnd.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        label = `${weekday} ${dEnd.getHours().toString().padStart(2, '0')}h`;
      } else if (durationMs <= 7 * 24 * 60 * 60 * 1000) {
        const weekday = dStart.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const dayMonth = dStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        label = `${weekday} ${dayMonth}`;
      } else {
        label = dStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }

      // Rich Tooltip fullRange label
      const isSameDay = dStart.toDateString() === dEnd.toDateString();
      const isToday = dEnd.toDateString() === now.toDateString();
      const datePrefix = isToday ? 'Hoje' : dStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      let fullRange: string;

      if (isSameDay) {
        fullRange = `${datePrefix}, ${dStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} → ${dEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        fullRange = `${dStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} → ${dEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      }

      return {
        index: idx,
        time: label,
        fullRange,
        startTime: bStart,
        endTime: bEnd,
        volume: 0,
        successCount: 0,
        failedCount: 0,
        successRate: 100,
        avgLatency: 0,
        maxLatency: 0,
        failedJobs: [],
        logs: [],
      };
    });

    // 4. Map backend buckets accurately into the time slots
    const backendBuckets = telemetryData?.buckets || [];
    backendBuckets.forEach((bb) => {
      const bbTime = new Date(bb.bucketTime).getTime();
      if (bbTime >= startTime && bbTime <= nowTime) {
        const slotIdx = Math.min(
          Math.floor((bbTime - startTime) / intervalMs),
          bucketCount - 1
        );
        if (slotIdx >= 0 && slotIdx < buckets.length) {
          const slot = buckets[slotIdx];
          slot.volume += bb.volume;
          slot.successCount += bb.successCount;
          slot.failedCount += bb.failedCount;
          if (bb.avgLatency > 0) {
            slot.avgLatency = slot.avgLatency === 0 ? bb.avgLatency : Math.round((slot.avgLatency + bb.avgLatency) / 2);
          }
          if (bb.maxLatency > slot.maxLatency) {
            slot.maxLatency = bb.maxLatency;
          }
          if (bb.failedJobs) {
            bb.failedJobs.forEach((fj) => {
              if (!slot.failedJobs.includes(fj)) slot.failedJobs.push(fj);
            });
          }
        }
      }
    });

    // 5. Calculate success rate per slot
    buckets.forEach((slot) => {
      slot.successRate = slot.volume > 0 ? Math.round((slot.successCount / slot.volume) * 100) : 100;
    });

    return buckets;
  }, [telemetryData, chartFilter, granularity]);

  const isChartEmpty = chartData.every((d) => d.volume === 0);

  // Period Summary KPI Strip (Directly from backend calculation or fallback to bucket sum)
  const periodSummary = useMemo(() => {
    if (telemetryData?.summary) {
      return {
        totalVolume: telemetryData.summary.totalVolume,
        totalSuccess: telemetryData.summary.successCount,
        totalFailed: telemetryData.summary.failedCount,
        rate: telemetryData.summary.totalVolume > 0 ? telemetryData.summary.successRate.toFixed(1) : '-',
        avg: telemetryData.summary.avgLatency,
        max: telemetryData.summary.maxLatency,
      };
    }
    const totalVolume = chartData.reduce((acc, b) => acc + b.volume, 0);
    const totalSuccess = chartData.reduce((acc, b) => acc + b.successCount, 0);
    const totalFailed = chartData.reduce((acc, b) => acc + b.failedCount, 0);
    const rate = totalVolume > 0 ? ((totalSuccess / totalVolume) * 100).toFixed(1) : '-';
    const allDurations = chartData.map((b) => b.avgLatency).filter((v) => v > 0);
    const avg = allDurations.length > 0 ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length) : 0;
    const max = Math.max(0, ...chartData.map((b) => b.maxLatency));

    return { totalVolume, totalSuccess, totalFailed, rate, avg, max };
  }, [telemetryData, chartData]);

  // Selected bucket for Drill-down
  const activeBucket = selectedBucketIndex !== null && chartData[selectedBucketIndex] ? chartData[selectedBucketIndex] : null;

  // Drilldown log fetch when clicking a bucket
  useEffect(() => {
    if (!activeBucket) return;
    let active = true;
    const fetchBucketLogs = async () => {
      setLoadingDrilldown(true);
      try {
        const start = new Date(activeBucket.startTime).toISOString();
        const end = new Date(activeBucket.endTime).toISOString();
        const res = await api.get(`/v1/executions?limit=50&start_date=${start}&end_date=${end}`);
        const raw = (res.data?.data || []) as LogEntry[];
        const mapped = raw.map((log) => {
          const job = jobs.find((j) => j.id === log.jobId);
          return {
            ...log,
            jobName: job ? job.name : 'Job Removido',
            jobUrl: job ? job.url : '',
          };
        });
        if (active) setDrilldownLogs(mapped);
      } catch (err) {
        console.error('Failed to fetch bucket logs', err);
      } finally {
        if (active) setLoadingDrilldown(false);
      }
    };
    fetchBucketLogs();
    return () => {
      active = false;
    };
  }, [activeBucket, jobs]);

  // Filtered activities list based on drilldown selection
  const displayActivities = useMemo(() => {
    if (activeBucket) {
      return drilldownLogs;
    }
    return recentLogs.slice(0, 10);
  }, [activeBucket, drilldownLogs, recentLogs]);

  // Error breakdown from backend
  const errorCounts = useMemo(() => {
    return (
      telemetryData?.errors || {
        ssrf: 0,
        timeout: 0,
        dns: 0,
        http5xx: 0,
        http4xx: 0,
        others: 0,
      }
    );
  }, [telemetryData]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pulse-slow pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
          Status do Sistema
        </span>
        <h2 className="text-3xl font-extrabold mt-1 text-slate-100">
          Bem-vindo ao <span className="text-gradient-cyber">CronFlow</span>
        </h2>
        <p className="text-sm text-slate-400 mt-2 max-w-xl">
          Sua plataforma integrada de agendamento e automação serverless. Configure tarefas, receba webhooks e analise o histórico com agendamento previsível.
        </p>
        
        <div className="flex flex-wrap gap-3 mt-6">
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
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none pulse-slow" />
          
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <svg className="w-8 h-8 text-indigo-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <div className="max-w-md space-y-2 relative">
            <h3 className="text-xl font-bold text-slate-100">
              Nenhuma tarefa agendada
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Você ainda não criou nenhum job. Comece agendando sua primeira rota de webhook com retries exponenciais e monitoramento instantâneo.
            </p>
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/30 neon-glow-primary cursor-pointer hover:scale-105"
          >
            Criar Primeiro Job Agora 🚀
          </button>
        </div>
      ) : (
        <>
          {/* Global KPI Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Tarefas Cadastradas"
              value={createdJobsCount}
              color="indigo"
              isLoading={isLoadingJobs}
              description={isProPlan ? `Até ${globalMaxLimit} jobs permitidos (PRO)` : `${createdJobsCount}/${globalMaxLimit} do plano Free`}
              tooltip="Quantidade de tarefas atualmente salvas no seu projeto."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
            <StatCard
              title="Total de Execuções"
              value={periodSummary.totalVolume}
              color="indigo"
              isLoading={isPageLoading}
              description={periodSummary.totalVolume > 0 ? `Filtrado por: ${chartFilter}` : 'Nenhuma execução'}
              tooltip="Total de requisições disparadas pelo worker no período selecionado."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              title="Taxa de Sucesso"
              value={periodSummary.rate === '-' ? '-' : `${periodSummary.rate}%`}
              color="emerald"
              isLoading={isPageLoading}
              description={periodSummary.rate === '-' ? 'Sem execuções registradas' : `Média do período (${chartFilter})`}
              tooltip="O percentual de requisições HTTP disparadas com sucesso (código menor que 400)."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Tempo de Resposta Médio"
              value={periodSummary.avg > 0 ? `${periodSummary.avg}ms` : '-'}
              color="purple"
              isLoading={isPageLoading}
              description={periodSummary.avg === 0 ? 'Sem execuções registradas' : `Média do período (${chartFilter})`}
              tooltip="A latência média de resposta dos seus servidores de webhook ao receber o agendamento."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* ================================================================= */}
          {/* ADVANCED INTERACTIVE METRICS & TELEMETRY CHART */}
          {/* ================================================================= */}
          <div className="p-6 rounded-2xl glass-panel border border-indigo-950/40 relative overflow-hidden space-y-5">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header: Title, Metric Segmented Selector & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-indigo-950/40 pb-4 gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Métricas & Telemetria Dinâmica</span>
                  <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-bold uppercase tracking-wider">
                    Interativo v2
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Distribuição temporal contínua por agregação SQL em tempo real, sem limites de linhas ou cortes de histórico.
                </p>
              </div>

              {/* Top Controls: Metrics Switcher & Live Refresh Button */}
              <div className="flex flex-wrap items-center gap-2.5 select-none">
                {/* Metric Mode Selector */}
                <div className="flex bg-[#04060f]/80 p-1 rounded-xl border border-indigo-950/80">
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

                {/* Auto Refresh Toggle & Manual Refresh Button */}
                <div className="flex items-center gap-1.5 bg-[#04060f]/80 p-1 rounded-xl border border-indigo-950/80">
                  <button
                    type="button"
                    onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAutoRefresh
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={isAutoRefresh ? 'Auto-refresh ativo a cada 10s' : 'Auto-refresh pausado'}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isAutoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                    {isAutoRefresh ? 'Ao Vivo' : 'Pausado'}
                  </button>

                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer"
                    title="Atualizar dados agora"
                  >
                    <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick KPI Strip inside the chart header */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 select-none font-mono">
              <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Volume no Filtro</span>
                <span className="text-sm font-black text-indigo-300">{periodSummary.totalVolume} reqs</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Sucessos</span>
                <span className="text-sm font-black text-emerald-400">{periodSummary.totalSuccess}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Falhas</span>
                <span className="text-sm font-black text-rose-400">{periodSummary.totalFailed}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Taxa de Sucesso</span>
                <span className="text-sm font-black text-teal-300">{periodSummary.rate}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Latência Média</span>
                <span className="text-sm font-black text-purple-300">{periodSummary.avg > 0 ? `${periodSummary.avg}ms` : '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Pico Máximo</span>
                <span className="text-sm font-black text-cyan-300">{periodSummary.max > 0 ? `${periodSummary.max}ms` : '-'}</span>
              </div>
            </div>

            {/* Controls Bar: Time Range, Granularity, Chart Style, Job Filter, Series Legend */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-[#04060f]/40 p-3 rounded-xl border border-indigo-950/30">
              <div className="flex flex-wrap items-center gap-2 select-none">
                {/* Time Range Filter Buttons */}
                <div className="flex bg-slate-900/80 border border-indigo-950/60 p-1 rounded-xl gap-0.5">
                  {[
                    { id: '1h', label: '1h' },
                    { id: '6h', label: '6h' },
                    { id: '24h', label: '24h' },
                    { id: '3d', label: '3d' },
                    { id: '7d', label: '7d' },
                    { id: '30d', label: '30d' },
                  ].map((filter) => {
                    const active = chartFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        onClick={() => {
                          setChartFilter(filter.id as TimeRangeFilter);
                          setSelectedBucketIndex(null);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white shadow-sm border border-indigo-400/30'
                            : 'text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>

                {/* Granularity Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900/80 border border-indigo-950/60 px-2 py-1 rounded-xl text-[10px]">
                  <span className="text-slate-400 font-bold">Resolução:</span>
                  <select
                    value={granularity}
                    onChange={(e) => {
                      setGranularity(e.target.value as GranularityFilter);
                      setSelectedBucketIndex(null);
                    }}
                    className="bg-transparent text-indigo-300 font-mono font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="auto" className="bg-[#0a0d1d] text-slate-200">Auto (Ideal)</option>
                    <option value="5m" className="bg-[#0a0d1d] text-slate-200">5 Minutos</option>
                    <option value="15m" className="bg-[#0a0d1d] text-slate-200">15 Minutos</option>
                    <option value="1h" className="bg-[#0a0d1d] text-slate-200">1 Hora</option>
                    <option value="3h" className="bg-[#0a0d1d] text-slate-200">3 Horas</option>
                    <option value="6h" className="bg-[#0a0d1d] text-slate-200">6 Horas</option>
                    <option value="1d" className="bg-[#0a0d1d] text-slate-200">1 Dia</option>
                  </select>
                </div>

                {/* Chart Style Switcher (Bar / Area / Line) */}
                <div className="flex bg-slate-900/80 border border-indigo-950/60 p-1 rounded-xl gap-0.5">
                  <button
                    type="button"
                    onClick={() => setChartStyle('bar')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      chartStyle === 'bar'
                        ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                    title="Visualização em Barras Empilhadas"
                  >
                    <span>📊</span>
                    <span className="hidden sm:inline">Barras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartStyle('area')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      chartStyle === 'area'
                        ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                    title="Visualização em Área Fluida"
                  >
                    <span>🌊</span>
                    <span className="hidden sm:inline">Área</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartStyle('line')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      chartStyle === 'line'
                        ? 'bg-indigo-600/40 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                    title="Visualização em Linhas"
                  >
                    <span>📈</span>
                    <span className="hidden sm:inline">Linhas</span>
                  </button>
                </div>

                {/* Job Selector Dropdown Filter */}
                <div className="relative select-none">
                  <button
                    type="button"
                    onClick={() => setIsJobFilterOpen(!isJobFilterOpen)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-900 border border-indigo-950/60 hover:border-indigo-500/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>
                      Jobs: {selectedJobIds.length === 0 ? 'Todos' : `${selectedJobIds.length} selecionados`}
                    </span>
                    <svg className={`w-3 h-3 text-slate-400 transition-transform ${isJobFilterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isJobFilterOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsJobFilterOpen(false)} />
                      <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-indigo-900/60 bg-[#070913]/98 backdrop-blur-xl shadow-2xl p-3 space-y-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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

                        <div className="max-h-45 overflow-y-auto space-y-1.5 pr-1">
                          {jobs.map((job) => {
                            const checked = selectedJobIds.includes(job.id);
                            return (
                              <label
                                key={job.id}
                                className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-indigo-950/30 cursor-pointer select-none text-[11px] font-medium text-slate-300 transition-colors"
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

                {/* Timeline Scrubber / Brush Toggle */}
                {chartData.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setIsBrushEnabled(!isBrushEnabled)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      isBrushEnabled
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-indigo-950/60'
                    }`}
                    title="Habilitar barra deslizante de zoom / timeline"
                  >
                    <span>🔍</span>
                    <span>Zoom Scrubber</span>
                  </button>
                )}
              </div>

              {/* Interactive Legend (Click to Toggle Series) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-slate-900/60 border border-indigo-950/30 px-3 py-1.5 rounded-xl text-[10px] font-semibold text-slate-400 select-none">
                <span className="text-[9px] uppercase font-bold text-slate-400 mr-1">Séries:</span>
                {activeMetric === 'overview' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSeriesVisible((prev) => ({ ...prev, success: !prev.success }))}
                      className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${seriesVisible.success ? 'opacity-100' : 'opacity-35 line-through'}`}
                      title="Clique para ocultar/exibir Sucessos"
                    >
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span>Sucesso</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeriesVisible((prev) => ({ ...prev, failed: !prev.failed }))}
                      className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${seriesVisible.failed ? 'opacity-100' : 'opacity-35 line-through'}`}
                      title="Clique para ocultar/exibir Falhas"
                    >
                      <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                      <span>Falhas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeriesVisible((prev) => ({ ...prev, rate: !prev.rate }))}
                      className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${seriesVisible.rate ? 'opacity-100' : 'opacity-35 line-through'}`}
                      title="Clique para ocultar/exibir Linha de Taxa %"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                      <span>Taxa %</span>
                    </button>
                  </>
                )}

                {activeMetric === 'latency' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSeriesVisible((prev) => ({ ...prev, avgLatency: !prev.avgLatency }))}
                      className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${seriesVisible.avgLatency ? 'opacity-100' : 'opacity-35 line-through'}`}
                    >
                      <span className="w-2.5 h-2.5 rounded bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                      <span>Média (ms)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeriesVisible((prev) => ({ ...prev, maxLatency: !prev.maxLatency }))}
                      className={`flex items-center gap-1.5 cursor-pointer transition-opacity ${seriesVisible.maxLatency ? 'opacity-100' : 'opacity-35 line-through'}`}
                    >
                      <span className="w-2.5 h-0.5 bg-cyan-400 border border-dashed border-cyan-400" />
                      <span>Pico Máx</span>
                    </button>
                  </>
                )}

                {activeMetric === 'errors' && (
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    <span>Requisições com Erro</span>
                  </span>
                )}

                {activeMetric === 'queue' && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Monitoramento Redis Live</span>
                  </span>
                )}
              </div>
            </div>

            {/* Active Drilldown Banner */}
            {activeBucket && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 flex-wrap font-mono">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold uppercase text-[9px]">
                    Filtro Ativo
                  </span>
                  <span>
                    Intervalo: <strong>{activeBucket.fullRange}</strong>
                  </span>
                  <span className="text-slate-400">
                    ({activeBucket.volume} reqs • {activeBucket.successCount} sucessos, {activeBucket.failedCount} falhas)
                  </span>
                  {loadingDrilldown && (
                    <span className="text-cyan-400 animate-pulse">Carregando logs do período...</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBucketIndex(null)}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:text-white bg-slate-900/60 hover:bg-slate-800 rounded-lg border border-cyan-500/20 transition-all cursor-pointer"
                >
                  Limpar Seleção ✕
                </button>
              </div>
            )}

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
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Fila: {q.name}</span>
                            <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border font-mono ${
                              q.paused
                                ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            }`}>
                              {q.paused ? 'Pausada' : 'Ativa'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-left font-mono">
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-400 uppercase font-semibold">Pendentes</p>
                              <p className="text-sm font-bold text-indigo-300">{q.pending}</p>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-400 uppercase font-semibold">Ativas</p>
                              <p className="text-sm font-bold text-emerald-400">{q.active}</p>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-400 uppercase font-semibold">Agendadas</p>
                              <p className="text-sm font-bold text-purple-400">{q.scheduled}</p>
                            </div>
                            <div className="bg-slate-950/40 p-2 rounded-lg border border-indigo-950/25">
                              <p className="text-[9px] text-slate-400 uppercase font-semibold">Retentativas</p>
                              <p className="text-sm font-bold text-rose-400">{q.retry}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-indigo-950/20 pt-2.5 mt-1 text-[9px] text-slate-400 font-mono">
                            <span>Total de Tarefas</span>
                            <span className="font-bold text-slate-200">{q.size}</span> 
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : hasError ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-rose-500/20 bg-rose-950/5 min-h-65 text-center space-y-4">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-rose-950/20 border border-rose-500/20 text-rose-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-xs font-bold text-slate-200 font-mono">Erro ao carregar telemetria</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Não foi possível carregar os dados de telemetria (timeout ou erro de conexão).
                    </p>
                    <button
                      onClick={() => fetchTelemetry(true)}
                      className="mt-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/20 transition-all cursor-pointer"
                    >
                      Tentar Novamente 🔄
                    </button>
                  </div>
                </div>
              ) : isPageLoading ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-indigo-500/10 bg-[#04060f]/30 min-h-65 text-center space-y-4 select-none animate-pulse">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400">
                    <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-xs font-bold text-slate-300 font-mono">Processando telemetria...</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Calculando métricas agregadas diretamente do banco de dados em tempo real.
                    </p>
                  </div>
                </div>
              ) : isChartEmpty ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 rounded-2xl border border-dashed border-indigo-500/10 bg-[#04060f]/30 min-h-65 text-center space-y-4 select-none">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-indigo-400">
                    <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                    </svg>
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-xs font-bold text-slate-300 font-mono">Sem execuções no período selecionado ({chartFilter})</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Nenhum disparo de webhook foi registrado no período selecionado. Seus jobs agendados estão prontos para disparar assim que o cronograma for atingido.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* OVERVIEW / VOLUME METRIC VIEW */}
                  {activeMetric === 'overview' && (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height={288}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: isBrushEnabled ? 25 : 5 }}
                          onClick={(e) => {
                            if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                              const index = Number(e.activeTooltipIndex);
                              setSelectedBucketIndex(selectedBucketIndex === index ? null : index);
                            }
                          }}
                        >
                          <defs>
                            <linearGradient id="successBarGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.4}/>
                            </linearGradient>
                            <linearGradient id="failedBarGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.9}/>
                              <stop offset="95%" stopColor="#e11d48" stopOpacity={0.5}/>
                            </linearGradient>
                            <linearGradient id="volumeAreaGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                          
                          <XAxis
                            dataKey="time"
                            stroke="#94a3b8"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={{ stroke: '#334155' }}
                          />
                          <YAxis
                            yAxisId="left"
                            stroke="#94a3b8"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `${v}`}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#34d399"
                            fontSize={10}
                            fontWeight={600}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(v) => `${v}%`}
                          />

                          <Tooltip content={<CustomTooltip />} />

                          {chartStyle === 'bar' && (
                            <>
                              {seriesVisible.success && (
                                <Bar
                                  yAxisId="left"
                                  dataKey="successCount"
                                  name="Sucessos"
                                  stackId="volume"
                                  radius={[0, 0, 0, 0]}
                                  fill="url(#successBarGlow)"
                                  cursor="pointer"
                                >
                                  {chartData.map((_, index) => (
                                    <Cell
                                      key={`cell-s-${index}`}
                                      stroke={selectedBucketIndex === index ? '#34d399' : 'transparent'}
                                      strokeWidth={selectedBucketIndex === index ? 2 : 0}
                                      opacity={selectedBucketIndex === null || selectedBucketIndex === index ? 1 : 0.4}
                                    />
                                  ))}
                                </Bar>
                              )}

                              {seriesVisible.failed && (
                                <Bar
                                  yAxisId="left"
                                  dataKey="failedCount"
                                  name="Falhas"
                                  stackId="volume"
                                  radius={[4, 4, 0, 0]}
                                  fill="url(#failedBarGlow)"
                                  cursor="pointer"
                                >
                                  {chartData.map((_, index) => (
                                    <Cell
                                      key={`cell-f-${index}`}
                                      stroke={selectedBucketIndex === index ? '#fda4af' : 'transparent'}
                                      strokeWidth={selectedBucketIndex === index ? 2 : 0}
                                      opacity={selectedBucketIndex === null || selectedBucketIndex === index ? 1 : 0.4}
                                    />
                                  ))}
                                </Bar>
                              )}
                            </>
                          )}

                          {chartStyle === 'area' && (
                            <Area
                              yAxisId="left"
                              type="monotone"
                              dataKey="volume"
                              name="Volume Total"
                              stroke="#818cf8"
                              strokeWidth={2.5}
                              fill="url(#volumeAreaGlow)"
                              cursor="pointer"
                            />
                          )}

                          {chartStyle === 'line' && (
                            <Line
                              yAxisId="left"
                              type="monotone"
                              dataKey="volume"
                              name="Volume Total"
                              stroke="#818cf8"
                              strokeWidth={3}
                              dot={{ r: 3, stroke: '#818cf8', strokeWidth: 2, fill: '#070913' }}
                              activeDot={{ r: 6, stroke: '#a5b4fc', strokeWidth: 2, fill: '#070913' }}
                              cursor="pointer"
                            />
                          )}

                          {seriesVisible.rate && (
                            <Line
                              yAxisId="right"
                              type="monotone"
                              dataKey="successRate"
                              name="Taxa de Sucesso"
                              stroke="#06b6d4"
                              strokeWidth={2.5}
                              dot={{ r: 3, stroke: '#06b6d4', strokeWidth: 2, fill: '#070913' }}
                              activeDot={{ r: 6, stroke: '#67e8f9', strokeWidth: 3, fill: '#070913' }}
                            />
                          )}

                          {isBrushEnabled && chartData.length > 8 && (
                            <Brush
                              dataKey="time"
                              height={20}
                              stroke="#6366f1"
                              fill="#090d24"
                              travellerWidth={8}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* LATENCY METRIC VIEW */}
                  {activeMetric === 'latency' && (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height={288}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -15, bottom: isBrushEnabled ? 25 : 5 }}
                          onClick={(e) => {
                            if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                              const index = Number(e.activeTooltipIndex);
                              setSelectedBucketIndex(selectedBucketIndex === index ? null : index);
                            }
                          }}
                        >
                          <defs>
                            <linearGradient id="latencyAreaGlow" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5}/>
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#334155' }} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}ms`} />
                          
                          <Tooltip content={<CustomTooltip />} />
                          
                          <ReferenceLine y={200} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'SLA Rápido (200ms)', fill: '#10b981', fontSize: 9 }} />
                          <ReferenceLine y={500} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Atenção (500ms)', fill: '#f59e0b', fontSize: 9 }} />

                          {seriesVisible.avgLatency && (
                            <Area
                              type="monotone"
                              dataKey="avgLatency"
                              name="Latência Média"
                              stroke="#a855f7"
                              strokeWidth={3}
                              fill="url(#latencyAreaGlow)"
                              cursor="pointer"
                            />
                          )}

                          {seriesVisible.maxLatency && (
                            <Line
                              type="monotone"
                              dataKey="maxLatency"
                              name="Pico Máximo"
                              stroke="#06b6d4"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                          )}

                          {isBrushEnabled && chartData.length > 8 && (
                            <Brush
                              dataKey="time"
                              height={20}
                              stroke="#a855f7"
                              fill="#090d24"
                              travellerWidth={8}
                            />
                          )}
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* ERRORS METRIC VIEW */}
                  {activeMetric === 'errors' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                      <div className="lg:col-span-2 h-72">
                        <ResponsiveContainer width="100%" height={288}>
                          <ComposedChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: -15, bottom: isBrushEnabled ? 25 : 5 }}
                            onClick={(e) => {
                              if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                                const index = Number(e.activeTooltipIndex);
                                setSelectedBucketIndex(selectedBucketIndex === index ? null : index);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
                            <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#334155' }} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v} err`} />
                            
                            <Tooltip content={<CustomTooltip />} />
                            
                            <Bar dataKey="failedCount" name="Erros" fill="#f43f5e" radius={[4, 4, 0, 0]} cursor="pointer">
                              {chartData.map((entry, index) => (
                                <Cell
                                  key={`cell-err-${index}`}
                                  stroke={selectedBucketIndex === index ? '#ffffff' : 'transparent'}
                                  strokeWidth={selectedBucketIndex === index ? 2 : 0}
                                  fill={entry.failedCount > 0 ? '#f43f5e' : '#334155'}
                                  opacity={entry.failedCount > 0 ? (selectedBucketIndex === null || selectedBucketIndex === index ? 1 : 0.4) : 0.2}
                                />
                              ))}
                            </Bar>

                            {isBrushEnabled && chartData.length > 8 && (
                              <Brush
                                dataKey="time"
                                height={20}
                                stroke="#f43f5e"
                                fill="#090d24"
                                travellerWidth={8}
                              />
                            )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="space-y-2.5 bg-[#050716]/80 p-4 rounded-2xl border border-indigo-950/60 select-none text-left">
                        <div className="flex justify-between items-center border-b border-indigo-950/40 pb-2">
                          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">Classificação dos Erros</h4>
                          {selectedErrorCategory && (
                            <button
                              onClick={() => setSelectedErrorCategory(null)}
                              className="text-[9px] text-slate-400 hover:text-slate-200 font-mono font-semibold cursor-pointer"
                            >
                              Limpar filtro
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {[
                            { label: 'SSRF Bloqueado', count: errorCounts.ssrf, color: 'bg-rose-500', icon: '🛡️', key: 'ssrf' },
                            { label: 'Timeouts / Deadlines', count: errorCounts.timeout, color: 'bg-amber-500', icon: '⏱️', key: 'timeout' },
                            { label: 'Resolução DNS / Host', count: errorCounts.dns, color: 'bg-cyan-500', icon: '🌐', key: 'dns' },
                            { label: 'Erros do Servidor (5xx)', count: errorCounts.http5xx, color: 'bg-purple-500', icon: '🔥', key: 'http5xx' },
                            { label: 'Erros do Cliente (4xx)', count: errorCounts.http4xx, color: 'bg-yellow-500', icon: '⚠️', key: 'http4xx' },
                            { label: 'Outros Erros', count: errorCounts.others, color: 'bg-slate-500', icon: '⚙️', key: 'others' },
                          ].map((item, idx) => {
                            const totalFailed = periodSummary.totalFailed;
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
                                    <span className={isExpanded ? 'text-rose-400 font-bold' : 'text-slate-300'}>{item.label}</span>
                                  </span>
                                  <span className="font-mono text-slate-400 flex items-center gap-1.5">
                                    <span>{item.count} ({pct}%)</span>
                                    <span className="text-[8px] text-slate-500">{isExpanded ? '▼' : '▶'}</span>
                                  </span>
                                </button>
                                <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-indigo-950/20">
                                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
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

          {/* Recent Activity List with drilldown connection */}
          <RecentActivity
            activities={displayActivities}
            isLoading={isPageLoading || loadingDrilldown}
            filterBadge={
              activeBucket ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2.5 py-0.5 rounded-full">
                  <span>Filtrado: {activeBucket.time} ({activeBucket.volume} execuções)</span>
                  <button
                    onClick={() => setSelectedBucketIndex(null)}
                    className="hover:text-white cursor-pointer ml-1"
                    title="Limpar filtro"
                  >
                    ✕
                  </button>
                </span>
              ) : undefined
            }
          />
        </>
      )}

      <PixModal isOpen={isPixModalOpen} onClose={() => setIsPixModalOpen(false)} />
      <LogDetail logs={recentLogs} />
    </div>
  );
};
