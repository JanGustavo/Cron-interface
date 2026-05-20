import React from 'react';
import type { LogEntry } from '../../types/logs';
import { StatusBadge } from '../Dashboard/StatusBadge';

interface LogListProps {
  logs: LogEntry[];
  totalLogs: number;
  currentPage: number;
  limit: number;
  onPageChange: (page: number) => void;
  onSelectLog: (logId: string) => void;
}

export const LogList: React.FC<LogListProps> = ({
  logs,
  totalLogs,
  currentPage,
  limit,
  onPageChange,
  onSelectLog,
}) => {
  const totalPages = Math.ceil(totalLogs / limit);
  const startEntry = (currentPage - 1) * limit + 1;
  const endEntry = Math.min(currentPage * limit, totalLogs);

  const getHttpStatusBadge = (status: number | null | undefined) => {
    if (!status) return <span className="text-slate-500 font-mono">-</span>;
    if (status >= 200 && status < 300) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-bold font-mono text-[10px]">
          {status}
        </span>
      );
    }
    if (status >= 300 && status < 400) {
      return (
        <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/10 font-bold font-mono text-[10px]">
          {status}
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/10 font-bold font-mono text-[10px]">
        {status}
      </span>
    );
  };

  return (
    <div className="rounded-2xl glass-panel border border-indigo-950/40 overflow-hidden bg-indigo-950/5 select-none flex flex-col">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-indigo-950/20 border-b border-indigo-950/40 text-slate-400 font-semibold">
              <th className="p-4 uppercase tracking-wider text-[9px] w-28">Status</th>
              <th className="p-4 uppercase tracking-wider text-[9px]">Tarefa / ID</th>
              <th className="p-4 uppercase tracking-wider text-[9px]">Endpoint Webhook</th>
              <th className="p-4 uppercase tracking-wider text-[9px] text-center w-24">HTTP</th>
              <th className="p-4 uppercase tracking-wider text-[9px] text-center w-24">Tentativa</th>
              <th className="p-4 uppercase tracking-wider text-[9px] text-center w-24">Duração</th>
              <th className="p-4 uppercase tracking-wider text-[9px] w-36">Disparado Em</th>
              <th className="p-4 uppercase tracking-wider text-[9px] text-center w-16">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-950/25">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-500 font-semibold text-xs">
                  Nenhum registro de execução encontrado com os filtros atuais.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => onSelectLog(log.id)}
                  className="hover:bg-indigo-950/15 cursor-pointer transition-colors group"
                >
                  {/* Status Badge */}
                  <td className="p-4">
                    <StatusBadge status={log.status} />
                  </td>

                  {/* Job Name / ID */}
                  <td className="p-4 font-medium text-slate-200">
                    <div className="flex flex-col">
                      <span className="font-bold truncate max-w-[150px] group-hover:text-indigo-400 transition-colors">
                        {log.jobName || 'Tarefa Deletada'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                        #{log.jobId.slice(0, 8)}...
                      </span>
                    </div>
                  </td>

                  {/* Webhook Endpoint URL */}
                  <td className="p-4 text-slate-400 font-mono text-[10px] truncate max-w-[200px]">
                    {log.jobUrl || 'N/A'}
                  </td>

                  {/* HTTP Status Code */}
                  <td className="p-4 text-center">
                    {getHttpStatusBadge(log.httpStatus)}
                  </td>

                  {/* Attempt Number */}
                  <td className="p-4 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/30 border border-indigo-950/40 text-[10px] font-bold text-slate-400 font-mono">
                      {log.attemptNumber}ª tent.
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="p-4 text-center font-mono text-slate-400 font-bold">
                    {log.durationMs ? `${log.durationMs}ms` : '-'}
                  </td>

                  {/* Timestamp */}
                  <td className="p-4 text-slate-400 font-medium">
                    {log.triggeredAt}
                  </td>

                  {/* Actions column */}
                  <td className="p-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLog(log.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-950/40 transition-all duration-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls Footer */}
      {logs.length > 0 && (
        <div className="p-4 border-t border-indigo-950/30 bg-indigo-950/5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Exibindo <span className="text-slate-300">{startEntry}</span>-
            <span className="text-slate-300">{endEntry}</span> de{' '}
            <span className="text-slate-300">{totalLogs}</span> execuções
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3.5 py-1.5 rounded-xl border text-[10px] uppercase font-bold transition-all duration-300 flex items-center gap-1.5 ${
                currentPage === 1
                  ? 'text-slate-600 bg-transparent border-indigo-950/10 cursor-not-allowed'
                  : 'text-indigo-400 bg-indigo-950/10 border-indigo-950/30 hover:bg-indigo-950/30 hover:text-white cursor-pointer'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3.5 py-1.5 rounded-xl border text-[10px] uppercase font-bold transition-all duration-300 flex items-center gap-1.5 ${
                currentPage === totalPages
                  ? 'text-slate-600 bg-transparent border-indigo-950/10 cursor-not-allowed'
                  : 'text-indigo-400 bg-indigo-950/10 border-indigo-950/30 hover:bg-indigo-950/30 hover:text-white cursor-pointer'
              }`}
            >
              Próximo
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
