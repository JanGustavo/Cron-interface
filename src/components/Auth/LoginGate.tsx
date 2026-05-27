import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import api from '../../services/api';

export const LoginGate: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-[#070913] flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Background Neon Blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#ff006e]/5 rounded-full blur-3xl" />

      {/* Floating Header Actions */}
      <div className="absolute top-6 right-6">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/30 border border-indigo-950/40 transition-colors"
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M16.24 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Brand / Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-950/40 border border-cyan-500/30 shadow-[0_0_20px_rgba(0,217,255,0.2)] mb-2">
            <svg className="w-9 h-9 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-widest text-gradient-cyber uppercase font-mono">
            CronFlow
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Autenticação micro-SaaS de alta performance. Conecte sua chave para gerenciar tarefas recorrentes.
          </p>
        </div>

        {/* Credentials Form Box */}
        <div className="p-6 md:p-8 rounded-3xl glass-panel border border-indigo-950/40 shadow-2xl relative">
          <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
          
          {/* Tabs Selector */}
          {!generatedKey && (
            <div className="flex border-b border-indigo-950/20 mb-6">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                }}
                className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  activeTab === 'login'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Conectar Chave
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
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>
          )}

          {generatedKey ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Sucesso!</span>
                <p className="text-xs text-slate-300">Sua Chave de API segura foi gerada e está pronta.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                  Sua Chave de API (cf_live_...)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedKey}
                    className="flex-1 px-3.5 py-2.5 bg-[#070913]/90 border border-indigo-950/60 rounded-xl font-mono text-xs text-indigo-400 focus:outline-none select-all"
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

              <div className="p-4 bg-[#0a0d1d]/80 border border-indigo-950/40 rounded-2xl space-y-3 text-left">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">Banco de dados local</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
                  Para rodar requisições localmente no backend em Go, insira o hash SHA-256 desta chave na tabela <code>api_keys</code> vinculada a um usuário e projeto. Veja instruções detalhadas de SQL e seeds no nosso manual de desenvolvimento (README.md).
                </p>
              </div>

              <button
                onClick={handleConnectWithGeneratedKey}
                className="w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer"
              >
                Conectar e Acessar o Dashboard ⚡
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
                Voltar para o cadastro
              </button>
            </div>
          ) : activeTab === 'login' ? (
            <form onSubmit={handleConnect} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                  E-mail do Desenvolvedor
                </label>
                <input
                  type="email"
                  placeholder="junior@empresa.com"
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
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.204.214-2.357.606-3.427m3.2 6.427a4 4 0 116.388 3.25M15 12a3 3 0 00-3-3"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-semibold text-center select-text">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Conectando no Servidor...
                  </>
                ) : (
                  'Entrar no Painel ⚡'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-5 animate-in fade-in duration-300">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                  E-mail do Desenvolvedor
                </label>
                <input
                  type="email"
                  placeholder="junior@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                  Senha de Acesso (Nova Conta)
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
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.204.214-2.357.606-3.427m3.2 6.427a4 4 0 116.388 3.25M15 12a3 3 0 00-3-3"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
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
                  placeholder="Meu Sistema SaaS"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300"
                  disabled={loading}
                  required
                />
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 font-semibold text-center">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 rounded-xl text-xs font-bold text-white bg-[#ff006e] hover:bg-[#d90368] transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 cursor-pointer ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Cadastrando Conta...
                  </>
                ) : (
                  'Criar Conta e Acessar 🚀'
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-600 font-medium">
          CronFlow Schedulers & Workers v1.0.0-stable • Go / Postgres / Redis
        </p>
      </div>
    </div>
  );
};
