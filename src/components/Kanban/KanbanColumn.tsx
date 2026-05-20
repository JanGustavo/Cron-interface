import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { Job, KanbanStatus } from '../../types/jobs';
import { JobCard } from './JobCard';

interface KanbanColumnProps {
  id: KanbanStatus;
  title: string;
  jobs: Job[];
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, jobs }) => {
  const getHeaderStyles = () => {
    switch (id) {
      case 'success':
        return {
          border: 'border-t-2 border-t-emerald-500',
          indicator: 'bg-emerald-500',
          titleColor: 'text-emerald-400',
        };
      case 'failed':
        return {
          border: 'border-t-2 border-t-rose-500',
          indicator: 'bg-rose-500',
          titleColor: 'text-rose-400',
        };
      case 'executing':
        return {
          border: 'border-t-2 border-t-sky-500',
          indicator: 'bg-sky-500',
          titleColor: 'text-sky-400',
        };
      case 'scheduled':
        return {
          border: 'border-t-2 border-t-indigo-500',
          indicator: 'bg-indigo-500',
          titleColor: 'text-indigo-400',
        };
      case 'draft':
      default:
        return {
          border: 'border-t-2 border-t-slate-500',
          indicator: 'bg-slate-500',
          titleColor: 'text-slate-400',
        };
    }
  };

  const styles = getHeaderStyles();

  return (
    <div className={`flex flex-col min-w-[250px] md:min-w-[270px] flex-1 rounded-2xl glass-panel border border-indigo-950/30 overflow-hidden ${styles.border} select-none`}>
      {/* Column Title Header */}
      <div className="p-4 border-b border-indigo-950/20 flex justify-between items-center bg-indigo-950/5">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${styles.indicator}`} />
          <h3 className={`font-bold text-xs uppercase tracking-wider ${styles.titleColor}`}>
            {title}
          </h3>
        </div>
        
        {/* Count Counter Badge */}
        <span className="px-2 py-0.5 rounded-md bg-indigo-950/30 border border-indigo-950/40 text-[10px] font-bold text-slate-400">
          {jobs.length}
        </span>
      </div>

      {/* Droppable Area Container */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3.5 space-y-3.5 transition-colors overflow-y-auto max-h-[64vh] ${
              snapshot.isDraggingOver ? 'bg-indigo-950/10' : 'bg-transparent'
            }`}
          >
            {jobs.map((job, index) => (
              <JobCard key={job.id} job={job} index={index} />
            ))}
            
            {provided.placeholder}

            {/* Empty column placeholder indicator */}
            {jobs.length === 0 && (
              <div className="h-28 border border-dashed border-indigo-950/30 rounded-xl flex items-center justify-center text-slate-600 text-xs font-semibold px-4 text-center select-none">
                Arraste tarefas aqui
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};
