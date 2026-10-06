import { useEffect } from 'react';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import type { LogEntry } from '../types/logs';
import { ExecutionNotificationCursor } from '../utils/executionNotifications';

interface HistoryPage { data: LogEntry[]; total: number }

export function useExecutionNotifications(authenticated: boolean, projectId?: string) {
  const showToast = useUiStore((state) => state.showToast);
  useEffect(() => {
    if (!authenticated || !projectId) return;
    const controller = new AbortController();
    const cursor = new ExecutionNotificationCursor();
    let pending = false;
    const poll = async () => {
      if (pending || controller.signal.aborted) return;
      pending = true;
      try {
        const params: Record<string, string | number> = { limit: 100, page: 1 };
        if (cursor.since) params.start_date = cursor.since;
        const first = await api.get<HistoryPage>('/v1/executions', { params, signal: controller.signal });
        const logs = [...(first.data.data || [])];
        // Freeze the result window while reading more pages, so new runs don't shift offsets.
        if (cursor.initialized && logs.length) {
          params.end_date = logs[0].triggeredAt;
          while (logs.length < first.data.total) {
            params.page = Number(params.page) + 1;
            const next = await api.get<HistoryPage>('/v1/executions', { params, signal: controller.signal });
            if (!next.data.data?.length) break;
            logs.push(...next.data.data);
          }
        }
        if (controller.signal.aborted) return;
        const notices = cursor.consume(logs);
        if (notices.length === 1) showToast(notices[0].message, notices[0].variant);
        else if (notices.length > 1) showToast(`${notices.length} novas execuções com falha ou erro de monitoramento. ${notices[0].message}`, notices.some((notice) => notice.variant === 'error') ? 'error' : 'warning');
      } catch {
        // A failed poll doesn't advance the cursor; the next poll retries the same window.
      } finally { pending = false; }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 10000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [authenticated, projectId, showToast]);
}
