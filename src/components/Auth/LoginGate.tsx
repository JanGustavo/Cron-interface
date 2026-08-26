import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { AuthProductPanel } from './AuthProductPanel';
import { authCopy } from './authCopy';
import type { User, Token, Project } from '../../types/auth';

const getPasswordStrength = (pwd: string) => {
  const checks = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd),
  };

  if (!pwd) return { score: 0, label: '', color: 'bg-transparent', textColor: 'text-slate-500', checks };

  const score = Object.values(checks).filter(Boolean).length;
  const levels = [
    { label: 'Muito fraca', color: 'bg-rose-500 w-1/5', textColor: 'text-rose-400' },
    { label: 'Fraca', color: 'bg-orange-500 w-2/5', textColor: 'text-orange-400' },
    { label: 'Média', color: 'bg-amber-500 w-3/5', textColor: 'text-amber-400' },
    { label: 'Boa', color: 'bg-cyan-500 w-4/5', textColor: 'text-cyan-400' },
    { label: 'Forte', color: 'bg-emerald-500 w-full', textColor: 'text-emerald-400' },
  ];

  const level = score === 0 ? { label: '', color: 'bg-transparent', textColor: 'text-slate-500' } : levels[Math.min(score, 5) - 1];

  return { score, ...level, checks };
};

const LIFECYCLE_STEPS = [
  {
    title: "1. Disparo de Agendamento",
    stepText: "PASSO 1",
    badgeClass: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
    description: "O job é disparado conforme o intervalo ou expressão cron definidos, a partir de instâncias isoladas do Scheduler.",
    glowGradient: "from-cyan-500/20 via-purple-500/20 to-indigo-500/10",
    lineGradient: "from-cyan-500/60 to-rose-500/40",
    glowColor: "#22d3ee"
  },
  {
    title: "2. Resposta com Falha",
    stepText: "PASSO 2",
    badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-455",
    description: "Seu endpoint responde com instabilidades temporárias, erros de rede (HTTP 5xx) ou timeouts inesperados de resposta.",
    glowGradient: "from-rose-500/20 via-purple-500/20 to-amber-500/10",
    lineGradient: "from-rose-500/60 to-amber-500/40",
    glowColor: "#f43f5e"
  },
  {
    title: "3. Retries Inteligentes",
    stepText: "PASSO 3",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    description: "O Worker enfileira automaticamente a tarefa para re-executar com backoff exponencial (3x), amortecendo flutuações temporárias.",
    glowGradient: "from-amber-500/20 via-purple-500/20 to-emerald-500/10",
    lineGradient: "from-amber-500/60 to-emerald-500/40",
    glowColor: "#f59e0b"
  },
  {
    title: "4. Alerta & Telemetria",
    stepText: "PASSO 4",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    description: "Se o erro persistir, você recebe um webhook assinado ou alerta SMTP com os logs completos de cada tentativa realizada.",
    glowGradient: "from-emerald-500/20 via-purple-500/20 to-cyan-500/10",
    lineGradient: "from-emerald-500/60 to-cyan-500/40",
    glowColor: "#10b981"
  }
];

const ONBOARDING_STEPS = [
  {
    stepNum: "01",
    title: "Crie um workspace",
    description: "Cadastre-se rapidamente com e-mail e senha para criar seu primeiro workspace isolado.",
    glowGradient: "from-cyan-500/20 via-purple-500/20 to-indigo-500/10",
    lineGradient: "from-cyan-500/60 to-rose-500/40",
    glowColor: "#22d3ee",
    textColor: "text-cyan-400"
  },
  {
    stepNum: "02",
    title: "Cadastre um endpoint",
    description: "Forneça a URL de destino das automações e as credenciais HTTP necessárias.",
    glowGradient: "from-rose-500/20 via-purple-500/20 to-amber-500/10",
    lineGradient: "from-rose-500/60 to-amber-500/40",
    glowColor: "#f43f5e",
    textColor: "text-rose-400"
  },
  {
    stepNum: "03",
    title: "Escolha o intervalo",
    description: "Escreva uma expressão cron ou use nossos helpers visuais simplificados (ex: every:10m).",
    glowGradient: "from-amber-500/20 via-purple-500/20 to-emerald-500/10",
    lineGradient: "from-amber-500/60 to-emerald-500/40",
    glowColor: "#f59e0b",
    textColor: "text-amber-400"
  },
  {
    stepNum: "04",
    title: "Execute e Acompanhe",
    description: "Acompanhe a telemetria, veja logs de tentativas e monitore as estatísticas de latência.",
    glowGradient: "from-emerald-500/20 via-purple-500/20 to-cyan-500/10",
    lineGradient: "from-emerald-500/60 to-cyan-500/40",
    glowColor: "#10b981",
    textColor: "text-emerald-400"
  }
];

