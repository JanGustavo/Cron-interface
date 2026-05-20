import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Job } from '../../types/jobs';
import { StatusBadge } from '../Dashboard/StatusBadge';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';

interface JobCardProps {
  job: Job;
  index: number;
}

export const JobCard: React.FC<JobCardProps> = ({ job, index }) => {
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

  const getKanbanStatusGlow = (status: string) => {
    switch (status) {
      case 'success':
        return 'hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.12)]';
      case 'failed':
        return 'hover:border-rose-500/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.12)]';
      case 'executing':
        return 'hover:border-sky-500/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.12)]';
      case 'scheduled':
        return 'hover:border-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.12)]';
      case 'draft':
      default:
        return 'hover:border-slate-500/30 hover:shadow-[0_0_15px_rgba(100,116,139,0.12)]';
    }
  };

  const formatSchedule = (sched: string) => {
    if (sched.startsWith('every:')) {
      return `Intervalo: a cada ${sched.replace('every:', '')}`;
    }
    return `Cron: ${sched}`;
  };

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleCardClick}
          className={`p-4 rounded-xl glass-panel border border-indigo-950/40 cursor-grab active:cursor-grabbing select-none transition-all duration-300 ${
            snapshot.isDragging
              ? 'scale-105 border-indigo-500/40 shadow-[0_8px_32px_rgba(99,102,241,0.25)] neon-glow-primary'
              : getKanbanStatusGlow(job.kanbanStatus || 'draft')
          }`}
        >
          {/* Card Title & Method */}
          <div className="flex justify-between items-start gap-2.5">
            <h4 className="font-extrabold text-sm text-slate-200 tracking-wide line-clamp-1 group-hover:text-indigo-400">
              {job.name}
            </h4>
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${getMethodColor(job.httpMethod)}`}>
              {job.httpMethod}
            </span>
          </div>

          {/* Webhook Endpoint URL */}
          <div className="text-[10px] text-slate-500 font-mono mt-1.5 truncate">
            {job.url}
          </div>

          {/* Separation Divider */}
          <div className="h-px bg-indigo-950/20 my-3" />

          {/* Details & Status Bottom Row */}
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-col gap-1">
              {/* Schedule Info */}
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <svg className="w-3.5 h-3.5 text-indigo-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatSchedule(job.schedule)}
              </div>
            </div>
            
            {/* Custom Status Badge */}
            <StatusBadge status={job.kanbanStatus || 'draft'} />
          </div>
        </div>
      )}
    </Draggable>
  );
};
