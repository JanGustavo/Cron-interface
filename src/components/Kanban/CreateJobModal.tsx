import React, { useState } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { CronTimeHelp } from '../Shared/CronTimeHelp';

export const CreateJobModal: React.FC = () => {
  const { addJob } = useJobsStore();
  const { isCreateModalOpen, setCreateModalOpen } = useUiStore();

  const [name, setName] = useState('');
  const [schedule, setSchedule] = useState('every:5m');
  const [timezone, setTimezone] = useState('UTC');
  const [url, setUrl] = useState('https://httpbin.org/post');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('POST');
  const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
  const [payloadText, setPayloadText] = useState('{\n  "status": "ping"\n}');
  const [webhookAlertUrl, setWebhookAlertUrl] = useState(() => localStorage.getItem('cf_global_webhook') || '');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isCreateModalOpen) return null;

  const handleClose = () => {
    setCreateModalOpen(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('O nome da tarefa é obrigatório.');
      return;
    }
    if (!schedule.trim()) {
      setErrorMsg('O agendamento da tarefa é obrigatório.');
      return;
    }
    if (!url.trim()) {
      setErrorMsg('A URL de destino é obrigatória.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Parse optional headers
      let headers: Record<string, string> | undefined;
      if (headersText.trim()) {
        try {
          headers = JSON.parse(headersText) as Record<string, string>;
        } catch (err) {
          throw new Error('Formato de Headers inválido. Deve ser um JSON válido.', { cause: err });
        }
      }

      // Parse optional payload
      let payload: Record<string, unknown> | string | undefined;
      if (payloadText.trim() && httpMethod !== 'GET') {
        try {
          payload = JSON.parse(payloadText) as Record<string, unknown>;
        } catch (err) {
          console.warn('Payload is not valid JSON, treating as raw string:', err);
          payload = payloadText;
        }
      }

      await addJob({
        name: name.trim(),
        schedule: schedule.trim(),
        timezone: timezone.trim(),
        url: url.trim(),
        httpMethod,
        headers,
        payload,
        status: 'active',
        webhookAlertUrl: webhookAlertUrl.trim() ? webhookAlertUrl.trim() : undefined,
      });

      // Clear state and close
      setName('');
      setSchedule('every:5m');
      setTimezone('UTC');
      setUrl('https://httpbin.org/post');
      setHttpMethod('POST');
      setHeadersText('{\n  "Content-Type": "application/json"\n}');
      setPayloadText('{\n  "status": "ping"\n}');
      setWebhookAlertUrl(localStorage.getItem('cf_global_webhook') || '');
      
      handleClose();
    } catch (err) {
      console.error(err);
      const errorObj = err as Error;
      setErrorMsg(errorObj.message || 'Erro ao criar a tarefa no servidor backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay backdrop */}
      <div
        className="fixed inset-0 bg-[#04060c]/85 backdrop-filter backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="w-full max-w-xl rounded-2xl border border-cyan-500/30 glass-panel shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden select-none animate-in fade-in zoom-in duration-300 relative">
        <div className="absolute top-0 inset-x-12 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Header Section */}
        <div className="p-5 border-b border-indigo-950/30 flex justify-between items-center bg-indigo-950/10">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-slate-100 tracking-wide uppercase font-mono">
              Criar Nova Tarefa ⚡
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-indigo-950/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 font-semibold text-center select-text">
              ⚠️ {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                Nome do Job
              </label>
              <input
                type="text"
                placeholder="Ex: Sincronizar Vendas"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                disabled={loading}
              />
            </div>

            {/* Agendamento */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                <span className="inline-flex items-center gap-2">
                  Cron / Intervalo (Schedule)
                  <CronTimeHelp />
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: every:5m ou * * * * *"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                disabled={loading}
              />
              <span className="text-[9px] text-slate-500 block pt-0.5">
                Formatos: <code className="text-cyan-500 font-mono">every:15m</code>, <code className="text-cyan-500 font-mono">every:2h</code>, ou expressão cron.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Método HTTP */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                Método HTTP
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')}
                className="w-full px-3 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                disabled={loading}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                Fuso Horário (Timezone)
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                disabled={loading}
              >
                <option value="UTC">UTC (Universal Time Coordinated)</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo (Horário de Brasília)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>

          {/* Destino URL */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
              URL de Destino (Webhook Endpoint)
            </label>
            <input
              type="url"
              placeholder="https://sua-api.com/v1/webhook"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
              disabled={loading}
            />
          </div>

          {/* Webhook Alert URL (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
              Webhook de Alerta (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookAlertUrl}
              onChange={(e) => setWebhookAlertUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
              disabled={loading}
            />
            <span className="text-[9px] text-slate-500 block pt-0.5">
              Notificado se a tarefa falhar repetidamente (excedendo 3 falhas seguidas).
            </span>
          </div>

          {/* Headers & Payload JSON Blocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Headers JSON */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                Headers HTTP (JSON)
              </label>
              <textarea
                rows={4}
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                className="w-full flex-1 px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-indigo-400 placeholder-slate-700 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-[11px] leading-relaxed resize-none"
                disabled={loading}
              />
            </div>

            {/* Payload Body JSON */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                Payload Body (JSON/Raw)
              </label>
              <textarea
                rows={4}
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className={`w-full flex-1 px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-indigo-400 placeholder-slate-700 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-[11px] leading-relaxed resize-none ${
                  httpMethod === 'GET' ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                disabled={loading || httpMethod === 'GET'}
                placeholder={httpMethod === 'GET' ? 'Indisponível em requisições GET' : '{"key": "value"}'}
              />
            </div>
          </div>

          {/* Button actions footer */}
          <div className="pt-4 border-t border-indigo-950/30 flex justify-end gap-3 bg-transparent">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-indigo-950/40 rounded-xl transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Criando...
                </>
              ) : (
                'Salvar Job 🚀'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
