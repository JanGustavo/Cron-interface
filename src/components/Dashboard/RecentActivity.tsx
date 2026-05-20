import React from 'react';
import type { LogEntry } from '../../types/logs';
import { StatusBadge } from './StatusBadge';
import { useUiStore } from '../../store/uiStore';

interface RecentActivityProps {
  activities?: LogEntry[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities = [] }) => {
  const { setLogModalOpen } = useUiStore();

  // Standard mock data if none is supplied
  const items = activities.length > 0 ? activities : [
    {
      id: '1',
      jobId: 'job-1',
      jobName: 'Sincronização de Cobranças',
      jobUrl: 'https://api.saas.sh/v1/billing/sync',
      triggeredAt: '2026-05-20T14:15:00-03:00',
      startedAt: '2026-05-20T14:15:00-03:00',
      finishedAt: '2026-05-20T14:15:00.142-03:00',
      status: 'success',
      httpStatus: 200,
      durationMs: 142,
      attemptNumber: 1,
    },
    {
      id: '2',
      jobId: 'job-2',
      jobName: 'Alerta do Slack',
      jobUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      triggeredAt: '2026-05-20T14:00:00-03:00',
      startedAt: '2026-05-20T14:00:00-03:00',
      finishedAt: '2026-05-20T14:00:00.088-03:00',
      status: 'success',
      httpStatus: 204,
      durationMs: 88,
      attemptNumber: 1,
    },
    {
      id: '3',
      jobId: 'job-3',
      jobName: 'Limpeza de Banco (Daily)',
      jobUrl: 'https://api.saas.sh/v1/db/cleanup',
      triggeredAt: '2026-05-20T13:59:00-03:00',
      startedAt: '2026-05-20T13:59:00-03:00',
      finishedAt: '2026-05-20T13:59:01.200-03:00',
      status: 'failed',
      httpStatus: 500,
      durationMs: 1200,
      attemptNumber: 3,
    },
    {
      id: '4',
      jobId: 'job-4',
      jobName: 'Verificar API de Terceiro',
      jobUrl: 'https://status.stripe.com/api/v2/status.json',
      triggeredAt: '2026-05-20T13:50:00-03:00',
      startedAt: '2026-05-20T13:50:00-03:00',
      finishedAt: null,
      status: 'timeout',
      httpStatus: null,
      durationMs: 30000,
      attemptNumber: 1,
    },
    {
      id: '5',
      jobId: 'job-5',
      jobName: 'Notificação Push (V2)',
      jobUrl: 'https://onesignal.com/api/v1/notifications',
      triggeredAt: '2026-05-20T13:45:00-03:00',
      startedAt: '2026-05-20T13:45:00-03:00',
      finishedAt: '2026-05-20T13:45:00.210-03:00',
      status: 'success',
      httpStatus: 200,
      durationMs: 210,
      attemptNumber: 1,
    },
  ] as LogEntry[];

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-2xl glass-panel border border-indigo-950/40 overflow-hidden select-none">
      {/* Header Panel */}
      <div className="px-5 py-4 border-b border-indigo-950/30 flex justify-between items-center bg-indigo-950/10">
        <div>
          <h3 className="text-sm font-extrabold text-slate-100 tracking-wide">
            Atividade Recente
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Últimas execuções de webhooks disparadas em tempo real.
          </p>
        </div>
        <span className="flex items-center gap-1">
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
              <th className="px-5 py-3 text-[10px] w-24">Hora</th>
              <th className="px-5 py-3 text-[10px] w-24">Duração</th>
              <th className="px-5 py-3 text-[10px] w-12">Tenta.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-indigo-950/15">
            {items.map((log) => (
              <tr
                key={log.id}
                onClick={() => setLogModalOpen(true, log.id)}
                className="hover:bg-indigo-950/15 transition-all duration-200 cursor-pointer group"
              >
                {/* Job metadata info */}
                <td className="px-5 py-3.5 min-w-[240px]">
                  <div className="font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors">
                    {log.jobName || `Job #${log.jobId}`}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate max-w-[260px]">
                    {log.jobUrl}
                  </div>
                </td>
                
                {/* Status Badges */}
                <td className="px-5 py-3.5">
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge status={log.status} />
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
