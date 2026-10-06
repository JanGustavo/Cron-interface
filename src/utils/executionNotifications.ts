import type { LogEntry } from '../types/logs';

export interface ExecutionNotice { message: string; variant: 'warning' | 'error' }

export function executionNotice(log: LogEntry): ExecutionNotice | null {
  const job = log.jobName || 'Job';
  if (log.status === 'failed' || log.status === 'timeout') return { variant: 'error', message: `${job}: falha na chamada HTTP${log.httpStatus ? ` (${log.httpStatus})` : ''}. Abra os logs para ver o motivo.` };
  const issue = log.ruleEvaluations?.find((condition) => condition.status === 'error')
    ?? log.ruleEvaluations?.find((condition) => condition.status === 'fail' || (!condition.status && !condition.passed));
  if (log.status === 'validation_failed') return { variant: 'error', message: `${job}: condição de sucesso não atendida${issue ? ` (${issue.ruleName})` : ''}. Próximo job bloqueado.` };
  if (issue) return { variant: issue.status === 'error' ? 'error' : 'warning', message: `${job}: ${issue.status === 'error' ? 'erro ao avaliar' : 'violação de'} ${issue.ruleName}. Consulte a execução.` };
  return null;
}

// Compare RFC3339 instants including sub-millisecond precision from PostgreSQL.
function instant(value: string): bigint {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return 0n;
  const fraction = value.match(/\.(\d+)/)?.[1] || '';
  return BigInt(Math.floor(milliseconds / 1000)) * 1000000000n + BigInt(fraction.slice(0, 9).padEnd(9, '0'));
}

// First snapshot is a baseline: opening the app never replays historical failures.
export class ExecutionNotificationCursor {
  initialized = false;
  since?: string;
  private seen = new Set<string>();

  consume(logs: LogEntry[]): ExecutionNotice[] {
    const notices: ExecutionNotice[] = [];
    const previous = this.since ? instant(this.since) : undefined;
    let latest = this.since;
    const batchSeen = new Set(this.seen);
    for (const log of logs) {
      const time = instant(log.triggeredAt);
      if (previous !== undefined && time < previous) continue;
      if (this.initialized && !batchSeen.has(log.id)) {
        const notice = executionNotice(log);
        if (notice) notices.push(notice);
      }
      batchSeen.add(log.id);
      if (!latest || time > instant(latest)) latest = log.triggeredAt;
    }
    if (latest) {
      const boundary = instant(latest);
      const boundaryIDs = previous === boundary ? new Set(this.seen) : new Set<string>();
      for (const log of logs) if (instant(log.triggeredAt) === boundary) boundaryIDs.add(log.id);
      this.since = latest;
      this.seen = boundaryIDs;
    }
    this.initialized = true;
    return notices;
  }
}
