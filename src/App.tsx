import React, { useEffect, useState } from 'react';
import { DashboardLayout } from './components/Dashboard/DashboardLayout';
import { useUiStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';
import type { Project } from './types/auth';
import { useJobsStore } from './store/jobsStore';
import { KanbanBoard } from './components/Kanban/KanbanBoard';
import { JobModal } from './components/Kanban/JobModal';
import { Logs } from './pages/Logs';
import { LoginGate } from './components/Auth/LoginGate';
import { CreateJobModal } from './components/Kanban/CreateJobModal';
import { ImportJobModal } from './components/Kanban/ImportJobModal';
import { ToastHost } from './components/Shared/ToastHost';
import { AgentChat } from './components/Shared/AgentChat';
import { OnboardingTour } from './components/Shared/OnboardingTour';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { CookieConsentBanner } from './components/Shared/CookieConsentBanner';
import api from './services/api';

function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Error loading chunk, retrying page reload...', error);
      try {
        const hasReloaded = window.sessionStorage.getItem('chunk-reload-attempted');
        if (!hasReloaded) {
          window.sessionStorage.setItem('chunk-reload-attempted', 'true');
          window.location.reload();
          return new Promise(() => {});
        }
      } catch (e) {
        console.error('sessionStorage is blocked or unavailable:', e);
      }
      throw error;
    }
  });
}

const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })));

