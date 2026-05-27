import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { useJobsStore } from '../store/jobsStore';
import { useUiStore } from '../store/uiStore';

const formatDate = (value?: string | null) => {
  if (!value) return 'Não informado';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
};

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

export const ProfilePage: React.FC = () => {
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
  const maskedKey = activeKey ? `${activeKey.slice(0, 8)}...${activeKey.slice(-4)}` : 'cf_live_prod_5a1f2b3c';
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
      value: activeKey ? '1 activa' : '0 activa', // Maintain Portuguese typo if existing: Wait, "activa" or "ativa"? Let's look at the original code: activeKey ? '1 ativa' : '0 ativa'. Let's keep it '1 ativa' : '0 ativa'
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
                  : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
              }`}>
                {isProPlan ? 'PRO' : 'STARTER'}
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
                          title="Disponível no Plano Pro"
                          className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/40 opacity-60 cursor-not-allowed"
                        >
                          Rotar
                        </button>
                        <button
                          type="button"
                          disabled
                          title="Disponível no Plano Pro"
                          className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/40 opacity-60 cursor-not-allowed"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start justify-between rounded-2xl border border-indigo-950/40 bg-slate-950/30 p-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-200">Chave de Staging</p>
                        <p className="text-[10px] font-mono text-slate-500">cf_staging_demo_4c2a</p>
                        <p className="text-[9px] text-slate-600">Gerada automaticamente para testes locais</p>
                      </div>
                      <span className="rounded-full border border-slate-700/50 bg-slate-900/40 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                        Staging
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => showToast('Geração de novas chaves sob demanda disponível no Plano Pro.', 'info')}
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
                    <span className="text-xs font-semibold text-slate-200">Disponível no Plano Enterprise</span>
                    <button
                      type="button"
                      disabled
                      className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/40 opacity-60 cursor-not-allowed"
                    >
                      Enterprise
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
