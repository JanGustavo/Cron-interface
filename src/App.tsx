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
import api from './services/api';
import {
  AreaChart,
  Area,
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
// Custom tooltip for premium cyber-neon dashboard area chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSuccess = data.status === 'success';
    return (
      <div className="p-4 rounded-xl border border-indigo-950/60 bg-slate-950/90 backdrop-blur-md shadow-2xl space-y-2 text-xs select-none">
        <div className="flex items-center justify-between gap-4">
          <span className="font-bold text-slate-200">{data.name}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            isSuccess 
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}>
            {data.status.toUpperCase()}
          </span>
        </div>
        <div className="space-y-1 text-slate-400">
          <p className="truncate max-w-[200px]"><span className="text-slate-500">URL:</span> {data.jobUrl}</p>
          <p><span className="text-slate-500">Duração:</span> <span className="font-semibold text-indigo-300">{data.duration}ms</span></p>
          <p><span className="text-slate-500">HTTP Status:</span> <span className="font-semibold text-slate-300">{data.httpStatus || 'N/A'}</span></p>
          <p><span className="text-slate-500">Disparo:</span> <span className="text-slate-300">{new Date(data.triggeredAt).toLocaleString('pt-BR')}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

// Premium Dashboard DashboardPage with Recharts Area Chart
const DashboardPage: React.FC = () => {
  const { setCreateModalOpen } = useUiStore();
  const { jobs } = useJobsStore();
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

  // Prepare chart data chronologically (oldest to newest)
  const chartData = [...allRecentLogs]
    .slice(0, 15)
    .reverse()
    .map((log) => ({
      name: log.jobName,
      time: new Date(log.triggeredAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      duration: log.durationMs || 0,
      status: log.status,
      jobUrl: log.jobUrl,
      httpStatus: log.httpStatus,
      triggeredAt: log.triggeredAt,
    }));

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
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 neon-glow-primary cursor-pointer animate-pulse"
          >
            Criar Nova Tarefa
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
          value={`${activeCount} / 100`}
          color="indigo"
          description="Limites do plano Starter"
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

      {/* Recharts Performance Area Chart */}
      <div className="p-6 rounded-2xl glass-panel border border-indigo-950/30 relative overflow-hidden space-y-4">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-200">Desempenho de Execuções</h3>
            <p className="text-xs text-slate-400">Tempo de resposta (ms) das últimas tarefas executadas em tempo real.</p>
          </div>
          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <span className="w-2.5 h-2.5 rounded bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
              Tempo de Resposta (ms)
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          {loading && allRecentLogs.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
              Carregando dados do gráfico...
            </div>
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
              Nenhuma execução registrada para exibir no gráfico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="durationGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#durationGlow)" 
                  dot={{ r: 3, stroke: '#6366f1', strokeWidth: 2, fill: '#070913' }}
                  activeDot={{ r: 5, stroke: '#818cf8', strokeWidth: 2, fill: '#070913' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
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

const ProfilePage: React.FC = () => {
  const { user, activeProject, projects } = useAuthStore();
  const { jobs } = useJobsStore();
  const { setActiveTab } = useUiStore();

  const userEmail = user?.email || 'admin@cronflow.sh';
  const userHandle = userEmail.split('@')[0] || 'cronflow';
  const avatarLabel = userHandle.slice(0, 2).toUpperCase();
  const memberSince = formatDate(user?.createdAt);
  const workspaceName = activeProject?.name || 'Projeto Pessoal';

  const workspaceJobs = activeProject
    ? jobs.filter((job) => job.projectId === activeProject.id)
    : jobs;

  const activeJobs = workspaceJobs.filter((job) => job.status === 'active').length;
  const pausedJobs = workspaceJobs.filter((job) => job.status === 'paused').length;
  const failingJobs = workspaceJobs.filter((job) => job.status === 'failing').length;

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

  const architectureNotes = [
    'Autenticação por API Key por projeto',
    'Headers enviados via Authorization: Bearer',
    'Logs com retenção mínima de 7 dias',
    'Retry automático com até 3 tentativas',
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="text-xs font-extrabold uppercase tracking-[0.3em] text-indigo-400">
          Perfil & Acesso
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-100">
          Conta, workspace e segurança
        </h2>
        <p className="text-sm text-slate-400 max-w-3xl">
          A tela foi alinhada à visão do CronFlow: múltiplos projetos por usuário, API Keys por projeto e contexto do workspace ativo sempre visível.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl glass-panel border border-indigo-950/30 p-6 md:p-7">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 opacity-90" />
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/25 to-cyan-500/10 text-xl font-black text-indigo-200 shadow-[0_0_28px_rgba(99,102,241,0.20)]">
                  {avatarLabel}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.3em] text-indigo-400">
                      Conta CronFlow
                    </span>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
                      Ativa
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

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {profileStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl glass-panel border border-indigo-950/30 p-4"
              >
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {stat.label}
                </span>
                <div className="mt-3 text-2xl font-black text-slate-100">{stat.value}</div>
                <p className="mt-1 text-xs text-slate-400">{stat.helper}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl glass-panel border border-indigo-950/30 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Projetos vinculados</h3>
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
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
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
          <div className="rounded-3xl glass-panel border border-indigo-950/30 p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Acesso e autenticação</h3>
                <p className="mt-1 text-xs text-slate-400">
                  API Keys são gerenciadas por projeto, hash SHA-256 fica no backend e o front usa o header Bearer.
                </p>
              </div>

              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">
                MVP
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-indigo-950/30 bg-[#0a0d1d]/80 p-4">
              <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                Exemplo de header
              </div>
              <div className="mt-2 break-all font-mono text-sm text-indigo-300">
                Authorization: Bearer cf_live_&lt;sua_api_key&gt;
              </div>
              <p className="mt-3 text-xs text-slate-500">
                As credenciais reais não aparecem no perfil. O gerenciamento completo fica na área de configurações.
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {architectureNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl border border-indigo-950/30 bg-slate-950/35 px-4 py-3 text-sm text-slate-300"
                >
                  {note}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="mt-5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 neon-glow-primary"
            >
              Abrir Configurações
            </button>
          </div>

          <div className="rounded-3xl glass-panel border border-indigo-950/30 p-6">
            <h3 className="text-sm font-semibold text-slate-200">Checklist da visão CronFlow</h3>
            <p className="mt-1 text-xs text-slate-400">
              Esta tela reforça os limites e garantias do MVP que aparecem no documento de arquitetura.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-indigo-950/30 bg-slate-950/30 px-4 py-3">
                <span className="text-sm text-slate-300">Frequência mínima</span>
                <span className="text-sm font-semibold text-slate-100">1 vez por minuto</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-indigo-950/30 bg-slate-950/30 px-4 py-3">
                <span className="text-sm text-slate-300">Timeout do worker</span>
                <span className="text-sm font-semibold text-slate-100">30 segundos</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-indigo-950/30 bg-slate-950/30 px-4 py-3">
                <span className="text-sm text-slate-300">Retenção de logs</span>
                <span className="text-sm font-semibold text-slate-100">7 dias no free</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-indigo-950/30 bg-slate-950/30 px-4 py-3">
                <span className="text-sm text-slate-300">Retry automático</span>
                <span className="text-sm font-semibold text-slate-100">3 tentativas</span>
              </div>
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

          login(
            { id: 'user-admin', email: 'admin@cronflow.sh', createdAt: new Date().toISOString() },
            { accessToken: savedToken, refreshToken: '', tokenType: 'Bearer', expiresIn: 86400 },
            [{ id: extractedProjectId, userId: 'user-admin', name: 'Projeto Principal', createdAt: new Date().toISOString() }]
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
    <DashboardLayout>
      {renderActivePage()}
      <CreateJobModal />
    </DashboardLayout>
  );
};

export default App;
