import React, { useState, useEffect } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useJobsStore } from '../../store/jobsStore';
import { soundFx } from '../../utils/soundFx';
import api from '../../services/api';
import type { Project } from '../../types/auth';

export const TopNav: React.FC = () => {
  const { activeTab, toggleSidebar, setOnboardingOpen, soundEnabled, toggleSound } = useUiStore();
  const { activeProject, projects, setActiveProject, user } = useAuthStore();
  const { jobs, fetchJobs } = useJobsStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSwitchProject = async (project: Project) => {
    try {
      const res = await api.post(`/v1/projects/${project.id}/switch`);
      if (res.data && res.data.token) {
        setActiveProject(project, res.data.token);
        fetchJobs();
      }
    } catch (err) {
      console.error('Failed to switch workspace', err);
    }
  };

  const userEmail = user?.email || 'admin@cronflow.sh';
  const userHandle = userEmail.split('@')[0] || 'cronflow';
  const avatarLabel = userHandle.slice(0, 2).toUpperCase();
  const isPro = !!(user?.limits?.alertsWebhooksEnabled || user?.limits?.workflowsEnabled);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Painel de Controle';
      case 'jobs':
        return 'Agendamentos';
      case 'logs':
        return 'Histórico de Execuções';
      case 'profile':
        return 'Minha Conta';
      default:
        return 'CronFlow';
    }
  };

  const currentProjectName = activeProject?.name || 'Projeto Pessoal';
  const availableProjects = projects.length > 0 ? projects : [
    { id: '1', userId: 'user', name: 'Projeto Pessoal', createdAt: '' },
    { id: '2', userId: 'user', name: 'Produção SaaS', createdAt: '' },
    { id: '3', userId: 'user', name: 'Dev Environment', createdAt: '' },
  ];

  const failedJobsCount = jobs.filter((j) => (j.status as string) === 'failing' || (j.status as string) === 'failed').length;
  const activeJobsCount = jobs.filter((j) => j.status === 'active' || (j.status as string) === 'running').length;
  const pausedJobsCount = jobs.filter((j) => j.status === 'paused' || (j.status as string) === 'suspended').length;
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.currentPeriodEnd) {
        const end = new Date(user.currentPeriodEnd).getTime();
        const diffDays = Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
        setDaysRemaining(diffDays > 0 ? diffDays : 0);
      } else {
        setDaysRemaining(null);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [user?.currentPeriodEnd]);

  const isSubscriptionExpiringSoon = daysRemaining !== null && daysRemaining <= 3;

  return (
    <header className="h-16 border-b border-indigo-950/40 glass-panel sticky top-0 z-30 px-4 md:px-6 flex items-center justify-between">
      {/* Page Title & Mobile Sidebar Toggle */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/30 border border-indigo-950/40 transition-colors md:hidden cursor-pointer"
          aria-label="Abrir menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 tracking-wide select-none">
          {getPageTitle()}
        </h2>
      </div>

      {/* Right Side Options (Tutorial, Notifications, Workspace Selector, Profile) */}
      <div className="flex items-center gap-4">
        
        {/* Sound FX Toggle Button */}
        <button
          onClick={() => {
            toggleSound();
            soundFx.playClick();
          }}
          className={`p-2 rounded-xl transition-colors border flex items-center justify-center cursor-pointer ${
            soundEnabled
              ? 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30 hover:bg-cyan-950/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              : 'text-slate-500 bg-slate-900/40 border-indigo-950/40 hover:text-slate-300'
          }`}
          title={soundEnabled ? "Efeitos Sonoros Ativados (Clique para silenciar)" : "Efeitos Sonoros Silenciados (Clique para ativar)"}
          aria-label="Alternar efeitos sonoros"
        >
          {soundEnabled ? (
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          ) : (
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
        </button>

        {/* Onboarding Tour Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            setOnboardingOpen(true);
          }}
          className="px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/30 border border-indigo-950/40 transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
          title="Ver Tutorial / Como Funciona"
        >
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="hidden sm:inline">Como Funciona</span>
        </button>

        {/* System Notifications & Health Center Button */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setDropdownOpen(false);
            }}
            className={`p-2 rounded-xl transition-colors border relative cursor-pointer ${
              failedJobsCount > 0 || isSubscriptionExpiringSoon
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-indigo-950/30 border-indigo-950/40'
            }`}
            title="Central de Alertas e Status do Sistema"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {failedJobsCount > 0 || isSubscriptionExpiringSoon ? (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {failedJobsCount > 0 ? failedJobsCount : '!'}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2.5 w-80 rounded-2xl border border-indigo-950/60 glass-panel shadow-2xl z-20 p-4 text-left space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-indigo-950/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-200">
                      Status do CronFlow
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Sistemas Operacionais
                  </span>
                </div>

                {/* Plan Expiration Notification Card */}
                {isSubscriptionExpiringSoon && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5 animate-pulse">
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span className="flex items-center gap-1.5">⚠️ Término do Plano PRO</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-[9px] font-extrabold uppercase">
                        {daysRemaining === 0 ? 'Expira hoje' : `${daysRemaining}d restantes`}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300 font-sans">
                      Sua assinatura encerra em <strong>{daysRemaining} dia(s)</strong>. Ao migrar para o plano Free, apenas os seus <strong>5 agendamentos mais antigos</strong> permanecerão ativos. Os excedentes serão automaticamente pausados.
                    </p>
                    <button
                      onClick={() => {
                        setNotificationsOpen(false);
                        useUiStore.getState().setActiveTab('profile');
                      }}
                      className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer block pt-0.5"
                    >
                      Renovar Assinatura PRO ✨ →
                    </button>
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 flex items-center justify-between">
                    <span className="text-slate-400">Tarefas Ativas</span>
                    <span className="font-mono font-bold text-indigo-400">{activeJobsCount}</span>
                  </div>

                  {pausedJobsCount > 0 && (
                    <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 flex items-center justify-between">
                      <span className="text-slate-400">Tarefas Pausadas / Suspensas</span>
                      <span className="font-mono font-bold text-amber-400">{pausedJobsCount}</span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl bg-[#04060f]/60 border border-indigo-950/40 flex items-center justify-between">
                    <span className="text-slate-400">Alertas de Falha</span>
                    {failedJobsCount > 0 ? (
                      <span className="font-mono font-bold text-rose-400">{failedJobsCount} com erro</span>
                    ) : (
                      <span className="text-slate-500">Nenhuma falha recente</span>
                    )}
                  </div>
                </div>

                <div className="pt-1 border-t border-indigo-950/30 text-center">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      useUiStore.getState().setActiveTab('logs');
                    }}
                    className="w-full py-1.5 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    Ver Histórico Completo de Execuções →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Workspace Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium bg-indigo-950/20 hover:bg-indigo-950/30 border transition-all select-none ${
              isPro
                ? 'border-transparent pro-border-shimmer'
                : 'border-indigo-950/40 text-slate-300 hover:text-white'
            }`}
          >
            <svg className={`w-4 h-4 ${isPro ? 'text-yellow-400' : 'text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {isPro ? (
              <span
                className="max-w-30 truncate bg-[length:300%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]"
                style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
              >
                {currentProjectName}
              </span>
            ) : (
              <span className="max-w-30 truncate">{currentProjectName}</span>
            )}
            <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''} ${isPro ? 'text-violet-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay background to dismiss */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2.5 w-56 rounded-xl border border-indigo-950/40 glass-panel shadow-2xl z-20 py-1.5 focus:outline-none">
                <div className="px-3.5 py-1.5 border-b border-indigo-950/20">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Projetos / Workspaces
                  </span>
                </div>
                
                <div className="max-h-48 overflow-y-auto py-1">
                  {availableProjects.map((proj) => {
                    const isSelected = activeProject ? proj.id === activeProject.id : proj.id === '1';
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          handleSwitchProject(proj);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between text-left px-3.5 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'text-indigo-400 font-semibold bg-indigo-950/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/10'
                        }`}
                      >
                        <span className="truncate">{proj.name}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Info Indicator */}
        <div className="flex items-center gap-3 border-l border-indigo-950/40 pl-4 select-none">
          {/* Username — dourado animado para PRO, slate padrão para Free */}
          {isPro ? (
            <span
              className="hidden md:inline text-xs font-bold max-w-30 truncate bg-[length:300%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]"
              style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
              title={user?.currentPeriodEnd ? `Plano PRO ativo ✨ (Válido até ${new Date(user.currentPeriodEnd).toLocaleDateString('pt-BR')})` : 'Plano PRO Ativo ✨'}
            >
              {userHandle}
            </span>
          ) : (
            <span className="hidden md:inline text-xs font-semibold text-slate-350 max-w-30 truncate">
              {userHandle}
            </span>
          )}

          {/* Avatar — contorno cyberpunk dourado/roxo para PRO */}
          {isPro ? (
            <div
              className="rounded-full p-[2px] animate-[spin_4s_linear_infinite]"
              style={{
                background: 'conic-gradient(from 0deg, #facc15, #a855f7, #ec4899, #facc15)',
              }}
              title={user?.currentPeriodEnd ? `Plano PRO ativo ✨ (Válido até ${new Date(user.currentPeriodEnd).toLocaleDateString('pt-BR')})` : 'Plano PRO Ativo ✨'}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md [animation:none]">
                {avatarLabel}
              </div>
            </div>
          ) : (
            <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md border border-indigo-400/20">
              {avatarLabel}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
