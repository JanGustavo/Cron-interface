import React, { useState, useEffect, useCallback } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { StatusBadge } from '../Dashboard/StatusBadge';
import { translateSchedule } from '../Shared/cronTranslator';
import api from '../../services/api';
import type { Job, JobLog } from '../../types/jobs';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { useEntitlements } from '../../hooks/useEntitlements';
import { validateDestinationUrl } from '../../utils/urlValidator';

const formatNextRun = (nextRunAt: string): string => {
  if (!nextRunAt) return '—';
  try {
    const date = new Date(nextRunAt);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    });
  } catch {
    return nextRunAt;
  }
};

const getNextRunPreview = (schedule: string, timezone: string): string => {
  if (!schedule || !timezone) return '—';
  try {
    const now = new Date();
    
    if (schedule.startsWith('every:')) {
      const parts = schedule.split(':');
      if (parts.length < 2) return '—';
      const val = parts[1];
      const num = parseInt(val, 10);
      const unit = val.replace(/[0-9]/g, '');
      if (isNaN(num)) return '—';
      
      let duration: number;
      if (unit === 'm') duration = num * 60 * 1000;
      else if (unit === 'h') duration = num * 60 * 60 * 1000;
      else return '—';
      
      const next = new Date(now.getTime() + duration);
      return next.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      });
    }
    
    // For cron expressions, use a simple approximation
    // This is a basic preview - exact calculation happens on backend
    const cronParts = schedule.split(/\s+/);
    if (cronParts.length !== 5) return 'Calculado no servidor';
    
    const [min, hour] = cronParts;
    if (min !== '*' && hour !== '*' && cronParts[2] === '*' && cronParts[3] === '*' && cronParts[4] === '*') {
      // Daily at specific time
      const next = new Date(now);
      next.setHours(parseInt(hour, 10), parseInt(min, 10), 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      return next.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZoneName: 'short'
      });
    }
    
    if (min.startsWith('*/') && hour === '*') {
      const step = parseInt(min.split('/')[1], 10);
      if (!isNaN(step)) {
        const next = new Date(now.getTime() + step * 60 * 1000);
        return next.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZoneName: 'short'
        });
      }
    }
    
    return 'Calculado no servidor';
  } catch {
    return '—';
  }
};

