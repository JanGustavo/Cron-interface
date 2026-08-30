import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Atualiza o estado para que o próximo render mostre a UI alternativa.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro crítico capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070913] flex flex-col justify-center items-center p-6 select-none font-mono text-left">
          {/* Neon Glow background elements */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />

          <div className="w-full max-w-xl rounded-2xl border border-rose-500/30 bg-[#0a0d1d]/90 p-6 md:p-8 shadow-[0_0_50px_rgba(244,63,94,0.15)] z-10 space-y-6">
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-rose-500 to-amber-500 rounded-t-2xl" />
            
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b border-rose-950/20 pb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-400">
                <svg className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">Erro de Execução Detectado</h2>
                <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-0.5">Crash de Renderização React</p>
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Desculpe o transtorno. O painel do CronFlow encontrou um erro crítico e não pôde continuar a renderização. Isso pode ser causado por dados expirados no cache ou um comportamento inesperado da interface.
              </p>
            </div>

            {/* Error Detail Box */}
            {this.state.error && (
              <div className="rounded-xl border border-rose-950/30 bg-[#04060f]/80 p-4 space-y-2 select-text">
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest font-mono">Mensagem do Sistema:</p>
                <p className="text-xs text-slate-200 font-mono break-all">{this.state.error.message}</p>
                {this.state.errorInfo && (
                  <details className="mt-2 text-[9px] text-slate-500">
                    <summary className="cursor-pointer hover:text-slate-350 focus:outline-none transition-colors select-none font-bold uppercase">Ver Stack Trace</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40 custom-scrollbar font-mono text-slate-600 bg-black/40 p-2 rounded border border-slate-900 select-all">
                      {this.state.error.stack}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-md shadow-rose-650/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                🔄 Tentar Recarregar
              </button>
              <button
                onClick={this.handleResetSession}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700/50 transition-all cursor-pointer"
              >
                🧹 Limpar Sessão e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
