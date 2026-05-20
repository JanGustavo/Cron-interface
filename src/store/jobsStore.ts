import { create } from 'zustand';
import type { Job, KanbanStatus } from '../types/jobs';

interface JobsState {
  jobs: Job[];
  activeJob: Job | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (job: Job) => void;
  deleteJob: (jobId: string) => void;
  setActiveJob: (job: Job | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Kanban helper actions
  moveJobKanbanStatus: (jobId: string, newKanbanStatus: KanbanStatus) => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [
    {
      id: 'job-1',
      projectId: '1',
      name: 'Sincronização de Cobranças',
      schedule: '0 9 * * 1',
      timezone: 'America/Sao_Paulo',
      url: 'https://api.saas.sh/v1/billing/sync',
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer cf_live_...' },
      payload: { sync_type: 'weekly', force_retry: true },
      status: 'active',
      kanbanStatus: 'success',
      nextRunAt: '2026-05-25T09:00:00Z',
      lastRunAt: '2026-05-18T09:00:15Z',
      consecutiveFailures: 0,
      createdAt: '2026-04-10T12:00:00Z',
    },
    {
      id: 'job-2',
      projectId: '1',
      name: 'Notificação Push (V2)',
      schedule: 'every:15m',
      timezone: 'UTC',
      url: 'https://onesignal.com/api/v1/notifications',
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: { app_id: 'cf-saas-production', contents: { en: 'Weekly status report available' } },
      status: 'active',
      kanbanStatus: 'scheduled',
      nextRunAt: '2026-05-20T14:45:00Z',
      lastRunAt: '2026-05-20T14:30:12Z',
      consecutiveFailures: 0,
      createdAt: '2026-04-15T08:30:00Z',
    },
    {
      id: 'job-3',
      projectId: '1',
      name: 'Slack Alert Sync',
      schedule: '0 * * * *',
      timezone: 'America/Sao_Paulo',
      url: 'https://hooks.slack.com/services/T00000/B00000/XXXXXX',
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      payload: { text: 'Alert: cron job synchronization active' },
      status: 'paused',
      kanbanStatus: 'draft',
      nextRunAt: '2026-05-20T15:00:00Z',
      lastRunAt: '2026-05-20T14:00:02Z',
      consecutiveFailures: 0,
      createdAt: '2026-04-20T10:00:00Z',
    },
    {
      id: 'job-4',
      projectId: '1',
      name: 'Limpeza de Banco (Daily)',
      schedule: '0 0 * * *',
      timezone: 'UTC',
      url: 'https://api.saas.sh/v1/db/cleanup',
      httpMethod: 'DELETE',
      headers: { 'X-Admin-Token': 'super-secret-cleanup-key' },
      payload: { purge_expired_logs: true, days_retention: 7 },
      status: 'failing',
      kanbanStatus: 'failed',
      nextRunAt: '2026-05-21T00:00:00Z',
      lastRunAt: '2026-05-20T00:00:04Z',
      consecutiveFailures: 3,
      createdAt: '2026-05-01T23:00:00Z',
    },
    {
      id: 'job-5',
      projectId: '1',
      name: 'Processar API de Terceiro',
      schedule: '*/5 * * * *',
      timezone: 'UTC',
      url: 'https://status.stripe.com/api/v2/status.json',
      httpMethod: 'GET',
      status: 'active',
      kanbanStatus: 'executing',
      nextRunAt: '2026-05-20T14:45:00Z',
      lastRunAt: '2026-05-20T14:40:02Z',
      consecutiveFailures: 0,
      createdAt: '2026-05-05T09:15:00Z',
    },
  ] as Job[],
  activeJob: null,
  isLoading: false,
  error: null,

  setJobs: (jobs) => set({ jobs, error: null }),

  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),

  updateJob: (updatedJob) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
      // Update activeJob if it is the one being updated
      activeJob: state.activeJob?.id === updatedJob.id ? updatedJob : state.activeJob,
    })),

  deleteJob: (jobId) =>
    set((state) => ({
      jobs: state.jobs.filter((job) => job.id !== jobId),
      activeJob: state.activeJob?.id === jobId ? null : state.activeJob,
    })),

  setActiveJob: (activeJob) => set({ activeJob }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  moveJobKanbanStatus: (jobId, newKanbanStatus) =>
    set((state) => ({
      jobs: state.jobs.map((job) =>
        job.id === jobId ? { ...job, kanbanStatus: newKanbanStatus } : job
      ),
    })),
}));
