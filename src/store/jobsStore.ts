import { create } from 'zustand';
import type { Job, KanbanStatus } from '../types/jobs';
import api from '../services/api';

const mapStatusToKanban = (status: string, consecutiveFailures: number): KanbanStatus => {
  if (status === 'paused') return 'draft';
  if (status === 'failing' || consecutiveFailures > 0) return 'failed';
  return 'scheduled';
};

interface JobsState {
  jobs: Job[];
  activeJob: Job | null;
  isLoading: boolean;
  error: string | null;
  executingJobs: Record<string, { startTime: number; prevLastRunAt: string | null }>;

  // Actions
  setJobs: (jobs: Job[]) => void;
  fetchJobs: () => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'projectId' | 'createdAt' | 'nextRunAt' | 'consecutiveFailures'> & { id?: string }) => Promise<void>;
  updateJob: (job: Job) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  triggerJob: (jobId: string) => Promise<{ status: number }>;
  setActiveJob: (job: Job | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Kanban helper actions
  moveJobKanbanStatus: (jobId: string, newKanbanStatus: KanbanStatus) => Promise<void>;
}

interface ErrorWithResponse {
  response?: {
    status?: number;
    data?: {
      error?: string;
      reason?: string;
    };
  };
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [] as Job[],
  activeJob: null,
  isLoading: false,
  error: null,
  executingJobs: {} as Record<string, { startTime: number; prevLastRunAt: string | null }>,

  setJobs: (jobs) => set({ jobs, error: null }),

  fetchJobs: async () => {
    const hasJobs = get().jobs.length > 0;
    if (!hasJobs) {
      set({ isLoading: true, error: null });
    }
    try {
      const response = await api.get('/v1/jobs');
      const backendJobs = (response.data || []) as Job[];
      
      const executingJobs = get().executingJobs;
      const updatedExecutingJobs = { ...executingJobs };
      const now = Date.now();

      const mappedJobs = backendJobs.map((job) => {
        const executingInfo = executingJobs[job.id];
        if (executingInfo) {
          const lastRunChanged = job.lastRunAt !== executingInfo.prevLastRunAt;
          const timedOut = now - executingInfo.startTime > 15000;

          if (lastRunChanged || timedOut) {
            delete updatedExecutingJobs[job.id];
            return {
              ...job,
              kanbanStatus: mapStatusToKanban(job.status, job.consecutiveFailures || 0),
            };
          } else {
            return {
              ...job,
              kanbanStatus: 'executing' as KanbanStatus,
            };
          }
        }
        
        return {
          ...job,
          kanbanStatus: mapStatusToKanban(job.status, job.consecutiveFailures || 0),
        };
      });

      set({ jobs: mappedJobs, executingJobs: updatedExecutingJobs, isLoading: false });

      // Update activeJob if it is currently selected and updated
      const activeJob = get().activeJob;
      if (activeJob) {
        const updatedActive = mappedJobs.find((j) => j.id === activeJob.id);
        if (updatedActive) {
          set({ activeJob: updatedActive });
        }
      }
    } catch (err) {
      console.error(err);
      const errResponse = err as ErrorWithResponse;
      const errMsg = errResponse.response?.data?.error || errResponse.response?.data?.reason || 'Erro ao carregar tarefas do backend';
      set({ error: errMsg, isLoading: false });
    }
  },

