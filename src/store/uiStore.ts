import { create } from 'zustand';

type ToastVariant = 'info' | 'success' | 'warning' | 'error';

interface UiState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
  activeTab: string; // e.g., 'dashboard', 'jobs', 'logs', 'profile', 'settings'
  isJobModalOpen: boolean;
  isLogModalOpen: boolean;
  isCreateModalOpen: boolean;
  isImportModalOpen: boolean;
  isDocsOpen: boolean;
  isOnboardingOpen: boolean;
  isPlansModalOpen: boolean;
  selectedLogId: string | null;
  toast: { message: string; variant: ToastVariant } | null;

  // Accessibility Settings
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'normal' | 'large';
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: 'normal' | 'large') => void;

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setActiveTab: (tab: string) => void;
  setJobModalOpen: (isOpen: boolean) => void;
  setLogModalOpen: (isLogModalOpen: boolean, logId?: string | null) => void;
  setCreateModalOpen: (isOpen: boolean) => void;
  setImportModalOpen: (isOpen: boolean) => void;
  setDocsOpen: (isOpen: boolean) => void;
  setOnboardingOpen: (isOpen: boolean) => void;
  setPlansModalOpen: (isOpen: boolean) => void;
  showToast: (message: string, variant?: ToastVariant) => void;
  clearToast: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark', // Defaulting to dark theme (premium glassmorphism/cyberpunk style)
  highContrast: typeof window !== 'undefined' ? localStorage.getItem('cf_high_contrast') === 'true' : false,
  reducedMotion: typeof window !== 'undefined' ? localStorage.getItem('cf_reduced_motion') === 'true' : false,
  fontSize: (typeof window !== 'undefined' && localStorage.getItem('cf_font_size') as 'normal' | 'large') || 'normal',
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  activeTab: 'dashboard',
  isJobModalOpen: false,
  isLogModalOpen: false,
  isCreateModalOpen: false,
  isImportModalOpen: false,
  isDocsOpen: false,
  isOnboardingOpen: false,
  isPlansModalOpen: false,
  selectedLogId: null,
  toast: null,

  toggleHighContrast: () =>
    set((state) => {
      const next = !state.highContrast;
      localStorage.setItem('cf_high_contrast', String(next));
      if (next) {
        document.documentElement.classList.add('high-contrast');
      } else {
        document.documentElement.classList.remove('high-contrast');
      }
      return { highContrast: next };
    }),

  toggleReducedMotion: () =>
    set((state) => {
      const next = !state.reducedMotion;
      localStorage.setItem('cf_reduced_motion', String(next));
      if (next) {
        document.documentElement.classList.add('reduced-motion');
      } else {
        document.documentElement.classList.remove('reduced-motion');
      }
      return { reducedMotion: next };
    }),

  setFontSize: (fontSize) => {
    localStorage.setItem('cf_font_size', fontSize);
    if (fontSize === 'large') {
      document.documentElement.classList.add('text-lg-accessibility');
    } else {
      document.documentElement.classList.remove('text-lg-accessibility');
    }
    set({ fontSize });
  },

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

  setImportModalOpen: (isImportModalOpen) => set({ isImportModalOpen }),

  setDocsOpen: (isDocsOpen) => set({ isDocsOpen }),

  setOnboardingOpen: (isOnboardingOpen) => set({ isOnboardingOpen }),

  setPlansModalOpen: (isPlansModalOpen) => set({ isPlansModalOpen }),

  showToast: (message, variant = 'info') =>
    set({ toast: { message, variant } }),

  clearToast: () => set({ toast: null }),
}));
