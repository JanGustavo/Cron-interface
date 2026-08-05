import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import api from '../../services/api';

export const LoginGate: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<{ user: any; token: any; projects: any } | null>(null);
  
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
    if (!email.trim() || !password || !projectName.trim()) {
      setErrorMsg('Por favor, preencha todos os campos do cadastro.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const response = await api.post('/v1/auth/signup', {
        email: email.trim(),
        password: password,
        projectName: projectName.trim(),
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

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 selection:bg-cyan-500/30 selection:text-white font-sans scroll-smooth overflow-x-hidden relative">
      
      {/* Dynamic Background Blurs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[6000ms]" />
      <div className="absolute top-[80vh] right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[20vh] left-10 w-[400px] h-[400px] bg-[#ff006e]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* 🧭 NAVIGATION BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-indigo-950/40 bg-[#060813]/70 backdrop-blur-md transition-all select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-950/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(0,217,255,0.15)] p-1.5">
              <img src="/logo.svg" alt="Logo CronFlow" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-black tracking-widest text-gradient-cyber font-mono uppercase">
              CronFlow
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400">
            <button onClick={() => scrollToSection('features')} className="hover:text-cyan-400 transition-colors cursor-pointer">Funcionalidades</button>
            <button onClick={() => scrollToSection('architecture')} className="hover:text-cyan-400 transition-colors cursor-pointer">Arquitetura</button>
            <button onClick={() => scrollToSection('playground')} className="hover:text-cyan-400 transition-colors cursor-pointer">Terminal AI</button>
            <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="hover:text-cyan-400 transition-colors">GitHub</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/30 border border-indigo-950/30 transition-colors"
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
              className="px-4.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-650/80 hover:bg-indigo-600 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all cursor-pointer"
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
              SaaS de Agendamentos Recorrentes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] font-mono text-slate-100">
              Agendamentos <br className="hidden sm:inline"/>
              de alta precisão para <br className="hidden sm:inline"/>
              <span className="text-gradient-cyber">Desenvolvedores</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
              Substitua crontabs instáveis em seus servidores. O CronFlow oferece disparos de webhooks com concorrência distribuída, retentativas exponenciais, workflows integrados e monitoramento em tempo real.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 select-none">
              <button
                onClick={() => {
                  setActiveTab('signup');
                  setIsModalOpen(true);
                }}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-cyan-500 hover:bg-cyan-400 rounded-xl shadow-[0_0_25px_rgba(0,217,255,0.3)] transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
              >
                Criar Conta Grátis ⚡
              </button>
              <button
                onClick={() => scrollToSection('architecture')}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/10 rounded-xl transition-all cursor-pointer"
              >
                Conhecer Arquitetura
              </button>
            </div>
          </div>

          {/* Premium Preview Mockup */}
          <div className="lg:col-span-6 animate-in fade-in zoom-in-95 duration-700 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 rounded-3xl filter blur-xl opacity-75" />
            
            {/* Glass Dashboard Card Mockup */}
            <div className="relative glass-panel rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl p-4 md:p-6 select-none font-mono scale-100 hover:scale-[1.01] transition-transform duration-300">
              <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              
              {/* Header Mockup */}
              <div className="flex justify-between items-center pb-4 border-b border-indigo-950/40 mb-4">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className="text-[9px] text-slate-500 tracking-wider">WORKSPACE: PROJETO_PRINCIPAL</div>
              </div>

              {/* Kanban Columns Mockup */}
              <div className="grid grid-cols-3 gap-3 text-left">
                {/* Active Column */}
                <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ativos</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="p-2.5 bg-[#070913]/80 border border-indigo-500/10 rounded-xl space-y-1.5 shadow-md">
                    <div className="text-[10px] font-black text-slate-200 truncate">Sincronizar Pedidos</div>
                    <div className="text-[8px] text-cyan-400">every:5m</div>
                  </div>
                </div>

                {/* Failing Column */}
                <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Falhando</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  </div>
                  <div className="p-2.5 bg-[#070913]/80 border border-rose-500/10 rounded-xl space-y-1.5 shadow-md">
                    <div className="text-[10px] font-black text-slate-200 truncate">Backup Logs</div>
                    <div className="text-[8px] text-rose-400">0 0 * * *</div>
                  </div>
                </div>

                {/* Paused Column */}
                <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pausados</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  </div>
                  <div className="p-2.5 bg-[#070913]/80 border border-indigo-950/40 rounded-xl space-y-1.5 shadow-md">
                    <div className="text-[10px] font-black text-slate-400 truncate">Envio Relatórios</div>
                    <div className="text-[8px] text-slate-600">0 8 * * 1</div>
                  </div>
                </div>
              </div>

              {/* Execution Graphic Mockup */}
              <div className="mt-4 p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-2xl flex flex-col gap-2">
                <div className="text-[9px] text-slate-500 tracking-wider text-left uppercase font-bold">Mapeador de Execuções (Precisão de 30s)</div>
                <div className="flex items-end gap-1 h-12 pt-2">
                  <div className="flex-1 bg-gradient-to-t from-indigo-500/80 to-cyan-400/80 h-[40%] rounded-sm" />
                  <div className="flex-1 bg-gradient-to-t from-indigo-500/80 to-cyan-400/80 h-[60%] rounded-sm" />
                  <div className="flex-1 bg-gradient-to-t from-indigo-500/80 to-cyan-400/80 h-[50%] rounded-sm" />
                  <div className="flex-1 bg-rose-500/70 h-[30%] rounded-sm" />
                  <div className="flex-1 bg-gradient-to-t from-indigo-500/80 to-cyan-400/80 h-[90%] rounded-sm animate-pulse" />
                  <div className="flex-1 bg-gradient-to-t from-indigo-500/80 to-cyan-400/80 h-[80%] rounded-sm" />
                  <div className="flex-1 bg-gradient-to-t from-indigo-500/80 to-cyan-400/80 h-[95%] rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🛠️ FEATURES GRID */}
      <section id="features" className="py-20 border-t border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center scroll-mt-10">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Infraestrutura Developer-First</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Desenvolvido para máxima confiabilidade</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Eliminamos a complexidade de gerenciar servidores cron internos e criamos ferramentas de rastreabilidade que sua equipe vai amar.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-cyan-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Alta Precisão Sub-Minuto</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O Scheduler processa ciclos curtos a cada 30 segundos, garantindo precisão em agendamentos de minutos, horas ou intervalos simplificados.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-cyan-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H12v9" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Retentativas Automáticas (Backoff)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Caso seu endpoint falhe, o Worker executa automaticamente até 3 retentativas com atraso exponencial, disparando webhooks de alerta.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-cyan-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Encadeamento (Workflows)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Conecte jobs em fila. Dispare o Job B no exato milissegundo de sucesso da conclusão do Job A, criando fluxos complexos e dependentes de forma nativa.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 SYSTEM ARCHITECTURE DIALETIC VIEW */}
      <section id="architecture" className="py-20 bg-indigo-950/5 border-t border-b border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center scroll-mt-10">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Arquitetura Desacoplada (3 Binários)</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Escalabilidade por design em Go</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Em vez de um monólito único, dividimos o CronFlow em três serviços focados em tarefas exclusivas, conectados via Postgres e Redis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {/* Service 1 */}
          <div className="relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 shadow-lg space-y-4">
            <span className="absolute top-4 right-4 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">API REST</span>
            <div className="text-xs font-black text-slate-200 font-mono">1. API (cmd/api)</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Responsável pelo cadastro de usuários, autenticação via SHA-256 e CRUD de Jobs. Escrita com Chi Router para latência mínima de processamento.
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-indigo-950/30 flex items-center justify-between">
              <span>Tecnologias:</span>
              <span className="text-indigo-400 font-semibold">Go / REST / JWT</span>
            </div>
          </div>

          {/* Service 2 */}
          <div className="relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 shadow-lg space-y-4">
            <span className="absolute top-4 right-4 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">SCHEDULER</span>
            <div className="text-xs font-black text-slate-200 font-mono">2. Scheduler (cmd/scheduler)</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Monitora os jobs recorrentes. A cada 30 segundos, ele resolve timezones, busca tarefas prontas no Postgres e as despacha de forma segura.
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-indigo-950/30 flex items-center justify-between">
              <span>Tecnologias:</span>
              <span className="text-indigo-400 font-semibold">Go / Redis Lock / pgx</span>
            </div>
          </div>

          {/* Service 3 */}
          <div className="relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 shadow-lg space-y-4">
            <span className="absolute top-4 right-4 font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20">WORKER</span>
            <div className="text-xs font-black text-slate-200 font-mono">3. Worker (cmd/worker)</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Consome e executa as requisições HTTP registradas de forma paralela via Asynq. Ele realiza disparos paralelos e guarda logs imutáveis.
            </p>
            <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-indigo-950/30 flex items-center justify-between">
              <span>Tecnologias:</span>
              <span className="text-indigo-400 font-semibold">Go / Asynq / Redis</span>
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
              <pre className="whitespace-pre-wrap leading-relaxed w-full">
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
              <pre className="whitespace-pre-wrap leading-relaxed w-full">
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
              <pre className="whitespace-pre-wrap leading-relaxed w-full">
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
          
          <div className="relative w-full max-w-md rounded-3xl border border-indigo-500/30 bg-[#0a0d1d]/95 p-6 md:p-8 shadow-[0_0_50px_rgba(0,217,255,0.2)] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
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
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-widest font-mono">Conectar ao CronFlow</h3>
              </div>
            )}

            {/* Tabs Selector */}
            {!generatedKey && (
              <div className="flex border-b border-indigo-950/20 mb-6 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === 'login'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signup');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeTab === 'signup'
                      ? 'text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-slate-500 hover:text-slate-350'
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
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
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
                  {loading ? 'Entrando...' : 'Entrar no Painel ⚡'}
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
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
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
                  {loading ? 'Cadastrando...' : 'Registrar e Entrar 🚀'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