const PageLoader: React.FC = () => (
  <div className="flex flex-col justify-center items-center py-20 min-h-[50vh] select-none font-mono">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.18)] mb-4 z-10 animate-spin">
      <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
      </svg>
    </div>
    <p className="text-[10px] text-slate-500 tracking-widest uppercase z-10 animate-pulse">Carregando...</p>
  </div>
);






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
  const { activeTab, setActiveTab, isDocsOpen, setDocsOpen, setJobModalOpen, highContrast, reducedMotion, fontSize } = useUiStore();
  const { isAuthenticated, login, logout, activeProject } = useAuthStore();
  const { fetchJobs, jobs, setActiveJob } = useJobsStore();
  const [authChecking, setAuthChecking] = useState(true);

  const [legalPage, setLegalPage] = useState<'terms' | 'privacy' | null>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/terms') return 'terms';
      if (window.location.pathname === '/privacy') return 'privacy';
    }
    return null;
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/terms') setLegalPage('terms');
      else if (window.location.pathname === '/privacy') setLegalPage('privacy');
      else setLegalPage(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync Accessibility CSS classes on <html>
  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    if (reducedMotion) {
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }

    if (fontSize === 'large') {
      document.documentElement.classList.add('text-lg-accessibility');
    } else {
      document.documentElement.classList.remove('text-lg-accessibility');
    }
  }, [highContrast, reducedMotion, fontSize]);

  useEffect(() => {
    try {
      window.sessionStorage.removeItem('chunk-reload-attempted');
    } catch {
      // Ignore if sessionStorage is disabled or unavailable
    }
  }, []);

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
    let isMounted = true;
    const fallbackTimer = setTimeout(() => {
      if (isMounted) {
        setAuthChecking(false);
      }
    }, 3000);

    const checkAuth = async () => {
      const savedToken = localStorage.getItem('cf_token');
      if (savedToken) {
        try {
          // Set temporary localstorage for api interceptor
          localStorage.setItem('cf_token', savedToken);
          
          // Load fresh profile and project list from backend with a fast 4s timeout
          const profileResponse = await api.get('/v1/users/profile', { timeout: 4000 });
          const profile = profileResponse.data;
          
          const decoded = parseJwt(savedToken);
          const email = decoded?.email || profile.email;
          const userId = decoded?.user_id || profile.id;
          const plan = profile.plan || decoded?.plan || 'free';
          const iat = decoded?.iat;
          const userCreatedAt = iat ? new Date(iat * 1000).toISOString() : new Date().toISOString();

          // Set the workspace plan state in localStorage
          localStorage.setItem('cf_user_plan', plan);

          // Get the active project from token claims, fallback to first project or default
          const activeProjID = decoded?.project_id || (profile.projects && profile.projects[0]?.id) || '0fe9fb93-3fa0-44b6-b5d8-a5c5b62148a1';
          
          const projectsList = profile.projects || [];
          const activeProj = projectsList.find((p: Project) => p.id === activeProjID) || projectsList[0] || { id: activeProjID, userId: userId, name: 'Projeto Principal', createdAt: userCreatedAt };

          login(
            { 
              id: userId, 
              email: email, 
              plan: plan, 
              createdAt: userCreatedAt, 
              fullName: profile.fullName, 
              limits: profile.limits,
              totalJobsCreated: profile.totalJobsCreated
            },
            { accessToken: savedToken, refreshToken: '', tokenType: 'Bearer', expiresIn: 86400 },
            projectsList.length > 0 ? projectsList : [activeProj]
          );

          // Update active project if it wasn't set correctly by login (to ensure it matches activeProjID)
          const state = useAuthStore.getState();
          state.setActiveProject(activeProj);
        } catch (err) {
          console.error('Auto login verification failed', err);
          logout();
        }
      }
      if (isMounted) {
        setAuthChecking(false);
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
    };
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
  }, [isAuthenticated, fetchJobs, activeProject?.id]);

  useEffect(() => {
    const syncProfileMetrics = async () => {
      if (isAuthenticated) {
        try {
          const res = await api.get('/v1/users/profile');
          if (res.data) {
            localStorage.setItem('cf_total_jobs_created', String(res.data.totalJobsCreated));
            localStorage.setItem('cf_profile_active_jobs_count', String(jobs.length));
            if (res.data.plan) {
              localStorage.setItem('cf_user_plan', res.data.plan);
            }
            
            // Sync user details and limits into the global Zustand store
            const authStore = useAuthStore.getState();
            if (authStore.user) {
              useAuthStore.setState({
                user: {
                  ...authStore.user,
                  fullName: res.data.fullName,
                  plan: res.data.plan,
                  limits: res.data.limits,
                  totalJobsCreated: res.data.totalJobsCreated
                }
              });
            }
          }
        } catch (err) {
          console.error('Failed to sync profile metrics', err);
        }
      }
    };
    syncProfileMetrics();
  }, [isAuthenticated, activeProject?.id, jobs.length]);

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

  if (legalPage === 'terms') {
    return (
      <>
        <TermsPage onBack={() => { setLegalPage(null); window.history.pushState({}, '', '/'); }} />
        <CookieConsentBanner
          onOpenTerms={() => { setLegalPage('terms'); window.history.pushState({}, '', '/terms'); }}
          onOpenPrivacy={() => { setLegalPage('privacy'); window.history.pushState({}, '', '/privacy'); }}
        />
      </>
    );
  }

  if (legalPage === 'privacy') {
    return (
      <>
        <PrivacyPage onBack={() => { setLegalPage(null); window.history.pushState({}, '', '/'); }} />
        <CookieConsentBanner
          onOpenTerms={() => { setLegalPage('terms'); window.history.pushState({}, '', '/terms'); }}
          onOpenPrivacy={() => { setLegalPage('privacy'); window.history.pushState({}, '', '/privacy'); }}
        />
      </>
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#070913] flex flex-col justify-center items-center select-none font-mono">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff006e]/5 rounded-full blur-3xl" />
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950/40 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,217,255,0.2)] mb-4 z-10 p-2.5 animate-pulse">
          <img src="/logo.svg" alt="Logo CronFlow" className="w-full h-full object-contain" />
        </div>
        <p className="text-xs text-slate-400 tracking-widest uppercase z-10 animate-pulse">Carregando Sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginGate />
        <CookieConsentBanner
          onOpenTerms={() => { setLegalPage('terms'); window.history.pushState({}, '', '/terms'); }}
          onOpenPrivacy={() => { setLegalPage('privacy'); window.history.pushState({}, '', '/privacy'); }}
        />
      </>
    );
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
      case 'admin':
        return <AdminPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <DashboardLayout>
        <React.Suspense fallback={<PageLoader />}>
          {renderActivePage()}
        </React.Suspense>
        <CreateJobModal />
        <ImportJobModal />
      </DashboardLayout>
      <AgentChat />
      <ToastHost />
      <OnboardingTour />
      <CookieConsentBanner
        onOpenTerms={() => { setLegalPage('terms'); window.history.pushState({}, '', '/terms'); }}
        onOpenPrivacy={() => { setLegalPage('privacy'); window.history.pushState({}, '', '/privacy'); }}
      />

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