export const JobModal: React.FC = () => {
  const { activeJob, setActiveJob, updateJob, deleteJob, triggerJob, jobs, fetchJobs } = useJobsStore();
  const { isJobModalOpen, setJobModalOpen, showToast, setPlansModalOpen } = useUiStore();
  const { alertsWebhooksEnabled, workflowsEnabled } = useEntitlements();
  const [jobLogs, setJobLogs] = useState<JobLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastTriggerStatus, setLastTriggerStatus] = useState<{ code: number | null; ok: boolean } | null>(null);

  const currentJob = activeJob ? (jobs.find(j => j.id === activeJob.id) || activeJob) : activeJob;

  const computedFailures = (() => {
    if (!currentJob) return 0;
    if (currentJob.status === 'failing' || currentJob.kanbanStatus === 'failed') {
      return 4;
    }
    const baseCount = currentJob.consecutiveFailures || 0;
    let logConsecutive = 0;
    for (const log of jobLogs) {
      if (log.status === 'failed' || log.status === 'timeout' || (log.httpStatus && log.httpStatus >= 400)) {
        logConsecutive++;
      } else {
        break;
      }
    }
    return Math.min(4, Math.max(baseCount, logConsecutive));
  })();

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
  const [editNextJobId, setEditNextJobId] = useState('');
  const [editTagsInput, setEditTagsInput] = useState('');

  const fetchJobLogs = useCallback(() => {
    if (!activeJob) return;
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
  }, [activeJob]);

  useEffect(() => {
    if (!activeJob || !isJobModalOpen) return;
    const timer = setTimeout(() => {
      fetchJobLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [activeJob, isJobModalOpen, fetchJobLogs]);

  useEffect(() => {
    if (computedFailures >= 4 && currentJob && (currentJob.consecutiveFailures < 4 || currentJob.status !== 'failing')) {
      updateJob({
        ...currentJob,
        consecutiveFailures: 4,
        status: 'failing',
        kanbanStatus: 'failed',
      });
    }
  }, [computedFailures, currentJob?.id, currentJob?.consecutiveFailures, currentJob?.status]);

  useEffect(() => {
    if (activeJob && !isEditing) {
      const timer = setTimeout(() => {
        setEditName(activeJob.name || '');
        setEditSchedule(activeJob.schedule || '');
        setEditTimezone(activeJob.timezone || 'UTC');
        setEditMethod(activeJob.httpMethod || 'GET');
        setEditUrl(activeJob.url || '');
        setEditHeaders(activeJob.headers ? JSON.stringify(activeJob.headers, null, 2) : '');
        setEditPayload(activeJob.payload ? JSON.stringify(activeJob.payload, null, 2) : '');
        setEditWebhookAlertUrl(activeJob.webhookAlertUrl || '');
        setEditNextJobId(activeJob.nextJobId || '');
        setEditTagsInput(activeJob.tags ? activeJob.tags.join(', ') : '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeJob, isEditing]);

  if (!isJobModalOpen || !activeJob) return null;

  const handleClose = () => {
    setIsEditing(false);
    setJobModalOpen(false);
    setActiveJob(null);
  };

  const isJobPausedOrFailing = currentJob?.status === 'paused' || currentJob?.status === 'failing' || computedFailures >= 3;

  const handleToggleStatus = () => {
    if (!activeJob) return;
    
    if (!isJobPausedOrFailing) {
      Swal.fire({
        title: 'Pausar tarefa?',
        text: `Deseja realmente pausar os agendamentos da tarefa "${activeJob.name}"? Ela não será executada até que você a reative.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, pausar!',
        cancelButtonText: 'Não, cancelar',
        background: '#0a0f1d',
        color: '#cbd5e1',
        iconColor: '#f59e0b',
        customClass: {
          popup: 'border border-indigo-950/60 rounded-3xl shadow-2xl bg-[#090c15] text-left font-sans',
          title: 'text-base font-bold text-slate-100 px-6 pt-6',
          htmlContainer: 'text-xs text-slate-400 font-medium leading-normal px-6 pb-4',
          actions: 'px-6 pb-6 flex justify-end gap-2',
          confirmButton: 'px-4 py-2 text-xs font-bold text-white bg-amber-650 hover:bg-amber-500 rounded-xl transition-all shadow-md cursor-pointer',
          cancelButton: 'px-4 py-2 text-xs font-semibold text-slate-450 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer',
        },
        buttonsStyling: false,
      }).then((result) => {
        if (result.isConfirmed) {
          executeToggleStatus();
        }
      });
    } else {
      executeToggleStatus();
    }
  };

  const executeToggleStatus = () => {
    const nextStatus = isJobPausedOrFailing ? 'active' : 'paused';
    const nextKanban = nextStatus === 'paused' ? 'draft' : 'scheduled';
    const consecutiveFailures = 0;
    updateJob({
      ...activeJob,
      status: nextStatus,
      kanbanStatus: nextKanban,
      consecutiveFailures,
    });
    showToast(nextStatus === 'paused' ? 'Tarefa pausada com sucesso.' : 'Tarefa reativada com sucesso. Falhas zeradas (0/3).', 'success');
  };

  const handleDelete = () => {
    if (!activeJob) return;

    Swal.fire({
      title: 'Excluir tarefa?',
      text: `Tem certeza que deseja deletar permanentemente a tarefa "${activeJob.name}"? Esta ação não pode ser desfeita.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Não, cancelar',
      background: '#0a0f1d',
      color: '#cbd5e1',
      iconColor: '#f43f5e',
      customClass: {
        popup: 'border border-indigo-950/60 rounded-3xl shadow-2xl bg-[#090c15] text-left font-sans',
        title: 'text-base font-bold text-slate-100 px-6 pt-6',
        htmlContainer: 'text-xs text-slate-400 font-medium leading-normal px-6 pb-4',
        actions: 'px-6 pb-6 flex justify-end gap-2',
        confirmButton: 'px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md cursor-pointer',
        cancelButton: 'px-4 py-2 text-xs font-semibold text-slate-450 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer',
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        deleteJob(activeJob.id);
        handleClose();
        showToast('Tarefa excluída com sucesso.', 'success');
      }
    });
  };

  const handleTriggerNow = () => {
    if (!activeJob) return;

    Swal.fire({
      title: 'Disparar agora?',
      text: `Deseja realmente forçar um disparo de webhook imediato para "${activeJob.url}"? Isso gerará um novo registro de execução e pode causar efeitos colaterais caso o endpoint de destino não esteja preparado para receber replays.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, disparar!',
      cancelButtonText: 'Não, cancelar',
      background: '#0a0f1d',
      color: '#cbd5e1',
      iconColor: '#06b6d4',
      customClass: {
        popup: 'border border-indigo-950/60 rounded-3xl shadow-2xl bg-[#090c15] text-left font-sans',
        title: 'text-base font-bold text-slate-100 px-6 pt-6',
        htmlContainer: 'text-xs text-slate-400 font-medium leading-normal px-6 pb-4',
        actions: 'px-6 pb-6 flex justify-end gap-2',
        confirmButton: 'px-4 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-md cursor-pointer',
        cancelButton: 'px-4 py-2 text-xs font-semibold text-slate-450 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer',
      },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) {
        executeTriggerNow();
      }
    });
  };

  const executeTriggerNow = async () => {
    try {
      const result = await triggerJob(activeJob.id);
      setLastTriggerStatus({ code: result.status, ok: result.status >= 200 && result.status < 300 });
      showToast(`Disparo manual iniciado para ${activeJob.url}`, 'success');
      showToast(`ℹ️ Política de retentativas: 1ª tent (10s) ➔ 2ª tent (20s) ➔ Circuito (3/3)`, 'info');
      setTimeout(() => {
        api.get(`/v1/jobs/${activeJob.id}/executions?limit=5`)
          .then((res) => setJobLogs(res.data || []))
          .catch(() => {});
        fetchJobs();
      }, 1000);
    } catch (err) {
      console.error(err);
      const errorObj = err as { status?: number; message?: string };
      const status = typeof errorObj?.status === 'number' ? errorObj.status : null;
      setLastTriggerStatus({ code: status, ok: false });
      showToast(`Falha ao disparar tarefa: ${errorObj.message || 'erro interno'}`, 'error');
    }
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      showToast('O nome do job não pode estar vazio', 'error');
      return;
    }
    const urlValidation = validateDestinationUrl(editUrl);
    if (!urlValidation.isValid) {
      showToast(urlValidation.error || 'A URL de destino é inválida', 'error');
      return;
    }
    if (!editSchedule.trim()) {
      showToast('O agendamento cron não pode estar vazio', 'error');
      return;
    }
    if (editWebhookAlertUrl.trim()) {
      try {
        const u = new URL(editWebhookAlertUrl.trim());
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          showToast('O Webhook de Alerta deve ser um URL válido (começando com http:// ou https://).', 'error');
          return;
        }
      } catch {
        showToast('O Webhook de Alerta deve ser um URL válido.', 'error');
        return;
      }
    }
    let parsedHeaders = null;
    if (editHeaders.trim()) {
      try {
        parsedHeaders = JSON.parse(editHeaders);
        if (typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
          showToast('Headers deve ser um objeto JSON válido', 'error');
          return;
        }
      } catch (e) {
        const errorObj = e as Error;
        showToast(`Erro nos Headers JSON: ${errorObj.message}`, 'error');
        return;
      }
    }

    let parsedPayload = null;
    if (editPayload.trim() && editMethod !== 'GET' && editMethod !== 'HEAD') {
      try {
        parsedPayload = JSON.parse(editPayload);
      } catch (e) {
        const errorObj = e as Error;
        showToast(`Erro no Payload JSON: ${errorObj.message}`, 'error');
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
        httpMethod: editMethod as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD',
        headers: parsedHeaders || undefined,
        payload: parsedPayload || undefined,
        webhookAlertUrl: editWebhookAlertUrl.trim() || undefined,
        nextJobId: editNextJobId.trim() || null,
        tags: editTagsInput.trim() ? editTagsInput.split(',').map((t) => t.trim()).filter(Boolean) : [],
      };

      await updateJob(updatedJob);
      setIsEditing(false);
      showToast('Tarefa atualizada com sucesso!', 'success');
    } catch (err) {
      console.error(err);
      const errorObj = err as { message?: string };
      showToast(`Erro ao salvar tarefa: ${errorObj.message || 'erro interno'}`, 'error');
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
      <div className="w-full max-w-3xl lg:max-w-4xl rounded-3xl border border-indigo-900/50 glass-panel shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden select-none animate-in fade-in zoom-in duration-300">
        
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
            <StatusBadge status={computedFailures >= 4 ? 'paused' : (currentJob?.status || activeJob.status)} attemptNumber={computedFailures > 0 ? computedFailures : undefined} />
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
          {(activeJob.consecutiveFailures >= 4 || activeJob.status === 'failing') && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-3 text-xs text-rose-300 font-medium">
              <svg className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="space-y-1">
                <p className="font-extrabold text-rose-200">Serviço Suspenso (Limite de Retentativas Atingido)</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Este agendamento foi temporariamente suspenso após falhar na <strong>tentativa inicial + 3 retentativas consecutivas</strong>. Nenhuma nova execução automática será disparada até que o problema seja resolvido e você clique em <strong>"Reativar"</strong> ou dispare ela manualmente com sucesso para redefinir as tentativas.
                </p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Agendamento</span>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    value={editSchedule}
                    onChange={(e) => setEditSchedule(e.target.value)}
                    className="w-full bg-slate-950/80 border border-indigo-500/20 rounded-lg px-2 py-1 text-xs font-semibold text-slate-200 mt-1 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                    placeholder="*/5 * * * *"
                  />
                  {editSchedule.trim() && (
                    <span className="text-[9px] text-cyan-400 font-semibold block pt-0.5 font-mono">
                      ⏱️ {translateSchedule(editSchedule)}
                    </span>
                  )}
                  {editSchedule.trim() && editTimezone.trim() && (
                    <span className="text-[9px] text-indigo-400 font-semibold block pt-1.5 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                      Próxima execução estimada: {getNextRunPreview(editSchedule, editTimezone)}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs font-mono font-bold text-slate-100">{activeJob.schedule}</span>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-300">
                      ⏱️ {translateSchedule(activeJob.schedule)}
                    </span>
                  </div>
                  <div className="mt-2.5 pt-2 border-t border-indigo-950/40">
                    {(currentJob?.status === 'failing' || computedFailures >= 3) ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-semibold bg-rose-950/20 border border-rose-500/25 px-2.5 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                        <span className="font-mono">Suspenso (3/3) — Reative a tarefa</span>
                      </div>
                    ) : (currentJob?.status === 'paused') ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold bg-amber-950/20 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                        <span className="font-mono">Pausado pelo usuário — Reative para agendar</span>
                      </div>
                    ) : (currentJob?.nextRunAt || activeJob.nextRunAt) ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-semibold bg-cyan-950/20 border border-cyan-500/25 px-2.5 py-1 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                        <span className="font-mono truncate">Próxima: {formatNextRun(currentJob?.nextRunAt || activeJob.nextRunAt)}</span>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fuso Horário</span>
              {isEditing ? (
                <select
                  value={editTimezone}
                  onChange={(e) => setEditTimezone(e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-500/20 rounded-lg px-2 py-1.5 pr-8 text-xs font-semibold text-slate-200 mt-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
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
                  className="w-full bg-slate-950 border border-indigo-500/20 rounded-lg px-2 py-1.5 pr-8 text-xs font-black text-indigo-400 mt-1 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 appearance-none bg-no-repeat bg-[right_0.5rem_center] bg-[length:1em_1em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')]"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="HEAD">HEAD</option>
                </select>
              ) : (
                <div className="text-xs font-black text-indigo-400 mt-1">{activeJob.httpMethod}</div>
              )}
            </div>
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Retentativas com falha</span>
              <div className="text-xs font-bold text-rose-400 mt-1">
                {Math.max(0, computedFailures - 1)} / 3
              </div>
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
              <>
                <input
                  type="url"
                  value={editWebhookAlertUrl}
                  onChange={(e) => setEditWebhookAlertUrl(e.target.value)}
                  className={`w-full bg-slate-950 border border-indigo-500/20 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 ${!alertsWebhooksEnabled ? 'opacity-50 cursor-not-allowed border-red-500/20' : ''}`}
                  placeholder={alertsWebhooksEnabled ? "https://hooks.slack.com/services/..." : "Bloqueado no seu plano. Faça upgrade para o Plano PRO! 🔒"}
                  disabled={!alertsWebhooksEnabled}
                />
                {!alertsWebhooksEnabled && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[9px] font-semibold font-mono select-none animate-in fade-in slide-in-from-top-1 duration-200 mt-1.5 cursor-pointer hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                    onClick={() => setPlansModalOpen(true)}
                  >
                    <span className="text-amber-500">🔒</span>
                    <span>Webhook de alerta é exclusivo do Plano PRO.</span>
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-xs font-mono text-slate-300 break-all select-all select-none">
                {activeJob.webhookAlertUrl || <span className="text-slate-600 italic">Nenhum webhook de alerta configurado</span>}
              </div>
            )}
          </div>
 
          {/* Workflow Chaining & Tags Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Próximo Job (Workflow Chaining) */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
                <span>Próximo Job (Workflow)</span>
                <span
                  className="text-[8px] font-black uppercase tracking-widest bg-[length:300%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]"
                  style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
                  title="Encadeamento de Workflows PRO ✨"
                >
                  PRO ✨
                </span>
              </label>
              {isEditing ? (
                <>
                  <select
                    value={editNextJobId}
                    onChange={(e) => setEditNextJobId(e.target.value)}
                    className={`w-full bg-slate-950 border border-indigo-500/20 rounded-xl px-4 py-3 pr-10 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 select-none appearance-none bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em] bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2322d3ee%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222.5%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] ${!workflowsEnabled ? 'opacity-50 cursor-not-allowed border-red-500/20' : ''}`}
                    disabled={!workflowsEnabled}
                  >
                    <option value="">{workflowsEnabled ? "Nenhum (Finalizar Fluxo)" : "Bloqueado no seu plano. Faça upgrade!"}</option>
                    {workflowsEnabled && jobs.filter(jb => jb.id !== activeJob.id).map((jb) => (
                      <option key={jb.id} value={jb.id}>
                        {jb.name} ({jb.schedule})
                      </option>
                    ))}
                  </select>
                  {!workflowsEnabled && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[9px] font-semibold font-mono select-none animate-in fade-in slide-in-from-top-1 duration-200 mt-1.5 cursor-pointer hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                      onClick={() => setPlansModalOpen(true)}
                    >
                      <span className="text-amber-500">🔒</span>
                      <span>Encadeamento (Workflows) é exclusivo do Plano PRO.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl text-xs font-mono text-slate-300 select-none">
                  {activeJob.nextJobId ? (
                    (() => {
                      const nextJ = jobs.find(j => j.id === activeJob.nextJobId);
                      return nextJ ? `🔗 ${nextJ.name} (${nextJ.schedule})` : `🔗 ${activeJob.nextJobId}`;
                    })()
                  ) : (
                    <span className="text-slate-600 italic">Nenhum próximo job (fim do fluxo)</span>
                  )}
                </div>
              )}
            </div>

            {/* Tags Badges / Input */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editTagsInput}
                  onChange={(e) => setEditTagsInput(e.target.value)}
                  className="w-full bg-slate-950 border border-indigo-500/20 rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                  placeholder="Ex: sync, billing, prod"
                />
              ) : (
                <div className="px-4 py-3 bg-slate-900/60 border border-indigo-950/40 rounded-xl flex flex-wrap gap-1.5 min-h-[42px] items-center">
                  {activeJob.tags && activeJob.tags.length > 0 ? (
                    activeJob.tags.map((tg, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/35 text-[9px] font-bold text-indigo-300 uppercase font-mono tracking-wider">
                        {tg}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 italic text-xs">Sem tags configuradas</span>
                  )}
                </div>
              )}
            </div>
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
                  disabled={editMethod === 'GET' || editMethod === 'HEAD'}
                  className={`w-full min-h-[140px] px-4 py-3 bg-slate-950 border rounded-xl font-mono text-xs text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 placeholder-slate-600 ${
                    editMethod === 'GET' || editMethod === 'HEAD' ? 'opacity-40 cursor-not-allowed border-indigo-950/20' : 'border-indigo-500/20'
                  }`}
                  placeholder={editMethod === 'GET' || editMethod === 'HEAD' ? `Não disponível para método ${editMethod}` : '{\n  "data": "value"\n}'}
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

          {/* Execution History Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Logs de Execução Recentes</h4>
              <button
                onClick={fetchJobLogs}
                disabled={loadingLogs}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <svg className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Atualizar</span>
              </button>
            </div>

            <div className="rounded-xl border border-indigo-950/40 overflow-hidden bg-slate-950/20 max-h-56 overflow-y-auto">
              {loadingLogs ? (
                <div className="p-4 text-center text-slate-500 animate-pulse bg-indigo-950/5">Carregando execuções...</div>
              ) : jobLogs.length > 0 ? (
                jobLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className={`p-3.5 border-b border-indigo-950/25 last:border-0 flex flex-col gap-2 transition-colors ${
                      idx % 2 === 0
                        ? 'bg-[#070a1a]/60 hover:bg-indigo-950/40'
                        : 'bg-[#0e132e]/70 hover:bg-indigo-950/50'
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          log.status === 'success'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {log.httpStatus || 'ERR'} {log.status === 'success' ? 'SUCCESS' : log.status.toUpperCase()}
                        </span>
                        {log.attemptNumber === 1 ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-950/60 border border-slate-800 text-slate-400 whitespace-nowrap">
                            Tentativa Inicial
                          </span>
                        ) : log.attemptNumber && log.attemptNumber > 1 ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 whitespace-nowrap flex items-center gap-1">
                            <span>🔄 Retentativa {log.attemptNumber - 1} de 3</span>
                          </span>
                        ) : null}
                        <span className="text-slate-400 font-mono text-[10px]">
                          {new Date(log.triggeredAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <span className="font-mono text-slate-500 text-[10px]">
                        {log.durationMs !== undefined && log.durationMs !== null ? `${log.durationMs}ms` : '-'}
                      </span>
                    </div>
                    {log.status !== 'success' && log.responseBody && (
                      <div className="mt-1 p-2 rounded bg-rose-950/20 border border-rose-900/30 font-mono text-[10px] text-rose-300 break-all select-all">
                        {log.responseBody}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-xs">Nenhuma execução registrada para este job ainda.</div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-4 sm:p-6 border-t border-indigo-950/30 bg-indigo-950/5">
          {isEditing ? (
            <div className="flex justify-end gap-2 w-full">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-rose-400 hover:text-rose-200 bg-[#12070c] hover:bg-[#200a14] border border-rose-950/40 hover:border-rose-500/45 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Deletar Tarefa</span>
              </button>

              {/* Right Action Stack */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-indigo-400 hover:text-white bg-indigo-950/10 hover:bg-indigo-950/40 border border-indigo-950/30 rounded-xl transition-all text-center cursor-pointer"
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
                  className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    isJobPausedOrFailing
                      ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-500/20 shadow-md shadow-emerald-500/10'
                      : 'text-amber-400 bg-amber-950/10 border-amber-950/30 hover:bg-amber-950/30'
                  }`}
                >
                  {isJobPausedOrFailing ? 'Reativar Job 🚀' : 'Pausar'}
                </button>
                <button
                  onClick={handleTriggerNow}
                  className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md neon-glow-primary text-center cursor-pointer"
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
