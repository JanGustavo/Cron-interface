import React, { useState } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
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
  const { setCreateModalOpen } = useUiStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [selectedFrequencyType, setSelectedFrequencyType] = useState(''); // 'cron' | 'interval' | ''
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  // Filter jobs based on search term and advanced parameters
  const filteredJobs = jobs.filter((job) => {
    // 1. Search term filter (matches name or URL)
    const matchesSearch =
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.url.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. HTTP Method filter
    if (selectedMethod && job.httpMethod !== selectedMethod) return false;

    // 3. Backend Status filter
    if (selectedStatus && job.status !== selectedStatus) return false;

    // 4. Timezone filter
    if (selectedTimezone && job.timezone !== selectedTimezone) return false;

    // 5. Periodicity filter
    if (selectedFrequencyType) {
      const isInterval = job.schedule.startsWith('every:');
      if (selectedFrequencyType === 'interval' && !isInterval) return false;
      if (selectedFrequencyType === 'cron' && isInterval) return false;
    }

    return true;
  });

  const hasActiveFilters = !!(selectedMethod || selectedStatus || selectedTimezone || selectedFrequencyType);

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

        {/* Filter Toggle & Search Stack */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Create Job button */}
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 neon-glow-primary flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Nova Tarefa</span>
          </button>

          {/* Button to toggle advanced filters */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              showAdvancedFilters
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/60 hover:bg-slate-800/80 border-slate-700/50 text-slate-300 hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros Avançados
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>

          {/* Cyber Search Bar */}
          <div className="relative w-full md:w-64 group">
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
      </div>

      {/* Advanced Filters Drawer Panel */}
      {showAdvancedFilters && (
        <div className="p-4 rounded-2xl glass-panel border border-indigo-950/40 space-y-4 bg-indigo-950/5 relative overflow-hidden select-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* HTTP Method Filter */}
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Método HTTP
              </label>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="w-full px-3 py-2 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Backend Status Filter */}
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Status no Backend
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="active">Ativo (Active)</option>
                <option value="paused">Pausado (Paused)</option>
                <option value="failing">Falhando (Failing)</option>
              </select>
            </div>

            {/* Timezone Filter */}
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Fuso Horário
              </label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full px-3 py-2 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>

            {/* Periodicity/Format Filter */}
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Periodicidade
              </label>
              <select
                value={selectedFrequencyType}
                onChange={(e) => setSelectedFrequencyType(e.target.value)}
                className="w-full px-3 py-2 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
              >
                <option value="">Todos os tipos</option>
                <option value="cron">Cron Expression (ex: */5 * * * *)</option>
                <option value="interval">Intervalo Simples (ex: every:10m)</option>
              </select>
            </div>
          </div>

          {/* Reset Button Stack */}
          {hasActiveFilters && (
            <div className="flex justify-end border-t border-indigo-950/20 pt-3">
              <button
                onClick={() => {
                  setSelectedMethod('');
                  setSelectedStatus('');
                  setSelectedTimezone('');
                  setSelectedFrequencyType('');
                }}
                className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-indigo-400 hover:text-white bg-indigo-950/10 hover:bg-indigo-950/40 border border-indigo-950/30 rounded-xl transition-all duration-300 flex items-center gap-1 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      )}

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
