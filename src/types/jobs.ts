import type { ExecutionStatus, LogEntry } from './logs';
/**
 * Types representing jobs, statuses, and execution log information
 * based on the database schema and Kanban board requirements.
 */

/**
 * Status of a job persisted in the database.
 */
export type JobStatus = 'active' | 'paused' | 'failing';

/**
 * Status representation for the Kanban board columns.
 */
export type KanbanStatus = 'draft' | 'scheduled' | 'executing' | 'success' | 'failed';

export interface Job {
  id: string;
  projectId: string;
  name: string;
  schedule: string; // e.g., "* * * * *" (cron) or "every:15m" (interval)
  timezone: string; // e.g., "UTC", "America/Sao_Paulo"
  url: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  payload?: Record<string, unknown> | string;
  status: JobStatus;
  kanbanStatus?: KanbanStatus; // Helper for frontend Kanban column state
  nextRunAt: string;
  lastRunAt?: string | null;
  consecutiveFailures: number;
  lastRunStatus?: ExecutionStatus | null;
  createdAt: string;
  webhookAlertUrl?: string;
  nextJobId?: string | null;
  tags?: string[];
}

/**
 * Single execution log entry associated with a specific job run.
 */
export type JobLog = LogEntry;
