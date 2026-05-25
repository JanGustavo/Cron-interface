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
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAllLogs = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', filter.page.toString());
        params.append('limit', filter.limit.toString());
        if (filter.searchQuery) {
          params.append('search', filter.searchQuery);
        }
        if (filter.status && filter.status.length > 0) {
          params.append('status', filter.status[0]);
        }
        if (filter.startDate) {
          params.append('start_date', filter.startDate);
        }
        if (filter.endDate) {
          params.append('end_date', filter.endDate);
        }

        const res = await api.get(`/v1/executions?${params.toString()}`);
        const payload = (res.data?.data || []) as LogEntry[];
        const total = res.data?.total || 0;
        
        if (active) {
          setDbLogs(payload);
          setTotalLogs(total);
        }
      } catch (err) {
        console.error("Erro ao carregar auditoria global de logs", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchAllLogs();
    return () => { active = false; };
  }, [filter, jobs]);

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
  const formattedLogs = useMemo(() => {
    return dbLogs.map((log) => ({
      ...log,
      triggeredAt: formatTimestamp(log.triggeredAt),
    }));
  }, [dbLogs]);

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
        <LogExport logs={formattedLogs} />
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
          logs={formattedLogs}
          totalLogs={totalLogs}
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
