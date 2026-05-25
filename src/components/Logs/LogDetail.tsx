import React from 'react';
import type { LogEntry } from '../../types/logs';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { StatusBadge } from '../Dashboard/StatusBadge';

interface LogDetailProps {
  logs: LogEntry[];
}

export const LogDetail: React.FC<LogDetailProps> = ({ logs }) => {
  const { jobs } = useJobsStore();
  const { isLogModalOpen, selectedLogId, setLogModalOpen, showToast } = useUiStore();

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

  // Mock attempts timeline depending on the current attemptNumber
  const getTimelineAttempts = () => {
    const list = [];
    const currentAttempt = log.attemptNumber;
    
    for (let i = 1; i <= currentAttempt; i++) {
      const isCurrent = i === currentAttempt;
      const status: 'success' | 'failed' | 'timeout' = isCurrent
        ? log.status
        : (i === 1 && currentAttempt === 3 ? 'timeout' : 'failed');
      const httpStatus = isCurrent
        ? (log.httpStatus || 500)
        : (status === 'timeout' ? 504 : 502);
      const timeOffset = isCurrent
        ? 'Agora'
        : `-${(currentAttempt - i) * 5}m`;

      list.push({
        attempt: i,
        status,
        httpStatus,
        time: timeOffset,
        message: status === 'success' ? 'Disparo OK' : status === 'timeout' ? 'Gateway Timeout' : 'Conexão Recusada',
      });
    }
    return list;
  };

  const timeline = getTimelineAttempts();

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
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Drawer Backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-[#04060c]/80 backdrop-filter backdrop-blur-sm transition-opacity duration-300 cursor-pointer animate-in fade-in"
      />

      {/* Drawer Panel Container */}
      <div className="absolute inset-y-0 right-0 max-w-lg w-full flex pl-10">
        <div className="w-full bg-[#070913]/95 border-l border-indigo-900/50 glass-panel shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300">
          
          {/* Header Section */}
          <div className="p-5 border-b border-indigo-950/30 flex justify-between items-center bg-indigo-950/15">
            <div className="flex items-center gap-3">
              <StatusBadge status={log.status} />
              <span className="text-[10px] text-slate-500 font-mono">
                ID: #{log.id.slice(0, 8)}
              </span>
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-indigo-950/60 scrollbar-track-transparent">

            {/* Task Meta details */}
            <div className="p-4 bg-indigo-950/10 border border-indigo-950/20 rounded-2xl space-y-2 relative overflow-hidden">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
              <span className="text-[8px] uppercase font-bold text-indigo-400 tracking-wider">
                Tarefa Associada
              </span>
              <h4 className="text-sm font-extrabold text-slate-200">
                {log.jobName || 'Tarefa Removida'}
              </h4>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Cron: <code className="text-indigo-400 font-bold font-mono">{job?.schedule || 'N/A'}</code></span>
                <span>Fuso: <span className="font-semibold">{job?.timezone || 'N/A'}</span></span>
              </div>
            </div>

            {/* Request Block */}
            <div className="space-y-2">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Webhook Request (Envio)
              </h5>
              <div className="space-y-3 p-4 bg-slate-950/40 border border-indigo-950/40 rounded-2xl">
                
                {/* Method & URL */}
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getMethodColor(job?.httpMethod || 'POST')}`}>
                    {job?.httpMethod || 'POST'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-mono truncate flex-1">
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
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}>
                        {log.httpStatus}
                      </span>
                    ) : (
                      <span className="text-rose-400 uppercase font-black">{log.status}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-400">
                    <span>Duração:</span>
                    <span className="font-bold text-slate-200">{log.durationMs ? `${log.durationMs}ms` : '-'}</span>
                  </div>
                </div>

                {/* Body/Payload response */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase">ResponseBody (Postgres Limit 2KB)</span>
                    {log.responseBody && (
                      <button
                        onClick={() => handleCopyText(log.responseBody || '', 'Corpo da resposta copiado!')}
                        className="text-[9px] font-bold text-indigo-400 hover:text-white transition-colors"
                      >
                        Copiar
                      </button>
                    )}
                  </div>
                  <div className="p-3 bg-[#05070e]/85 rounded-xl border border-indigo-950/30 font-mono text-[9px] text-indigo-400 max-h-[140px] overflow-auto neon-glow-inner">
                    {log.responseBody ? (
                      <pre className="whitespace-pre-wrap">{log.responseBody}</pre>
                    ) : (
                      <span className="text-slate-600 italic">Sem resposta retornada pelo endpoint</span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Retry Timeline */}
            <div className="space-y-3">
              <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Linha do Tempo de Tentativas
              </h5>
              
              <div className="relative border-l border-indigo-950/60 ml-3.5 pl-5.5 space-y-4">
                {timeline.map((item) => (
                  <div key={item.attempt} className="relative">
                    {/* Bullet indicator */}
                    <span className={`absolute -left-[30px] top-1 w-2.5 h-2.5 rounded-full border-2 ${
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

          {/* Footer Toolbar */}
          <div className="p-4 border-t border-indigo-950/30 bg-indigo-950/10 flex justify-between items-center gap-2">
            <button
              onClick={() => handleCopyText(JSON.stringify(log, null, 2), 'Objeto de log completo copiado para o clipboard! 📋')}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 rounded-xl border border-slate-700/30 transition-all cursor-pointer"
            >
              Copiar Log Completo
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary cursor-pointer"
            >
              Fechar Auditoria
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
