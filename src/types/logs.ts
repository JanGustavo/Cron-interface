export type ExecutionStatus = 'success' | 'failed' | 'timeout' | 'validation_failed';

export interface RuleEvaluation {
  mode?: 'observe' | 'require_success';
  valueType?: string;
  ruleId: string;
  ruleName: string;
  passed: boolean;
  status?: 'pass' | 'fail' | 'error' | 'skipped';
  reason?: string;
  message?: string;
  key?: string;
  operator?: string;
  expectedValue?: string;
  observedValue?: unknown;
  observedValueText?: string;
}

/**
 * Types representing log entries and filtering criteria
 * for the detailed logs screen.
 */

export interface LogEntry {
  id: string;
  jobId: string;
  jobName?: string; // Optional metadata for displaying job name in UI
  jobUrl?: string;  // Optional metadata for displaying URL in UI
  triggeredAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  status: ExecutionStatus;
  transportStatus?: ExecutionStatus;
  httpStatus?: number | null;
  durationMs?: number | null;
  responseBody?: string | null;
  attemptNumber: number;
  ruleEvaluations?: RuleEvaluation[] | null;
}

export interface LogFilter {
  jobId?: string;
  status?: ExecutionStatus[];
  searchQuery?: string; // Search by job name, ID or webhook URL
  startDate?: string | null; // ISO string format
  endDate?: string | null;   // ISO string format
  page: number;
  limit: number;
}
