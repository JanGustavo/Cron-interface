import React, { useState, useEffect } from 'react';
import type { LogEntry, LogFilter } from '../../types/logs';
import { useUiStore } from '../../store/uiStore';
import { useEntitlements } from '../../hooks/useEntitlements';
import api from '../../services/api';

interface LogExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: LogFilter;
  initialFormat?: 'csv' | 'json' | 'clipboard';
}

interface ColumnOption {
  key: string;
  label: string;
  enabled: boolean;
}

const parseIsoToDateString = (isoString?: string | null) => {
  if (!isoString) return '';
  return isoString.split('T')[0];
};

function escapeCSV(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const LogExportModal: React.FC<LogExportModalProps> = ({
  isOpen,
  onClose,
  filter,
  initialFormat = 'csv',
}) => {
  const { showToast, setPlansModalOpen } = useUiStore();
  const { isPro } = useEntitlements();

  const [format, setFormat] = useState<'csv' | 'json' | 'clipboard'>(initialFormat);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxLogs, setMaxLogs] = useState(1000);
  const [exporting, setExporting] = useState(false);

  const [columns, setColumns] = useState<ColumnOption[]>([
    { key: 'id', label: 'ID do Log', enabled: true },
    { key: 'jobId', label: 'ID da Tarefa', enabled: true },
    { key: 'status', label: 'Status', enabled: true },
    { key: 'httpStatus', label: 'Código HTTP', enabled: true },
    { key: 'durationMs', label: 'Duração (ms)', enabled: true },
    { key: 'attemptNumber', label: 'Tentativa', enabled: true },
    { key: 'responseBody', label: 'Resposta HTTP', enabled: true },
    { key: 'triggeredAt', label: 'Data/Hora', enabled: true },
  ]);

  // Synchronize formats and initial dates when modal opens
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isOpen) {
      timer = setTimeout(() => {
        setFormat(initialFormat);
        setStartDate(parseIsoToDateString(filter.startDate));
        setEndDate(parseIsoToDateString(filter.endDate));
      }, 0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      if (timer) clearTimeout(timer);
      document.body.style.overflow = '';
    };
  }, [isOpen, filter, initialFormat]);

  if (!isOpen) return null;

  const toggleColumn = (key: string) => {
    setColumns(
      columns.map((col) => (col.key === key ? { ...col, enabled: !col.enabled } : col))
    );
  };

  const getFormatTheme = () => {
    switch (format) {
      case 'csv':
        return {
          name: 'CSV',
          accentColor: 'text-emerald-400',
          bgAccent: 'bg-emerald-950/20',
          bgAccentHover: 'hover:bg-emerald-900/30',
          borderAccent: 'border-emerald-500/30',
          borderAccentHover: 'hover:border-emerald-500/50',
          glowShadow: 'shadow-[0_0_50px_rgba(16,185,129,0.2)]',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
          ringAccent: 'focus:ring-emerald-500/20 focus:border-emerald-500/40',
          checkboxAccent: 'text-emerald-600 focus:ring-emerald-500/20',
          badgeText: 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/50',
        };
      case 'json':
        return {
          name: 'JSON',
          accentColor: 'text-cyan-400',
          bgAccent: 'bg-cyan-950/20',
          bgAccentHover: 'hover:bg-cyan-900/30',
          borderAccent: 'border-cyan-500/30',
          borderAccentHover: 'hover:border-cyan-500/50',
          glowShadow: 'shadow-[0_0_50px_rgba(6,182,212,0.2)]',
          btnBg: 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30',
          ringAccent: 'focus:ring-cyan-500/20 focus:border-cyan-500/40',
          checkboxAccent: 'text-cyan-600 focus:ring-cyan-500/20',
          badgeText: 'text-cyan-400 bg-cyan-950/40 border border-cyan-900/50',
        };
      case 'clipboard':
      default:
        return {
          name: 'Área de Transferência',
          accentColor: 'text-indigo-400',
          bgAccent: 'bg-indigo-950/20',
          bgAccentHover: 'hover:bg-indigo-900/30',
          borderAccent: 'border-indigo-500/30',
          borderAccentHover: 'hover:border-indigo-500/50',
          glowShadow: 'shadow-[0_0_50px_rgba(99,102,241,0.2)]',
          btnBg: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30',
          ringAccent: 'focus:ring-indigo-500/20 focus:border-indigo-500/40',
          checkboxAccent: 'text-indigo-600 focus:ring-indigo-500/20',
          badgeText: 'text-indigo-400 bg-indigo-950/40 border border-indigo-900/50',
        };
    }
  };

  const theme = getFormatTheme();

  const handleExport = async () => {
    if (!isPro) {
      showToast('A exportação de logs é um recurso exclusivo do Plano PRO. Faça o upgrade!', 'error');
      setPlansModalOpen(true);
      return;
    }

    if (columns.filter((c) => c.enabled).length === 0) {
      showToast('Selecione pelo menos uma coluna para exportar.', 'error');
      return;
    }

    setExporting(true);
    try {
      showToast('Buscando logs de execução...', 'info');

      // Fetch dynamic pages up to the requested maximum logs limit
      const fetchPageSize = Math.min(100, maxLogs);
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', String(fetchPageSize));

      if (filter.searchQuery) params.append('search', filter.searchQuery);
      if (filter.status && filter.status.length > 0) {
        params.append('status', filter.status[0]);
      }
      if (startDate) params.append('start_date', `${startDate}T00:00:00.000Z`);
      if (endDate) params.append('end_date', `${endDate}T23:59:59.999Z`);
      if (filter.jobId) params.append('job_id', filter.jobId);

      const firstRes = await api.get(`/v1/executions?${params.toString()}`, { timeout: 15000 });
      const firstRows = (firstRes.data?.data || []) as LogEntry[];
      const total = Number(firstRes.data?.total ?? 0);

      const logs: LogEntry[] = [...firstRows].slice(0, maxLogs);

      if (logs.length === 0) {
        showToast('Nenhum log encontrado para os critérios selecionados.', 'error');
        setExporting(false);
        return;
      }

      if (total > logs.length && logs.length < maxLogs) {
        const totalPages = Math.min(
          Math.ceil(total / fetchPageSize),
          Math.ceil(maxLogs / fetchPageSize)
        );

        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          const pageParams = new URLSearchParams(params);
          pageParams.set('page', String(p));
          promises.push(
            api.get(`/v1/executions?${pageParams.toString()}`, { timeout: 15000 })
              .then((res) => (res.data?.data || []) as LogEntry[])
          );
        }

        const results = await Promise.all(promises);
        for (const rows of results) {
          logs.push(...rows);
        }
      }

      const finalLogs = logs.slice(0, maxLogs);
      const enabledColumns = columns.filter((c) => c.enabled);

      if (format === 'csv') {
        const headers = enabledColumns.map((c) => c.label);
        const rows = finalLogs.map((log) =>
          enabledColumns.map((c) => {
            let val: string;
            if (c.key === 'httpStatus') val = String(log.httpStatus ?? 'N/A');
            else if (c.key === 'durationMs') val = String(log.durationMs ?? 0);
            else if (c.key === 'responseBody') val = log.responseBody ?? '';
            else val = String(log[c.key as keyof LogEntry] ?? '');
            return escapeCSV(val);
          })
        );

        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cronflow_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`CSV exportado — ${finalLogs.length.toLocaleString()} registros! 📊`, 'success');
      } else if (format === 'json') {
        const mappedData = finalLogs.map((log) => {
          const obj: Record<string, unknown> = {};
          enabledColumns.forEach((c) => {
            if (c.key === 'httpStatus') obj[c.key] = log.httpStatus ?? null;
            else if (c.key === 'durationMs') obj[c.key] = log.durationMs ?? 0;
            else if (c.key === 'responseBody') obj[c.key] = log.responseBody ?? null;
            else obj[c.key] = log[c.key as keyof LogEntry];
          });
          return obj;
        });

        const dataStr = JSON.stringify(
          {
            exported_at: new Date().toISOString(),
            total: mappedData.length,
            data: mappedData,
          },
          null,
          2
        );

        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cronflow_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`JSON exportado — ${finalLogs.length.toLocaleString()} registros! 📊`, 'success');
      } else {
        // clipboard
        const formatted = finalLogs
          .map((log) =>
            enabledColumns
              .map((c) => {
                let val: string;
                if (c.key === 'httpStatus') val = String(log.httpStatus ?? 'N/A');
                else if (c.key === 'durationMs') val = `${log.durationMs ?? 0}ms`;
                else if (c.key === 'responseBody') val = log.responseBody ?? '';
                else val = String(log[c.key as keyof LogEntry] ?? '');
                return `${c.label}: ${val}`;
              })
              .join(' | ')
          )
          .join('\n');

        await navigator.clipboard.writeText(formatted);
        showToast(`${finalLogs.length.toLocaleString()} registros copiados para a área de transferência!`, 'success');
      }

      onClose();
    } catch (err) {
      console.error('Falha ao exportar logs:', err);
      showToast('Falha ao executar a exportação. Tente novamente.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-120 rounded-3xl border ${theme.borderAccent} bg-[#0a0d1d]/95 p-5 sm:p-6 md:p-7 shadow-2xl transition-all duration-300 text-left ${theme.glowShadow}`}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-800/60 hover:bg-slate-800 hover:text-white border border-slate-700/50 rounded-full w-8 h-8 flex items-center justify-center text-xs text-slate-400 cursor-pointer focus:outline-none transition-all duration-200"
          title="Fechar"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-100 tracking-wide flex items-center gap-2">
            <span>📊 Exportação de Logs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Filtre os parâmetros e personalize as colunas do relatório de webhook.
          </p>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-indigo-950/20 mb-4 font-mono text-[9px] uppercase font-bold tracking-wider select-none">
          <button
            onClick={() => setFormat('csv')}
            className={`flex-1 pb-2 border-b-2 text-center transition-all duration-200 cursor-pointer ${
              format === 'csv'
                ? 'text-emerald-400 border-emerald-500'
                : 'text-slate-500 hover:text-slate-400 border-transparent'
            }`}
          >
            📄 CSV (.csv)
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`flex-1 pb-2 border-b-2 text-center transition-all duration-200 cursor-pointer ${
              format === 'json'
                ? 'text-cyan-400 border-cyan-500'
                : 'text-slate-500 hover:text-slate-400 border-transparent'
            }`}
          >
            💻 JSON (.json)
          </button>
          <button
            onClick={() => setFormat('clipboard')}
            className={`flex-1 pb-2 border-b-2 text-center transition-all duration-200 cursor-pointer ${
              format === 'clipboard'
                ? 'text-indigo-400 border-indigo-500'
                : 'text-slate-500 hover:text-slate-400 border-transparent'
            }`}
          >
            📋 Clipboard
          </button>
        </div>

        {/* Inputs Content */}
        <div className="space-y-3.5">
          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-3 py-2 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 transition-all ${theme.ringAccent}`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
                Data de Fim
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full px-3 py-2 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 transition-all ${theme.ringAccent}`}
              />
            </div>
          </div>

          {/* Max logs input & presets */}
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
              Nº Máximo de Logs
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={50000}
                value={maxLogs}
                onChange={(e) => setMaxLogs(Math.max(1, Number(e.target.value)))}
                className={`w-28 px-3 py-2 bg-[#070913]/90 border border-indigo-950/60 rounded-xl text-xs font-bold text-slate-200 focus:outline-none focus:ring-1 transition-all font-mono ${theme.ringAccent}`}
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {[100, 500, 1000, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setMaxLogs(preset)}
                    className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer font-mono ${
                      maxLogs === preset
                        ? theme.badgeText
                        : 'border-indigo-950/80 bg-[#080a17]/80 text-slate-400 hover:text-slate-350'
                    }`}
                  >
                    {preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Columns Selection */}
          <div className="space-y-1.5 border-t border-indigo-950/20 pt-3">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
              Colunas a Exportar
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#070913]/60 p-3 rounded-xl border border-indigo-950/60">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 px-1 py-0.5 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={() => toggleColumn(col.key)}
                    className={`rounded border-indigo-950/80 focus:ring-0 focus:ring-offset-0 bg-slate-950 w-3.5 h-3.5 ${theme.checkboxAccent}`}
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-indigo-950/20 flex gap-2 items-center justify-end select-none">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-450 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-900/80 rounded-xl border border-slate-800/80 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${theme.btnBg} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {exporting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Exportando…</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>
                  {format === 'clipboard'
                    ? 'Copiar Logs'
                    : `Exportar ${format.toUpperCase()}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
