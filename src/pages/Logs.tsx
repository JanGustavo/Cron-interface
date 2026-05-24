import React, { useState, useMemo, useEffect } from 'react';
import type { LogEntry, LogFilter as LogFilterType } from '../types/logs';
import { LogFilter } from '../components/Logs/LogFilter';
import { LogList } from '../components/Logs/LogList';
import { LogDetail } from '../components/Logs/LogDetail';
import { LogExport } from '../components/Logs/LogExport';
import { useUiStore } from '../store/uiStore';
import { useJobsStore } from '../store/jobsStore';
import api from '../services/api';

const INITIAL_FILTER: LogFilterType = {
  page: 1,
  limit: 10,
};

export const Logs: React.FC = () => {
  const { setLogModalOpen } = useUiStore();
  const { jobs } = useJobsStore();
  const [filter, setFilter] = useState<LogFilterType>(INITIAL_FILTER);
  const [dbLogs, setDbLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAllLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/v1/executions?limit=200');
        const payload = (res.data?.data || []) as LogEntry[];
        if (active) {
          setDbLogs(payload);
        }
      } catch (err) {
        console.error("Erro ao carregar auditoria global de logs", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAllLogs();
    return () => { active = false; };
  }, [jobs]);

  const handleReset = () => {
    setFilter(INITIAL_FILTER);
  };

  const handleSelectLog = (logId: string) => {
    setLogModalOpen(true, logId);
  };

  // Human-friendly localized date formatter
  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Perform reactive computations using useMemo
  const filteredAndFormattedLogs = useMemo(() => {
    return dbLogs.filter((log) => {
      // 1. Search query filter (matches ID, job name, or target webhook URL)
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase();
        const matchesName = log.jobName?.toLowerCase().includes(query);
        const matchesUrl = log.jobUrl?.toLowerCase().includes(query);
        const matchesId = log.id.toLowerCase().includes(query) || log.jobId.toLowerCase().includes(query);
        
        if (!matchesName && !matchesUrl && !matchesId) return false;
      }

      // 2. Status filter
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(log.status)) return false;
      }

      // 3. Date range filter
      const logTime = new Date(log.triggeredAt).getTime();
      if (filter.startDate) {
        const start = new Date(filter.startDate).getTime();
        if (logTime < start) return false;
      }
      if (filter.endDate) {
        // Extend end date to cover the entire day (up to 23:59:59.999)
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        if (logTime > end.getTime()) return false;
      }

      return true;
    }).map((log) => ({
      ...log,
      // Format triggeredAt into standard Brazilian locale inside UI entries
      triggeredAt: formatTimestamp(log.triggeredAt),
    }));
  }, [filter, dbLogs]);

  // Paginated subset
  const paginatedLogs = useMemo(() => {
    const startIdx = (filter.page - 1) * filter.limit;
    const endIdx = startIdx + filter.limit;
    return filteredAndFormattedLogs.slice(startIdx, endIdx);
  }, [filteredAndFormattedLogs, filter.page, filter.limit]);

  return (
    <div className="space-y-6">
      {/* Header section with export tools */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">
            Histórico de Auditoria
          </h2>
          <p className="text-xs text-slate-400">
            Monitore a telemetria, códigos HTTP, latências e payloads de disparo de todas as execuções.
          </p>
        </div>
        
        {/* Export Buttons Stack */}
        <LogExport logs={filteredAndFormattedLogs} />
      </div>

      {/* Advanced Filter Toolbar */}
      <LogFilter
        filter={filter}
        onChange={setFilter}
        onReset={handleReset}
      />

      {/* Glassmorphism Log List Table */}
      {loading && dbLogs.length === 0 ? (
        <div className="p-8 rounded-2xl glass-panel border border-indigo-950/40 text-center text-slate-400 animate-pulse">
          Carregando histórico de auditoria em tempo real...
        </div>
      ) : (
        <LogList
          logs={paginatedLogs}
          totalLogs={filteredAndFormattedLogs.length}
          currentPage={filter.page}
          limit={filter.limit}
          onPageChange={(page) => setFilter({ ...filter, page })}
          onSelectLog={handleSelectLog}
        />
      )}

      {/* Slide-over Inspection drawer */}
      <LogDetail logs={dbLogs} />
    </div>
  );
};
