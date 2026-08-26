import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Job, KanbanStatus } from '../../types/jobs';
import { translateSchedule } from '../Shared/cronTranslator';
import { StatusBadge } from '../Dashboard/StatusBadge';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';

const formatNextRun = (nextRunAt: string): string => {
  if (!nextRunAt) return '—';
  try {
    const date = new Date(nextRunAt);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return nextRunAt;
  }
};

interface JobCardProps {
  job: Job;
  index: number;
  columnId: KanbanStatus;
}

export const JobCard: React.FC<JobCardProps> = ({ job, index, columnId }) => {
  const { setActiveJob } = useJobsStore();
  const { setJobModalOpen } = useUiStore();

  const handleCardClick = () => {
    setActiveJob(job);
    setJobModalOpen(true);
  };

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



  const formatSchedule = (sched: string) => {
    const translation = translateSchedule(sched);
    return (
      <span title={sched} className="cursor-help">
        {translation || sched}
      </span>
    );
  };

  const getWebhookAlertStatus = (j: Job) => {
    if (!j.webhookAlertUrl || j.webhookAlertUrl.trim() === '') {
      return (
        <span className="flex items-center gap-1 text-slate-500/80" title="Sem webhook de alerta configurada para este job">
          <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Sem Alerta
        </span>
      );
    }

    if (j.status === 'failing' || j.consecutiveFailures >= 4) {
      return (
        <span className="flex items-center gap-1 text-rose-400 font-bold" title="Alerta disparado devido a falhas no job">
          <svg className="w-3.5 h-3.5 text-rose-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Alerta Erro
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1 text-emerald-400 font-bold" title="Webhook de alerta configurado e monitorando normalmente">
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Alerta OK
      </span>
    );
  };

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick();
            }
          }}
          tabIndex={0}
          className={`p-4 rounded-xl bg-[#0a0e27]/85 border cursor-grab active:cursor-grabbing select-none transition-all duration-300 ease-out hover:-translate-y-1.5 hover:scale-[1.015] hover:border-indigo-400/60 hover:shadow-[0_12px_30px_rgba(99,102,241,0.25)] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/80 ${
            snapshot.isDragging ? 'scale-105' : ''
          }`}
          style={{
            ...provided.draggableProps.style,
            borderColor: (columnId === 'draft' || job.status === 'paused' || job.status === 'failing' || job.consecutiveFailures >= 4)
              ? 'rgba(239, 68, 68, 0.65)' // Borda vermelha forte
              : (columnId === 'failed')
                ? 'rgba(244, 63, 94, 0.45)' // Borda vermelha média
                : (columnId === 'success')
                  ? 'rgba(16, 185, 129, 0.5)' // Borda verde success
                  : 'rgba(99, 102, 241, 0.2)', // Borda azulada padrão

            boxShadow: snapshot.isDragging
              ? '0 8px 32px rgba(99, 102, 241, 0.25), 0 0 20px rgba(99, 102, 241, 0.35)'
              : (columnId === 'draft' || job.status === 'paused' || job.status === 'failing' || job.consecutiveFailures >= 4)
                ? '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 25px rgba(239, 68, 68, 0.35)'
                : (columnId === 'failed')
                  ? '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 16px rgba(244, 63, 94, 0.22)'
                  : (columnId === 'success')
                    ? '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 16px rgba(16, 185, 129, 0.22)'
                    : '0 4px 15px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Card Title & Method */}
          <div className="flex justify-between items-start gap-2.5">
            <h4 className="font-extrabold text-sm text-slate-200 tracking-wide line-clamp-1 group-hover:text-indigo-400">
              {job.name}
            </h4>
            <div className="flex gap-1.5 items-center">
              {job.nextJobId && (
                <span
                  className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-[length:300%_auto] bg-clip-text text-transparent border border-purple-500/35 animate-[shimmer_3s_linear_infinite]"
                  style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
                  title="Workflow Encadeado PRO ✨"
                >
                  ⚡ fluxo pro
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getMethodColor(job.httpMethod)}`}>
                {job.httpMethod}
              </span>
            </div>
          </div>

          {/* Webhook Endpoint URL */}
          <div className="text-[10px] text-slate-500 font-mono mt-1.5 truncate">
            {job.url}
          </div>

          {/* Suspended Alert Indicator */}
          {(job.consecutiveFailures >= 4 || job.status === 'failing') && (
            <div className="mt-2.5 px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-1.5 text-[10px] text-rose-400 font-semibold animate-pulse">
              <svg className="w-3.5 h-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Serviço Suspenso (3 retentativas falhas)</span>
            </div>
          )}

          {/* Tags list */}
          {job.tags && job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2.5">
              {job.tags.map((tg, idx) => (
                <span key={idx} className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 text-[8px] font-extrabold text-indigo-300 uppercase font-mono tracking-wider">
                  {tg}
                </span>
              ))}
            </div>
          )}

          {/* Separation Divider */}
          <div className="h-px bg-indigo-950/20 my-3" />

          {/* Details & Status Bottom Row */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-col gap-1">
              {/* Schedule Info */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-semibold font-mono">
                <span className="text-indigo-400 font-bold">⏱️ {formatSchedule(job.schedule)}</span>
              </div>
              {/* Next Run Info */}
              {(job.status === 'failing' || (job.consecutiveFailures && job.consecutiveFailures >= 4)) ? (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-400 font-semibold bg-rose-950/20 border border-rose-500/25 px-2 py-0.5 rounded-md mt-0.5" title="Execuções automáticas suspensas">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                  <span className="font-mono">Suspenso — Sem agendamento</span>
                </div>
              ) : job.status === 'paused' ? (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-semibold bg-amber-950/20 border border-amber-500/25 px-2 py-0.5 rounded-md mt-0.5" title="Tarefa pausada pelo usuário">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="font-mono">Pausado pelo usuário</span>
                </div>
              ) : job.nextRunAt ? (
                <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-semibold bg-cyan-950/20 border border-cyan-500/25 px-2 py-0.5 rounded-md mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
                  <span className="font-mono">Próxima: {formatNextRun(job.nextRunAt)}</span>
                </div>
              ) : null}
              {/* Webhook Alert Status */}
              <div className="flex items-center gap-1 text-[9px] font-semibold mt-0.5">
                {getWebhookAlertStatus(job)}
              </div>
            </div>
            
            {/* Custom Status Badge */}
            <StatusBadge status={job.kanbanStatus || 'draft'} attemptNumber={job.consecutiveFailures > 0 ? job.consecutiveFailures : undefined} />
          </div>
        </div>
      )}
    </Draggable>
  );
};
