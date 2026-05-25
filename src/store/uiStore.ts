import { create } from 'zustand';

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface UiState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  activeTab: string; // e.g., 'dashboard', 'jobs', 'logs', 'profile', 'settings'
  isJobModalOpen: boolean;
  isLogModalOpen: boolean;
  isCreateModalOpen: boolean;
  selectedLogId: string | null;
  toast: { message: string; variant: ToastVariant } | null;

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: string) => void;
  setJobModalOpen: (isOpen: boolean) => void;
  setLogModalOpen: (isOpen: boolean, logId?: string | null) => void;
  setCreateModalOpen: (isOpen: boolean) => void;
  showToast: (message: string, variant?: ToastVariant) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark', // Defaulting to dark theme (premium glassmorphism/cyberpunk style)
  sidebarOpen: true,
  activeTab: 'dashboard',
  isJobModalOpen: false,
  isLogModalOpen: false,
  isCreateModalOpen: false,
  selectedLogId: null,
  toast: null,

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      // Sync with index.html classList for Tailwind/Global CSS styling
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { theme: nextTheme };
    }),

  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setJobModalOpen: (isJobModalOpen) => set({ isJobModalOpen }),

  setLogModalOpen: (isLogModalOpen, selectedLogId = null) =>
    set({ isLogModalOpen, selectedLogId }),

  setCreateModalOpen: (isCreateModalOpen) => set({ isCreateModalOpen }),

  showToast: (message, variant = 'info') =>
    set({ toast: { message, variant } }),

  clearToast: () => set({ toast: null }),
}));
