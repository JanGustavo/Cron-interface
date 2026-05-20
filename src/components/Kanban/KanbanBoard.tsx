import React, { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useJobsStore } from '../../store/jobsStore';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanStatus } from '../../types/jobs';

const COLUMNS: { id: KanbanStatus; title: string }[] = [
  { id: 'draft', title: 'Draft' },
  { id: 'scheduled', title: 'Scheduled' },
  { id: 'executing', title: 'Executing' },
  { id: 'success', title: 'Success' },
  { id: 'failed', title: 'Failed' },
];

export const KanbanBoard: React.FC = () => {
  const { jobs, moveJobKanbanStatus } = useJobsStore();
  const [searchTerm, setSearchTerm] = useState('');

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a valid droppable area
    if (!destination) return;

    // Dropped in the exact same spot
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Cast the target droppable ID to KanbanStatus
    const nextStatus = destination.droppableId as KanbanStatus;
    
    // Call Zustand action to persist frontend move
    moveJobKanbanStatus(draggableId, nextStatus);
  };

  // Filter jobs based on search term
  const filteredJobs = jobs.filter(
    (job) =>
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Board Controls and Stats */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">
            Quadro Kanban de Tarefas
          </h2>
          <p className="text-xs text-slate-400">
            Arraste e solte tarefas para gerenciar seus fluxos e estados de execução em tempo real.
          </p>
        </div>

        {/* Cyber Search Bar */}
        <div className="relative w-full md:w-80 group">
          <div className="absolute -inset-0.5 bg-indigo-500/20 rounded-xl blur-sm group-focus-within:bg-indigo-500/40 transition duration-300" />
          <div className="relative flex items-center">
            <svg
              className="absolute left-3.5 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0a0d1d]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 font-medium focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Drag & Drop Board Context Wrapper */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-indigo-950/60 scrollbar-track-transparent">
          {COLUMNS.map((column) => {
            // Get jobs belonging to this column, filtered by the search term
            const columnJobs = filteredJobs.filter(
              (job) => (job.kanbanStatus || 'draft') === column.id
            );

            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                jobs={columnJobs}
              />
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
