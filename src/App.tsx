import React, { useEffect, useState } from 'react';
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


const formatDate = (value?: string | null) => {
  if (!value) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

// Mock Page Components to render inside our Layout
// Custom tooltip for composed volume & success rate chart
const CustomTooltip = ({ active, payload }: any) => {
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
            <span className="font-semibold text-emerald-400">{data.successRate}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-indigo-950/20 pt-1.5 mt-1 text-[10px] text-slate-500">
            <span>Sucessos: {data.successCount}</span>
            <span>Falhas: {data.failedCount}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Premium Dashboard DashboardPage with Recharts Composed Chart
const DashboardPage: React.FC = () => {
  const { setCreateModalOpen } = useUiStore();
  const { jobs } = useJobsStore();
  const { user } = useAuthStore();
  const [allRecentLogs, setAllRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRecentLogs = async () => {
      if (jobs.length === 0) return;
      setLoading(true);
      try {
        const fetchPromises = jobs.map(async (job) => {
          try {
            // Fetch 10 executions per job to populate chart and activity feed
            const res = await api.get(`/v1/jobs/${job.id}/executions?limit=10`);
            const data = (res.data || []) as any[];
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
  const totalCount = jobs.length;
  const failingCount = jobs.filter((j) => j.status === 'failing').length;
  const successRate = totalCount > 0 ? (((totalCount - failingCount) / totalCount) * 100).toFixed(2) : '100.00';

  const plan = user?.plan || 'free';
  const maxJobsLimit = plan === 'paid' ? 20 : 5;
  const isLimitReached = activeCount >= maxJobsLimit;

  // Prepare chart data chronologically (oldest to newest)
  const chartData = (() => {
    const now = new Date();
    
    // Dynamic Fallback: if no real logs are present, we display a gorgeous mock trend
    if (allRecentLogs.length === 0) {
      return Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(now.getTime() - (5 - idx) * 60 * 60 * 1000);
        const hourLabel = d.getHours().toString().padStart(2, '0') + ':00';
        const mockVolumes = [12, 19, 15, 24, 30, 28];
        const mockRates = [100, 95, 100, 92, 96, 100];
        const vol = mockVolumes[idx];
        const rate = mockRates[idx];
        const succ = Math.round((vol * rate) / 100);
        return {
          time: hourLabel,
          volume: vol,
          successRate: rate,
          successCount: succ,
          failedCount: vol - succ,
        };
      });
    }

    const timestamps = allRecentLogs.map(l => new Date(l.triggeredAt).getTime());
    const minTimestamp = Math.min(...timestamps);
    const timeSpanMs = now.getTime() - minTimestamp;

    // Use 5-minute resolution if all activities happened in the last 45 minutes
    const useMinuteGranularity = timeSpanMs < 45 * 60 * 1000;

    if (useMinuteGranularity) {
      const intervals = Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(now.getTime() - (5 - idx) * 5 * 60 * 1000);
        const label = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return {
          label,
          start: d.getTime() - 5 * 60 * 1000,
          end: d.getTime(),
          volume: 0,
          successCount: 0,
        };
      });

      allRecentLogs.forEach((log) => {
        const logTime = new Date(log.triggeredAt).getTime();
        const target = intervals.find((int) => logTime > int.start && logTime <= int.end);
        if (target) {
          target.volume += 1;
          if (log.status === 'success') {
            target.successCount += 1;
          }
        }
      });

      return intervals.map((int) => ({
        time: int.label,
        volume: int.volume,
        successRate: int.volume > 0 ? Math.round((int.successCount / int.volume) * 100) : 100,
        successCount: int.successCount,
        failedCount: int.volume - int.successCount,
      }));
    } else {
      // Default hourly resolution (last 6 hours)
      const intervals = Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(now.getTime() - (5 - idx) * 60 * 60 * 1000);
        const label = d.getHours().toString().padStart(2, '0') + ':00';
        return {
          label,
          start: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 0, 0).getTime(),
          end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), 59, 59, 999).getTime(),
          volume: 0,
          successCount: 0,
        };
      });

      allRecentLogs.forEach((log) => {
        const logTime = new Date(log.triggeredAt).getTime();
        const target = intervals.find((int) => logTime >= int.start && logTime <= int.end);
        if (target) {
          target.volume += 1;
          if (log.status === 'success') {
            target.successCount += 1;
          }
        }
      });

      return intervals.map((int) => ({
        time: int.label,
        volume: int.volume,
        successRate: int.volume > 0 ? Math.round((int.successCount / int.volume) * 100) : 100,
        successCount: int.successCount,
        failedCount: int.volume - int.successCount,
      }));
    }
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
          <button className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all cursor-pointer">
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
          value={`${successRate}%`}
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
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-200">Volume & Taxa de Sucesso</h3>
            <p className="text-xs text-slate-400">Total de requisições disparadas e taxa de entrega nas últimas horas.</p>
          </div>
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

const ProfilePage: React.FC = () => {
  const { user, activeProject, projects, token } = useAuthStore();
  const { jobs } = useJobsStore();
  const { setActiveTab, setCreateModalOpen, showToast } = useUiStore();
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
  const globalWebhook = localStorage.getItem('cf_global_webhook') || '';
  const webhookConfigured = globalWebhook.trim().length > 0;
  const memberDays = user?.createdAt
    ? Math.max(1, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
    : 0;

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

  const handleOpenSettings = () => setActiveTab('settings');
  const handleOpenJobs = () => setActiveTab('jobs');
  const handleOpenLogs = () => setActiveTab('logs');
  const handleOpenDocs = () => showToast('Documentacao em breve.', 'info');
  const handleOpenSupport = () => showToast('Suporte em breve.', 'info');

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
        onClick: handleOpenSettings,
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
            className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 via-[#0a0d1d] to-cyan-500/10 p-6 md:p-7 shadow-[0_0_45px_rgba(99,102,241,0.18)] transition-all duration-300 hover:border-indigo-400/60 hover:shadow-[0_0_65px_rgba(99,102,241,0.25)] animate-in fade-in slide-in-from-bottom-4"
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

                  <p className="max-w-2xl text-sm text-slate-400">
                    Membro desde {memberSince}. O perfil reflete a estrutura de produto do CronFlow, com autenticação por projeto, controle de workspace e observabilidade dos jobs.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-indigo-300">
                      Workspace: {workspaceName}
                    </span>
                    <span className="rounded-full border border-slate-700/50 bg-slate-950/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-slate-300">
                      {projects.length} projeto{projects.length === 1 ? '' : 's'}
                    </span>
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
                      {workspaceJobs.length} job{workspaceJobs.length === 1 ? '' : 's'} no workspace
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
                  onClick={() => setActiveTab('settings')}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800/80 rounded-xl border border-slate-700/50 transition-all"
                >
                  Gerenciar Chaves
                </button>
              </div>
            </div>
          </div>

          <div
            className="rounded-3xl glass-panel border border-indigo-950/30 p-6 animate-in fade-in slide-in-from-bottom-4"
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
            className="rounded-3xl glass-panel border border-indigo-950/30 p-6 animate-in fade-in slide-in-from-bottom-4"
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
            className="rounded-3xl glass-panel border border-indigo-950/30 p-6 space-y-5 animate-in fade-in slide-in-from-bottom-4"
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
                    onClick={handleOpenSettings}
                    className="w-full px-4 py-2 text-[10px] uppercase font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-500/30"
                  >
                    Gerar nova chave
                  </button>
                </div>
              )}

              {securityTab === 'webhooks' && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                        Webhook de alerta
                      </span>
                      <p className="mt-1 text-xs text-slate-400">
                        Configure um endpoint padrao para falhas consecutivas.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenSettings}
                      className="px-3 py-1.5 text-[10px] uppercase font-bold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-950/70 rounded-xl border border-indigo-900/40 transition-all"
                    >
                      Ir
                    </button>
                  </div>

                  <div className="rounded-2xl border border-indigo-950/40 bg-slate-950/40 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-slate-500">Atual</span>
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
                </div>
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
            className="rounded-3xl glass-panel border border-indigo-950/30 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4"
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
            className="rounded-3xl glass-panel border border-indigo-950/30 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4"
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
                className="px-4 py-2 text-[10px] uppercase font-bold text-slate-200 bg-slate-800/60 hover:bg-slate-800/90 rounded-xl transition-all"
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
                onClick={handleOpenSettings}
                className="px-4 py-2 text-[10px] uppercase font-bold text-amber-300 bg-amber-950/30 hover:bg-amber-950/60 border border-amber-500/20 rounded-xl transition-all"
              >
                Configurar
              </button>
              <button
                type="button"
                onClick={handleOpenSupport}
                className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400 bg-slate-900/40 hover:text-white hover:bg-slate-900/70 rounded-xl transition-all"
              >
                Suporte
              </button>
              <button
                type="button"
                onClick={handleOpenDocs}
                className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400 bg-slate-900/40 hover:text-white hover:bg-slate-900/70 rounded-xl transition-all"
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

const SettingsPage: React.FC = () => {
  const { token } = useAuthStore();
  const activeKey = token?.accessToken || localStorage.getItem('cf_token') || 'cf_live_test_key';
  const [globalWebhook, setGlobalWebhook] = useState(() => localStorage.getItem('cf_global_webhook') || '');
  const [copySuccess, setCopySuccess] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(activeKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleUpdateWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('cf_global_webhook', globalWebhook.trim());
    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Configurações do Projeto</h2>
        <p className="text-xs text-slate-400">Configure chaves de API e alertas de webhooks globais para o seu workspace.</p>
      </div>
      
      <div className="p-6 rounded-2xl glass-panel space-y-6">
        {/* Chave de API do Workspace */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Chave de API Ativa do Workspace</h3>
          <p className="text-xs text-slate-400">
            Use esta chave de API no cabeçalho <code>X-API-Key</code> ou <code>Authorization: Bearer</code> para autenticar requisições no backend.
          </p>
          
          <div className="flex gap-2 max-w-xl">
            <input
              type="text"
              readOnly
              value={activeKey}
              className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-indigo-950/40 rounded-xl font-mono text-xs text-indigo-400 select-all focus:outline-none"
            />
            <button 
              onClick={handleCopyKey}
              className={`px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                copySuccess 
                  ? 'bg-emerald-600 border-emerald-500 text-white' 
                  : 'bg-slate-800/60 hover:bg-slate-800/80 border-slate-700/50 text-slate-300'
              }`}
            >
              {copySuccess ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
        
        {/* Webhooks de Alerta Global */}
        <form onSubmit={handleUpdateWebhook} className="border-t border-indigo-950/20 pt-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200">Webhook de Alerta Padrão</h3>
          <p className="text-xs text-slate-400">
            Configure uma URL padrão para notificar quando um job falhar 3 vezes seguidas. Ao criar novos jobs no Kanban, este endereço será autopopulado por conveniência.
          </p>
          
          <div className="flex gap-2 max-w-xl">
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
        </form>
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
  const { activeTab } = useUiStore();
  const { isAuthenticated, login, logout } = useAuthStore();
  const { fetchJobs } = useJobsStore();
  const [authChecking, setAuthChecking] = useState(true);

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

          login(
            { id: userId, email: email, plan: plan, createdAt: new Date().toISOString() },
            { accessToken: savedToken, refreshToken: '', tokenType: 'Bearer', expiresIn: 86400 },
            [{ id: projectId, userId: userId, name: 'Projeto Principal', createdAt: new Date().toISOString() }]
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
        return <SettingsPage />;
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
    </>
  );
};

export default App;