export const LoginGate: React.FC = () => {
  // Parse URL on initialization to support reset-password and verify-email routing
  const getInitialResetInfo = () => {
    if (typeof window === 'undefined') return { isResetMode: false, isVerifyMode: false, token: '' };
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    const path = window.location.pathname;
    return {
      isResetMode: !!(tokenFromUrl && path === '/reset-password'),
      isVerifyMode: !!(tokenFromUrl && path === '/verify-email'),
      token: tokenFromUrl || '',
    };
  };

  const initialResetInfo = getInitialResetInfo();

  const [isModalOpen, setIsModalOpen] = useState(initialResetInfo.isResetMode || initialResetInfo.isVerifyMode);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'verify'>(
    initialResetInfo.isVerifyMode ? 'verify' : initialResetInfo.isResetMode ? 'reset' : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj'>('cpf');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupSession, setSignupSession] = useState<{ user: User; token: Token; projects: Project[] } | null>(null);
  const handleInvalid = (e: React.FormEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.validity.valueMissing) {
      target.setCustomValidity('Por favor, preencha este campo.');
    } else if (target.validity.typeMismatch) {
      target.setCustomValidity('Por favor, insira um endereço de e-mail válido.');
    } else {
      target.setCustomValidity('');
    }
  };

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    (e.target as HTMLInputElement).setCustomValidity('');
  };

  // Forgot Password & Reset Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccessMsg, setForgotSuccessMsg] = useState<string | null>(null);
  const [resetToken] = useState(initialResetInfo.token);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email Verification State
  const [signupVerificationRequired, setSignupVerificationRequired] = useState(false);
  const [signupVerificationMessage, setSignupVerificationMessage] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [signupVerificationLink, setSignupVerificationLink] = useState('');
  
  // Resend Verification State
  const [showResendOption, setShowResendOption] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccessMessage, setResendSuccessMessage] = useState('');
  const [resendSuccessLink, setResendSuccessLink] = useState('');
  
  // Interactive Sandbox Tab State
  const [activeSandboxTab, setActiveSandboxTab] = useState<'curl' | 'json' | 'agent'>('curl');
  const [playgroundCopySuccess, setPlaygroundCopySuccess] = useState(false);
  
  // Track hovered step for 3D cascading tilt and flow animations
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  
  // Track hovered step for onboarding flow animations
  const [hoveredOnboardingCard, setHoveredOnboardingCard] = useState<number | null>(null);

  const handleCopyPlaygroundCode = () => {
    const code = activeSandboxTab === 'curl'
      ? `curl -X POST https://cronflow.jangustavo.me/v1/jobs \\\n  -H "Authorization: Bearer cf_live_suaAPIKey" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Sync Vendas", "schedule": "0 8 * * *", "url": "https://api.vendas.com/sync"}'`
      : activeSandboxTab === 'json'
      ? `{\n  "name": "Sincronizador Diário",\n  "schedule": "every:24h",\n  "url": "https://meu-endpoint.com/webhook",\n  "http_method": "POST",\n  "timezone": "America/Sao_Paulo",\n  "tags": ["vendas", "faturamento"]\n}`
      : `👤 Você: crie um job chamado Monitor de Dolar para rodar toda segunda-feira às 12h batendo na URL https://economia.com/api usando o método GET\n🤖 Agente: Executando Tool createJob... Job criado com ID 4a82-f38b com sucesso! 🚀`;

    navigator.clipboard.writeText(code);
    setPlaygroundCopySuccess(true);
    setTimeout(() => setPlaygroundCopySuccess(false), 2000);
  };

  const { login } = useAuthStore();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setShowResendOption(false);
    setResendSuccessMessage('');
    setResendSuccessLink('');

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
        if (axiosError.response.status === 403 && backendError?.toLowerCase().includes('confirme seu e-mail')) {
          setShowResendOption(true);
        }
      } else {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setErrorMsg('Por favor, preencha o e-mail para reenviar a confirmação.');
      return;
    }
    setResendLoading(true);
    setResendSuccessMessage('');
    setResendSuccessLink('');
    setErrorMsg(null);
    try {
      const response = await api.post('/v1/auth/resend-verification', {
        email: email.trim(),
      });
      const { message, link } = response.data;
      setResendSuccessMessage(message || 'E-mail de confirmação reenviado com sucesso!');
      setResendSuccessLink(link || '');
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
      const backendError = axiosError.response?.data?.error || axiosError.response?.data?.reason;
      setErrorMsg(backendError || 'Erro ao reenviar confirmação. Verifique se o e-mail está correto.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDocument = documentType === 'cpf' ? cpf : cnpj;
    if (!email.trim() || !password || !confirmPassword || !projectName.trim() || !fullName.trim() || !selectedDocument.trim()) {
      setErrorMsg('Por favor, preencha todos os campos do cadastro, incluindo a confirmação da senha e o documento.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem. Digite novamente para continuar.');
      return;
    }

    const cleanDocument = selectedDocument.replace(/\D/g, '');
    const expectedLength = documentType === 'cpf' ? 11 : 14;
    if (cleanDocument.length !== expectedLength) {
      setErrorMsg(documentType === 'cpf' ? 'O CPF deve conter 11 dígitos.' : 'O CNPJ deve conter 14 dígitos.');
      return;
    }

    // Validação de nome completo: pelo menos duas partes, sem números, min 6 chars
    const trimmedName = fullName.trim();
    const nameParts = trimmedName.split(/\s+/);
    const nameRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/;

    if (nameParts.length < 2) {
      setErrorMsg("Por favor, insira seu nome e sobrenome.");
      return;
    }

    if (trimmedName.length < 6) {
      setErrorMsg("O nome completo deve ter pelo menos 6 caracteres.");
      return;
    }

    if (!nameRegex.test(trimmedName)) {
      setErrorMsg("O nome contém caracteres inválidos.");
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
        cpf: documentType === 'cpf' ? cleanDocument : '',
        cnpj: documentType === 'cnpj' ? cleanDocument : '',
        document_type: documentType,
      });

      const { token, user, projects, apiKey, requiresVerification, message, link } = response.data;
      if (requiresVerification) {
        setSignupVerificationRequired(true);
        setSignupVerificationMessage(message || 'Por favor, confirme seu e-mail para ativar sua conta.');
        setSignupVerificationLink(link || '');
      } else {
        setGeneratedKey(apiKey);
        setSignupSession({ user, token, projects });
      }
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
      if (axiosError.response) {
        const backendError = axiosError.response.data?.error || axiosError.response.data?.reason;
        setErrorMsg(backendError || `Erro no cadastro: HTTP ${axiosError.response.status}`);
      } else {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg('Por favor, preencha o e-mail.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setForgotSuccessMsg(null);

    try {
      const response = await api.post('/v1/auth/forgot-password', {
        email: forgotEmail.trim(),
      });
      const msg = response.data?.message || 'Link de recuperação enviado!';
      const devLink = response.data?.link;
      setForgotSuccessMsg(msg + (devLink ? ` (Link de desenvolvimento: ${devLink})` : ''));
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
      if (axiosError.response) {
        const backendError = axiosError.response.data?.error || axiosError.response.data?.reason;
        setErrorMsg(backendError || `Erro: HTTP ${axiosError.response.status}`);
      } else {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      setErrorMsg('Por favor, preencha a nova senha e confirme.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }
    if (!resetToken) {
      setErrorMsg('Token de redefinição não encontrado na URL.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setResetSuccessMsg(null);

    try {
      const response = await api.post('/v1/auth/reset-password', {
        token: resetToken,
        newPassword: newPassword,
      });
      const msg = response.data?.message || 'Senha redefinida com sucesso!';
      setResetSuccessMsg(msg);
      setTimeout(() => {
        setResetSuccessMsg(null);
        setNewPassword('');
        setConfirmNewPassword('');
        setShowConfirmPassword(false);
        setActiveTab('login');
        // Clean the URL query params so they don't reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }, 3000);
    } catch (err) {
      console.error(err);
      const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
      if (axiosError.response) {
        const backendError = axiosError.response.data?.error || axiosError.response.data?.reason;
        setErrorMsg(backendError || `Erro: HTTP ${axiosError.response.status}`);
      } else {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger email verification automatically when in verify mode
  useEffect(() => {
    if (activeTab !== 'verify' || !initialResetInfo.token) return;

    const performVerification = async () => {
      setVerificationLoading(true);
      setErrorMsg(null);
      try {
        const response = await api.post('/v1/auth/verify-email', {
          token: initialResetInfo.token,
        });

        // The response format matches AuthResponse
        const { token, user, projects, apiKey } = response.data;
        
        setVerificationSuccess(true);
        if (apiKey) {
          // It was the first activation, show the API Key
          setGeneratedKey(apiKey);
          setSignupSession({ user, token, projects });
        } else {
          // Already verified, log in directly
          login(user, token, projects);
          // Clean the URL query params so they don't reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
      } catch (err) {
        console.error(err);
        const axiosError = err as { response?: { status: number; data?: { error?: string; reason?: string } } };
        if (axiosError.response) {
          const backendError = axiosError.response.data?.error || axiosError.response.data?.reason;
          setErrorMsg(backendError || `Erro na ativação: HTTP ${axiosError.response.status}`);
        } else {
          setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
        }
      } finally {
        setVerificationLoading(false);
      }
    };

    performVerification();
  }, [activeTab, initialResetInfo.token, login]);



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
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold tracking-widest font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              Automações HTTP para produtos que não podem falhar no silêncio
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] font-mono text-slate-100">
              Seus jobs executam.<br />
              Você sabe quando <br className="hidden sm:inline"/>
              <span className="text-gradient-cyber">não executam.</span>
            </h1>

            <p className="text-base font-bold text-slate-350 tracking-wide">
              Chega de falhas silenciosas em tarefas cron e webhooks.
            </p>

            <p className="text-sm sm:text-base text-slate-400 max-w-lg leading-relaxed">
              O CronFlow é o agendador de tarefas developer-first com retries exponenciais automáticos, alertas instantâneos de falha e logs completos para garantir que suas automações nunca quebrem no silêncio.
            </p>

            <div className="grid gap-3 pt-2 select-none sm:grid-cols-3">
              <button
                onClick={() => {
                  setActiveTab('signup');
                  setIsModalOpen(true);
                }}
                className="inline-flex w-full items-center justify-center whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-widest text-white bg-cyan-500 hover:bg-cyan-400 rounded-xl shadow-[0_0_25px_rgba(0,217,255,0.3)] transition-all cursor-pointer hover:-translate-y-0.5 duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                Começar grátis ⚡
              </button>
              <button
                onClick={() => setIsSimulationOpen(true)}
                className="inline-flex w-full items-center justify-center whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/10 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
              >
                Ver simulador
              </button>
              <a
                href="https://github.com/JanGustavo/Cron"
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/20 rounded-xl transition-all cursor-pointer hover:-translate-y-0.5 duration-200"
              >
                <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub Repo</span>
              </a>
            </div>

            {/* Dogfooding Callout */}
            <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-slate-300 text-xs font-sans space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-[11px]">
                <span>⚡ Testado na prática (Dogfooding)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Desenvolvido e usado em produção para monitorar tarefas de segundo plano e sincronizações do <strong>PromoPulse</strong>. Nenhuma automação falha no silêncio.
              </p>
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
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed">
            Diferente de agendadores silenciosos, o CronFlow foi projetado para lidar com instabilidades na rede e falhas de serviços de forma resiliente.
          </p>
        </div>

        <div className="relative">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            {LIFECYCLE_STEPS.map((step, index) => {
              const isHovered = hoveredCard === index;
              const isNextHovered = hoveredCard !== null && hoveredCard + 1 === index;
              
              // Clean 2D translation and scale (No 3D distortion, keeping text crisp)
              let transformStyle = 'translateY(0) translateX(0) scale(1)';
              if (isHovered) {
                // Hovered card lifts up and shifts slightly right
                transformStyle = 'translateY(-6px) translateX(4px) scale(1.03)';
              } else if (isNextHovered) {
                // The subsequent card responds to the hover flow, shifting right to show push direction
                transformStyle = 'translateY(0) translateX(10px) scale(1.01)';
              }

              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    transform: transformStyle,
                    transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease, box-shadow 0.3s ease',
                  }}
                  className={`group relative p-6 rounded-3xl bg-[#0a0d1d]/40 border transition-all duration-300 select-none ${
                    isHovered
                      ? 'border-indigo-500/30 shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-20'
                      : isNextHovered
                      ? 'border-indigo-500/15 shadow-[0_10px_20px_rgba(0,0,0,0.4)] z-10'
                      : 'border-indigo-950/50 hover:border-indigo-500/20 z-0'
                  }`}
                >
                  {/* Multi-colored blurred glow behind the card on hover */}
                  <div
                    className={`absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r ${step.glowGradient} blur-2xl transition-all duration-500 pointer-events-none ${
                      isHovered ? 'opacity-100 scale-[1.08]' : isNextHovered ? 'opacity-40 scale-[1.04]' : 'opacity-0'
                    }`}
                  />
                  
                  {/* Connector Line to next card (only on desktop and for steps 1-3) */}
                  {index < 3 && (
                    <div
                      style={{
                        width: isHovered ? '26px' : '20px',
                      }}
                      className={`hidden md:block absolute top-[28px] left-[calc(100%+2px)] h-[2px] transition-all duration-300 pointer-events-none ${
                        isHovered
                          ? `bg-gradient-to-r ${step.lineGradient} opacity-90 shadow-[0_0_8px_${step.glowColor}] h-[3px] z-30`
                          : isNextHovered
                          ? `bg-indigo-950/40 opacity-40`
                          : 'bg-indigo-950/20 opacity-20'
                      }`}
                    />
                  )}

                  <div className="mb-3 flex items-start justify-between gap-3 relative z-10">
                    <div className="text-xs font-black text-slate-200 font-mono leading-tight pr-2">{step.title}</div>
                    <span className={`inline-flex min-h-6 min-w-[68px] shrink-0 items-center justify-center rounded border px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-center leading-none sm:min-w-[72px] sm:text-[9px] ${step.badgeClass}`}>
                      {step.stepText}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-sans relative z-10">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 💎 KEY DIFFERENTIATORS SECTION */}
      <section className="py-20 bg-[#080a14]/60 border-t border-b border-indigo-950/30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-4 mb-16">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono font-bold">Diferencial Operacional</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Não basta executar. É preciso confiar na execução.</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Entenda como construímos uma camada de resiliência e segurança robusta para automações recorrentes.
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
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-xs font-black text-slate-200 block font-mono relative z-10">Desenvolvedores</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans relative z-10">
              Substitua de forma limpa os crontabs espalhados por servidores e scripts bash sem logs ou observabilidade.
            </p>
          </div>

          {/* SaaS */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-rose-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-xs font-black text-slate-200 block font-mono relative z-10">SaaS Pequenos</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans relative z-10">
              Garanta a execução estável de sincronizações recorrentes de dados, relatórios PDF pesados e envios de newsletters.
            </p>
          </div>

          {/* Integrators */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-xs font-black text-slate-200 block font-mono relative z-10">Times de Integração</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans relative z-10">
              Centralize webhooks de terceiros, controle retries exponenciais de parceiros e inspecione logs HTTP centralizados.
            </p>
          </div>

          {/* AI Agents */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-xs font-black text-slate-200 block font-mono relative z-10">Agentes de IA</span>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans relative z-10">
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
          {ONBOARDING_STEPS.map((step, index) => {
            const isHovered = hoveredOnboardingCard === index;
            const isNextHovered = hoveredOnboardingCard !== null && hoveredOnboardingCard + 1 === index;
            
            // Clean 2D translation and scale (No 3D distortion, keeping text crisp)
            let transformStyle = 'translateY(0) translateX(0) scale(1)';
            if (isHovered) {
              // Hovered card lifts up and shifts slightly right
              transformStyle = 'translateY(-6px) translateX(4px) scale(1.03)';
            } else if (isNextHovered) {
              // The subsequent card responds to the hover flow, shifting right to show push direction
              transformStyle = 'translateY(0) translateX(10px) scale(1.01)';
            }

            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredOnboardingCard(index)}
                onMouseLeave={() => setHoveredOnboardingCard(null)}
                style={{
                  transform: transformStyle,
                  transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), border-color 0.3s ease, box-shadow 0.3s ease',
                }}
                className={`group relative p-6 rounded-3xl bg-[#0a0d1d]/50 border transition-all duration-300 select-none ${
                  isHovered
                    ? 'border-indigo-500/30 shadow-[0_20px_40px_rgba(0,0,0,0.6)] z-20'
                    : isNextHovered
                    ? 'border-indigo-500/15 shadow-[0_10px_20px_rgba(0,0,0,0.4)] z-10'
                    : 'border-indigo-950/50 hover:border-indigo-500/20 z-0'
                }`}
              >
                {/* Multi-colored blurred glow behind the card on hover */}
                <div
                  className={`absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r ${step.glowGradient} blur-2xl transition-all duration-500 pointer-events-none ${
                    isHovered ? 'opacity-100 scale-[1.08]' : isNextHovered ? 'opacity-40 scale-[1.04]' : 'opacity-0'
                  }`}
                />
                
                {/* Connector Line to next card (only on large desktop and for steps 1-3) */}
                {index < 3 && (
                  <div
                    style={{
                      width: isHovered ? '26px' : '20px',
                    }}
                    className={`hidden lg:block absolute top-[28px] left-[calc(100%+2px)] h-[2px] transition-all duration-300 pointer-events-none ${
                      isHovered
                        ? `bg-gradient-to-r ${step.lineGradient} opacity-90 shadow-[0_0_8px_${step.glowColor}] h-[3px] z-30`
                        : isNextHovered
                        ? `bg-indigo-950/40 opacity-40`
                        : 'bg-indigo-950/20 opacity-20'
                    }`}
                  />
                )}

                <div className={`text-3xl font-black font-mono mb-2 transition-colors duration-300 ${
                  isHovered ? step.textColor : 'text-indigo-550/30'
                }`}>
                  {step.stepNum}
                </div>
                <span className="text-xs font-black text-slate-200 block font-mono relative z-10">{step.title}</span>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1 font-sans relative z-10">
                  {step.description}
                </p>
              </div>
            );
          })}
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
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 flex flex-col justify-between min-h-[180px] hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <div className="space-y-3 relative z-10">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">API REST</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">1. API (cmd/api)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Escrita em Go usando Chi Router, cuida da autenticação por chaves API em hashes timing-safe. Focada em baixíssima latência nas requisições do SDK.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2 relative z-10">
              Tradução: <span className="text-indigo-400">Escala de requisições sem lentidão.</span>
            </div>
          </div>

          {/* Scheduler */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 flex flex-col justify-between min-h-[180px] hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <div className="space-y-3 relative z-10">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">SCHEDULER</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">2. Scheduler (cmd/scheduler)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Processo em loop isolado que lê tarefas prontas. Resolve as timezones e distribui o lock com locks exclusivos de Redis para evitar dupla execução.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2 relative z-10">
              Tradução: <span className="text-indigo-400">Agendamentos não ficam presos à API.</span>
            </div>
          </div>

          {/* Worker */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 flex flex-col justify-between min-h-[180px] hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <div className="space-y-3 relative z-10">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">WORKER</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">3. Worker (cmd/worker)</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Executa requisições de forma concorrente em Goroutines através de filas Asynq. Gerencia limites de concorrência por plano e fila.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2 relative z-10">
              Tradução: <span className="text-indigo-400">Concorrência controlada e fila resiliente.</span>
            </div>
          </div>

          {/* Lock/Logs */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/85 border border-indigo-950/50 flex flex-col justify-between min-h-[180px] hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <div className="space-y-3 relative z-10">
              <span className="inline-flex min-h-6 min-w-[96px] items-center justify-center rounded border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider text-cyan-400 text-center leading-none sm:min-w-[104px] sm:text-[9px]">TELEMETRIA</span>
              <div className="text-xs font-black text-slate-200 font-mono leading-tight">4. Logs de Tentativas</div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Persistência de logs imutáveis e estatísticas detalhadas de cada tentativa de execução no Postgres para auditoria.
              </p>
            </div>
            <div className="text-[9px] text-slate-500 font-mono pt-3 border-t border-indigo-950/30 mt-2 relative z-10">
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
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-3 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-sm font-bold text-slate-200 block font-mono relative z-10">Proteção Anti-SSRF activa</span>
            <p className="text-xs text-slate-400 leading-relaxed relative z-10">
              O CronFlow valida ativamente todos os endereços IP de destino e redirecionamentos contra faixas de redes privadas internas (como localhost, 127.0.0.1, 10.0.0.0/8). Impedimos escaneamentos maliciosos na sua rede interna.
            </p>
            <div className="pt-2 relative z-10">
              <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>

          {/* Card 2: Assinaturas HMAC */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-3 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-sm font-bold text-slate-200 block font-mono relative z-10">Webhooks com Assinatura HMAC-SHA256</span>
            <p className="text-xs text-slate-400 leading-relaxed relative z-10">
              Todas as notificações contêm uma assinatura criptográfica no cabeçalho baseada em chaves geradas por projeto. Seus servidores receptores podem validar a autenticidade das mensagens, mitigando ataques de spoofing.
            </p>
            <div className="pt-2 relative z-10">
              <a href="https://github.com/JanGustavo/Cron/blob/master/README_WEBHOOKS.md" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>

          {/* Card 3: Chaves de API Revogáveis */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-3 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-sm font-bold text-slate-200 block font-mono relative z-10">Chaves de API Revogáveis & Isoladas</span>
            <p className="text-xs text-slate-400 leading-relaxed relative z-10">
              Gere chaves de API exclusivas com escopo restrito para cada workspace. Em caso de comprometimento, revogue ou rotacione suas chaves instantaneamente pelo painel, sem interromper as outras rotinas da sua organização.
            </p>
            <div className="pt-2 relative z-10">
              <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>

          {/* Card 4: Validação de Redirecionamentos */}
          <div className="group relative p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-3 hover:border-indigo-500/25 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.015] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500 pointer-events-none scale-105" />
            <span className="text-sm font-bold text-slate-200 block font-mono relative z-10">Validação de Redirecionamento (Redirects)</span>
            <p className="text-xs text-slate-400 leading-relaxed relative z-10">
              O pipeline do Worker segue as diretrizes HTTP de redirecionamento com validação estrita de segurança. Impedimos redirecionamentos abertos e forçamos o protocolo HTTPS seguro nas transições para proteger chaves e tokens de autenticação.
            </p>
            <div className="pt-2 relative z-10">
              <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-[10px] uppercase font-bold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:outline-none focus-visible:underline">
                Ver documentação →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ❓ FAQ SECTION (SEO & USER GUIDE) */}
      <section id="faq" className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left scroll-mt-10">
        <div className="space-y-4 mb-12 text-center">
          <span className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 font-mono">Dúvidas Frequentes</span>
          <h2 className="text-3xl font-black tracking-wide font-mono text-slate-100">Perguntas Frequentes sobre Agendamento e Cron Jobs</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Entenda como o CronFlow funciona como um Cron Job & Webhook Scheduler as a Service confiável.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2">
            <h3 className="text-sm font-bold text-slate-200 font-mono">O que é um Cron Job as a Service?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              É um serviço em nuvem que substitui a necessidade de manter crontabs locais em servidores. O CronFlow dispara requisições HTTP/HTTPS agendadas diretamente para a sua API com retentativas e monitoramento.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2">
            <h3 className="text-sm font-bold text-slate-200 font-mono">Como funcionam as retentativas automáticas (retries)?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Caso seu servidor responda com erro HTTP (5xx) ou sofra um timeout, o Worker do CronFlow re-executa a requisição (totalizando até 3 tentativas de execução) utilizando atrasos (backoff) de 10s a 20s para suavizar picos de instabilidade.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2">
            <h3 className="text-sm font-bold text-slate-200 font-mono">Como é feita a proteção anti-SSRF?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O CronFlow valida IPs de destino e redirecionamentos para impedir requisições maliciosas a faixas de rede privada interna (como localhost, 127.0.0.1 ou redes RFC 1918).
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0a0d1d]/35 border border-indigo-950/40 space-y-2">
            <h3 className="text-sm font-bold text-slate-200 font-mono">Posso usar expressões cron tradicionais?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sim! Aceitamos expressões cron padrão de 5 campos (ex: <code className="text-cyan-400 font-mono">0 * * * *</code>), além de atalhos simplificados como <code className="text-cyan-400 font-mono">every:10m</code> ou <code className="text-cyan-400 font-mono">every:1h</code>.
            </p>
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
          <div className="flex bg-[#070913]/90 border-b border-indigo-950/40 p-2 gap-1.5 select-none justify-between items-center">
            <div className="flex gap-1.5">
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

            {/* Copy button */}
            <button
              onClick={handleCopyPlaygroundCode}
              aria-label="Copiar código do sandbox"
              className={`px-3 py-1.5 rounded-xl border text-[10px] uppercase font-bold flex items-center gap-1.5 transition-all duration-200 cursor-pointer mr-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 ${
                playgroundCopySuccess
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 border-indigo-950 hover:text-slate-200 hover:border-cyan-500/20'
              }`}
            >
              {playgroundCopySuccess ? (
                <>
                  <span>✓</span>
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Code output area */}
          <div className="p-5 md:p-7 bg-[#070913]/60 min-h-[160px] flex items-center justify-between text-indigo-300 overflow-x-auto select-all">
            {activeSandboxTab === 'curl' && (
              <pre className="whitespace-pre-wrap leading-relaxed w-full font-mono">
                <code>
<span className="text-slate-500"># Dispara uma rota de sync todo dia às 8h da manhã</span>
<br />
curl -X POST https://cronflow.jangustavo.me/v1/jobs \
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
          <span>© 2026 CronFlow • Todos os direitos reservados. Plataforma de Automação & Resiliência HTTP.</span>
        </div>
      </footer>

      {/* 🔑 GLOWING LOGIN/SIGNUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
          
          <div className="relative grid w-full max-w-md lg:max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-indigo-500/30 bg-[#0a0d1d]/95 shadow-[0_0_50px_rgba(0,217,255,0.2)] animate-in zoom-in-95 duration-200 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.75fr)]">
            <div className="pointer-events-none absolute top-0 inset-x-12 z-10 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
            
            {/* Oculta o banner esquerdo em telas menores que lg para liberar espaço no mobile */}
            <div className="hidden lg:block">
              <AuthProductPanel
                onCreateAccount={() => {
                  setActiveTab('signup');
                  setErrorMsg(null);
                }}
                onExplore={() => {
                  setIsModalOpen(false);
                  scrollToSection('failure-lifecycle');
                }}
              />
            </div>

            <div className="relative min-w-0 p-6 md:p-8 max-h-[90vh] overflow-y-auto lg:flex lg:flex-col lg:justify-center">
            
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
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                  {activeTab === 'login'
                    ? authCopy.login.eyebrow
                    : activeTab === 'signup'
                    ? authCopy.signup.eyebrow
                    : activeTab === 'forgot'
                    ? authCopy.forgotPassword.eyebrow
                    : activeTab === 'reset'
                    ? authCopy.resetPassword.eyebrow
                    : 'Ativação'}
                </p>
                <h3 className="text-lg font-black text-slate-100 tracking-tight font-mono">
                  {activeTab === 'login'
                    ? authCopy.login.title
                    : activeTab === 'signup'
                    ? authCopy.signup.title
                    : activeTab === 'forgot'
                    ? authCopy.forgotPassword.title
                    : activeTab === 'reset'
                    ? authCopy.resetPassword.title
                    : 'Verificando seu e-mail'}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-500">
                  {activeTab === 'login'
                    ? authCopy.login.description
                    : activeTab === 'signup'
                    ? authCopy.signup.description
                    : activeTab === 'forgot'
                    ? authCopy.forgotPassword.description
                    : activeTab === 'reset'
                    ? authCopy.resetPassword.description
                    : 'Por favor, aguarde enquanto ativamos o seu workspace.'}
                </p>
              </div>
            )}

            {/* Tabs Selector */}
            {!generatedKey && (activeTab === 'login' || activeTab === 'signup') && (
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
                    onInvalid={handleInvalid}
                    onInput={handleInput}
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
                      onInvalid={handleInvalid}
                      onInput={handleInput}
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
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('forgot');
                        setErrorMsg(null);
                        setForgotSuccessMsg(null);
                      }}
                      className="text-[10px] text-slate-400 hover:text-cyan-400 transition-colors font-mono uppercase tracking-wider cursor-pointer focus-visible:outline-none focus-visible:text-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-500/20"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium select-text animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
                    <svg className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                {showResendOption && (
                  <div className="p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-2xl space-y-3 animate-in slide-in-from-bottom-2 duration-300">
                    <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                      Não recebeu o e-mail de ativação ou deseja reenviar? Clique no botão abaixo:
                    </p>
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={handleResendVerification}
                      className="w-full py-2.5 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/45 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none"
                    >
                      {resendLoading ? 'Reenviando...' : '📩 Reenviar E-mail de Confirmação'}
                    </button>
                  </div>
                )}

                {resendSuccessMessage && (
                  <div className="space-y-4 font-sans animate-in fade-in duration-300">
                    <div className="flex items-start gap-3.5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                      <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider font-mono">Sucesso!</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{resendSuccessMessage}</p>
                      </div>
                    </div>

                    {resendSuccessLink && (
                      <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl space-y-3 shadow-inner">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider font-mono">Modo Desenvolvimento</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                          Use o atalho abaixo para ativar a conta imediatamente sem abrir o e-mail:
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = resendSuccessLink;
                          }}
                          className="w-full py-2.5 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/45 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none"
                        >
                          ⚡ Simular Clique de Ativação
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Entrando...' : authCopy.login.submit}
                </button>
              </form>
            ) : activeTab === 'signup' ? (
              signupVerificationRequired ? (
                <div className="space-y-5 animate-in zoom-in-95 duration-300 text-left font-sans">
                  {/* Clean, premium success card */}
                  <div className="flex items-start gap-3.5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <svg className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider font-mono">Sucesso!</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{signupVerificationMessage}</p>
                    </div>
                  </div>

                  {/* Dedicated developer helper section */}
                  {signupVerificationLink && (
                    <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-2xl space-y-3 shadow-inner">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                        <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider font-mono">Modo Desenvolvimento</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Como você está testando localmente, utilize o atalho abaixo para simular o clique e ativar a conta imediatamente:
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.href = signupVerificationLink;
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/45 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none"
                      >
                        ⚡ Simular Clique de Ativação
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setSignupVerificationRequired(false);
                      setSignupVerificationMessage('');
                      setSignupVerificationLink('');
                      setErrorMsg(null);
                    }}
                    className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                  >
                    Ir para o Login
                  </button>
                </div>
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
                    onInvalid={handleInvalid}
                    onInput={handleInput}
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
                      onInvalid={handleInvalid}
                      onInput={handleInput}
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
                  {password && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500">Força da senha:</span>
                        <span className={`font-bold ${getPasswordStrength(password).textColor}`}>
                          {getPasswordStrength(password).label}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-indigo-950/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(password).color}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 font-medium">
                        {[
                          { label: '8+ caracteres', isValid: getPasswordStrength(password).checks.length },
                          { label: 'Maiúscula', isValid: getPasswordStrength(password).checks.uppercase },
                          { label: 'Minúscula', isValid: getPasswordStrength(password).checks.lowercase },
                          { label: 'Número', isValid: getPasswordStrength(password).checks.number },
                          { label: 'Símbolo', isValid: getPasswordStrength(password).checks.special },
                        ].map((rule) => (
                          <div key={rule.label} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${rule.isValid ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-slate-700/70 bg-slate-900/40 text-slate-500'}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${rule.isValid ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            {rule.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repita sua senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                      disabled={loading}
                      required
                      onInvalid={handleInvalid}
                      onInput={handleInput}
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
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-rose-400 font-medium">As senhas não coincidem.</p>
                  )}
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
                    onInvalid={handleInvalid}
                    onInput={handleInput}
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
                    onInvalid={handleInvalid}
                    onInput={handleInput}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Tipo de Documento
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDocumentType('cpf')}
                      className={`flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${documentType === 'cpf' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-indigo-950/60 bg-[#070913]/90 text-slate-400 hover:text-slate-200'}`}
                    >
                      CPF
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentType('cnpj')}
                      className={`flex-1 rounded-xl border px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all ${documentType === 'cnpj' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-indigo-950/60 bg-[#070913]/90 text-slate-400 hover:text-slate-200'}`}
                    >
                      CNPJ
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    {documentType === 'cpf' ? 'CPF (Apenas números)' : 'CNPJ (Apenas números)'}
                  </label>
                  <input
                    type="text"
                    placeholder={documentType === 'cpf' ? '12345678909' : '11222333000181'}
                    maxLength={documentType === 'cpf' ? 11 : 14}
                    value={documentType === 'cpf' ? cpf : cnpj}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      if (documentType === 'cpf') {
                        setCpf(digits.slice(0, 11));
                      } else {
                        setCnpj(digits.slice(0, 14));
                      }
                    }}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                    disabled={loading}
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium select-text animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
                    <svg className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? 'Criando workspace...' : authCopy.signup.submit}
                </button>
                <p className="text-[10px] text-slate-500 text-center leading-relaxed pt-2">
                  Ao criar o workspace, você concorda com os nossos{' '}
                  <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-cyan-400 underline transition-colors">Termos de Serviço</a>{' '}
                  e{' '}
                  <a href="https://github.com/JanGustavo/Cron" target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-cyan-400 underline transition-colors">Política de Privacidade</a>.
                </p>
              </form>
            )
          ) : activeTab === 'forgot' ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-5 text-left animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    E-mail do Desenvolvedor
                  </label>
                  <input
                    type="email"
                    placeholder="dev@empresa.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                    disabled={loading}
                    required
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium select-text animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
                    <svg className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                {forgotSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 font-semibold space-y-2 select-text">
                    <p>{forgotSuccessMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : authCopy.forgotPassword.submit}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                    setForgotSuccessMsg(null);
                  }}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 font-semibold cursor-pointer uppercase tracking-wider font-mono mt-4 block focus-visible:outline-none focus-visible:text-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-500/20 py-1.5"
                >
                  Voltar para o Login
                </button>
              </form>
            ) : activeTab === 'reset' ? (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-5 text-left animate-in fade-in duration-300">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  {newPassword && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-500">Força da senha:</span>
                        <span className={`font-bold ${getPasswordStrength(newPassword).textColor}`}>
                          {getPasswordStrength(newPassword).label}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-indigo-950/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${getPasswordStrength(newPassword).color}`} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 font-medium">
                        {[
                          { label: '8+ caracteres', isValid: getPasswordStrength(newPassword).checks.length },
                          { label: 'Maiúscula', isValid: getPasswordStrength(newPassword).checks.uppercase },
                          { label: 'Minúscula', isValid: getPasswordStrength(newPassword).checks.lowercase },
                          { label: 'Número', isValid: getPasswordStrength(newPassword).checks.number },
                          { label: 'Símbolo', isValid: getPasswordStrength(newPassword).checks.special },
                        ].map((rule) => (
                          <div key={rule.label} className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 ${rule.isValid ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-slate-700/70 bg-slate-900/40 text-slate-500'}`}>
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${rule.isValid ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            {rule.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Confirme a Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      aria-label="Alternar visibilidade da senha"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 focus:outline-none focus:text-cyan-400 transition-colors"
                    >
                      {showConfirmPassword ? (
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
                  {confirmNewPassword && newPassword !== confirmNewPassword && (
                    <p className="text-[10px] text-rose-400 font-medium">As senhas não coincidem.</p>
                  )}
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium select-text animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
                    <svg className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="leading-relaxed">{errorMsg}</span>
                  </div>
                )}

                {resetSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-400 font-semibold select-text">
                    ✅ {resetSuccessMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 disabled:opacity-50"
                >
                  {loading ? 'Redefinindo...' : authCopy.resetPassword.submit}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                    setResetSuccessMsg(null);
                    const newUrl = window.location.pathname;
                    window.history.replaceState({}, document.title, newUrl);
                  }}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-slate-400 font-semibold cursor-pointer uppercase tracking-wider font-mono mt-4 block focus-visible:outline-none focus-visible:text-cyan-400 focus-visible:ring-1 focus-visible:ring-cyan-500/20 py-1.5"
                >
                  Cancelar e Voltar ao Login
                </button>
              </form>
            ) : activeTab === 'verify' ? (
              <div className="space-y-6 text-left animate-in fade-in duration-300 font-sans">
                {verificationLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-mono animate-pulse">Ativando sua conta e workspace...</p>
                  </div>
                ) : errorMsg ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 font-medium select-text animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
                      <svg className="w-4.5 h-4.5 shrink-0 text-rose-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="leading-relaxed">{errorMsg}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrorMsg(null);
                        const newUrl = window.location.pathname;
                        window.history.replaceState({}, document.title, newUrl);
                      }}
                      className="w-full py-3.5 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                    >
                      Ir para o Login
                    </button>
                  </div>
                ) : verificationSuccess ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider font-mono">Conta Ativada!</span>
                    <p className="text-xs text-slate-300">Seu e-mail foi verificado com sucesso. Preparando o seu painel...</p>
                  </div>
                ) : null}
              </div>
            ) : null}
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
            <div className="flex-1 bg-[#060812] border border-indigo-950/60 rounded-2xl p-3 md:p-5 min-h-[300px] text-[10px] md:text-xs space-y-2.5 overflow-y-auto select-all text-left">
              <div className="text-[10px] text-amber-500/80 mb-3 bg-amber-950/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center gap-2 select-none font-mono">
                <span>⚠️</span>
                <span><strong>Simulação:</strong> Nenhum webhook real será enviado para o destino nesta demonstração.</span>
              </div>
              {simulationStep >= 1 && (
                <div className="text-cyan-400 animate-in fade-in duration-300">
                  📡 [08:00:00.000] scheduler: Dispatching job-9a1b (Sync Vendas) on schedule "0 8 * * *"
                </div>
              )}
              {simulationStep >= 2 && (
                <div className="text-indigo-300 animate-in fade-in duration-300">
                  ⚡ [08:00:00.045] worker: Acquired distributed Redis lock. Task ID: tsk_e891b.
                </div>
              )}
              {simulationStep >= 3 && (
                <div className="text-slate-300 animate-in fade-in duration-300">
                  🔄 [08:00:00.052] worker: Dispatching HTTP POST webhook to https://api.vendas.com/sync...
                </div>
              )}
              {simulationStep >= 4 && (
                <div className="text-rose-400 font-semibold animate-in fade-in duration-300 space-y-1">
                  <div>⚠️ [08:00:10.055] worker: HTTP TIMEOUT (10s limit exceeded).</div>
                  <div className="pl-6 text-[9px] md:text-[11px] text-rose-500/80">
                    → Enqueuing job for Retry 1/2 (10s backoff). Status: FAIL_TEMPORARY
                  </div>
                </div>
              )}
              {simulationStep >= 5 && (
                <div className="text-amber-400 animate-in fade-in duration-300 space-y-1">
                  <div>🔄 [08:00:20.060] worker: Backoff expired. Executing Retry 1/2...</div>
                  <div className="pl-6 text-[9px] md:text-[11px] text-amber-500/80">
                    → Sending HTTP POST webhook (signed with project HMAC-SHA256)
                  </div>
                </div>
              )}
              {simulationStep >= 6 && (
                <div className="text-emerald-400 font-bold animate-in fade-in duration-300 space-y-1">
                  <div>✅ [08:00:20.245] worker: HTTP Status 200 OK! Latency: 185ms.</div>
                  <div className="pl-6 text-[9px] md:text-[11px] text-emerald-500/80">
                    → DB updated (1 retry required). Distributed Redis lock released.
                  </div>
                  <div className="pl-6 text-[9px] md:text-[11px] text-emerald-500/80">
                    → Telemetry and notifications dispatched successfully. Recovery complete.
                  </div>
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
