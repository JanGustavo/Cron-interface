import React from 'react';
import type { LogFilter as LogFilterType } from '../../types/logs';

interface LogFilterProps {
  filter: LogFilterType;
  onChange: (newFilter: LogFilterType) => void;
  onReset: () => void;
}

export const LogFilter: React.FC<LogFilterProps> = ({ filter, onChange, onReset }) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filter, searchQuery: e.target.value, page: 1 });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const statusVal = val ? [val as 'success' | 'failed' | 'timeout'] : undefined;
    onChange({ ...filter, status: statusVal, page: 1 });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filter, startDate: e.target.value || null, page: 1 });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filter, endDate: e.target.value || null, page: 1 });
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filter, limit: Number(e.target.value), page: 1 });
  };

  // Convert array status back to single selected status value for the HTML select
  const currentStatusValue = filter.status && filter.status.length > 0 ? filter.status[0] : '';

  return (
    <div className="p-4 rounded-2xl glass-panel border border-indigo-950/40 space-y-4 bg-indigo-950/5 relative overflow-hidden select-none">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Primary Row: Search & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Search Query Input */}
        <div className="relative group lg:col-span-2">
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Pesquisa Geral
          </label>
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors"
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
              placeholder="Buscar por ID, Nome ou Endpoint URL..."
              value={filter.searchQuery || ''}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-3 py-2 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40 transition duration-300"
            />
          </div>
        </div>

        {/* Status Option Select */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Filtrar Status
          </label>
          <select
            value={currentStatusValue}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
          >
            <option value="">Todos os Status</option>
            <option value="success">Sucesso (2xx OK)</option>
            <option value="failed">Erro (5xx / Failed)</option>
            <option value="timeout">Timeout (Excedido)</option>
          </select>
        </div>

        {/* Start Date Selector */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Data Inicial
          </label>
          <input
            type="date"
            value={filter.startDate || ''}
            onChange={handleStartDateChange}
            className="w-full px-3 py-1.5 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
          />
        </div>

        {/* End Date Selector */}
        <div>
          <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
            Data Final
          </label>
          <input
            type="date"
            value={filter.endDate || ''}
            onChange={handleEndDateChange}
            className="w-full px-3 py-1.5 bg-[#060814]/80 border border-indigo-950/60 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
          />
        </div>
      </div>

      {/* Secondary Row: Limites e Reset */}
      <div className="flex justify-between items-center border-t border-indigo-950/20 pt-3">
        {/* Pagination Limit Display selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Exibir:
          </span>
          <select
            value={filter.limit}
            onChange={handleLimitChange}
            className="px-2 py-1 bg-[#060814]/80 border border-indigo-950/60 rounded-lg text-[10px] text-slate-400 font-bold focus:outline-none focus:border-indigo-500/40 transition duration-300 cursor-pointer"
          >
            <option value={10}>10 registros</option>
            <option value={20}>20 registros</option>
            <option value={50}>50 registros</option>
          </select>
        </div>

        {/* Reset Filters Stack button */}
        {(filter.searchQuery || filter.status || filter.startDate || filter.endDate) && (
          <button
            onClick={onReset}
            className="px-3.5 py-1.5 text-[10px] uppercase font-bold text-indigo-400 hover:text-white bg-indigo-950/10 hover:bg-indigo-950/40 border border-indigo-950/30 rounded-xl transition-all duration-300 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Limpar Filtros
          </button>
        )}
      </div>
    </div>
  );
};
