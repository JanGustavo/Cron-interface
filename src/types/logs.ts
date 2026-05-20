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
  status: 'success' | 'failed' | 'timeout';
  httpStatus?: number | null;
  durationMs?: number | null;
  responseBody?: string | null;
  attemptNumber: number;
}

export interface LogFilter {
  jobId?: string;
  status?: ('success' | 'failed' | 'timeout')[];
  searchQuery?: string; // Search by job name, ID or webhook URL
  startDate?: string | null; // ISO string format
  endDate?: string | null;   // ISO string format
  page: number;
  limit: number;
}
