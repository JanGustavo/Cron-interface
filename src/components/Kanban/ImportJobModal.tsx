import React, { useState } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';

const EXAMPLE_JSON = `{
  "name": "Monitor PromoPulse",
  "schedule": "every:1m",
  "timezone": "America/Sao_Paulo",
  "url": "https://jangustavo.me/apis/promopulse/",
  "httpMethod": "GET",
  "headers": {
    "Content-Type": "application/json"
  },
  "payload": {
    "status": "ping"
  },
  "webhookAlertUrl": "https://ntfy.sh/monitor-promopulse-jangustavo"
}`;

export const ImportJobModal: React.FC = () => {
  const { addJob } = useJobsStore();
  const { isImportModalOpen, setImportModalOpen, showToast } = useUiStore();
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isImportModalOpen) return null;

  const handleClose = () => {
    setImportModalOpen(false);
    setJsonText('');
    setErrorMsg(null);
  };

  const handleCopyExample = () => {
    try {
      navigator.clipboard.writeText(EXAMPLE_JSON);
      showToast('Estrutura de exemplo copiada para o clipboard! 📋', 'success');
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!jsonText.trim()) {
      setErrorMsg('Por favor, cole o conteúdo JSON.');
      return;
    }

    setLoading(true);

    try {
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText.trim());
      } catch (err: any) {
        throw new Error(`JSON inválido: ${err.message}`);
      }

      if (!parsed.name || typeof parsed.name !== 'string' || !parsed.name.trim()) {
        throw new Error('O campo "name" é obrigatório e deve ser uma string.');
      }
      if (!parsed.schedule || typeof parsed.schedule !== 'string' || !parsed.schedule.trim()) {
        throw new Error('O campo "schedule" é obrigatório e deve ser uma string.');
      }
      if (!parsed.url || typeof parsed.url !== 'string' || !parsed.url.trim()) {
        throw new Error('O campo "url" é obrigatório e deve ser uma string.');
      }

      const method = (parsed.httpMethod || 'POST').toUpperCase();
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        throw new Error('O campo "httpMethod" deve ser GET, POST, PUT, DELETE ou PATCH.');
      }

      await addJob({
        name: parsed.name.trim(),
        schedule: parsed.schedule.trim(),
        timezone: parsed.timezone ? parsed.timezone.trim() : 'UTC',
        url: parsed.url.trim(),
        httpMethod: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        headers: parsed.headers || undefined,
        payload: parsed.payload || undefined,
        status: 'active',
        webhookAlertUrl: parsed.webhookAlertUrl ? parsed.webhookAlertUrl.trim() : undefined,
      });

      showToast('Tarefa importada e criada com sucesso! 🚀', 'success');
      handleClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao importar a tarefa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg flex flex-col rounded-2xl border border-indigo-500/30 bg-[#0a0d1d]/95 p-6 shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden transition-all duration-300">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 opacity-90" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/20 shadow-lg text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-wide">Importar Tarefa via JSON</h3>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Crie um job instantaneamente</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4 flex-1">
          {/* Explanation Banner */}
          <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-slate-400 text-xs leading-relaxed space-y-1.5 select-none">
            <p>
              Cole a estrutura JSON contendo os campos obrigatórios (<code className="text-indigo-400 font-bold font-mono">name</code>, <code className="text-indigo-400 font-bold font-mono">schedule</code> e <code className="text-indigo-400 font-bold font-mono">url</code>).
            </p>
            <div className="flex justify-between items-center pt-1 border-t border-indigo-950/40">
              <span className="text-[10px] text-slate-500">Exemplo com headers, timezone e alerta.</span>
              <button
                type="button"
                onClick={handleCopyExample}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Copiar Exemplo 📋
              </button>
            </div>
          </div>

          {/* JSON Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
              Conteúdo JSON
            </label>
            <textarea
              placeholder='{\n  "name": "Minha Tarefa",\n  "schedule": "every:5m",\n  "url": "https://api.exemplo.com"\n}'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-44 px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-indigo-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-xs custom-scrollbar"
              disabled={loading}
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 select-none animate-shake">
              <span className="font-bold">Erro:</span> {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-indigo-950/40">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 rounded-xl transition-all cursor-pointer"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/35 neon-glow-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Importando...' : 'Importar e Criar Job 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
