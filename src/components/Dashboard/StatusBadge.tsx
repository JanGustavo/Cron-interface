import React from 'react';
import type { JobStatus, KanbanStatus } from '../../types/jobs';

export type BadgeStatus = JobStatus | KanbanStatus | 'success' | 'failed' | 'timeout';

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStatusStyles = () => {
    switch (status) {
      // Active states
      case 'active':
      case 'scheduled':
      case 'success':
        return {
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
          border: 'border-emerald-500/20',
          label: status === 'active' ? 'Ativo' : status === 'scheduled' ? 'Agendado' : 'Sucesso',
          dot: 'bg-emerald-400',
        };
      
      // Failed or critical states
      case 'failing':
      case 'failed':
      case 'timeout':
        return {
          bg: 'bg-rose-500/10',
          text: 'text-rose-400',
          border: 'border-rose-500/20',
          label: status === 'failing' ? 'Falhando' : status === 'failed' ? 'Falhou' : 'Timeout',
          dot: 'bg-rose-400',
        };

      // Executing or running states
      case 'executing':
        return {
          bg: 'bg-sky-500/10',
          text: 'text-sky-400',
          border: 'border-sky-500/20',
          label: 'Executando',
          dot: 'bg-sky-400 animate-pulse',
        };

      // Paused / Draft / Neutral states
      case 'paused':
        return {
          bg: 'bg-amber-500/10',
          text: 'text-amber-400',
          border: 'border-amber-500/20',
          label: 'Pausado',
          dot: 'bg-amber-400',
        };
      
      case 'draft':
        return {
          bg: 'bg-slate-500/10',
          text: 'text-slate-400',
          border: 'border-slate-500/20',
          label: 'Rascunho',
          dot: 'bg-slate-400',
        };

      default:
        return {
          bg: 'bg-slate-500/10',
          text: 'text-slate-400',
          border: 'border-slate-500/20',
          label: status,
          dot: 'bg-slate-400',
        };
    }
  };

  const styles = getStatusStyles();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses} select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {styles.label}
    </span>
  );
};
