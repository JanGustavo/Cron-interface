import React, { useState } from 'react';
import type { LogEntry, LogFilter } from '../../types/logs';
import { useUiStore } from '../../store/uiStore';
import api from '../../services/api';

interface LogExportProps {
  filter: LogFilter;
}

// O backend pagina em lotes de até 100 registros. Para exportar tudo,
// precisamos buscar página por página até consumir todos os resultados do filtro.
const EXPORT_PAGE_SIZE = 100;
const EXPORT_WARNING_THRESHOLD = 1000;

async function fetchAllForExport(
  filter: LogFilter
): Promise<{ logs: LogEntry[]; total: number }> {
  const allLogs: LogEntry[] = [];
  let page = 1;
  let total = 0;

  while (true) {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(EXPORT_PAGE_SIZE));

    if (filter.searchQuery) params.append('search', filter.searchQuery);
    if (filter.status && filter.status.length > 0) {
      params.append('status', filter.status[0]);
    }
    if (filter.startDate) params.append('start_date', filter.startDate);
    if (filter.endDate) params.append('end_date', filter.endDate);

    const res = await api.get(`/v1/executions?${params.toString()}`);
    const rows = (res.data?.data || []) as LogEntry[];
    total = Number(res.data?.total ?? 0);

    if (!rows.length) {
      break;
    }

    allLogs.push(...rows);

    if (allLogs.length >= total || rows.length < EXPORT_PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  return { logs: allLogs, total };
}

function escapeCSV(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export const LogExport: React.FC<LogExportProps> = ({ filter }) => {
  const { showToast } = useUiStore();
  const [exporting, setExporting] = useState(false);
  const [exportSummary, setExportSummary] = useState('Todos os registros do filtro atual');

  const handleExportCSV = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      showToast('Buscando todos os registros para exportar...', 'info');
      const { logs, total } = await fetchAllForExport(filter);

      if (logs.length === 0) {
        showToast('Nenhum registro encontrado com os filtros atuais.', 'error');
        return;
      }

      setExportSummary(`${total.toLocaleString()} registros no filtro atual`);

      if (total >= EXPORT_WARNING_THRESHOLD) {
        showToast(
          `Exportando ${total.toLocaleString()} registros... isso pode levar alguns segundos.`,
          'info'
        );
      }

      const headers = [
        'ID',
        'Job ID',
        'Status',
        'HTTP Status',
        'Duração (ms)',
        'Tentativa',
        'Corpo da Resposta',
        'Data/Hora',
      ];

      const rows = logs.map((log) => [
        escapeCSV(log.id),
        escapeCSV(log.jobId),
        escapeCSV(log.status),
        escapeCSV(log.httpStatus ?? 'N/A'),
        escapeCSV(log.durationMs ?? 0),
        escapeCSV(log.attemptNumber),
        escapeCSV(log.responseBody ?? ''),
        escapeCSV(log.triggeredAt),
      ]);

      const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cronflow_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`CSV exportado — ${logs.length.toLocaleString()} registros 📊`, 'success');
    } catch (err) {
      console.error('Falha ao exportar CSV:', err);
      showToast('Falha ao exportar CSV. Tente novamente.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      showToast('Buscando todos os registros para exportar...', 'info');
      const { logs, total } = await fetchAllForExport(filter);

      if (logs.length === 0) {
        showToast('Nenhum registro encontrado com os filtros atuais.', 'error');
        return;
      }

      setExportSummary(`${total.toLocaleString()} registros no filtro atual`);

      if (total >= EXPORT_WARNING_THRESHOLD) {
        showToast(
          `Exportando ${total.toLocaleString()} registros... isso pode levar alguns segundos.`,
          'info'
        );
      }

      const dataStr = JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          total: logs.length,
          filters: filter,
          data: logs,
        },
        null,
        2
      );

      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cronflow_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`JSON exportado — ${logs.length.toLocaleString()} registros 📊`, 'success');
    } catch (err) {
      console.error('Falha ao exportar JSON:', err);
      showToast('Falha ao exportar JSON. Tente novamente.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const { logs, total } = await fetchAllForExport(filter);
      setExportSummary(`${total.toLocaleString()} registros no filtro atual`);

      const formatted = logs
        .map(
          (log) =>
            `[${log.triggeredAt}] Job ID: ${log.jobId} | Status: ${log.status.toUpperCase()} (${
              log.httpStatus ?? 'N/A'
            }) | Duração: ${log.durationMs ?? 0}ms | Tentativa: ${log.attemptNumber}`
        )
        .join('\n');

      await navigator.clipboard.writeText(formatted);
      showToast(`${logs.length.toLocaleString()} registros copiados para a área de transferência!`, 'success');
    } catch (err) {
      console.error('Falha ao copiar logs:', err);
      showToast('Falha ao copiar. Tente exportar como CSV.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const btnBase =
    'p-1.5 rounded-lg transition-all duration-300 font-bold text-[10px] uppercase flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2 items-center">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider hidden sm:inline">
          Exportar:
        </span>

        <div className="flex bg-[#0a0d1d]/80 border border-indigo-950/60 rounded-xl overflow-hidden p-1 gap-1">
          <button
            onClick={handleCopyToClipboard}
            disabled={exporting}
            title="Copiar todos os registros para Área de Transferência"
            className={`${btnBase} text-slate-400 hover:text-indigo-400 hover:bg-indigo-950/30`}
          >
            {exporting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            )}
          </button>

          <button
            onClick={handleExportJSON}
            disabled={exporting}
            title="Exportar todos os registros como JSON"
            className={`${btnBase} text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            JSON
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting}
            title="Exportar todos os registros como CSV"
            className={`${btnBase} text-slate-400 hover:text-amber-400 hover:bg-amber-950/20`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2-8H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z"
              />
            </svg>
            CSV
          </button>
        </div>
      </div>

      <div className="text-[10px] text-slate-400">{exporting ? 'Exportando…' : exportSummary}</div>
    </div>
  );
};
