import React from 'react';
import type { LogEntry } from '../../types/logs';

interface LogExportProps {
  logs: LogEntry[];
}

export const LogExport: React.FC<LogExportProps> = ({ logs }) => {
  const handleCopyToClipboard = () => {
    try {
      const formatted = logs
        .map(
          (log) =>
            `[${log.triggeredAt}] Job ID: ${log.jobId} | Status: ${log.status.toUpperCase()} (${
              log.httpStatus || 'N/A'
            }) | Duração: ${log.durationMs || 0}ms | Tentativa: ${log.attemptNumber}`
        )
        .join('\n');
      
      navigator.clipboard.writeText(formatted);
      alert('Logs copiados para a área de transferência! 📋');
    } catch (err) {
      console.error('Falha ao copiar logs:', err);
    }
  };

  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cronflow_audit_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao exportar JSON:', err);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Job ID', 'Status', 'HTTP Status', 'Duração (ms)', 'Tentativa', 'Data/Hora'];
      const rows = logs.map((log) => [
        log.id,
        log.jobId,
        log.status,
        log.httpStatus || 'N/A',
        log.durationMs || 0,
        log.attemptNumber,
        log.triggeredAt,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cronflow_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao exportar CSV:', err);
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider hidden sm:inline">
        Exportar:
      </span>
      <div className="flex bg-[#0a0d1d]/80 border border-indigo-950/60 rounded-xl overflow-hidden p-1 gap-1">
        <button
          onClick={handleCopyToClipboard}
          title="Copiar para Área de Transferência"
          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30 transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
        </button>
        
        <button
          onClick={handleExportJSON}
          title="Exportar como JSON"
          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 transition-all duration-300 font-bold text-[10px] uppercase flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          JSON
        </button>

        <button
          onClick={handleExportCSV}
          title="Exportar como CSV"
          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-950/20 transition-all duration-300 font-bold text-[10px] uppercase flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2-8H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z" />
          </svg>
          CSV
        </button>
      </div>
    </div>
  );
};
