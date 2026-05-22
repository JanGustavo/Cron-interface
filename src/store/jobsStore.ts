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

  // Actions
  setJobs: (jobs: Job[]) => void;
  fetchJobs: () => Promise<void>;
  addJob: (job: Omit<Job, 'id' | 'projectId' | 'createdAt' | 'nextRunAt' | 'consecutiveFailures'> & { id?: string }) => Promise<void>;
  updateJob: (job: Job) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  setActiveJob: (job: Job | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Kanban helper actions
  moveJobKanbanStatus: (jobId: string, newKanbanStatus: KanbanStatus) => Promise<void>;
}

interface ErrorWithResponse {
  response?: {
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

  setJobs: (jobs) => set({ jobs, error: null }),

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/v1/jobs');
      const backendJobs = (response.data || []) as Job[];
      const mappedJobs = backendJobs.map((job) => ({
        ...job,
        kanbanStatus: mapStatusToKanban(job.status, job.consecutiveFailures || 0),
      }));
      set({ jobs: mappedJobs, isLoading: false });
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
      // Verify if the job status has changed and update on the backend
      const currentJob = get().jobs.find((j) => j.id === updatedJob.id);
      if (currentJob && currentJob.status !== updatedJob.status) {
        await api.patch(`/v1/jobs/${updatedJob.id}`, { status: updatedJob.status });
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
