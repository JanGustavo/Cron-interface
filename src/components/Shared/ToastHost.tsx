import React, { useEffect, useRef } from 'react';
import { useUiStore } from '../../store/uiStore';

type ToastStyle = {
  container: string;
  icon: JSX.Element;
};

const toastStyles: Record<string, ToastStyle> = {
  info: {
    container: 'border-cyan-500/20 text-cyan-200',
    icon: (
      <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
      </svg>
    ),
  },
  success: {
    container: 'border-emerald-500/20 text-emerald-200',
    icon: (
      <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  warning: {
    container: 'border-amber-500/20 text-amber-200',
    icon: (
      <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86l-8.2 14.2a1 1 0 00.86 1.5h18.1a1 1 0 00.86-1.5l-8.2-14.2a1 1 0 00-1.72 0z" />
      </svg>
    ),
  },
  error: {
    container: 'border-rose-500/20 text-rose-200',
    icon: (
      <svg className="w-4 h-4 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
};

export const ToastHost: React.FC = () => {
  const toast = useUiStore((state) => state.toast);
  const clearToast = useUiStore((state) => state.clearToast);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      clearToast();
    }, 2400);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [toast, clearToast]);

  if (!toast) return null;

  const style = toastStyles[toast.variant] || toastStyles.info;

  return (
    <div className="fixed top-5 right-5 z-[9999] pointer-events-none">
      <div
        className={`flex items-start gap-2 px-4 py-2.5 rounded-xl border bg-[#0a0d1d]/90 text-xs shadow-lg animate-in fade-in duration-200 ${style.container}`}
        role="status"
        aria-live="polite"
      >
        {style.icon}
        <span className="leading-relaxed max-w-[280px]">{toast.message}</span>
      </div>
    </div>
  );
};
