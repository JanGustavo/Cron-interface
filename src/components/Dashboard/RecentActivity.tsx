import React from 'react';
import type { LogEntry } from '../../types/logs';
import { StatusBadge } from './StatusBadge';
import { useUiStore } from '../../store/uiStore';

interface RecentActivityProps {
  activities?: LogEntry[];
  isLoading?: boolean;
  filterBadge?: React.ReactNode;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities = [], isLoading, filterBadge }) => {
  const { setLogModalOpen, openLiveExecutionModal } = useUiStore();

  const items = activities;

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        return '-';
      }
      
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();
      
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (isToday) {
        return `Hoje às ${timeStr}`;
      } else if (isYesterday) {
        return `Ontem às ${timeStr}`;
      } else {
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return `${dateStr} às ${timeStr}`;
      }
    } catch {
      return '-';
    }
  };

  return (
    <div className="rounded-2xl glass-panel border border-indigo-950/40 overflow-hidden select-none">
      {/* Header Panel */}
      <div className="px-5 py-4 border-b border-indigo-950/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-indigo-950/10">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm font-extrabold text-slate-100 tracking-wide">
              Atividade Recente
            </h3>
            {filterBadge}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Últimas execuções de webhooks disparadas em tempo real.
          </p>
        </div>
        <span className="flex items-center gap-1 shrink-0">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            Live Feed
          </span>
        </span>
      </div>

      {/* Activities Table List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-indigo-950/20 text-slate-500 font-bold uppercase tracking-wider bg-indigo-950/5">
              <th className="px-5 py-3 text-[10px]">Tarefa / URL</th>
              <th className="px-5 py-3 text-[10px] w-28">Status</th>
              <th className="px-5 py-3 text-[10px] w-48">Horário</th>
              <th className="px-5 py-3 text-[10px] w-24">Duração</th>
              <th className="px-5 py-3 text-[10px] w-12">Tenta.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-950/15">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="border-b border-indigo-950/10">
                  <td className="px-5 py-4">
                    <div className="h-4 bg-slate-800/80 rounded w-2/3 animate-pulse" />
                    <div className="h-3 bg-slate-800/80 rounded w-1/2 mt-1.5 animate-pulse" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-5 bg-slate-800/80 rounded-md w-16 animate-pulse" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-slate-800/80 rounded w-3/4 animate-pulse" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-slate-800/80 rounded w-12 animate-pulse" />
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-4 bg-slate-800/80 rounded w-8 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center select-none">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-slate-900 border border-indigo-950/40 flex items-center justify-center text-slate-500 mb-3">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                    </div>
                    <h5 className="text-[11px] font-bold text-slate-400">Sem atividade recente</h5>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-60 leading-normal">Os logs de disparos HTTP e retries aparecerão aqui em tempo real assim que os jobs forem executados.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((log, index) => (
                <tr
                  key={log.id}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                      openLiveExecutionModal(log.jobId);
                    } else {
                      setLogModalOpen(true, log.id);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openLiveExecutionModal(log.jobId);
                  }}
                  className={`cursor-pointer transition-colors group ${
                    index % 2 === 0
                      ? 'bg-[#070a1a]/40 hover:bg-indigo-900/30'
                      : 'bg-[#0e132e]/55 hover:bg-indigo-900/40'
                  }`}
                >
                  {/* Job metadata info */}
                  <td className="px-5 py-3.5 min-w-60">
                    <div className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                      {log.jobName || `Job #${log.jobId ? log.jobId.slice(0, 8) : ''}`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-65">
                      {log.jobUrl}
                    </div>
                  </td>
                  
                  {/* Status Badges */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={log.status} attemptNumber={log.attemptNumber} />
                      {log.httpStatus && (
                        <span className="text-[9px] font-semibold font-mono text-slate-500 pl-1">
                          HTTP {log.httpStatus}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {/* Triggered time */}
                  <td className="px-5 py-3.5 text-slate-400 font-medium">
                    {formatTime(log.triggeredAt)}
                  </td>
                  
                  {/* Duration */}
                  <td className="px-5 py-3.5 font-mono text-slate-400">
                    {log.durationMs !== null && log.durationMs !== undefined ? (
                      log.durationMs >= 1000 ? (
                        <span className="text-rose-400 font-semibold">{(log.durationMs / 1000).toFixed(2)}s</span>
                      ) : (
                        `${log.durationMs}ms`
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  
                  {/* Attempts */}
                  <td className="px-5 py-3.5 font-bold font-mono text-center">
                    <span
                      className={
                        log.attemptNumber > 1
                          ? 'text-amber-400 font-extrabold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px]'
                          : 'text-slate-500'
                      }
                    >
                      {log.attemptNumber}x
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Action Button to View Full Logs */}
      <div className="p-3 border-t border-indigo-950/30 bg-indigo-950/10 text-center">
        <button
          onClick={() => useUiStore.getState().setActiveTab('logs')}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-600/30 border border-indigo-500/20 hover:border-indigo-500/40 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
        >
          <span>Ver histórico completo de auditoria e logs</span>
          <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};
