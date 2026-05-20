import { create } from 'zustand';
import type { User, Token, Project } from '../types/auth';
interface AuthState {
  user: User | null;
  token: Token | null;
  isAuthenticated: boolean;
  activeProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (user: User, token: Token, projects: Project[]) => void;
  logout: () => void;
  setActiveProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  activeProject: null,
  projects: [],
  isLoading: false,
  error: null,

  login: (user, token, projects) => {
    // Persist token in localStorage for convenience (Session persistence)
    localStorage.setItem('cf_token', token.accessToken);
    localStorage.setItem('cf_refresh_token', token.refreshToken);

    set({
      user,
      token,
      isAuthenticated: true,
      projects,
      activeProject: projects.length > 0 ? projects[0] : null,
      error: null,
    });
  },

  logout: () => {
    localStorage.removeItem('cf_token');
    localStorage.removeItem('cf_refresh_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      activeProject: null,
      projects: [],
      error: null,
    });
  },

  setActiveProject: (project) => set({ activeProject: project }),

  setProjects: (projects) => {
    set((state) => {
      const activeProject = state.activeProject
        ? projects.find((p) => p.id === state.activeProject?.id) || projects[0] || null
        : projects[0] || null;

      return { projects, activeProject };
    });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
