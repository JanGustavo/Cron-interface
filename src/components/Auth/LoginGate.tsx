import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import api from '../../services/api';

export const LoginGate: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { login } = useAuthStore();
  const { toggleTheme, theme } = useUiStore();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setErrorMsg('Por favor, informe a Chave de API.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Temporarily set token in localstorage so api interceptor reads it
      localStorage.setItem('cf_token', apiKey.trim());
      
      // Test credentials with list request
      const response = await api.get('/v1/jobs');
      
      // If success, get project ID from the first job or use a default one
      const jobs = response.data || [];
      const extractedProjectId = jobs[0]?.projectId || '0fe9fb93-3fa0-44b6-b5d8-a5c5b62148a1';

      const mockUser = {
        id: 'user-admin',
        email: 'admin@cronflow.sh',
        createdAt: new Date().toISOString(),
      };

      const mockToken = {
        accessToken: apiKey.trim(),
        refreshToken: '',
        tokenType: 'Bearer',
        expiresIn: 86400,
      };

      const mockProjects = [
        {
          id: extractedProjectId,
          userId: 'user-admin',
          name: 'Projeto Principal',
          createdAt: new Date().toISOString(),
        },
      ];

      // Formally login in the auth store
      login(mockUser, mockToken, mockProjects);
    } catch (err) {
      localStorage.removeItem('cf_token');
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
          
          <form onSubmit={handleConnect} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                Chave de API do Projeto (Bearer)
              </label>
              
              <div className="relative group">
                <input
                  type="password"
                  placeholder="cf_live_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full px-4 py-3 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all duration-300 font-mono"
                  disabled={loading}
                />
              </div>
              
              <div className="text-[10px] text-slate-500 flex justify-between pt-1">
                <span>Sugestão de teste local:</span>
                <button
                  type="button"
                  onClick={() => setApiKey('cf_live_test_key')}
                  className="text-cyan-400 font-bold hover:underline font-mono"
                  disabled={loading}
                >
                  cf_live_test_key
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
              className={`w-full py-3.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg neon-glow-primary flex items-center justify-center gap-2 ${
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
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-600 font-medium">
          CronFlow Schedulers & Workers v1.0.0 (MVP) • Go / Postgres / Redis
        </p>
      </div>
    </div>
  );
};
