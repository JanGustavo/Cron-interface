import React, { useState, useEffect } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { StatusBadge } from '../Dashboard/StatusBadge';
import api from '../../services/api';
import type { Job } from '../../types/jobs';

export const JobModal: React.FC = () => {
  const { activeJob, setActiveJob, updateJob, deleteJob, triggerJob } = useJobsStore();
  const { isJobModalOpen, setJobModalOpen, showToast } = useUiStore();
  const [jobLogs, setJobLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastTriggerStatus, setLastTriggerStatus] = useState<{ code: number | null; ok: boolean } | null>(null);

  // Edit Mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSchedule, setEditSchedule] = useState('');
  const [editTimezone, setEditTimezone] = useState('');
  const [editMethod, setEditMethod] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editHeaders, setEditHeaders] = useState('');
  const [editPayload, setEditPayload] = useState('');
  const [editWebhookAlertUrl, setEditWebhookAlertUrl] = useState('');

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

  useEffect(() => {
    if (activeJob && !isEditing) {
      setEditName(activeJob.name || '');
      setEditSchedule(activeJob.schedule || '');
      setEditTimezone(activeJob.timezone || 'UTC');
      setEditMethod(activeJob.httpMethod || 'GET');
      setEditUrl(activeJob.url || '');
      setEditHeaders(activeJob.headers ? JSON.stringify(activeJob.headers, null, 2) : '');
      setEditPayload(activeJob.payload ? JSON.stringify(activeJob.payload, null, 2) : '');
      setEditWebhookAlertUrl(activeJob.webhookAlertUrl || '');
    }
  }, [activeJob, isEditing]);

  if (!isJobModalOpen || !activeJob) return null;

  const handleClose = () => {
    setIsEditing(false);
    setJobModalOpen(false);
    setActiveJob(null);
  };

  const handleToggleStatus = () => {
    const nextStatus = (activeJob.status === 'paused' || activeJob.status === 'failing') ? 'active' : 'paused';
    // Sync kanban status appropriately
    const nextKanban = nextStatus === 'paused' ? 'draft' : 'scheduled';
    const consecutiveFailures = nextStatus === 'active' ? 0 : activeJob.consecutiveFailures;
    updateJob({
      ...activeJob,
      status: nextStatus,
      kanbanStatus: nextKanban,
      consecutiveFailures,
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

  const handleSave = async () => {
    if (!editName.trim()) {
      showToast('O nome do job não pode estar vazio', 'error');
      return;
    }
    if (!editUrl.trim()) {
      showToast('A URL do job não pode estar vazia', 'error');
      return;
    }
    if (!editSchedule.trim()) {
      showToast('O agendamento cron não pode estar vazio', 'error');
      return;
    }

    let parsedHeaders = null;
    if (editHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(editHeaders);
        if (typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
          showToast('Headers deve ser um objeto JSON válido', 'error');
          return;
        }
      } catch (e: any) {
        showToast(`Erro nos Headers JSON: ${e.message}`, 'error');
        return;
      }
    }

    let parsedPayload = null;
    if (editPayload.trim() && editMethod !== 'GET') {
      try {
        parsedPayload = JSON.parse(editPayload);
      } catch (e: any) {
        showToast(`Erro no Payload JSON: ${e.message}`, 'error');
        return;
      }
    }

    try {
      const updatedJob: Job = {
        ...activeJob,
        name: editName.trim(),
        url: editUrl.trim(),
        schedule: editSchedule.trim(),
        timezone: editTimezone.trim(),
        httpMethod: editMethod as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        headers: parsedHeaders || undefined,
        payload: parsedPayload || undefined,
        webhookAlertUrl: editWebhookAlertUrl.trim() || undefined,
      };

      await updateJob(updatedJob);
      setIsEditing(false);
      showToast('Tarefa atualizada com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(`Erro ao salvar tarefa: ${err.message || 'erro interno'}`, 'error');
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
          <div className="flex items-center gap-3 flex-1 mr-4">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full max-w-[360px] px-3 py-1.5 bg-slate-950/80 border border-indigo-500/30 rounded-lg text-sm font-extrabold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-sans"
                placeholder="Nome da tarefa"
              />
            ) : (
              <h3 className="text-base font-extrabold text-slate-100 tracking-wide truncate max-w-[360px]">
                {activeJob.name}
              </h3>
            )}
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

          {/* Suspended alert banner */}
          {(activeJob.consecutiveFailures >= 3 || activeJob.status === 'failing') && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-xs text-rose-300 font-medium">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="space-y-1">
                <p className="font-extrabold text-rose-200">Serviço Suspenso (Limite de Tentativas Atingido)</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Este agendamento foi temporariamente suspenso após falhar <strong>3 vezes consecutivas</strong>. Nenhuma nova execução automática será disparada até que o problema seja resolvido e você clique em <strong>"Reativar"</strong> ou dispare ela manualmente com sucesso para redefinir as tentativas.
                </p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Agendamento</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="w-full bg-slate-950/80 border border-indigo-500/20 rounded-lg px-2 py-1 text-xs font-semibold text-slate-200 mt-1 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  placeholder="*/5 * * * *"
                />
              ) : (
                <div className="text-xs font-semibold text-slate-200 mt-1 font-mono">{activeJob.schedule}</div>
              )}
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fuso Horário</span>
              {isEditing ? (
                <select
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-500/20 rounded-lg px-1 py-1 text-xs font-semibold text-slate-200 mt-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  {editTimezone && !['UTC', 'America/Sao_Paulo', 'America/New_York', 'Europe/London'].includes(editTimezone) && (
                    <option value={editTimezone}>{editTimezone}</option>
                  )}
                </select>
              ) : (
                <div className="text-xs font-semibold text-slate-200 mt-1">{activeJob.timezone}</div>
              )}
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Método HTTP</span>
              {isEditing ? (
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-500/20 rounded-lg px-2 py-1 text-xs font-black text-indigo-400 mt-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              ) : (
                <div className="text-xs font-black text-indigo-400 mt-1">{activeJob.httpMethod}</div>
              )}
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Falhas Seguidas</span>
              <div className="text-xs font-bold text-rose-400 mt-1">{activeJob.consecutiveFailures} / 3</div>
            </div>
          </div>

          {/* Webhook Destination URL */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Destino (Webhook URL)</label>
            {isEditing ? (
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/20 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                placeholder="https://api.exemplo.com/webhook"
              />
            ) : (
              <div className="px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-xs font-mono text-slate-300 break-all select-all select-none">
                {activeJob.url}
              </div>
            )}
          </div>

          {/* Webhook Alert URL (Optional) */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Webhook de Alerta (Opcional)</label>
            {isEditing ? (
              <input
                type="url"
                value={editWebhookAlertUrl}
                onChange={(e) => setEditWebhookAlertUrl(e.target.value)}
                className="w-full bg-slate-950 border border-indigo-500/20 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                placeholder="https://hooks.slack.com/services/..."
              />
            ) : (
              <div className="px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-xs font-mono text-slate-300 break-all select-all select-none">
                {activeJob.webhookAlertUrl || <span className="text-slate-600 italic">Nenhum webhook de alerta configurado</span>}
              </div>
            )}
          </div>

          {/* Headers & Payload Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Headers Area */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Headers HTTP (JSON)</label>
              {isEditing ? (
                <textarea
                  value={editHeaders}
                  onChange={(e) => setEditHeaders(e.target.value)}
                  className="w-full min-h-[140px] px-4 py-3 bg-slate-950 border border-indigo-500/20 rounded-xl font-mono text-xs text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-600"
                  placeholder='{\n  "Authorization": "Bearer ..."\n}'
                />
              ) : (
                <div className="flex-1 min-h-[140px] px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl font-mono text-xs text-indigo-400 overflow-auto max-h-[140px]">
                  {activeJob.headers ? (
                    <pre>{JSON.stringify(activeJob.headers, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-600 italic text-[11px]">Nenhum header configurado</span>
                  )}
                </div>
              )}
            </div>

            {/* Payload Area */}
            <div className="space-y-2 flex flex-col">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Payload POST (Body JSON)</label>
              {isEditing ? (
                <textarea
                  value={editPayload}
                  onChange={(e) => setEditPayload(e.target.value)}
                  disabled={editMethod === 'GET'}
                  className={`w-full min-h-[140px] px-4 py-3 bg-slate-950 border rounded-xl font-mono text-xs text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-600 ${
                    editMethod === 'GET' ? 'opacity-40 cursor-not-allowed border-indigo-950/20' : 'border-indigo-500/20'
                  }`}
                  placeholder={editMethod === 'GET' ? 'Não disponível para método GET' : '{\n  "data": "value"\n}'}
                />
              ) : (
                <div className="flex-1 min-h-[140px] px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl font-mono text-xs text-indigo-400 overflow-auto max-h-[140px]">
                  {activeJob.payload ? (
                    <pre>{JSON.stringify(activeJob.payload, null, 2)}</pre>
                  ) : (
                    <span className="text-slate-600 italic text-[11px]">Nenhum payload configurado</span>
                  )}
                </div>
              )}
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
          {isEditing ? (
            <>
              {/* Cancel Button */}
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary"
              >
                Salvar Alterações
              </button>
            </>
          ) : (
            <>
              {/* Left Deletar Action */}
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-semibold text-rose-400 hover:text-white bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/30 rounded-xl transition-all"
              >
                Deletar Tarefa
              </button>

              {/* Right Action Stack */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 text-xs font-semibold text-indigo-400 hover:text-white bg-indigo-950/10 hover:bg-indigo-950/40 border border-indigo-950/30 rounded-xl transition-all"
                >
                  Editar Tarefa ✏️
                </button>

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
                    activeJob.status === 'paused' || activeJob.status === 'failing'
                      ? 'text-emerald-400 bg-emerald-950/10 border-emerald-950/30 hover:bg-emerald-950/30'
                      : 'text-amber-400 bg-amber-950/10 border-amber-950/30 hover:bg-amber-950/30'
                  }`}
                >
                  {activeJob.status === 'paused' || activeJob.status === 'failing' ? 'Reativar' : 'Pausar'}
                </button>
                <button
                  onClick={handleTriggerNow}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary"
                >
                  Executar Agora ⚡
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
