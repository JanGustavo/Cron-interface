import React, { useState, useEffect, useRef } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { soundFx } from '../../utils/soundFx';
import api from '../../services/api';
import type { JobLog } from '../../types/jobs';

interface LogStep {
  id: string;
  time: string;
  type: 'info' | 'dispatch' | 'worker' | 'success' | 'failed' | 'retry';
  text: string;
  details?: string;
}

export const LiveExecutionModal: React.FC = () => {
  const { jobs } = useJobsStore();
  const { isLiveExecutionModalOpen, liveExecutionJobId, closeLiveExecutionModal, showToast } = useUiStore();
  
  const [activeTab, setActiveTab] = useState<'stream' | 'response' | 'headers' | 'payload'>('stream');
  const [isExecuting, setIsExecuting] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [steps, setSteps] = useState<LogStep[]>([]);
  const [latestLog, setLatestLog] = useState<JobLog | null>(null);
  const [copied, setCopied] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef<boolean>(false);
  const executedJobIdRef = useRef<string | null>(null);
  const streamBottomRef = useRef<HTMLDivElement | null>(null);

  const job = jobs.find((j) => j.id === liveExecutionJobId);

  const formatNow = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  const handleClose = () => {
    isRunningRef.current = false;
    executedJobIdRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    soundFx.playClick();
    closeLiveExecutionModal();
  };

  const execute = async () => {
    if (!liveExecutionJobId || isRunningRef.current) return;

    const currentJobs = useJobsStore.getState().jobs;
    const targetJob = currentJobs.find((j) => j.id === liveExecutionJobId);
    if (!targetJob) return;

    isRunningRef.current = true;
    setIsExecuting(true);
    setElapsedMs(0);
    setLatestLog(null);
    startTimeRef.current = Date.now();

    // Som de disparo futurista
    soundFx.playTrigger();

    setSteps([
      {
        id: '1',
        time: formatNow(),
        type: 'info',
        text: `📡 [Scheduler/API] Enfileirando tarefa para "${targetJob.name}" (ID: ${targetJob.id.slice(0, 8)}...)`,
        details: `Queue: asynq:default • Schedule: ${targetJob.schedule} • Timezone: ${targetJob.timezone}`,
      },
    ]);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 30);

    setTimeout(() => {
      if (!isRunningRef.current) return;
      setSteps((prev) => [
        ...prev,
        {
          id: '2',
          time: formatNow(),
          type: 'worker',
          text: `⚡ [Worker Engine] Lock distribuído adquirido no Redis (ttl: 40s)`,
          details: `Goroutine alocada no pool de concorrência distribuído`,
        },
      ]);
    }, 60);

    setTimeout(() => {
      if (!isRunningRef.current) return;
      setSteps((prev) => [
        ...prev,
        {
          id: '3',
          time: formatNow(),
          type: 'dispatch',
          text: `🌐 [HTTP Client] Disparando requisição ${targetJob.httpMethod} para ${targetJob.url}`,
          details: `User-Agent: CronFlow/1.0 • Timeout: 30s • SSRF Filter: ACTIVE (Public IP Only)`,
        },
      ]);
    }, 140);

    try {
      await useJobsStore.getState().triggerJob(targetJob.id);

      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      pollTimerRef.current = setTimeout(async () => {
        try {
          const res = await api.get(`/v1/jobs/${targetJob.id}/executions?limit=1`);
          const logs = (res.data || []) as JobLog[];
          if (logs.length > 0) {
            const execLog = logs[0];
            setLatestLog(execLog);
            const duration = execLog.durationMs || (Date.now() - startTimeRef.current);
            setElapsedMs(duration);

            const isOk = execLog.status === 'success' && (!execLog.httpStatus || execLog.httpStatus < 400);

            if (isOk) {
              soundFx.playSuccess();
              setSteps((prev) => [
                ...prev,
                {
                  id: '4',
                  time: formatNow(),
                  type: 'success',
                  text: `🎉 [HTTP Resposta] Status ${execLog.httpStatus || 200} OK recebido em ${duration}ms`,
                  details: `Payload salvo no histórico de auditoria (Truncamento seguro 2KB)`,
                },
              ]);
            } else {
              soundFx.playError();
              setSteps((prev) => [
                ...prev,
                {
                  id: '4',
                  time: formatNow(),
                  type: 'failed',
                  text: `⚠️ [HTTP Erro] Status ${execLog.httpStatus || 'ERR'} recebido (${execLog.responseBody || 'Falha de conexão/timeout'})`,
                  details: `Tentativa ${execLog.attemptNumber || 1} de 3 • Agendando Retry com Backoff Exponencial`,
                },
              ]);
            }
          }
        } catch (e) {
          console.error('Falha ao obter log de execução em tempo real', e);
        } finally {
          setIsExecuting(false);
          isRunningRef.current = false;
          if (timerRef.current) clearInterval(timerRef.current);
          useJobsStore.getState().fetchJobs();
        }
      }, 1000);
    } catch (err: unknown) {
      soundFx.playError();
      const errObj = err as { message?: string };
      setSteps((prev) => [
        ...prev,
        {
          id: 'error',
          time: formatNow(),
          type: 'failed',
          text: `❌ [Falha no Disparo] ${errObj.message || 'Erro de comunicação com o servidor'}`,
        },
      ]);
      setIsExecuting(false);
      isRunningRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (isLiveExecutionModalOpen && liveExecutionJobId) {
      if (executedJobIdRef.current !== liveExecutionJobId) {
        executedJobIdRef.current = liveExecutionJobId;
        execute();
      }
    } else {
      executedJobIdRef.current = null;
      isRunningRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLiveExecutionModalOpen, liveExecutionJobId]);

  // Auto scroll para o final do terminal
  useEffect(() => {
    if (activeTab === 'stream' && streamBottomRef.current) {
      streamBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps, activeTab]);

  if (!isLiveExecutionModalOpen || !job) return null;

  const handleCopy = () => {
    const textToCopy = latestLog?.responseBody || JSON.stringify(steps, null, 2);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    soundFx.playClick();
    showToast('Copiado para a área de transferência', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const isSuccess = latestLog?.status === 'success' && (!latestLog?.httpStatus || latestLog.httpStatus < 400);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-slate-950/70 animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden rounded-3xl border border-cyan-550/30 bg-[#070a1a]/95 shadow-[0_0_50px_rgba(6,182,212,0.25)] animate-in zoom-in-95 duration-200">
        
        {/* Glowing Top Line */}
        <div className="pointer-events-none absolute top-0 inset-x-12 z-10 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-5 py-4 border-b border-indigo-950/60 bg-[#050713]/80">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <span className={`w-2.5 h-2.5 rounded-full ${isExecuting ? 'bg-cyan-400 animate-ping' : isSuccess ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-100 tracking-wide font-mono">
                  {job.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 uppercase font-mono">
                  {job.httpMethod}
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-mono truncate max-w-md mt-0.5">
                {job.url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Realtime Latency Counter */}
            <div className="px-3 py-1.5 rounded-xl border border-indigo-950/60 bg-indigo-950/20 flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Latência:</span>
              <span className={`font-black ${isExecuting ? 'text-cyan-300 animate-pulse' : isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                {elapsedMs} ms
              </span>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-indigo-950/40 transition-colors cursor-pointer"
              aria-label="Fechar modal de execução ao vivo"
            >
              <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-indigo-950/40 bg-[#050713]/50 px-5 pt-2 gap-2 text-xs font-mono select-none">
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('stream');
            }}
            className={`px-3 py-2 rounded-t-xl border-b-2 font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stream'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📡 Telemetria ao Vivo</span>
            {isExecuting && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('response');
            }}
            className={`px-3 py-2 rounded-t-xl border-b-2 font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'response'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📦 Resposta HTTP</span>
            {latestLog && (
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black ${isSuccess ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {latestLog.httpStatus || 'ERR'}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('headers');
            }}
            className={`px-3 py-2 rounded-t-xl border-b-2 font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'headers'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Headers ({job.headers ? Object.keys(job.headers).length : 0})
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('payload');
            }}
            className={`px-3 py-2 rounded-t-xl border-b-2 font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'payload'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Payload JSON
          </button>
        </div>

        {/* Modal Main Terminal Content */}
        <div className="flex-1 min-h-[280px] max-h-[50vh] overflow-y-auto p-4 sm:p-6 font-mono text-xs text-left select-text bg-[#04060f]">
          
          {/* TAB 1: Real-time Execution Stream */}
          {activeTab === 'stream' && (
            <div className="space-y-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-2xl border transition-all duration-200 animate-in fade-in slide-in-from-bottom-1 ${
                    step.type === 'success'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                      : step.type === 'failed'
                      ? 'bg-rose-950/20 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                      : step.type === 'worker'
                      ? 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300'
                      : step.type === 'dispatch'
                      ? 'bg-cyan-950/20 border-cyan-500/20 text-cyan-300'
                      : 'bg-slate-900/40 border-indigo-950/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{step.text}</span>
                    <span className="text-[10px] text-slate-500 shrink-0 font-mono">{step.time}</span>
                  </div>
                  {step.details && (
                    <p className="text-[11px] text-slate-400 font-sans mt-1.5 leading-relaxed pl-2 border-l-2 border-indigo-500/30">
                      {step.details}
                    </p>
                  )}
                </div>
              ))}

              {isExecuting && (
                <div className="flex items-center gap-2.5 p-3 rounded-2xl border border-cyan-500/20 bg-cyan-950/10 text-cyan-400 animate-pulse">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-xs font-bold font-mono">
                    Aguardando resposta do servidor remoto ({job.url})...
                  </span>
                </div>
              )}

              <div ref={streamBottomRef} />
            </div>
          )}

          {/* TAB 2: Response Body */}
          {activeTab === 'response' && (
            <div className="space-y-3">
              {latestLog ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-indigo-950/40 bg-indigo-950/10 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Status:</span>
                      <span className={`font-black ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`}>
                        HTTP {latestLog.httpStatus || 200}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Duração:</span>
                      <span className="text-indigo-300 font-bold">{latestLog.durationMs || elapsedMs} ms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Tentativa:</span>
                      <span className="text-amber-400 font-bold">{latestLog.attemptNumber || 1} / 3</span>
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="p-4 rounded-2xl border border-indigo-950/60 bg-[#060815] text-indigo-300 text-xs overflow-x-auto leading-relaxed max-h-64 font-mono">
                      <code>{latestLog.responseBody || 'Corpo de resposta vazio (204 No Content ou corpo limpo).'}</code>
                    </pre>
                  </div>
                </div>
              ) : isExecuting ? (
                <div className="p-8 text-center text-slate-500 animate-pulse">
                  Aguardando resposta HTTP para exibir o corpo...
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  Nenhuma resposta capturada nesta execução.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Request Headers */}
          {activeTab === 'headers' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 font-sans mb-3">
                Cabeçalhos HTTP customizados enviados nesta requisição:
              </p>
              {job.headers && Object.keys(job.headers).length > 0 ? (
                <pre className="p-4 rounded-2xl border border-indigo-950/60 bg-[#060815] text-cyan-300 text-xs overflow-x-auto leading-relaxed font-mono">
                  <code>{JSON.stringify(job.headers, null, 2)}</code>
                </pre>
              ) : (
                <div className="p-6 text-center text-slate-600 italic">
                  Nenhum cabeçalho customizado (usando Content-Type e User-Agent padrão).
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Payload JSON */}
          {activeTab === 'payload' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 font-sans mb-3">
                Corpo JSON (Payload) enviado no disparo {job.httpMethod}:
              </p>
              {job.payload && Object.keys(job.payload).length > 0 ? (
                <pre className="p-4 rounded-2xl border border-indigo-950/60 bg-[#060815] text-emerald-300 text-xs overflow-x-auto leading-relaxed font-mono">
                  <code>{JSON.stringify(job.payload, null, 2)}</code>
                </pre>
              ) : (
                <div className="p-6 text-center text-slate-600 italic">
                  Nenhum payload JSON configurado para este job.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-5 py-3.5 border-t border-indigo-950/50 bg-[#050713]/80">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-indigo-950/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial"
            >
              {copied ? (
                <>
                  <span className="text-emerald-400">✓</span>
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copiar Dados</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Fechar
            </button>

            <button
              onClick={execute}
              disabled={isExecuting}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-all cursor-pointer hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              <span>{isExecuting ? 'Executando...' : 'Executar Novamente ⚡'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
