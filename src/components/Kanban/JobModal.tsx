import React, { useState, useEffect } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { StatusBadge } from '../Dashboard/StatusBadge';
import api from '../../services/api';

export const JobModal: React.FC = () => {
  const { activeJob, setActiveJob, updateJob, deleteJob, triggerJob } = useJobsStore();
  const { isJobModalOpen, setJobModalOpen, showToast } = useUiStore();
  const [jobLogs, setJobLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastTriggerStatus, setLastTriggerStatus] = useState<{ code: number | null; ok: boolean } | null>(null);

  useEffect(() => {
    if (!activeJob || !isJobModalOpen) return;
    setLoadingLogs(true);
    api.get(`/v1/jobs/${activeJob.id}/executions?limit=5`)
      .then((res) => {
        setJobLogs(res.data || []);
      })
      .catch((err) => {
        console.error("Erro ao carregar execuções do job:", err);
      })
      .finally(() => {
        setLoadingLogs(false);
      });
  }, [activeJob, isJobModalOpen]);

  if (!isJobModalOpen || !activeJob) return null;

  const handleClose = () => {
    setJobModalOpen(false);
    setActiveJob(null);
  };

  const handleToggleStatus = () => {
    const nextStatus = activeJob.status === 'paused' ? 'active' : 'paused';
    // Sync kanban status appropriately
    const nextKanban = nextStatus === 'paused' ? 'draft' : 'scheduled';
    updateJob({
      ...activeJob,
      status: nextStatus,
      kanbanStatus: nextKanban,
    });
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja deletar a tarefa "${activeJob.name}"?`)) {
      deleteJob(activeJob.id);
      handleClose();
    }
  };

  const handleTriggerNow = async () => {
    try {
      const result = await triggerJob(activeJob.id);
      setLastTriggerStatus({ code: result.status, ok: result.status >= 200 && result.status < 300 });
      showToast(`Disparo de webhook manual iniciado para ${activeJob.url}`, 'success');
    } catch (err: any) {
      console.error(err);
      const status = typeof err?.status === 'number' ? err.status : null;
      setLastTriggerStatus({ code: status, ok: false });
      showToast(`Falha ao disparar tarefa: ${err.message || 'erro interno'}`, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay backdrop */}
      <div
        className="fixed inset-0 bg-[#04060c]/80 backdrop-filter backdrop-blur-sm cursor-pointer"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-900/50 glass-panel shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden select-none animate-in fade-in zoom-in duration-300">
        
        {/* Header Section */}
        <div className="p-5 border-b border-indigo-950/30 flex justify-between items-center bg-indigo-950/10">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-extrabold text-slate-100 tracking-wide truncate max-w-[360px]">
              {activeJob.name}
            </h3>
            <StatusBadge status={activeJob.status} />
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

        {/* Modal Content Scrollable Area */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Agendamento</span>
              <div className="text-xs font-semibold text-slate-200 mt-1 font-mono">{activeJob.schedule}</div>
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fuso Horário</span>
              <div className="text-xs font-semibold text-slate-200 mt-1">{activeJob.timezone}</div>
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Método HTTP</span>
              <div className="text-xs font-black text-indigo-400 mt-1">{activeJob.httpMethod}</div>
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Falhas Seguidas</span>
              <div className="text-xs font-bold text-rose-400 mt-1">{activeJob.consecutiveFailures} / 3</div>
            </div>
          </div>

          {/* Webhook Destination URL */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Destino (Webhook URL)</label>
            <div className="px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-xs font-mono text-slate-300 break-all select-all select-none">
              {activeJob.url}
            </div>
          </div>

          {/* Headers & Payload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Headers Area */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Headers HTTP</label>
              <div className="flex-1 px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl font-mono text-xs text-indigo-400 overflow-auto max-h-[140px]">
                {activeJob.headers ? (
                  <pre>{JSON.stringify(activeJob.headers, null, 2)}</pre>
                ) : (
                  <span className="text-slate-600 italic">Nenhum header configurado</span>
                )}
              </div>
            </div>

            {/* Payload Area */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payload POST (Body)</label>
              <div className="flex-1 px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl font-mono text-xs text-indigo-400 overflow-auto max-h-[140px]">
                {activeJob.payload ? (
                  <pre>{JSON.stringify(activeJob.payload, null, 2)}</pre>
                ) : (
                  <span className="text-slate-600 italic">Nenhum payload configurado</span>
                )}
              </div>
            </div>
          </div>

          {/* Executions Logs Section */}
          <div className="space-y-3">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Logs de Execução Recentes</label>
            <div className="border border-indigo-950/30 rounded-xl overflow-hidden text-xs">
              {loadingLogs ? (
                <div className="p-4 text-center text-slate-500 animate-pulse bg-indigo-950/5">Carregando execuções...</div>
              ) : jobLogs.length > 0 ? (
                jobLogs.map((log) => (
                  <div key={log.id} className="p-3.5 bg-indigo-950/10 border-b border-indigo-950/20 last:border-0 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {log.httpStatus || 'ERR'} {log.status === 'success' ? 'SUCCESS' : log.status.toUpperCase()}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {new Date(log.triggeredAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <span className="font-mono text-slate-500 text-[10px]">{log.durationMs}ms</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 italic bg-indigo-950/5">Nenhuma execução registrada para este job.</div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Toolbar Actions */}
        <div className="p-5 border-t border-indigo-950/30 bg-indigo-950/10 flex flex-wrap gap-2 justify-between items-center">
          {/* Left Deletar Action */}
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/30 rounded-xl transition-all"
          >
            Deletar Tarefa
          </button>

          {/* Right Action Stack */}
          <div className="flex gap-2">
            {lastTriggerStatus && (
              <span
                className={`px-2.5 py-2 text-[9px] font-bold rounded-xl border uppercase tracking-wider self-center ${
                  lastTriggerStatus.ok
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                HTTP {lastTriggerStatus.code ?? 'ERR'}
              </span>
            )}
            <button
              onClick={handleToggleStatus}
              className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                activeJob.status === 'paused'
                  ? 'text-emerald-400 bg-emerald-950/10 border-emerald-950/30 hover:bg-emerald-950/30'
                  : 'text-amber-400 bg-amber-950/10 border-amber-950/30 hover:bg-amber-950/30'
              }`}
            >
              {activeJob.status === 'paused' ? 'Reativar' : 'Pausar'}
            </button>
            <button
              onClick={handleTriggerNow}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary"
            >
              Executar Agora ⚡
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
