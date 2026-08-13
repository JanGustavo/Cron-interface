import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import api from '../../services/api';
import { AuthProductPanel } from './AuthProductPanel';
import { authCopy } from './authCopy';
import type { User, Token, Project } from '../../types/auth';

export const LoginGate: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<{ user: User; token: Token; projects: Project[] } | null>(null);
  
  // Interactive Sandbox Tab State
  const [activeSandboxTab, setActiveSandboxTab] = useState<'curl' | 'json' | 'agent'>('curl');

  const { login } = useAuthStore();
  const { toggleTheme, theme } = useUiStore();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await api.post('/v1/auth/login', {
        email: email.trim(),
        password: password,
      });

      const { token, user, projects } = response.data;
      login(user, token, projects);
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
      if (axiosError.response) {
        const backendError = axiosError.response.data?.error || axiosError.response.data?.reason;
        setErrorMsg(backendError || `Erro de autenticação: HTTP ${axiosError.response.status}`);
      } else {
        setErrorMsg('Erro de conexão. Verifique se o backend em Go está rodando na porta 8080.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !projectName.trim() || !fullName.trim() || !cpf.trim()) {
      setErrorMsg('Por favor, preencha todos os campos do cadastro.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await api.post('/v1/auth/signup', {
        email: email.trim(),
        password: password,
        project_name: projectName.trim(),
        full_name: fullName.trim(),
        cpf: cpf.trim(),
      });

      const { token, user, projects, apiKey } = response.data;
      setGeneratedKey(apiKey);
      setSignupSession({ user, token, projects });
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
      if (axiosError.response) {
        const backendError = axiosError.response.data?.error || axiosError.response.data?.reason;
        setErrorMsg(backendError || `Erro no cadastro: HTTP ${axiosError.response.status}`);
      } else {
        setErrorMsg('Erro de conexão. Verifique se o backend em Go está rodando na porta 8080.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleConnectWithGeneratedKey = () => {
    if (!signupSession) return;
    login(signupSession.user, signupSession.token, signupSession.projects);
  };

  // Smooth Scroll Helper
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Close modal when pressing ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close simulation modal when pressing ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSimulationOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulation step controller
  useEffect(() => {
    if (!isSimulationOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSimulationStep(0);
      setIsSimulating(false);
      return;
    }
    setIsSimulating(true);
    setSimulationStep(1);
  }, [isSimulationOpen]);

  useEffect(() => {
    if (!isSimulating) return;
    if (simulationStep < 6) {
      const timer = setTimeout(() => {
        setSimulationStep((prev) => prev + 1);
      }, 1800);
      return () => clearTimeout(timer);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSimulating(false);
    }
  }, [simulationStep, isSimulating]);

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 selection:bg-cyan-500/30 selection:text-white font-sans scroll-smooth overflow-x-hidden relative">
      
      {/* Dynamic Background Blurs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute top-[80vh] right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20vh] left-10 w-[400px] h-[400px] bg-[#ff006e]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 🧭 NAVIGATION BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-indigo-950/40 bg-[#060813]/75 backdrop-blur-xl transition-all duration-300 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="group flex items-center gap-3 cursor-pointer transition-transform duration-300 hover:-translate-y-0.5" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-950/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,217,255,0.15)] p-1.5 transition-all duration-300 group-hover:border-cyan-400/40 group-hover:bg-indigo-900/50 group-hover:shadow-[0_0_20px_rgba(0,217,255,0.22)]">
              <img src="/logo.svg" alt="Logo CronFlow" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-black tracking-widest text-gradient-cyber font-mono uppercase transition-all duration-300 group-hover:tracking-[0.28em]">
              CronFlow
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-2 rounded-full border border-indigo-950/40 bg-indigo-950/10 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 shadow-[0_0_0_1px_rgba(99,102,241,0.02)]">
            <button onClick={() => scrollToSection('failure-lifecycle')} className="rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.15)] focus-visible:bg-cyan-500/10 focus-visible:text-cyan-300">Como Funciona</button>
            <button onClick={() => scrollToSection('architecture')} className="rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.15)] focus-visible:bg-cyan-500/10 focus-visible:text-cyan-300">Arquitetura</button>
            <button onClick={() => scrollToSection('playground')} className="rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.15)] focus-visible:bg-cyan-500/10 focus-visible:text-cyan-300">Terminal AI</button>
            <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 transition-all duration-200 hover:bg-cyan-500/10 hover:text-cyan-300 hover:shadow-[0_0_0_1px_rgba(6,182,212,0.15)] focus-visible:bg-cyan-500/10 focus-visible:text-cyan-300">GitHub</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 border border-indigo-950/30 bg-indigo-950/10 transition-all duration-200 hover:text-white hover:bg-indigo-950/30 hover:border-cyan-500/20 hover:shadow-[0_0_14px_rgba(99,102,241,0.16)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M16.24 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('login');
                setIsModalOpen(true);
              }}
              className="px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-650/80 hover:bg-indigo-600 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_0_26px_rgba(99,102,241,0.32)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400/40"
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 HERO SECTION */}
      <section className="relative pt-12 pb-20 md:py-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-left animate-in fade-in slide-in-from-bottom-8 duration-500">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Automações HTTP para produtos que não podem falhar no silêncio
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] font-mono text-slate-100">
              Seus jobs executam.<br />
              Você sabe quando <br className="hidden sm:inline"/>
              <span className="text-gradient-cyber">não executam.</span>
            </h1>

            <p className="text-base font-bold text-slate-350 tracking-wide">
              Agende, proteja e monitore suas automações em um só lugar.
            </p>

            <p className="text-sm text-slate-400 max-w-lg leading-relaxed">
              Substitua crontabs espalhados e webhooks sem diagnóstico por uma camada confiável para suas tarefas recorrentes. O CronFlow agenda execuções, tenta novamente quando necessário, assina seus webhooks e mostra o histórico completo de cada resultado.
            </p>

            <div className="grid gap-4 pt-2 select-none sm:grid-cols-2">
              <button
                onClick={() => {
                  setActiveTab('signup');
                  setIsModalOpen(true);
                }}
                className="inline-flex w-full items-center justify-center whitespace-nowrap px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-cyan-500 hover:bg-cyan-400 rounded-xl shadow-[0_0_25px_rgba(0,217,255,0.3)] transition-all cursor-pointer hover:-translate-y-0.5 duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                Criar meu primeiro job grátis ⚡
              </button>
              <button
                onClick={() => setIsSimulationOpen(true)}
                className="inline-flex w-full items-center justify-center whitespace-nowrap px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/10 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                Ver uma execução por dentro
              </button>
            </div>

            <p className="text-[10px] text-slate-500 tracking-wider font-semibold font-mono">
              Sem cartão de crédito · Workspace pronto em minutos · API e painel visual
            </p>
          </div>

          {/* Premium Preview Mockup */}
          <div className="lg:col-span-6 animate-in fade-in zoom-in-95 duration-700 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 rounded-3xl filter blur-xl opacity-75 pointer-events-none" />
            
            {/* Glass Dashboard Card Mockup - Observabilidade Real */}
            <div className="relative glass-panel rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl p-6 select-none font-mono hover:border-cyan-500/30 transition-all duration-300">
              <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              
              {/* Header Mockup */}
              <div className="flex justify-between items-center pb-4 border-b border-indigo-950/40 mb-5">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Live Telemetry</span>
                </div>
                <div className="text-[9px] text-cyan-400 bg-cyan-950/30 border border-cyan-550/20 px-2.5 py-0.5 rounded-lg font-bold tracking-wider animate-pulse">
                  SYNC_API_ACTIVE
                </div>
              </div>

              {/* Narrativa Visual de Execução: Agendado -> Executando -> Falhou -> Retry 2/3 -> Recuperado */}
              <div className="space-y-4 text-left">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  <span>Fluxo do Evento</span>
                  <span className="text-cyan-400 font-mono">ID: job-9a1b</span>
                </div>

                <div className="relative pl-6 border-l border-indigo-950/60 space-y-4">
                  {/* Step 1: Agendado */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#060813] border border-cyan-500/30 text-[9px] text-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.1)]">
                      1
                    </span>
                    <div>
                      <span className="text-[11px] font-bold text-slate-200 block">Agendamento Disparado</span>
                      <span className="text-[9px] text-slate-500 block">Intervalo: 08:00 (every:24h)</span>
                    </div>
                  </div>

                  {/* Step 2: Executando */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#060813] border border-indigo-500/30 text-[9px] text-indigo-400 font-bold">
                      2
                    </span>
                    <div>
                      <span className="text-[11px] font-bold text-slate-200 block">Envio HTTP POST</span>
                      <span className="text-[9px] text-indigo-300 block">URL: https://api.empresa.com/sync</span>
                    </div>
                  </div>

                  {/* Step 3: Falhou */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#060813] border border-rose-500/40 text-[9px] text-rose-450 font-bold shadow-[0_0_8px_rgba(239,68,68,0.1)]">
                      3
                    </span>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-rose-450 block">Falha de Timeout</span>
                        <span className="text-[9px] text-rose-500/70 block font-mono">HTTP 504 Gateway Timeout (Tentativa 1)</span>
                      </div>
                      <span className="text-[8px] font-black uppercase text-rose-400 border border-rose-500/20 bg-rose-950/20 px-1.5 py-0.5 rounded">FALHA</span>
                    </div>
                  </div>

                  {/* Step 4: Retry 2/3 */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#060813] border border-amber-500/40 text-[9px] text-amber-400 font-bold animate-pulse">
                      4
                    </span>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-amber-350 block">Executando Retry 2/3</span>
                        <span className="text-[9px] text-slate-500 block">Atraso Exponencial com Backoff (30s)</span>
                      </div>
                      <span className="text-[8px] font-black uppercase text-amber-400 border border-amber-500/20 bg-amber-950/20 px-1.5 py-0.5 rounded animate-pulse">RETRY</span>
                    </div>
                  </div>

                  {/* Step 5: Recuperado */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-400 font-black shadow-[0_0_10px_rgba(16,185,129,0.15)]">
                      ✓
                    </span>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[11px] font-black text-emerald-400 block">Fluxo Recuperado com Sucesso</span>
                        <span className="text-[9px] text-emerald-500/80 block">HTTP 200 OK na segunda tentativa</span>
                      </div>
                      <span className="text-[8px] font-black uppercase text-emerald-400 border border-emerald-500/20 bg-emerald-950/20 px-1.5 py-0.5 rounded">SUCESSO</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadados Telemetria */}
              <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-indigo-950/40 text-left">
                <div className="p-2.5 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">Latência</span>
                  <span className="text-[10px] font-black text-cyan-400 block mt-0.5">842 ms</span>
                </div>
                <div className="p-2.5 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">Tentativas</span>
                  <span className="text-[10px] font-black text-amber-400 block mt-0.5">2 de 3</span>
                </div>
                <div className="p-2.5 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">Alerta</span>
                  <span className="text-[10px] font-black text-emerald-400 block mt-0.5 truncate">Webhook enviado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔄 FAILURE LIFECYCLE SECTION */}
      <section id="failure-lifecycle" className="py-20 border-t border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center scroll-mt-16">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Controle de Ciclo de Vida</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">O que acontece quando um job falha?</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Diferente de agendadores silenciosos, o CronFlow foi projetado para lidar com instabilidades na rede e falhas de serviços de forma resiliente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
          {/* Passo 1 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/40 border border-indigo-950/50 hover:border-indigo-500/20 transition-all duration-300">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-xs font-black text-slate-200 font-mono leading-tight pr-2">1. Disparo de Agendamento</div>
              <span className="inline-flex min-h-6 min-w-[68px] shrink-0 items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[72px] sm:text-[9px]">PASSO 1</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              O job é disparado conforme o intervalo ou expressão cron definidos, a partir de instâncias isoladas do Scheduler.
            </p>
          </div>

          {/* Passo 2 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/40 border border-indigo-950/50 hover:border-indigo-500/20 transition-all duration-300">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-xs font-black text-slate-200 font-mono leading-tight pr-2">2. Resposta com Falha</div>
              <span className="inline-flex min-h-6 min-w-[68px] shrink-0 items-center justify-center rounded border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-rose-455 text-center leading-none sm:min-w-[72px] sm:text-[9px]">PASSO 2</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Seu endpoint responde com instabilidades temporárias, erros de rede (HTTP 5xx) ou timeouts inesperados de resposta.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/40 border border-indigo-950/50 hover:border-indigo-500/20 transition-all duration-300">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-xs font-black text-slate-200 font-mono leading-tight pr-2">3. Retries Inteligentes</div>
              <span className="inline-flex min-h-6 min-w-[68px] shrink-0 items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-amber-400 text-center leading-none sm:min-w-[72px] sm:text-[9px]">PASSO 3</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              O Worker enfileira automaticamente a tarefa para re-executar com backoff exponencial (3x), amortecendo flutuações temporárias.
            </p>
          </div>

          {/* Passo 4 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/40 border border-indigo-950/50 hover:border-indigo-500/20 transition-all duration-300">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-xs font-black text-slate-200 font-mono leading-tight pr-2">4. Alerta & Telemetria</div>
              <span className="inline-flex min-h-6 min-w-[68px] shrink-0 items-center justify-center rounded border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-emerald-400 text-center leading-none sm:min-w-[72px] sm:text-[9px]">PASSO 4</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Se o erro persistir, você recebe um webhook assinado ou alerta SMTP com os logs completos de cada tentativa realizada.
            </p>
          </div>
        </div>
      </section>

      {/* 💎 KEY DIFFERENTIATORS SECTION */}
      <section className="py-20 bg-[#080a14]/60 border-t border-b border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono font-bold">Diferencial Operacional</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Não basta executar. É preciso confiar na execução.</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Entenda como construímos a camada de resiliência e segurança mais avançada do mercado para automações recorrentes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/75 border border-indigo-950/50 hover:border-cyan-500/20 transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Resiliência sem gambiarra</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Retries nativos com backoff exponencial para absorver falhas transitórias de infraestrutura sem precisar duplicar código de re-execução em cada um dos seus microsserviços.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/75 border border-indigo-950/50 hover:border-cyan-500/20 transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Segurança por padrão</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Proteção SSRF contra requisições a endereços locais privados, bloqueio de redirects maliciosos e assinaturas de Webhooks com segredos HMAC para manter suas conexões sempre íntegras.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/75 border border-indigo-950/50 hover:border-cyan-500/20 transition-all duration-300 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Diagnóstico que ajuda</h3>
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Histórico detalhado de tentativas com latência, payloads, cabeçalhos e status das respostas. IA integrada para sugerir soluções e investigar a causa raiz do erro imediatamente.
            </p>
          </div>
        </div>
      </section>

      {/* 🎯 AUDIENCE SECTION */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono font-bold">Público-Alvo</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Feito para quem mantém tarefas que não podem simplesmente desaparecer.</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Seja você um desenvolvedor solo ou parte de um time de engenharia complexo, o CronFlow se integra ao seu fluxo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* Devs */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-2 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-xs font-black text-slate-250 block font-mono">Desenvolvedores</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Substitua de forma limpa os crontabs espalhados por servidores e scripts bash sem logs ou observabilidade.
            </p>
          </div>

          {/* SaaS */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-2 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-xs font-black text-slate-250 block font-mono">SaaS Pequenos</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Garanta a execução estável de sincronizações recorrentes de dados, relatórios PDF pesados e envios de newsletters.
            </p>
          </div>

          {/* Integrators */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-2 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-xs font-black text-slate-250 block font-mono">Times de Integração</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Centralize webhooks de terceiros, controle retries exponenciais de parceiros e inspecione logs HTTP centralizados.
            </p>
          </div>

          {/* AI Agents */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-2 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-xs font-black text-slate-250 block font-mono">Agentes de IA</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Permita que rotinas controladas por IA criem fluxos dinamicamente através de chamadas de API simples, sem perder a governança técnica.
            </p>
          </div>
        </div>
      </section>

      {/* 🏁 ONBOARDING FLOW SECTION */}
      <section className="py-20 bg-[#080a14]/60 border-t border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Sem Fricção</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Do primeiro job ao primeiro sinal em poucos minutos.</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Nosso fluxo foi projetado para ser direto ao ponto. Sem burocracia, sem cartão de crédito, sem barreiras técnicas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* Step 1 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/50 border border-indigo-950/50">
            <div className="text-3xl font-black text-indigo-550/30 font-mono mb-2">01</div>
            <span className="text-xs font-black text-slate-200 block font-mono">Crie um workspace</span>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
              Cadastre-se rapidamente com e-mail e senha para criar seu primeiro workspace isolado.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/50 border border-indigo-950/50">
            <div className="text-3xl font-black text-indigo-550/30 font-mono mb-2">02</div>
            <span className="text-xs font-black text-slate-200 block font-mono">Cadastre um endpoint</span>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
              Forneça a URL de destino das automações e as credenciais HTTP necessárias.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/50 border border-indigo-950/50">
            <div className="text-3xl font-black text-indigo-550/30 font-mono mb-2">03</div>
            <span className="text-xs font-black text-slate-200 block font-mono">Escolha o intervalo</span>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
              Escreva uma expressão cron ou use nossos helpers visuais simplificados (ex: every:10m).
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/50 border border-indigo-950/50">
            <div className="text-3xl font-black text-indigo-550/30 font-mono mb-2">04</div>
            <span className="text-xs font-black text-slate-200 block font-mono">Execute e Acompanhe</span>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans">
              Acompanhe a telemetria, veja logs de tentativas e monitore as estatísticas de latência.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 SYSTEM ARCHITECTURE */}
      <section id="architecture" className="py-20 border-t border-b border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center scroll-mt-16">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Resiliência Operacional</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Por trás da simplicidade, uma arquitetura preparada para crescer.</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Conheça as decisões de engenharia em Go, Postgres e Redis que tornam a plataforma incrivelmente robusta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          {/* API */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 relative flex flex-col justify-between min-h-[180px]">
            <div className="space-y-3">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">API REST</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">1. API (cmd/api)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Escrita em Go usando Chi Router, cuida da autenticação por chaves API em hashes timing-safe. Focada em baixíssima latência nas requisições do SDK.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2">
              Tradução: <span className="text-indigo-400">Escala de requisições sem lentidão.</span>
            </div>
          </div>

          {/* Scheduler */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 relative flex flex-col justify-between min-h-[180px]">
            <div className="space-y-3">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">SCHEDULER</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">2. Scheduler (cmd/scheduler)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Processo em loop isolado que lê tarefas prontas. Resolve as timezones e distribui o lock com locks exclusivos de Redis para evitar dupla execução.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2">
              Tradução: <span className="text-indigo-400">Agendamentos não ficam presos à API.</span>
            </div>
          </div>

          {/* Worker */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 relative flex flex-col justify-between min-h-[180px]">
            <div className="space-y-3">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">WORKER</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">3. Worker (cmd/worker)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Executa requisições de forma concorrente em Goroutines através de filas Asynq. Gerencia limites de concorrência por plano e fila.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2">
              Tradução: <span className="text-indigo-400">Concorrência controlada e fila resiliente.</span>
            </div>
          </div>

          {/* Lock/Logs */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 relative flex flex-col justify-between min-h-[180px]">
            <div className="space-y-3">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">TELEMETRIA</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">4. Logs de Tentativas</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Persistência de logs imutáveis e estatísticas detalhadas de cada tentativa de execução no Postgres para auditoria.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2">
              Tradução: <span className="text-indigo-400">Histórico completo de cada tentativa.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 🛡️ SECURITY & TRUST SECTION */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center font-sans">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono font-bold">Segurança e Conformidade</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Automação sem abrir uma porta para o ambiente interno.</h2>
          <p className="text-sm text-slate-450 max-w-lg mx-auto leading-relaxed">
            Tratamos a segurança das suas requisições HTTP e dados sensíveis com padrões corporativos de ponta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Card 1: Proteção SSRF */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-3 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-sm font-bold text-slate-200 block font-mono">Proteção Anti-SSRF ativa</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              O CronFlow valida ativamente todos os endereços IP de destino e redirecionamentos contra faixas de redes privadas internas (como localhost, 127.0.0.1, 10.0.0.0/8). Impedimos escaneamentos maliciosos na sua rede interna.
            </p>
            <div className="pt-2">
              <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>

          {/* Card 2: Assinaturas HMAC */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-3 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-sm font-bold text-slate-200 block font-mono">Webhooks com Assinatura HMAC-SHA256</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Todas as notificações contêm uma assinatura criptográfica no cabeçalho baseada em chaves geradas por projeto. Seus servidores receptores podem validar a autenticidade das mensagens, mitigando ataques de spoofing.
            </p>
            <div className="pt-2">
              <a href="https://github.com/JanGustavo/Cron/blob/master/README_WEBHOOKS.md" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>

          {/* Card 3: Chaves de API Revogáveis */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-3 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-sm font-bold text-slate-200 block font-mono">Chaves de API Revogáveis & Isoladas</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Gere chaves de API exclusivas com escopo restrito para cada workspace. Em caso de comprometimento, revogue ou rotacione suas chaves instantaneamente pelo painel, sem interromper as outras rotinas da sua organização.
            </p>
            <div className="pt-2">
              <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>

          {/* Card 4: Validação de Redirecionamentos */}
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/30 border border-indigo-950/40 space-y-3 hover:border-indigo-500/10 transition-all duration-300">
            <span className="text-sm font-bold text-slate-200 block font-mono">Validação de Redirecionamento (Redirects)</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              O pipeline do Worker segue as diretrizes HTTP de redirecionamento com validação estrita de segurança. Impedimos redirecionamentos abertos e forçamos o protocolo HTTPS seguro nas transições para proteger chaves e tokens de autenticação.
            </p>
            <div className="pt-2">
              <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 💻 INTERACTIVE PLAYGROUND (CODE SNIPPETS) */}
      <section id="playground" className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center scroll-mt-10">
        <div className="space-y-4 mb-10">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Código Sem Fricção</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Dispare tarefas com uma única linha</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Integre o CronFlow ao seu pipeline via cURL tradicional, JSON ou usando nosso agente de IA via chat.
          </p>
        </div>

        {/* Terminal Container */}
        <div className="glass-panel rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl flex flex-col font-mono text-left text-xs text-indigo-300">
          
          {/* Tabs header */}
          <div className="flex bg-[#070913]/90 border-b border-indigo-950/40 p-2 gap-1.5 select-none">
            <button
              onClick={() => setActiveSandboxTab('curl')}
              className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all cursor-pointer ${
                activeSandboxTab === 'curl'
                  ? 'bg-indigo-950/70 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Comando cURL
            </button>
            <button
              onClick={() => setActiveSandboxTab('json')}
              className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all cursor-pointer ${
                activeSandboxTab === 'json'
                  ? 'bg-indigo-950/70 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Estrutura JSON
            </button>
            <button
              onClick={() => setActiveSandboxTab('agent')}
              className={`px-4 py-2 text-[10px] uppercase font-bold tracking-wider rounded-xl transition-all cursor-pointer ${
                activeSandboxTab === 'agent'
                  ? 'bg-indigo-950/70 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              Prompt Agente IA
            </button>
          </div>

          {/* Code output area */}
          <div className="p-5 md:p-7 bg-[#070913]/60 min-h-[160px] flex items-center justify-between text-indigo-300 overflow-x-auto select-all">
            {activeSandboxTab === 'curl' && (
              <pre className="whitespace-pre-wrap leading-relaxed w-full font-mono">
                <code>
<span className="text-slate-500"># Dispara uma rota de sync todo dia às 8h da manhã</span>
<br />
curl -X POST https://cron.jangustavo.me/v1/jobs \
  -H <span className="text-emerald-400">"Authorization: Bearer cf_live_suaAPIKey"</span> \
  -H <span className="text-emerald-400">"Content-Type: application/json"</span> \
  -d <span className="text-cyan-400">'{'{'}"name": "Sync Vendas", "schedule": "0 8 * * *", "url": "https://api.vendas.com/sync"{'}'}'</span>
                </code>
              </pre>
            )}

            {activeSandboxTab === 'json' && (
              <pre className="whitespace-pre-wrap leading-relaxed w-full font-mono">
                <code>
<span className="text-slate-500">// Payload padrão de criação enviado para o backend</span>
<br />
{'{'}
  <span className="text-emerald-400">"name"</span>: "Sincronizador Diário",
  <span className="text-emerald-400">"schedule"</span>: "every:24h",
  <span className="text-emerald-400">"url"</span>: "https://meu-endpoint.com/webhook",
  <span className="text-emerald-400">"http_method"</span>: "POST",
  <span className="text-emerald-400">"timezone"</span>: "America/Sao_Paulo",
  <span className="text-emerald-400">"tags"</span>: ["vendas", "faturamento"]
{'}'}
                </code>
              </pre>
            )}

            {activeSandboxTab === 'agent' && (
              <pre className="whitespace-pre-wrap leading-relaxed w-full font-mono">
                <code>
<span className="text-slate-500"># Copie e envie isto para o chatbot inteligente no terminal</span>
<br />
👤 Você: crie um job chamado Monitor de Dolar para rodar toda segunda-feira às 12h batendo na URL https://economia.com/api usando o método GET
<br />
🤖 Agente: Executando Tool createJob... Job criado com ID 4a82-f38b com sucesso! 🚀
                </code>
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* 🏁 FINAL CTA SECTION */}
      <section className="py-20 border border-indigo-950/40 bg-gradient-to-b from-[#060813] to-[#0a0d1e] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden rounded-3xl mb-12">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-indigo-500/5 opacity-50 pointer-events-none" />
        <div className="relative space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-slate-100">
            Pare de descobrir falhas pelos clientes.
          </h2>
          <p className="text-sm text-slate-450 leading-relaxed font-sans">
            Crie seu primeiro job, acompanhe a execução e veja como o CronFlow transforma uma rotina silenciosa em um fluxo observável, seguro e totalmente auditável.
          </p>
          <div className="flex justify-center gap-4 select-none">
            <button
              onClick={() => {
                setActiveTab('signup');
                setIsModalOpen(true);
              }}
              className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-cyan-500 hover:bg-cyan-400 rounded-xl shadow-[0_0_20px_rgba(0,217,255,0.25)] transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
            >
              Criar conta grátis
            </button>
            <a
              href="https://github.com/JanGustavo/Cron"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/10 rounded-xl transition-all flex items-center justify-center hover:-translate-y-0.5 duration-200"
            >
              Ler a documentação
            </a>
          </div>
        </div>
      </section>

      {/* 🧭 FOOTER */}
      <footer className="py-12 border-t border-indigo-950/40 text-center text-[10px] text-slate-600 font-mono select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-slate-500 uppercase tracking-widest font-black">CronFlow v1.0.0</span>
          <span>© 2026 CronFlow Inc. • Distribuído sob a licença MIT.</span>
        </div>
      </footer>

      {/* 🔑 GLOWING LOGIN/SIGNUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
          
          <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border border-indigo-500/30 bg-[#0a0d1d]/95 shadow-[0_0_50px_rgba(0,217,255,0.2)] animate-in zoom-in-95 duration-200 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
            <div className="pointer-events-none absolute top-0 inset-x-12 z-10 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            <AuthProductPanel
              onCreateAccount={() => {
                setActiveTab('signup');
                setErrorMsg(null);
              }}
              onExplore={() => {
                setIsModalOpen(false);
                scrollToSection('features');
              }}
            />
            <div className="relative min-w-0 p-6 md:p-8 lg:flex lg:h-full lg:flex-col lg:justify-center">
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              aria-label="Fechar modal"
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Logo inside modal */}
            {!generatedKey && (
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-950/40 border border-cyan-500/20 shadow-lg p-1.5">
                  <img src="/logo.svg" alt="Logo CronFlow" className="w-full h-full object-contain" />
                </div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">{activeTab === 'login' ? authCopy.login.eyebrow : authCopy.signup.eyebrow}</p>
                <h3 className="text-lg font-black text-slate-100 tracking-tight font-mono">{activeTab === 'login' ? authCopy.login.title : authCopy.signup.title}</h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">{activeTab === 'login' ? authCopy.login.description : authCopy.signup.description}</p>
              </div>
            )}

            {/* Tabs Selector */}
            {!generatedKey && (
              <div className="flex border-b border-indigo-950/20 mb-6 font-mono">
                <button
                  type="button"
                  aria-label="Trocar para aba de Login"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500/40 rounded-lg ${
                    activeTab === 'login'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-slate-500 hover:text-slate-355'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  aria-label="Trocar para aba de Registro"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:text-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500/40 rounded-lg ${
                    activeTab === 'signup'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-slate-500 hover:text-slate-355'
                  }`}
                >
                  Registrar
                </button>
              </div>
            )}

            {/* Form logic */}
            {generatedKey ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-300">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1 text-left">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Sucesso!</span>
                  <p className="text-xs text-slate-300">Sua conta foi criada e a chave gerada com sucesso.</p>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Sua Chave de API Segura (cf_live_...)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedKey}
                      className="flex-1 px-3.5 py-2.5 bg-[#070913]/90 border border-indigo-950/60 rounded-xl font-mono text-xs text-indigo-450 focus:outline-none select-all"
                    />
                    <button
                      onClick={handleCopyKey}
                      aria-label="Copiar chave de API"
                      className={`px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                        copySuccess
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800/60 hover:bg-slate-800/80 border-slate-700/50 text-slate-300'
                      }`}
                    >
                      {copySuccess ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#0a0d1d]/80 border border-indigo-950/40 rounded-2xl text-left space-y-2 font-mono">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Instruções para SDKs</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                    Use essa chave para autenticar requisições na API HTTP local/remota ou conectando o seu Agente de IA. Guarde em local seguro, pois ela não será mostrada novamente!
                  </p>
                </div>

                <button
                  onClick={handleConnectWithGeneratedKey}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-605 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                >
                  Acessar Painel Principal ⚡
                </button>
                
                <button
                  onClick={() => {
                    setGeneratedKey(null);
                    setActiveTab('signup');
                    setEmail('');
                    setProjectName('');
                    setFullName('');
                    setCpf('');
                  }}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 font-semibold cursor-pointer"
                >
                  Voltar ao cadastro
                </button>
              </div>
            ) : activeTab === 'login' ? (
              <form onSubmit={handleConnect} className="space-y-5 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    E-mail do Desenvolvedor
                  </label>
                  <input
                    type="email"
                    placeholder="dev@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      aria-label="Alternar visibilidade da senha"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 focus:outline-none focus:text-cyan-400 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.204.214-2.357.606-3.427m3.2 6.427a4 4 0 116.388 3.25M15 12a3 3 0 00-3-3 M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold text-center select-text">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Entrando...' : authCopy.login.submit}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4 text-left">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    E-mail do Desenvolvedor
                  </label>
                  <input
                    type="email"
                    placeholder="dev@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      aria-label="Alternar visibilidade da senha"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 focus:outline-none focus:text-cyan-400 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.204.214-2.357.606-3.427m3.2 6.427a4 4 0 116.388 3.25M15 12a3 3 0 00-3-3 M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Nome do Projeto / Workspace
                  </label>
                  <input
                    type="text"
                    placeholder="SaaS Faturamento"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    placeholder="João da Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    CPF (Apenas números)
                  </label>
                  <input
                    type="text"
                    placeholder="12345678909"
                    maxLength={11}
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                    disabled={loading}
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold text-center">
                    ⚠️ {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-[#ff006e] hover:bg-[#d90368] transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Criando workspace...' : authCopy.signup.submit}
                </button>
              </form>
            )}
            </div>
          </div>
        </div>
      )}

      {/* 📡 SIMULATOR MODAL */}
      {isSimulationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200 font-mono">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-indigo-500/30 bg-[#0a0d1d]/95 shadow-[0_0_50px_rgba(0,217,255,0.2)] animate-in zoom-in-95 duration-200 p-6 md:p-8 flex flex-col">
            <div className="pointer-events-none absolute top-0 inset-x-12 z-10 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-indigo-950/40 mb-6">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400">Simulador de Execução CronFlow</span>
              </div>
              <button
                onClick={() => setIsSimulationOpen(false)}
                aria-label="Fechar simulação"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Simulation Area */}
            <div className="flex-1 bg-[#060812] border border-indigo-950/60 rounded-2xl p-5 min-h-[320px] text-xs space-y-3 overflow-y-auto select-all text-left">
              {simulationStep >= 1 && (
                <div className="text-cyan-400 animate-in fade-in duration-300">
                  📡 [08:00:00.000] scheduler: Dispatching job-9a1b (Sync Vendas) on schedule "0 8 * * *"
                </div>
              )}
              {simulationStep >= 2 && (
                <div className="text-indigo-300 animate-in fade-in duration-300">
                  ⚡ [08:00:00.045] worker: Acquired distributed Redis lock for epoch window. Task ID: tsk_e891b.
                </div>
              )}
              {simulationStep >= 3 && (
                <div className="text-slate-300 animate-in fade-in duration-300">
                  🔄 [08:00:00.052] worker: Dispatching HTTP POST webhook to https://api.vendas.com/sync...
                </div>
              )}
              {simulationStep >= 4 && (
                <div className="text-rose-450 font-semibold animate-in fade-in duration-300">
                  ⚠️ [08:00:10.055] worker: HTTP request TIMEOUT (10000ms limit exceeded). Connection closed.
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  Enqueuing job for Retry 2/3 with backoff delay (30 seconds). Status: FAIL_TEMPORARY
                </div>
              )}
              {simulationStep >= 5 && (
                <div className="text-amber-400 animate-in fade-in duration-300">
                  🔄 [08:00:40.060] worker: Backoff period expired. Executing Retry 2/3...
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  Sending HTTP POST to https://api.vendas.com/sync (HMAC Header signed)
                </div>
              )}
              {simulationStep >= 6 && (
                <div className="text-emerald-400 font-bold animate-in fade-in duration-300">
                  ✅ [08:00:40.245] worker: HTTP Status 200 OK received! Latency: 185ms.
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  Database updated (1 retry required). Distributed Redis lock released.
                  <br />
                  🔔 [08:00:40.252] telemetry: Email/Webhook logs saved successfully. System recovery complete.
                </div>
              )}

              {/* Typing/running indicator */}
              {isSimulating && (
                <div className="flex items-center gap-1.5 text-slate-500 py-1 font-sans">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-150" />
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-300" />
                  <span className="text-[10px] italic ml-1 font-mono uppercase tracking-wider">Executando etapa {simulationStep}...</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-indigo-950/40 select-none">
              <span className="text-[10px] text-slate-500">
                {isSimulating ? 'Simulação em progresso...' : 'Simulação concluída.'}
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSimulationStep(1);
                    setIsSimulating(true);
                  }}
                  disabled={isSimulating}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                >
                  Reiniciar
                </button>
                <button
                  onClick={() => setIsSimulationOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