  addJob: async (jobData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/v1/jobs', jobData);
      const newJob = response.data as Job;
      const mappedJob = {
        ...newJob,
        kanbanStatus: mapStatusToKanban(newJob.status, newJob.consecutiveFailures || 0),
      };
      set((state) => ({
        jobs: [mappedJob, ...state.jobs],
        isLoading: false,
      }));
    } catch (err) {
      console.error(err);
      const errResponse = err as ErrorWithResponse;
      const errMsg = errResponse.response?.data?.error || errResponse.response?.data?.reason || 'Erro ao criar tarefa no backend';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg, { cause: err });
    }
  },

  updateJob: async (updatedJob) => {
    set({ isLoading: true, error: null });
    try {
      // Verify if the job status or configuration has changed and update on the backend
      const currentJob = get().jobs.find((j) => j.id === updatedJob.id);
      if (currentJob) {
        const statusChanged = currentJob.status !== updatedJob.status;
        const configChanged =
          currentJob.name !== updatedJob.name ||
          currentJob.schedule !== updatedJob.schedule ||
          currentJob.timezone !== updatedJob.timezone ||
          currentJob.url !== updatedJob.url ||
          currentJob.httpMethod !== updatedJob.httpMethod ||
          JSON.stringify(currentJob.headers) !== JSON.stringify(updatedJob.headers) ||
          JSON.stringify(currentJob.payload) !== JSON.stringify(updatedJob.payload) ||
          currentJob.webhookAlertUrl !== updatedJob.webhookAlertUrl;

        if (configChanged) {
          await api.put(`/v1/jobs/${updatedJob.id}`, {
            name: updatedJob.name,
            schedule: updatedJob.schedule,
            timezone: updatedJob.timezone,
            url: updatedJob.url,
            http_method: updatedJob.httpMethod,
            headers: updatedJob.headers,
            payload: updatedJob.payload,
            webhook_alert_url: updatedJob.webhookAlertUrl || null,
          });
        } else if (statusChanged) {
          await api.patch(`/v1/jobs/${updatedJob.id}`, { status: updatedJob.status });
        }
      }

      set((state) => ({
        jobs: state.jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
        activeJob: state.activeJob?.id === updatedJob.id ? updatedJob : state.activeJob,
        isLoading: false,
      }));
    } catch (err) {
      console.error(err);
      const errResponse = err as ErrorWithResponse;
      const errMsg = errResponse.response?.data?.error || errResponse.response?.data?.reason || 'Erro ao atualizar tarefa';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg, { cause: err });
    }
  },

  deleteJob: async (jobId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/v1/jobs/${jobId}`);
      set((state) => ({
        jobs: state.jobs.filter((job) => job.id !== jobId),
        activeJob: state.activeJob?.id === jobId ? null : state.activeJob,
        isLoading: false,
      }));
    } catch (err) {
      console.error(err);
      const errResponse = err as ErrorWithResponse;
      const errMsg = errResponse.response?.data?.error || errResponse.response?.data?.reason || 'Erro ao deletar tarefa';
      set({ error: errMsg, isLoading: false });
      throw new Error(errMsg, { cause: err });
    }
  },

  triggerJob: async (jobId) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (job) {
      set((state) => ({
        jobs: state.jobs.map((j) =>
          j.id === jobId ? { ...j, kanbanStatus: 'executing' as KanbanStatus } : j
        ),
        activeJob: state.activeJob?.id === jobId ? { ...state.activeJob, kanbanStatus: 'executing' as KanbanStatus } : state.activeJob,
        executingJobs: {
          ...state.executingJobs,
          [jobId]: {
            startTime: Date.now(),
            prevLastRunAt: job.lastRunAt || null,
          },
        },
      }));
    }

    try {
      const response = await api.post(`/v1/jobs/${jobId}/trigger`);
      return { status: response.status };
    } catch (err) {
      const originalJob = get().jobs.find((j) => j.id === jobId);
      if (originalJob) {
        set((state) => {
          const nextExecuting = { ...state.executingJobs };
          delete nextExecuting[jobId];
          return {
            jobs: state.jobs.map((j) =>
              j.id === jobId
                ? { ...j, kanbanStatus: mapStatusToKanban(j.status, j.consecutiveFailures || 0) }
                : j
            ),
            activeJob:
              state.activeJob?.id === jobId
                ? {
                    ...state.activeJob,
                    kanbanStatus: mapStatusToKanban(state.activeJob.status, state.activeJob.consecutiveFailures || 0),
                  }
                : state.activeJob,
            executingJobs: nextExecuting,
          };
        });
      }

      console.error(err);
      const errResponse = err as ErrorWithResponse;
      const status = errResponse.response?.status;
      const errMsg = errResponse.response?.data?.error || errResponse.response?.data?.reason || 'Erro ao disparar execução manual';
      const error = new Error(errMsg, { cause: err }) as Error & { status?: number };
      error.status = status;
      throw error;
    }
  },

  setActiveJob: (activeJob) => set({ activeJob }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  moveJobKanbanStatus: async (jobId, newKanbanStatus) => {
    let backendStatus: 'active' | 'paused' = 'active';
    if (newKanbanStatus === 'draft') {
      backendStatus = 'paused';
    } else if (newKanbanStatus === 'failed') {
      backendStatus = 'paused';
    }

    try {
      await api.patch(`/v1/jobs/${jobId}`, { status: backendStatus });
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: backendStatus,
                kanbanStatus: newKanbanStatus,
              }
            : job
        ),
        activeJob:
          state.activeJob?.id === jobId
            ? {
                ...state.activeJob,
                status: backendStatus,
                kanbanStatus: newKanbanStatus,
              }
            : state.activeJob,
      }));
    } catch (err) {
      console.error(err);
      const errResponse = err as ErrorWithResponse;
      const errMsg = errResponse.response?.data?.error || errResponse.response?.data?.reason || 'Erro ao mover tarefa no backend';
      set({ error: errMsg });
    }
  },
}));
