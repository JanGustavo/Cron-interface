import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LogEntry } from '../../types/logs';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { StatusBadge } from '../Dashboard/StatusBadge';
import Swal from 'sweetalert2';

interface LogDetailProps {
  logs: LogEntry[];
}

export const LogDetail: React.FC<LogDetailProps> = ({ logs }) => {
  const { jobs } = useJobsStore();
  const { isLogModalOpen, selectedLogId, setLogModalOpen, showToast, openLiveExecutionModal, setActiveTab } = useUiStore();

  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getTerminalLogs = useCallback((targetLog: LogEntry) => {
    const recordedTime = new Date(targetLog.triggeredAt).toLocaleString('pt-BR');
    const lines = [
      `[${recordedTime}] [SYS] Registro da execução ${targetLog.id}`,
      `[${recordedTime}] [SYS] Tentativa registrada: ${targetLog.attemptNumber}`,
      `[${recordedTime}] [HTTP] Status: ${targetLog.httpStatus ?? 'sem resposta HTTP'}`,
      `[${recordedTime}] [HTTP] Duração registrada: ${targetLog.durationMs ?? 0}ms`,
      `[${recordedTime}] [SYS] Resultado HTTP: ${targetLog.transportStatus ?? targetLog.status}`,
    ];
    if (targetLog.status === 'validation_failed') lines.push(`[${recordedTime}] [MONITOR] Condição de sucesso não atendida; próximo job bloqueado`);
    if (targetLog.responseBody) lines.push(`[${recordedTime}] [HTTP] Prévia da resposta: ${targetLog.responseBody}`);
    for (const condition of targetLog.ruleEvaluations ?? []) {
      lines.push(`[${recordedTime}] [MONITOR] ${condition.ruleName}: ${condition.status ?? (condition.passed ? 'pass' : 'fail')}${condition.message ? ` — ${condition.message}` : ''}`);
    }
    return lines;
  }, []);

  useEffect(() => {
    if (!isLogModalOpen || !selectedLogId) {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      return;
    }

    const targetLog = logs.find((l) => l.id === selectedLogId);
    if (!targetLog) return;

    const fullLines = getTerminalLogs(targetLog).filter(Boolean);
    
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);

    requestAnimationFrame(() => {
      setIsTyping(true);
      setTerminalLines([]);
    });
    let lineIdx = 0;
    typingTimerRef.current = setInterval(() => {
      if (lineIdx < fullLines.length) {
        setTerminalLines((prev) => [...prev, fullLines[lineIdx]]);
        lineIdx++;
      } else {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        setIsTyping(false);
      }
    }, 200); // print a new line every 200ms

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [isLogModalOpen, selectedLogId, logs, getTerminalLogs]);

  const handleSkipTerminalTyping = () => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    const targetLog = logs.find((l) => l.id === selectedLogId);
    if (targetLog) {
      setTerminalLines(getTerminalLogs(targetLog).filter(Boolean));
    }
    setIsTyping(false);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines]);

  if (!isLogModalOpen || !selectedLogId) return null;

  // Find target log
  const log = logs.find((l) => l.id === selectedLogId);
  if (!log) return null;

  // Find related job
  const job = jobs.find((j) => j.id === log.jobId);

  const handleClose = () => {
    setLogModalOpen(false);
  };

  const handleCopyText = (text: string, message: string) => {
    try {
      navigator.clipboard.writeText(text);
      showToast(message, 'success');
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleReplayJob = () => {
    if (!job) return;
    
    const method = job.httpMethod || 'POST';
    const payloadStr = job.payload 
      ? (typeof job.payload === 'object' ? JSON.stringify(job.payload, null, 2) : job.payload) 
      : 'Nenhum';

    Swal.fire({
      title: 'Disparar Replay Manual?',
      html: `
        <div class="text-left space-y-3 font-sans text-xs">
          <p class="text-slate-450">Deseja realmente reexecutar esta tarefa disparando uma nova requisição HTTP?</p>
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-900/60 space-y-1.5 font-mono">
            <div><span class="text-cyan-400 font-bold">MÉTODO:</span> <span class="text-slate-200">${method}</span></div>
            <div><span class="text-cyan-400 font-bold">URL:</span> <span class="text-slate-350 break-all">${log.jobUrl || job.url}</span></div>
            <div><span class="text-cyan-400 font-bold">PAYLOAD:</span> <pre class="text-slate-400 text-[10px] mt-1 whitespace-pre-wrap">${payloadStr}</pre></div>
          </div>
          <p class="text-amber-500 font-semibold mt-2">⚠️ Atenção: Isso gerará novos registros e efeitos colaterais no endpoint de destino.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, disparar replay',
      cancelButtonText: 'Cancelar',
      background: '#0a0f1d',
      color: '#cbd5e1',
      iconColor: '#06b6d4',
      customClass: {
        popup: 'border border-indigo-950/60 rounded-3xl shadow-2xl bg-[#090c15] text-left font-sans max-w-lg',
        title: 'text-base font-bold text-slate-100 px-6 pt-6',
        htmlContainer: 'px-6 pb-4',
        actions: 'px-6 pb-6 flex justify-end gap-2',
        confirmButton: 'px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 border border-cyan-300 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/50',
        cancelButton: 'px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-indigo-950/80 rounded-xl transition-all cursor-pointer focus:outline-none',
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        executeReplayJob();
      }
    });
  };

  const executeReplayJob = () => {
    if (!job) return;
    const jobId = job.id;
    setLogModalOpen(false);
    openLiveExecutionModal(jobId);
  };

  const handleCopyAsCurl = () => {
    if (!job) return;
    const method = job.httpMethod || 'POST';
    let curl = `curl -X ${method} "${log.jobUrl || job.url}"`;
    
    if (job.headers) {
      Object.entries(job.headers).forEach(([key, val]) => {
        curl += ` \\\n  -H "${key}: ${val}"`;
      });
    }
    
    if (job.payload && method !== 'GET') {
      const payloadStr = typeof job.payload === 'object' ? JSON.stringify(job.payload) : job.payload;
      curl += ` \\\n  -d '${payloadStr.replace(/'/g, "'\\''")}'`;
    }
    
    handleCopyText(curl, 'Comando cURL copiado para o clipboard! 📋');
  };

  const handleCreateMonitorRuleFromLog = () => {
    if (!log) return;
    const prefill = { jobId: log.jobId || '', logId: log.id };

    localStorage.setItem('cf_prefill_rule', JSON.stringify(prefill));
    window.dispatchEvent(new CustomEvent('cf_open_monitor_page', { detail: prefill }));
    setLogModalOpen(false);
    setActiveTab('monitor');
    showToast('Resposta selecionada para configurar sua validação.', 'info');
  };

  // Other attempts require a shared run ID; only this recorded attempt is known.
  const timeline = [{
    attempt: log.attemptNumber,
    status: log.status,
    httpStatus: log.httpStatus ?? 'Sem resposta',
    time: new Date(log.triggeredAt).toLocaleString('pt-BR'),
    message: log.status === 'validation_failed' ? 'Resultado inválido; próximo job bloqueado' : log.status === 'success' ? 'Chamada HTTP concluída' : 'Chamada HTTP falhou',
  }];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'POST':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Modal Backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-[#04060c]/85 backdrop-filter backdrop-blur-sm transition-opacity duration-300 cursor-pointer animate-in fade-in"
      />

      {/* Modal Panel Container */}
      <div className="relative max-w-4xl w-full bg-[#070913]/95 border border-indigo-900/50 glass-panel shadow-2xl rounded-3xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 z-10">
        
        {/* Header Section */}
        <div className="p-5 border-b border-indigo-950/30 flex justify-between items-center bg-indigo-950/15">
          <div className="flex items-center gap-3">
            <StatusBadge status={log.status} />
            <div>
              <h3 className="text-sm font-black text-slate-200 tracking-wide">
                Inspeção de Execução: <span className="text-indigo-400">{log.jobName || 'Tarefa Removida'}</span>
              </h3>
              <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                Log ID: #{log.id}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/30 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content - 2 Columns */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 scrollbar-thin scrollbar-thumb-indigo-950/60 scrollbar-track-transparent">
          
          {/* LEFT COLUMN: Request / Config details */}
          <div className="space-y-5 text-left">
            {/* Task Meta details */}
            <div className="p-4 bg-indigo-950/10 border border-indigo-950/20 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
              <span className="text-[8px] uppercase font-bold text-indigo-400 tracking-wider">
                Configurações da Tarefa
              </span>
              <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                <span>Cron: <code className="text-indigo-400 font-bold font-mono">{job?.schedule || 'N/A'}</code></span>
                <span>Fuso: <span className="font-semibold text-slate-350">{job?.timezone || 'N/A'}</span></span>
              </div>
            </div>

            {/* Request Block */}
            <div className="space-y-2">
              <div className="flex justify-between items-center select-none">
                <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Webhook Request (Envio)
                </h5>
                <div className="flex gap-2.5">
                  <button
                    onClick={handleCopyAsCurl}
                    className="text-[9px] font-extrabold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer uppercase font-mono tracking-wider"
                    title="Copiar chamada como comando cURL"
                  >
                    💻 Copiar cURL
                  </button>
                  {job && (
                    <button
                      onClick={handleReplayJob}
                      className="text-[9px] font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer uppercase font-mono tracking-wider"
                      title="Disparar esta tarefa novamente agora"
                    >
                      🔄 Replay
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-3 p-4 bg-slate-950/40 border border-indigo-950/40 rounded-2xl">
                {/* Method & URL */}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getMethodColor(job?.httpMethod || 'POST')}`}>
                    {job?.httpMethod || 'POST'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono truncate flex-1" title={log.jobUrl}>
                    {log.jobUrl || 'N/A'}
                  </div>
                  <button
                    onClick={() => handleCopyText(log.jobUrl || '', 'URL copiada com sucesso! 🔗')}
                    className="p-1 rounded bg-indigo-950/30 hover:bg-indigo-950/60 text-slate-500 hover:text-indigo-400 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>

                {/* Headers */}
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase">Headers</span>
                  <div className="p-3 bg-[#05070e]/85 rounded-xl border border-indigo-950/30 font-mono text-[9px] text-indigo-400 max-h-[100px] overflow-auto">
                    {job?.headers ? (
                      <pre>{JSON.stringify(job.headers, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-600 italic">Sem headers cadastrados</span>
                    )}
                  </div>
                </div>

                {/* Body/Payload */}
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase">Body Payload</span>
                  <div className="p-3 bg-[#05070e]/85 rounded-xl border border-indigo-950/30 font-mono text-[9px] text-indigo-400 max-h-[100px] overflow-auto">
                    {job?.payload ? (
                      <pre>{JSON.stringify(job.payload, null, 2)}</pre>
                    ) : (
                      <span className="text-slate-600 italic">Nenhum payload associado</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Response / Execution details */}
          <div className="space-y-5 text-left">
            {/* Response Block */}
            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Webhook Response (Retorno)
              </h5>
              <div className="space-y-3 p-4 bg-slate-950/40 border border-indigo-950/40 rounded-2xl">
                
                {/* HTTP Status & Duration */}
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-500 font-medium">Status HTTP:</span>
                    {log.httpStatus ? (
                      <span className={`px-2 py-0.5 rounded font-black ${
                        log.httpStatus >= 200 && log.httpStatus < 300
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {log.httpStatus}
                      </span>
                    ) : (
                      <span className="text-rose-400 uppercase font-black">{log.status}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-400">
                    <span>Duração:</span>
                    <span className="font-bold text-slate-200">{log.durationMs != null ? `${log.durationMs}ms` : '-'}</span>
                  </div>
                </div>

                {/* Body/Payload response */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">Prévia da resposta (até 2 KB)</span>
                    {log.responseBody && (
                      <button
                        onClick={() => handleCopyText(log.responseBody || '', 'Corpo da resposta copiado!')}
                        className="text-[9px] font-bold text-indigo-400 hover:text-white transition-colors"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-[#05070e]/85 rounded-xl border border-indigo-950/30 font-mono text-[9px] text-indigo-455 max-h-[140px] overflow-auto neon-glow-inner">
                    {log.responseBody ? (
                      <pre className="whitespace-pre-wrap">{log.responseBody}</pre>
                    ) : (
                      <span className="text-slate-600 italic">Sem resposta retornada pelo endpoint</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <section className="space-y-2" aria-label="Avaliação do monitoramento">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Condições da resposta</h5>
              <p className="text-[10px] text-slate-400">O status HTTP e as condições da resposta são avaliados separadamente.</p>
              {log.ruleEvaluations?.length ? log.ruleEvaluations.map((evaluation, index) => {
                const state = evaluation.status ?? (evaluation.passed ? 'pass' : 'fail');
                const label = { pass: 'Atendida', fail: 'Não atendida', error: 'Erro de avaliação', skipped: 'Não avaliada' }[state];
                return <div key={`${evaluation.ruleId}-${index}`} className="p-3 rounded-xl bg-slate-950/40 border border-indigo-950/40 text-xs space-y-1">
                  <div className="flex justify-between gap-3"><strong className="text-slate-200">{evaluation.ruleName}</strong><span className={state === 'pass' ? 'text-emerald-400' : state === 'skipped' ? 'text-slate-400' : 'text-amber-400'}>{label}</span></div>
                  {evaluation.key && <p className="font-mono text-slate-400 break-all">{evaluation.key} {evaluation.operator} {evaluation.expectedValue}</p>}
                  {evaluation.mode === 'require_success' && <p className="text-amber-300">Obrigatória para considerar sucesso</p>}
                  {evaluation.observedValue !== undefined && <p className="font-mono text-slate-300 break-all">Observado: {evaluation.observedValueText ?? JSON.stringify(evaluation.observedValue)}</p>}
                  {evaluation.message && <p className="text-slate-400">{evaluation.message}</p>}
                </div>;
              }) : <p className="text-xs text-slate-500">Esta execução não possui avaliações registradas.</p>}
            </section>

            {/* Alert Webhook Status Block */}
            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Notificação de Alerta de Falha
              </h5>
              <div className="p-4 bg-slate-950/40 border border-indigo-950/40 rounded-2xl space-y-2 select-text text-[10px] text-left leading-relaxed">
                {job?.webhookAlertUrl ? (
                  <div className="space-y-2 text-slate-400">
                    <p>Webhook configurado. Este registro não informa o estado de entrega da notificação.</p>
                    <p className="font-mono break-all">Destino atual: {job.webhookAlertUrl}</p>
                  </div>
                ) : <p className="text-slate-500">Nenhum webhook de falha configurado atualmente para esta tarefa.</p>}

              </div>
            </div>

            {/* Retry Timeline */}
            <div className="space-y-3">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Tentativa registrada
              </h5>
              
              <div className="relative border-l border-indigo-950/60 ml-3.5 pl-5.5 space-y-4">
                {timeline.map((item) => (
                  <div key={item.attempt} className="relative">
                    {/* Bullet indicator */}
                    <span className={`absolute -left-7.5 top-1 w-2.5 h-2.5 rounded-full border-2 ${
                      item.status === 'success'
                        ? 'bg-emerald-500 border-emerald-950 animate-pulse'
                        : item.status === 'timeout'
                        ? 'bg-amber-500 border-amber-950'
                        : 'bg-rose-500 border-rose-950'
                    }`} />
                    
                    {/* Info */}
                    <div className="flex flex-col text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-200">{item.attempt}ª Tentativa</span>
                        <span className={`text-[8px] font-black uppercase px-1 rounded ${
                          item.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {item.httpStatus}
                        </span>
                        <span className="text-slate-600 font-mono text-[9px] ml-auto">{item.time}</span>
                      </div>
                      <span className="text-slate-500 font-semibold mt-0.5">{item.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full-width Terminal Pane */}
          <div className="col-span-1 md:col-span-2 border-t border-indigo-950/30 pt-5 text-left">
            <div className="flex justify-between items-center mb-2 select-none">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                Resumo dos dados registrados
              </h5>
              {isTyping && (
                <button
                  onClick={handleSkipTerminalTyping}
                  className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase font-mono tracking-wider cursor-pointer"
                >
                  ⏩ Pular Animação
                </button>
              )}
            </div>
            
            <div className="p-4 bg-[#03050a] border border-indigo-950/65 rounded-2xl font-mono text-[10px] text-cyan-400/90 h-64 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-indigo-950/60 scrollbar-track-transparent">
              {terminalLines.filter(Boolean).map((line, idx) => {
                let color = 'text-cyan-400/90';
                if (line.includes('[SYS]')) color = 'text-slate-500';
                if (line.includes('[NET]')) color = 'text-indigo-400';
                if (line.includes('[ERR]')) color = 'text-rose-450 font-semibold';
                if (line.includes('[TENTATIVA')) color = 'text-amber-400';
                if (line.includes('✔')) color = 'text-emerald-400 font-bold';
                if (line.includes('❌')) color = 'text-rose-400 font-bold';

                return (
                  <div key={idx} className={`${color} leading-relaxed break-all`}>
                    {line}
                  </div>
                );
              })}
              
              {/* Blinking cursor */}
              <div className="inline-flex items-center gap-1 text-slate-500 select-none">
                <span>{isTyping ? 'Exibindo registros...' : '>'}</span>
                <span className="w-1.5 h-3 bg-cyan-400 animate-pulse" />
              </div>
              <div ref={terminalEndRef} />
            </div>
          </div>

        </div>

        {/* Footer Toolbar */}
        <div className="p-4 border-t border-indigo-950/30 bg-indigo-950/10 flex justify-between items-center gap-2">
          <button
            onClick={() => handleCopyText(JSON.stringify(log, null, 2), 'Objeto de log completo copiado para o clipboard! 📋')}
            className="px-4 py-2.5 text-xs font-semibold text-slate-350 hover:text-white bg-slate-900/40 hover:bg-slate-700/80 rounded-xl border border-indigo-200/40 transition-all cursor-pointer"
          >
            Copiar Log Completo (JSON)
          </button>
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-650/80 hover:bg-indigo-200/80 rounded-xl border border-indigo-50/600 transition-all shadow-[0_0_20px_rgba(99,102,241,0.25)] cursor-pointer"
          >
            Fechar Inspeção
          </button>
        </div>

      </div>
    </div>
  );
};
