import React, { useState, useMemo } from 'react';
import type { LogEntry, LogFilter as LogFilterType } from '../types/logs';
import { LogFilter } from '../components/Logs/LogFilter';
import { LogList } from '../components/Logs/LogList';
import { LogDetail } from '../components/Logs/LogDetail';
import { LogExport } from '../components/Logs/LogExport';
import { useUiStore } from '../store/uiStore';

// Rich Mock Log list aligning perfectly with the executions schema
const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-101',
    jobId: 'job-1',
    jobName: 'Sincronização de Cobranças',
    jobUrl: 'https://api.saas.sh/v1/billing/sync',
    triggeredAt: '2026-05-20T14:15:00-03:00',
    startedAt: '2026-05-20T14:15:00-03:00',
    finishedAt: '2026-05-20T14:15:00-03:00',
    status: 'success',
    httpStatus: 200,
    durationMs: 142,
    responseBody: '{\n  "status": "ok",\n  "synced_records": 125\n}',
    attemptNumber: 1,
  },
  {
    id: 'log-102',
    jobId: 'job-4',
    jobName: 'Limpeza de Banco (Daily)',
    jobUrl: 'https://api.saas.sh/v1/db/cleanup',
    triggeredAt: '2026-05-20T00:00:04-03:00',
    startedAt: '2026-05-20T00:00:02-03:00',
    finishedAt: '2026-05-20T00:00:04-03:00',
    status: 'failed',
    httpStatus: 500,
    durationMs: 1200,
    responseBody: '{\n  "error": "Database timeout during purge of expired logs",\n  "code": "DB_TIMEOUT"\n}',
    attemptNumber: 3,
  },
  {
    id: 'log-103',
    jobId: 'job-4',
    jobName: 'Limpeza de Banco (Daily)',
    jobUrl: 'https://api.saas.sh/v1/db/cleanup',
    triggeredAt: '2026-05-19T23:55:00-03:00',
    startedAt: '2026-05-19T23:50:00-03:00',
    finishedAt: '2026-05-19T23:55:00-03:00',
    status: 'failed',
    httpStatus: 504,
    durationMs: 5000,
    responseBody: 'Gateway Timeout: Cloudflare could not reach upstream server.',
    attemptNumber: 2,
  },
  {
    id: 'log-104',
    jobId: 'job-4',
    jobName: 'Limpeza de Banco (Daily)',
    jobUrl: 'https://api.saas.sh/v1/db/cleanup',
    triggeredAt: '2026-05-19T23:50:00-03:00',
    startedAt: '2026-05-19T23:49:59-03:00',
    finishedAt: '2026-05-19T23:50:00-03:00',
    status: 'failed',
    httpStatus: 502,
    durationMs: 800,
    responseBody: 'Bad Gateway: connection refused to application target.',
    attemptNumber: 1,
  },
  {
    id: 'log-105',
    jobId: 'job-2',
    jobName: 'Notificação Push (V2)',
    jobUrl: 'https://onesignal.com/api/v1/notifications',
    triggeredAt: '2026-05-20T14:30:12-03:00',
    startedAt: '2026-05-20T14:30:12-03:00',
    finishedAt: '2026-05-20T14:30:12-03:00',
    status: 'success',
    httpStatus: 200,
    durationMs: 154,
    responseBody: '{\n  "id": "ns-819a-251f",\n  "recipients": 1420,\n  "delivered": true\n}',
    attemptNumber: 1,
  },
  {
    id: 'log-106',
    jobId: 'job-2',
    jobName: 'Notificação Push (V2)',
    jobUrl: 'https://onesignal.com/api/v1/notifications',
    triggeredAt: '2026-05-20T14:15:11-03:00',
    startedAt: '2026-05-20T14:15:11-03:00',
    finishedAt: '2026-05-20T14:15:11-03:00',
    status: 'success',
    httpStatus: 200,
    durationMs: 130,
    responseBody: '{\n  "id": "ns-819a-250e",\n  "recipients": 1390,\n  "delivered": true\n}',
    attemptNumber: 1,
  },
  {
    id: 'log-107',
    jobId: 'job-5',
    jobName: 'Processar API de Terceiro',
    jobUrl: 'https://status.stripe.com/api/v2/status.json',
    triggeredAt: '2026-05-20T14:40:02-03:00',
    startedAt: '2026-05-20T14:40:02-03:00',
    finishedAt: '2026-05-20T14:40:02-03:00',
    status: 'success',
    httpStatus: 200,
    durationMs: 210,
    responseBody: '{\n  "status": "up",\n  "description": "All systems operational"\n}',
    attemptNumber: 1,
  },
  {
    id: 'log-108',
    jobId: 'job-3',
    jobName: 'Slack Alert Sync',
    jobUrl: 'https://hooks.slack.com/services/T00000/B00000/XXXXXX',
    triggeredAt: '2026-05-20T14:00:02-03:00',
    startedAt: '2026-05-20T14:00:02-03:00',
    finishedAt: '2026-05-20T14:00:02-03:00',
    status: 'success',
    httpStatus: 200,
    durationMs: 95,
    responseBody: 'ok',
    attemptNumber: 1,
  },
  {
    id: 'log-109',
    jobId: 'job-1',
    jobName: 'Sincronização de Cobranças',
    jobUrl: 'https://api.saas.sh/v1/billing/sync',
    triggeredAt: '2026-05-11T09:00:18-03:00',
    startedAt: '2026-05-11T09:00:18-03:00',
    finishedAt: '2026-05-11T09:00:18-03:00',
    status: 'success',
    httpStatus: 200,
    durationMs: 158,
    responseBody: '{\n  "status": "ok",\n  "synced_records": 98\n}',
    attemptNumber: 1,
  },
  {
    id: 'log-110',
    jobId: 'job-5',
    jobName: 'Processar API de Terceiro',
    jobUrl: 'https://status.stripe.com/api/v2/status.json',
    triggeredAt: '2026-05-20T14:35:02-03:00',
    startedAt: '2026-05-20T14:34:47-03:00',
    finishedAt: '2026-05-20T14:35:02-03:00',
    status: 'timeout',
    httpStatus: null,
    durationMs: 15000,
    responseBody: 'Execution exceeded maximum duration limit of 15 seconds. Connection timed out.',
    attemptNumber: 1,
  },
];

const INITIAL_FILTER: LogFilterType = {
  page: 1,
  limit: 10,
};

export const Logs: React.FC = () => {
  const { setLogModalOpen } = useUiStore();
  const [filter, setFilter] = useState<LogFilterType>(INITIAL_FILTER);

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
    return MOCK_LOGS.filter((log) => {
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
  }, [filter]);

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
      <LogList
        logs={paginatedLogs}
        totalLogs={filteredAndFormattedLogs.length}
        currentPage={filter.page}
        limit={filter.limit}
        onPageChange={(page) => setFilter({ ...filter, page })}
        onSelectLog={handleSelectLog}
      />

      {/* Slide-over Inspection drawer */}
      <LogDetail logs={MOCK_LOGS} />
    </div>
  );
};
