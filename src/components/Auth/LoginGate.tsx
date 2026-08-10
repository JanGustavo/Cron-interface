import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import api from '../../services/api';
import type { Token, Project } from '../../types/auth';

export const LoginGate: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<{ user: any; token: any; projects: any } | null>(null);
  
  // Signup Wizard States
  const [signupStep, setSignupStep] = useState(1);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('Desenvolvedor Full Stack');
  const [techStack, setTechStack] = useState('Node.js / TypeScript');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'paid'>('free');

  // Recovery States
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Reset step wizard on tab change
  useEffect(() => {
    if (activeTab === 'signup') {
      setSignupStep(1);
      setErrorMsg(null);
    }
  }, [activeTab, isModalOpen]);


  // Password strength checker helper
  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: 'Não informada', color: 'bg-slate-700' };
    if (password.length < 6) return { score: 1, label: 'Fraca (Mínimo 6 caracteres)', color: 'bg-rose-500' };

    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    // Se tiver apenas números ou apenas letras
    if ((hasNumbers && !hasLetters && !hasSpecial) || (hasLetters && !hasNumbers && !hasSpecial)) {
      return { score: 1, label: 'Fraca (Misture letras e números)', color: 'bg-rose-500' };
    }

    // Se tiver letras e números mas for menor que 8 ou sem símbolos
    if (password.length < 8 || !(hasLetters && hasNumbers)) {
      return { score: 2, label: 'Razoável', color: 'bg-amber-500' };
    }

    // Se tiver letras, números e caracteres especiais, e for >= 8
    if (hasLetters && hasNumbers && hasSpecial && password.length >= 8) {
      return { score: 4, label: 'Muito Forte! 🔥', color: 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse' };
    }

    return { score: 3, label: 'Forte!', color: 'bg-emerald-500' };
  };

  // Validation flags for the Signup Onboarding Wizard
  const isEmailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length === 0 || password.length >= 6;
  const isConfirmPasswordValid = confirmPassword.length === 0 || password === confirmPassword;
  const isFullNameValid = fullName.trim() === '' || fullName.trim().split(' ').filter(Boolean).length >= 2;
  const isCompanyValid = company.trim() === '' || company.trim().length >= 2;

  const formatCPF = (value: string) => {
    const clean = value.replace(/\D/g, '');
    return clean
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
  };

  const isCpfValid = (() => {
    if (cpf.trim() === '') return true;
    const clean = cpf.replace(/[^\d]+/g, '');
    if (clean.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
    let rest = sum % 11;
    let digit1 = rest < 2 ? 0 : 11 - rest;
    if (parseInt(clean.charAt(9)) !== digit1) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
    rest = sum % 11;
    let digit2 = rest < 2 ? 0 : 11 - rest;
    if (parseInt(clean.charAt(10)) !== digit2) return false;
    return true;
  })();

  // Interactive Sandbox Tab State
  const [activeSandboxTab, setActiveSandboxTab] = useState<'curl' | 'json' | 'agent'>('curl');

  const { login } = useAuthStore();
  const { toggleTheme, theme, showToast } = useUiStore();

  // URL token checker for password reset and OAuth callbacks
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setActiveTab('reset-password');
      setIsModalOpen(true);
      
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return;
    }

    const oauthToken = params.get('oauth_token');
    const oauthEmail = params.get('oauth_user_email');
    const oauthId = params.get('oauth_user_id');
    const oauthApiKey = params.get('oauth_api_key');
    const oauthError = params.get('oauth_error');

    if (oauthError) {
      setErrorMsg(`Erro na autenticação OAuth: ${oauthError}`);
      setIsModalOpen(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      return;
    }

    if (oauthToken && oauthEmail && oauthId) {
      const user = { id: oauthId, email: oauthEmail, plan: 'free' as const, createdAt: new Date().toISOString() };
      const project: Project = { id: '', userId: oauthId, name: 'Meu Workspace', createdAt: new Date().toISOString() };
      const tokenObj: Token = {
        accessToken: oauthToken,
        refreshToken: '',
        tokenType: 'Bearer',
        expiresIn: 86400
      };

      if (oauthApiKey) {
        setGeneratedKey(oauthApiKey);
        setSignupSession({ user, token: tokenObj, projects: [project] });
        setActiveTab('signup');
        setSignupStep(3); // Mostra a tela final com a chave de API gerada
        setIsModalOpen(true);
      } else {
        login(user, tokenObj, [project]);
        showToast('Login via OAuth realizado com sucesso!', 'success');
      }

      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [login, showToast]);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/v1/auth/forgot-password', {
        email: recoveryEmail.trim(),
      });
      setRecoverySuccess(true);
      if (res.data.link) {
        setRecoveryLink(res.data.link);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao processar solicitação de recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword || newPassword !== confirmNewPassword) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      await api.post('/v1/auth/reset-password', {
        token: resetToken,
        newPassword: newPassword,
      });
      setResetSuccess(true);
      showToast('Senha redefinida com sucesso!', 'success');
      setTimeout(() => {
        setResetSuccess(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setResetToken('');
        setRecoverySuccess(false);
        setRecoveryLink(null);
        setActiveTab('login');
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMsg('Falha ao redefinir a senha. O token pode ser inválido ou ter expirado.');
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
        projectName: projectName.trim(),
        full_name: fullName.trim(),
        cpf: cpf.trim(),
      });

      const { token, user, projects, apiKey } = response.data;
      
      // Save onboarding fields locally
      localStorage.setItem('cf_user_name', fullName.trim());
      localStorage.setItem('cf_user_company', company.trim());
      localStorage.setItem('cf_user_role', role);
      localStorage.setItem('cf_user_tech_stack', techStack);
      localStorage.setItem('cf_user_timezone', timezone);
      localStorage.setItem('cf_user_plan', selectedPlan);

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
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              ✦ Plataforma de Agendamentos Seguros & IA Conversacional
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] font-mono text-slate-100">
              Crontabs <br className="hidden sm:inline"/>
              escaláveis com <br className="hidden sm:inline"/>
              <span className="text-gradient-cyber">Segurança & IA</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
              Deixe para trás scripts crontab instáveis que quebram silenciosamente. O CronFlow oferece concorrência de disparo distribuída por Redis, inteligência artificial integrada, proteção anti-SSRF nativa em sandbox, assinaturas HMAC-SHA256 para webhooks e painéis de observabilidade de latência.
            </p>

            <div className="flex flex-wrap gap-4 pt-2 select-none">
              <button
                onClick={() => {
                  setActiveTab('signup');
                  setIsModalOpen(true);
                }}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.3)] transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
              >
                Criar Conta Grátis ⚡
              </button>
              <button
                onClick={() => scrollToSection('architecture')}
                className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900/90 border border-indigo-950/40 rounded-xl transition-all cursor-pointer"
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
          <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 font-mono">Diferenciais do CronFlow</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Infraestrutura resiliente e focada em segurança</h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            Eliminamos a complexidade de gerenciar servidores cron internos e criamos ferramentas avançadas de segurança, IA e observabilidade para desenvolvedores.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-indigo-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Agente de IA Conversacional</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Crie, liste, teste e agende tarefas complexas por linguagem natural utilizando o chatbot integrado no Terminal AI, reduzindo drasticamente a curva de aprendizado.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-indigo-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Proteção Anti-SSRF</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sandbox nativo com lista de bloqueio IP que barra requisições direcionadas a endereços locais (localhost), privados ou de loopback, impedindo explorações maliciosas.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-indigo-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Assinaturas HMAC-SHA256</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autenticação forte com cabeçalhos <code className="text-indigo-400 font-mono">X-CronFlow-Signature</code> assinados com a chave secreta do projeto, neutralizando ataques de replay.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-indigo-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Gráficos de Latência & Erros</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Painel analítico integrado que rastreia os tempos de resposta de cada execução e classifica erros com precisão (timeouts, DNS, SSRF ou faixas HTTP).
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-indigo-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Encadeamento e Workflows</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Configure dependências entre tarefas. Execute o Job B imediatamente após o sucesso do Job A, encadeando workflows de processos em segundo plano.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-3xl bg-indigo-950/5 border border-indigo-950/30 hover:border-indigo-500/20 hover:bg-indigo-950/10 transition-all duration-300 text-left space-y-4 hover:-translate-y-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H12v9" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-200 tracking-wide font-mono">Retries com Backoff Exponencial</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tratamento inteligente de falhas com até 3 retentativas automáticas e escalonamento exponencial para não sobrecarregar endpoints instáveis.
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
                <h3 className="text-lg font-black text-slate-100 uppercase tracking-widest font-mono">
                  {activeTab === 'forgot-password' && 'Recuperar Senha'}
                  {activeTab === 'reset-password' && 'Redefinir Senha'}
                  {activeTab !== 'forgot-password' && activeTab !== 'reset-password' && 'Conectar ao CronFlow'}
                </h3>
              </div>
            )}

            {/* Tabs Selector */}
            {!generatedKey && activeTab !== 'forgot-password' && activeTab !== 'reset-password' && (
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
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot-password');
                        setErrorMsg(null);
                      }}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
                    >
                      Esqueci minha senha?
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

                <div className="relative flex py-2 items-center select-none">
                  <div className="flex-grow border-t border-indigo-950/40"></div>
                  <span className="flex-shrink mx-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">ou conectar com</span>
                  <div className="flex-grow border-t border-indigo-950/40"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`${api.defaults.baseURL || 'http://localhost:8080'}/v1/auth/oauth/google`}
                    className="py-2.5 rounded-xl text-xs font-bold text-slate-350 hover:text-white bg-slate-900/60 hover:bg-slate-900/90 border border-indigo-950/40 hover:border-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
                  >
                    <svg className="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.147 4.114-3.418 0-6.2-2.782-6.2-6.2 0-3.418 2.782-6.2 6.2-6.2 1.494 0 2.855.534 3.918 1.424l3.116-3.116C19.124 2.052 15.932 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.126 0 11.24-5.033 11.24-11.24 0-.796-.078-1.56-.216-2.285H12.24z"/>
                    </svg>
                    Google
                  </a>
                  <a
                    href={`${api.defaults.baseURL || 'http://localhost:8080'}/v1/auth/oauth/github`}
                    className="py-2.5 rounded-xl text-xs font-bold text-slate-350 hover:text-white bg-slate-900/60 hover:bg-slate-900/90 border border-indigo-950/40 hover:border-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer no-underline"
                  >
                    <svg className="w-4 h-4 text-slate-200" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                    </svg>
                    GitHub
                  </a>
                </div>
              </form>
            ) : activeTab === 'forgot-password' ? (
              <form onSubmit={handleForgotPassword} className="space-y-5 text-left animate-in fade-in slide-in-from-right-4 duration-250">
                {!recoverySuccess ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        E-mail Cadastrado
                      </label>
                      <input
                        type="email"
                        placeholder="dev@empresa.com"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                        disabled={loading}
                        required
                      />
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
                      {loading ? 'Processando...' : 'Enviar Link de Recuperação 📧'}
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1.5 text-left">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">E-mail Enviado!</span>
                      <p className="text-xs text-slate-300">
                        Um link de redefinição de senha foi gerado e enviado (simulado) para o console do servidor.
                      </p>
                    </div>

                    {recoveryLink && (
                      <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-2xl space-y-3">
                        <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-indigo-400 block">Atalho de Teste (Mock):</span>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Para fins de teste e avaliação do fluxo do onboarding seguro sem precisar acessar os logs do terminal, clique no botão abaixo para ir direto à redefinição de senha:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const urlParams = new URL(recoveryLink).searchParams;
                            const tok = urlParams.get('token') || '';
                            setResetToken(tok);
                            setActiveTab('reset-password');
                            setErrorMsg(null);
                          }}
                          className="w-full py-2 text-[10px] uppercase font-bold text-cyan-400 hover:text-white bg-cyan-950/20 hover:bg-cyan-950/50 rounded-xl border border-cyan-900/40 transition-all cursor-pointer"
                        >
                          Ir para Redefinição de Senha ➔
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setRecoverySuccess(false);
                    setRecoveryLink(null);
                    setErrorMsg(null);
                  }}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 font-semibold cursor-pointer pt-2"
                >
                  Voltar ao Login
                </button>
              </form>
            ) : activeTab === 'reset-password' ? (
              <form onSubmit={handleResetPassword} className="space-y-5 text-left animate-in fade-in slide-in-from-right-4 duration-250">
                {!resetSuccess ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Mínimo 6 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                          disabled={loading}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                          {showNewPassword ? (
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
                        Confirmar Nova Senha
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                        disabled={loading}
                        required
                      />
                    </div>

                    {newPassword && confirmNewPassword && newPassword !== confirmNewPassword && (
                      <p className="text-[10px] text-rose-500 font-bold font-mono">⚠️ As senhas não coincidem</p>
                    )}

                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold text-center select-text">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || newPassword.length < 6 || newPassword !== confirmNewPassword}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? 'Salvando...' : 'Salvar Nova Senha 🔒'}
                    </button>
                  </>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1 text-left">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Sucesso!</span>
                    <p className="text-xs text-slate-300">Sua senha foi redefinida com sucesso. Redirecionando para o login...</p>
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-4 text-left">
                {/* Step Indicators */}
                <div className="flex items-center justify-between mb-4 font-mono text-[9px] text-slate-500 font-bold uppercase tracking-wider select-none">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${signupStep >= 1 ? 'border-cyan-400 text-cyan-400 bg-cyan-950/45' : 'border-indigo-950/60 bg-transparent'}`}>1</span>
                    <span className={signupStep >= 1 ? 'text-slate-350' : ''}>Acesso</span>
                  </div>
                  <div className="h-px flex-1 bg-indigo-950/20 mx-2" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${signupStep >= 2 ? 'border-cyan-400 text-cyan-400 bg-cyan-950/45' : 'border-indigo-950/60 bg-transparent'}`}>2</span>
                    <span className={signupStep >= 2 ? 'text-slate-350' : ''}>Perfil</span>
                  </div>
                  <div className="h-px flex-1 bg-indigo-950/20 mx-2" />
                  <div className="flex items-center gap-1.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${signupStep >= 3 ? 'border-cyan-400 text-cyan-400 bg-cyan-950/45' : 'border-indigo-950/60 bg-transparent'}`}>3</span>
                    <span className={signupStep >= 3 ? 'text-slate-350' : ''}>Workspace</span>
                  </div>
                </div>

                {signupStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        E-mail do Desenvolvedor
                      </label>
                      <input
                        type="email"
                        placeholder="dev@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-4 py-3 bg-[#070913]/90 border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 ${
                          email && !isEmailValid 
                            ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20' 
                            : 'border-indigo-950/60 focus:border-cyan-500/40 focus:ring-cyan-500/20'
                        }`}
                        required
                      />
                      {email && !isEmailValid && (
                        <span className="text-[9px] font-semibold text-rose-400 mt-1 block">
                          ⚠️ Digite um formato de e-mail válido (ex: dev@empresa.com).
                        </span>
                      )}
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
                          className={`w-full px-4 py-3 pr-12 bg-[#070913]/90 border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 font-mono ${
                            password && !isPasswordValid 
                              ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20' 
                              : 'border-indigo-950/60 focus:border-cyan-500/40 focus:ring-cyan-500/20'
                          }`}
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
                      
                      {password && !isPasswordValid && (
                        <span className="text-[9px] font-semibold text-rose-400 mt-1 block">
                          ⚠️ A senha precisa de pelo menos 6 caracteres.
                        </span>
                      )}

                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center text-[9px] font-bold tracking-wider font-mono text-slate-500 uppercase">
                            <span>Força da Senha:</span>
                            <span className={
                              getPasswordStrength().score === 1 ? 'text-rose-400' :
                              getPasswordStrength().score === 2 ? 'text-amber-400' : 'text-emerald-400'
                            }>
                              {getPasswordStrength().label}
                            </span>
                          </div>
                          <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden flex">
                            <div className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength().color}`} style={{ width: `${(getPasswordStrength().score / 4) * 100}%` }} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Confirmar Senha
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full px-4 py-3 bg-[#070913]/90 border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 font-mono ${
                          confirmPassword && !isConfirmPasswordValid 
                            ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20' 
                            : 'border-indigo-950/60 focus:border-cyan-500/40 focus:ring-cyan-500/20'
                        }`}
                        required
                      />
                      {confirmPassword && !isConfirmPasswordValid && (
                        <span className="text-[9px] font-semibold text-rose-400 mt-1 block">
                          ⚠️ As senhas digitadas não coincidem.
                        </span>
                      )}
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold text-center select-text">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!email.trim() || !password || !confirmPassword || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid}
                      onClick={() => {
                        setErrorMsg(null);
                        setSignupStep(2);
                      }}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Avançar: Perfil do Dev
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}

                {signupStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        placeholder="Ana Silva"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`w-full px-4 py-3 bg-[#070913]/90 border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 ${
                          fullName && !isFullNameValid 
                            ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20' 
                            : 'border-indigo-950/60 focus:border-cyan-500/40 focus:ring-cyan-500/20'
                        }`}
                        required
                      />
                      {fullName && !isFullNameValid && (
                        <span className="text-[9px] font-semibold text-rose-400 mt-1 block">
                          ⚠️ Digite seu nome e sobrenome (ex: Ana Silva).
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        CPF (Para Prevenção de Fraudes)
                      </label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCPF(e.target.value))}
                        className={`w-full px-4 py-3 bg-[#070913]/90 border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 ${
                          cpf && !isCpfValid 
                            ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20' 
                            : 'border-indigo-950/60 focus:border-cyan-500/40 focus:ring-cyan-500/20'
                        }`}
                        required
                      />
                      {cpf && !isCpfValid && (
                        <span className="text-[9px] font-semibold text-rose-400 mt-1 block">
                          ⚠️ Digite um CPF válido.
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Nome da Empresa / Organização
                      </label>
                      <input
                        type="text"
                        placeholder="Empresa Tech Ltda"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className={`w-full px-4 py-3 bg-[#070913]/90 border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all duration-300 ${
                          company && !isCompanyValid 
                            ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20' 
                            : 'border-indigo-950/60 focus:border-cyan-500/40 focus:ring-cyan-500/20'
                        }`}
                        required
                      />
                      {company && !isCompanyValid && (
                        <span className="text-[9px] font-semibold text-rose-400 mt-1 block">
                          ⚠️ O nome da empresa deve ter pelo menos 2 caracteres.
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Cargo / Função
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-300 hover:border-indigo-900/80 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        <option value="Desenvolvedor Backend">Desenvolvedor Backend</option>
                        <option value="Desenvolvedor Frontend">Desenvolvedor Frontend</option>
                        <option value="Desenvolvedor Full Stack">Desenvolvedor Full Stack</option>
                        <option value="Engenheiro DevOps / SRE">Engenheiro DevOps / SRE</option>
                        <option value="Founder / CTO">Founder / CTO</option>
                        <option value="Gerente de Produto">Gerente de Produto</option>
                        <option value="Estudante / Outro">Estudante / Outro</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Stack Principal
                      </label>
                      <select
                        value={techStack}
                        onChange={(e) => setTechStack(e.target.value)}
                        className="w-full px-4 py-3 pr-10 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-300 hover:border-indigo-900/80 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        <option value="Node.js / TypeScript">Node.js / TypeScript</option>
                        <option value="Go (Golang)">Go (Golang)</option>
                        <option value="Python">Python</option>
                        <option value="Java / Spring Boot">Java / Spring Boot</option>
                        <option value="PHP / Laravel">PHP / Laravel</option>
                        <option value="C# / .NET">C# / .NET</option>
                        <option value="Ruby / Rust / Outro">Ruby / Rust / Outro</option>
                      </select>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold text-center select-text">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setSignupStep(1)}
                        className="flex-1 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/50 transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        Voltar
                      </button>
                      <button
                        type="button"
                        disabled={!fullName.trim() || !company.trim() || !cpf.trim() || !isFullNameValid || !isCompanyValid || !isCpfValid}
                        onClick={() => {
                          setErrorMsg(null);
                          setSignupStep(3);
                        }}
                        className="flex-[2] py-3 rounded-xl text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Avançar: Workspace
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {signupStep === 3 && (
                  <form onSubmit={handleSignupSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Nome do Workspace / Projeto
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
                        Fuso Horário Padrão
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        disabled={loading}
                        className="w-full px-4 py-3 pr-10 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-350 hover:border-indigo-900/80 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                      >
                        <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                        <option value="UTC">UTC (Universal Time)</option>
                        <option value="America/New_York">America/New_York (UTC-5)</option>
                        <option value="Europe/London">Europe/London (UTC+0)</option>
                      </select>
                    </div>

                    {/* Choose Plan Cards */}
                    <div className="space-y-2 select-none">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                        Selecione seu Plano
                      </label>
                      
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Free Tier Card */}
                        <div
                          onClick={() => !loading && setSelectedPlan('free')}
                          className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-left cursor-pointer ${
                            selectedPlan === 'free'
                              ? 'border-cyan-500/50 bg-cyan-950/15 shadow-[0_0_15px_rgba(0,217,255,0.15)] ring-1 ring-cyan-500/35'
                              : 'border-indigo-950/60 bg-transparent hover:border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-extrabold text-xs text-slate-200">Plano Free</span>
                              <span className="text-[8px] font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">R$0</span>
                            </div>
                            <p className="text-[9px] text-slate-450 leading-relaxed">
                              Ideal para testes e projetos pessoais simples.
                            </p>
                          </div>
                          
                          <div className="mt-3.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Limite 5 jobs
                          </div>
                        </div>

                        {/* Paid Pro Tier Card */}
                        <div
                          onClick={() => !loading && setSelectedPlan('paid')}
                          className={`p-3.5 rounded-2xl border transition-all duration-300 flex flex-col justify-between text-left cursor-pointer ${
                            selectedPlan === 'paid'
                              ? 'border-[#ff006e]/50 bg-[#ff006e]/5 shadow-[0_0_15px_rgba(255,0,110,0.15)] ring-1 ring-[#ff006e]/35'
                              : 'border-indigo-950/60 bg-transparent hover:border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-extrabold text-xs text-slate-200">Pro Dev</span>
                              <span className="text-[8px] font-bold text-[#ff006e] bg-[#ff006e]/10 px-1.5 py-0.5 rounded border border-[#ff006e]/20">R$19</span>
                            </div>
                            <p className="text-[9px] text-slate-450 leading-relaxed">
                              Agendamentos de produção com webhook de falhas.
                            </p>
                          </div>
                          
                          <div className="mt-3.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#ff006e]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#ff006e] animate-pulse" />
                            Limite 20 jobs
                          </div>
                        </div>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[10px] text-rose-400 font-semibold text-center select-text">
                        ⚠️ {errorMsg}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setSignupStep(2)}
                        className="flex-1 py-3.5 rounded-xl text-xs font-semibold text-slate-350 hover:text-white bg-slate-805 hover:bg-slate-800 border border-slate-700/50 transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !projectName.trim()}
                        className="flex-[2] py-3.5 rounded-xl text-xs font-bold text-white bg-[#ff006e] hover:bg-[#d90368] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? 'Cadastrando...' : 'Registrar e Entrar 🚀'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
