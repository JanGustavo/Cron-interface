import React, { useState, useEffect } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { translateSchedule } from '../Shared/cronTranslator';
import { useEntitlements } from '../../hooks/useEntitlements';
import { validateDestinationUrl } from '../../utils/urlValidator';
import { JobPreviewModal } from './JobPreviewModal';

export const CreateJobModal: React.FC = () => {
	const { addJob, jobs } = useJobsStore();
	const { isCreateModalOpen, setCreateModalOpen, setPlansModalOpen, showToast } = useUiStore();
	const { alertsWebhooksEnabled, workflowsEnabled, isPro } = useEntitlements();

	const [name, setName] = useState('');
	const [schedule, setSchedule] = useState('every:5m');
	const [timezone, setTimezone] = useState(() => localStorage.getItem('cf_user_timezone') || 'UTC');
	const [url, setUrl] = useState('https://httpbin.org/post');
	const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'>('POST');
	const [headersText, setHeadersText] = useState('{\n  "Content-Type": "application/json"\n}');
	const [payloadText, setPayloadText] = useState('{\n  "status": "ping"\n}');
	const [webhookAlertUrl, setWebhookAlertUrl] = useState(() => localStorage.getItem('cf_global_webhook') || '');
	const [nextJobId, setNextJobId] = useState('');
	const [tagsInput, setTagsInput] = useState('');

	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [step, setStep] = useState(1);
	const [showHelp, setShowHelp] = useState(false);
	const [scheduleError, setScheduleError] = useState<string | null>(null);

	const getScheduleValidationError = (value: string): string | null => {
		if (!value.trim()) return 'O agendamento é obrigatório.';
		if (value.startsWith('every:')) {
			const parts = value.split(':');
			if (parts.length !== 2) return 'Use o formato every:<valor><unidade>, ex: every:5m.';
			const val = parts[1];
			const num = parseInt(val, 10);
			const unit = val.replace(/[0-9]/g, '');
			if (isNaN(num) || num <= 0) return 'O valor numérico do intervalo deve ser maior que 0.';
			if (!['m', 'h', 'd'].includes(unit)) return 'Use m (minutos), h (horas) ou d (dias) como unidade.';
			return null;
		}
		const parts = value.trim().split(/\s+/);
		if (parts.length !== 5) {
			return 'Expressão cron deve conter exatamente 5 campos (minuto hora dia mês dia_semana).';
		}
		for (const part of parts) {
			if (part !== '*' && !part.match(/^[0-9*,\/\-]+$/)) {
				return `Caractere inválido no campo cron: "${part}"`;
			}
		}
		return null;
	};

	useEffect(() => {
		if (schedule) {
			const err = getScheduleValidationError(schedule);
			setScheduleError(err);
		} else {
			setScheduleError(null);
		}
	}, [schedule]);

  useEffect(() => {
    if (isCreateModalOpen) {
      const timer = setTimeout(() => {
        setWebhookAlertUrl(localStorage.getItem('cf_global_webhook') || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isCreateModalOpen]);

  if (!isCreateModalOpen) return null;

  const handleClose = () => {
    setCreateModalOpen(false);
    setErrorMsg(null);
    setStep(1);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        setErrorMsg('O nome da tarefa é obrigatório.');
        return;
      }
      const schedErr = getScheduleValidationError(schedule);
      if (schedErr) {
        setErrorMsg(schedErr);
        return;
      }
    }
    if (step === 2) {
      if (!url.trim()) {
        setErrorMsg('A URL de destino é obrigatória.');
        return;
      }
      try {
        const u = new URL(url.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setErrorMsg('A URL de destino deve começar com http:// ou https://');
          return;
        }
      } catch {
        setErrorMsg('A URL de destino deve ser uma URL válida.');
        return;
      }
    }
    setErrorMsg(null);
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setErrorMsg('O nome da tarefa é obrigatório.');
      return;
    }
    const schedErr = getScheduleValidationError(schedule);
    if (schedErr) {
      setErrorMsg(schedErr);
      return;
    }
    const urlValidation = validateDestinationUrl(url);
    if (!urlValidation.isValid) {
      setErrorMsg(urlValidation.error || 'URL de destino inválida.');
      return;
    }

    if (webhookAlertUrl.trim()) {
      try {
        const u = new URL(webhookAlertUrl.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          setErrorMsg('O Webhook de Alerta deve ser um URL válido (começando com http:// ou https://).');
          return;
        }
      } catch {
        setErrorMsg('O Webhook de Alerta deve ser um URL válido.');
        return;
      }
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
      if (payloadText.trim() && httpMethod !== 'GET' && httpMethod !== 'HEAD') {
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
        nextJobId: nextJobId.trim() ? nextJobId.trim() : undefined,
        tags: tagsInput.trim() ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      });

      // Clear state and close
      setName('');
      setSchedule('every:5m');
      setTimezone(localStorage.getItem('cf_user_timezone') || 'UTC');
      setUrl('https://httpbin.org/post');
      setHttpMethod('POST');
      setHeadersText('{\n  "Content-Type": "application/json"\n}');
      setPayloadText('{\n  "status": "ping"\n}');
      setWebhookAlertUrl(localStorage.getItem('cf_global_webhook') || '');
      setNextJobId('');
      setTagsInput('');
      
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
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/30 glass-panel shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden select-none animate-in fade-in zoom-in duration-300 relative">
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

        {/* Progress indicator bar */}
        <div className="px-6 py-3 border-b border-indigo-950/20 bg-indigo-950/5 flex items-center justify-between text-[10px] text-slate-400 select-none">
          <div className="flex gap-2 items-center">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? 'w-8 bg-cyan-400'
                    : s < step
                    ? 'w-4 bg-indigo-500/50'
                    : 'w-2 bg-indigo-950'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-cyan-400 font-bold uppercase tracking-wider">
            {step === 1 && '1. Identificação & Agendamento'}
            {step === 2 && '2. Destino & Método'}
            {step === 3 && '3. Alertas & Integrações'}
            {step === 4 && '4. Headers & Payload'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden text-xs">
          <div className="overflow-y-auto p-6 space-y-5 flex-1 text-left">
            {errorMsg && (
              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-rose-500/20 bg-rose-950/15 text-rose-350 select-text animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                <span className="text-sm shrink-0 mt-0.5">⚠️</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-rose-450 font-mono">Erro de Validação</h5>
                  <p className="text-[11px] text-rose-350/90 mt-1 leading-relaxed">{errorMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMsg(null)}
                  className="text-rose-500/50 hover:text-rose-450 p-0.5 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                  title="Fechar aviso"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-250 text-left">
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
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                    disabled={loading}
                  />
                </div>

                {/* Agendamento */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    <span className="inline-flex items-center gap-2">
                      Cron / Intervalo (Schedule)
                      <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        className="px-1.5 py-0.5 rounded border border-indigo-500/25 bg-indigo-950/40 text-[9px] text-cyan-400 hover:text-white transition-colors cursor-pointer focus:outline-none"
                      >
                        {showHelp ? 'Ocultar Guia 📖' : 'Ver Guia 📖'}
                      </button>
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: every:5m ou * * * * *"
                    value={schedule}
                    onChange={(e) => {
                      setSchedule(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                    disabled={loading}
                  />
                  <span className="text-[9px] text-slate-500 block pt-0.5 select-none">
                    Formatos: <code className="text-cyan-500 font-mono">every:15m</code> ou cron <code className="text-cyan-500 font-mono">*/5 * * * *</code>
                  </span>
                  
                  {scheduleError ? (
                    <span className="text-[9px] text-rose-450 font-semibold block pt-1 font-mono">
                      ❌ {scheduleError}
                    </span>
                  ) : (
                    schedule.trim() && (
                      <span className="text-[9px] text-cyan-400 font-semibold block pt-1 font-mono">
                        ⏱️ {translateSchedule(schedule)}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Collapsible Help Guide */}
              {showHelp && (
                <div className="p-4 rounded-2xl border border-indigo-500/10 bg-[#060814]/85 text-[10px] text-slate-400 space-y-3.5 select-none animate-in fade-in slide-in-from-top-2 duration-250 font-mono">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-cyan-400 font-black mb-1.5">Intervalos Simples (every:)</div>
                    <div className="grid grid-cols-2 gap-2 text-slate-350 bg-slate-950/40 p-2 rounded-xl border border-indigo-950/20">
                      <div><code className="text-cyan-300">every:15m</code> <span className="text-slate-500">→ 15 mins</span></div>
                      <div><code className="text-cyan-300">every:2h</code> <span className="text-slate-500">→ 2 horas</span></div>
                      <div><code className="text-cyan-300">every:1d</code> <span className="text-slate-500">→ Todo dia</span></div>
                    </div>
                  </div>
                  <div className="border-t border-indigo-950/30 pt-2.5">
                    <div className="text-[9px] uppercase tracking-wider text-indigo-400 font-black mb-1.5">Expressão Cron (5 campos)</div>
                    <div className="text-[8px] text-slate-500 mb-1.5">minuto hora dia_mes mes dia_semana</div>
                    <div className="grid grid-cols-1 gap-1.5 text-slate-350 bg-slate-950/40 p-2 rounded-xl border border-indigo-950/20">
                      <div className="flex justify-between"><code className="text-indigo-300">*/5 * * * *</code> <span>A cada 5 minutos</span></div>
                      <div className="flex justify-between"><code className="text-indigo-300">0 9 * * 1-5</code> <span>09:00 de segunda a sexta</span></div>
                      <div className="flex justify-between"><code className="text-indigo-300">30 8 1 * *</code> <span>Dia 1 às 08:30</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Timezone */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                  Fuso Horário (Timezone)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2.5 pr-10 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 hover:border-indigo-900/80 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                  disabled={loading}
                >
                  <option value="UTC">UTC (Universal Time Coordinated)</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo (Horário de Brasília)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-250 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Método HTTP */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Método HTTP
                  </label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD')}
                    className="w-full px-3 py-2.5 pr-10 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 hover:border-indigo-900/80 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono cursor-pointer appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                    disabled={loading}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>

                {/* Destino URL */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    URL de Destino
                  </label>
                  <input
                    type="url"
                    placeholder="https://sua-api.com/v1/webhook"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-250 text-left">
              {/* Webhook Alert URL (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest font-mono flex items-center gap-1.5">
                    <span>Webhook de Alerta (Opcional)</span>
                    <button
                      type="button"
                      onClick={() => showToast('Endpoint de webhook (Discord, Slack, ntfy) notificado especificamente quando esta tarefa falhar 3 vezes seguidas.', 'info')}
                      className="px-1 py-0.2 rounded bg-indigo-950/60 border border-indigo-500/25 text-[9px] text-cyan-400 font-bold hover:text-white transition-colors cursor-pointer"
                      title="O que é o Webhook de Alerta?"
                    >
                      ?
                    </button>
                  </label>
                </div>
                <input
                  type="url"
                  placeholder={alertsWebhooksEnabled ? "https://hooks.slack.com/services/..." : "Bloqueado no seu plano. Faça upgrade para o Plano PRO! 🔒"}
                  value={webhookAlertUrl}
                  onChange={(e) => setWebhookAlertUrl(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono ${!alertsWebhooksEnabled ? 'opacity-50 cursor-not-allowed border-red-500/20' : ''}`}
                  disabled={loading || !alertsWebhooksEnabled}
                />
                {!alertsWebhooksEnabled && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[9px] font-semibold font-mono select-none animate-in fade-in slide-in-from-top-1 duration-200 cursor-pointer hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                    onClick={() => setPlansModalOpen(true)}
                  >
                    <span className="text-amber-500">🔒</span>
                    <span>Webhook de alerta é exclusivo do Plano PRO.</span>
                  </div>
                )}
                {alertsWebhooksEnabled && (
                  <span className="text-[9px] text-slate-500 block pt-0.5">
                    Notificado se a tarefa falhar repetidamente. Suporta Discord, Slack e ntfy.
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Próximo Job (Workflow Chaining) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest font-mono flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span>Próximo Job (Workflow)</span>
                      <button
                        type="button"
                        onClick={() => showToast('Encadeamento automático: Quando este job for concluído com sucesso, o CronFlow engata e dispara o Próximo Job imediatamente.', 'info')}
                        className="px-1 py-0.2 rounded bg-indigo-950/60 border border-indigo-500/25 text-[9px] text-cyan-400 font-bold hover:text-white transition-colors cursor-pointer"
                        title="O que é o Próximo Job?"
                      >
                        ?
                      </button>
                    </span>
                    <span
                      className="text-[8px] font-black uppercase tracking-widest bg-[length:300%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]"
                      style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
                      title="Encadeamento de Workflows PRO ✨"
                    >
                      PRO ✨
                    </span>
                  </label>
                  <select
                    value={nextJobId}
                    onChange={(e) => setNextJobId(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono ${!workflowsEnabled ? 'opacity-50 cursor-not-allowed border-red-500/20' : ''}`}
                    disabled={loading || !workflowsEnabled}
                  >
                    <option value="">{workflowsEnabled ? "Nenhum (Finalizar Fluxo)" : "Bloqueado no seu plano. Faça upgrade!"}</option>
                    {workflowsEnabled && jobs.map((jb) => (
                      <option key={jb.id} value={jb.id}>
                        {jb.name} ({jb.schedule})
                      </option>
                    ))}
                  </select>
                  {!workflowsEnabled && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[9px] font-semibold font-mono select-none animate-in fade-in slide-in-from-top-1 duration-200 cursor-pointer hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                      onClick={() => setPlansModalOpen(true)}
                    >
                      <span className="text-amber-500">🔒</span>
                      <span>Encadeamento (Workflows) é exclusivo do Plano PRO.</span>
                    </div>
                  )}
                </div>

                {/* Tags Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: billing, sync, prod"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-250 text-left">
              {/* Headers & Payload JSON Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Headers JSON */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
                    Headers HTTP (JSON)
                  </label>
                  <textarea
                    rows={6}
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
                    rows={6}
                    value={payloadText}
                    onChange={(e) => setPayloadText(e.target.value)}
                    className={`w-full flex-1 px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-indigo-400 placeholder-slate-700 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-[11px] leading-relaxed resize-none ${
                      httpMethod === 'GET' || httpMethod === 'HEAD' ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    disabled={loading || httpMethod === 'GET' || httpMethod === 'HEAD'}
                    placeholder={httpMethod === 'GET' || httpMethod === 'HEAD' ? `Indisponível em requisições ${httpMethod}` : '{"key": "value"}'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Button actions footer */}
        <div className="p-5 border-t border-indigo-950/30 bg-[#0a0d1d]/85 backdrop-blur-sm flex justify-between gap-3 select-none relative z-10">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-indigo-950/40 rounded-xl transition-all cursor-pointer"
                disabled={loading}
              >
                ← Voltar
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-indigo-950/40 rounded-xl transition-all cursor-pointer"
              disabled={loading}
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary cursor-pointer"
              >
                Próximo →
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!isPro) {
                      showToast('Revisão e Teste de Prévia em Tempo Real é um recurso exclusivo do Plano PRO. Faça upgrade!', 'info');
                      setPlansModalOpen(true);
                      return;
                    }
                    if (!name.trim()) {
                      setErrorMsg('Preencha o Nome da tarefa para testar a prévia.');
                      setStep(1);
                      return;
                    }
                    const urlValidation = validateDestinationUrl(url);
                    if (!urlValidation.isValid) {
                      setErrorMsg(urlValidation.error || 'A URL de destino é inválida.');
                      setStep(2);
                      return;
                    }
                    setIsPreviewOpen(true);
                  }}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    !isPro
                      ? 'bg-slate-900/80 border border-slate-700/60 text-slate-500 opacity-60 cursor-not-allowed hover:bg-slate-900'
                      : 'bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 shadow-md cursor-pointer'
                  }`}
                  title={!isPro ? 'Prévia e Teste em Tempo Real é exclusivo do Plano PRO. Clique para fazer upgrade!' : 'Abrir Modal de Revisão e Teste em Tempo Real'}
                >
                  {!isPro ? (
                    <>
                      <span>🔒</span>
                      <span>Revisar Prévia (PRO)</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Revisar Prévia</span>
                      <span
                        className="text-[7.5px] font-black uppercase tracking-widest bg-[length:300%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]"
                        style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
                      >
                        PRO ✨
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary flex items-center gap-2 cursor-pointer"
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
              </>
            )}
          </div>
        </div>
      </form>
    </div>

    {/* PRO Job Preview & Test Execution Modal */}
    <JobPreviewModal
      isOpen={isPreviewOpen}
      onClose={() => setIsPreviewOpen(false)}
      jobData={{
        name: name.trim(),
        schedule: schedule.trim(),
        timezone: timezone.trim(),
        url: url.trim(),
        httpMethod,
        headers: (() => {
          try { return headersText.trim() ? JSON.parse(headersText) : undefined; } catch { return undefined; }
        })(),
        payload: (() => {
          try { return payloadText.trim() ? JSON.parse(payloadText) : payloadText; } catch { return payloadText; }
        })(),
        webhookAlertUrl: webhookAlertUrl.trim() || undefined,
        nextJobId: nextJobId.trim() || undefined,
        tags: tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      }}
      onConfirmCreate={async () => {
        setIsPreviewOpen(false);
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }}
      isCreating={loading}
    />
  </div>
  );
};
