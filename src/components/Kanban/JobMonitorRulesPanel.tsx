import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { useEntitlements } from '../../hooks/useEntitlements';

interface MonitorRule {
  id: string;
  name: string;
  key: string;
  operator: string;
  jobId?: string | null;
  job_id?: string | null;
  thresholdValue?: string;
  threshold_value?: string;
  alertEmail?: boolean;
  alert_email?: boolean;
  webhookUrl?: string | null;
  webhook_url?: string | null;
  isEnabled?: boolean;
  is_enabled?: boolean;
}

const getJobId = (rule: MonitorRule) => rule.jobId ?? rule.job_id ?? null;
const getThreshold = (rule: MonitorRule) => rule.thresholdValue ?? rule.threshold_value ?? '';
const isEnabled = (rule: MonitorRule) => rule.isEnabled ?? rule.is_enabled ?? true;

const operatorLabel: Record<string, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'contém',
};

export const JobMonitorRulesPanel: React.FC = () => {
  const { activeJob } = useJobsStore();
  const { isJobModalOpen, showToast } = useUiStore();
  const { isPro } = useEntitlements();
  const [rules, setRules] = useState<MonitorRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isJobModalOpen || !activeJob) {
      setPortalTarget(null);
      return;
    }

    let frame = 0;
    const locateModalContent = () => {
      const target = document.querySelector<HTMLElement>('.fixed.inset-0.z-50 > .glass-panel > .p-6');
      if (target) {
        setPortalTarget(target);
        return;
      }
      frame = window.requestAnimationFrame(locateModalContent);
    };

    locateModalContent();
    return () => window.cancelAnimationFrame(frame);
  }, [isJobModalOpen, activeJob]);

  const fetchRules = async () => {
    if (!activeJob) return;
    try {
      setLoading(true);
      const response = await api.get('/v1/monitor/rules');
      setRules(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar regras do job:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isJobModalOpen && activeJob) fetchRules();
  }, [isJobModalOpen, activeJob?.id]);

  const visibleRules = useMemo(() => {
    if (!activeJob) return [];
    return rules.filter((rule) => {
      const jobId = getJobId(rule);
      return jobId === activeJob.id || jobId === null;
    });
  }, [rules, activeJob]);

  const linkedRules = visibleRules.filter((rule) => getJobId(rule) === activeJob?.id);
  const globalRules = visibleRules.filter((rule) => getJobId(rule) === null);

  const openMonitorForJob = (rule?: MonitorRule) => {
    if (!activeJob) return;
    const detail = {
      jobId: activeJob.id,
      ...(rule ? {
        key: rule.key,
        value: getThreshold(rule),
        name: rule.name,
      } : {}),
    };
    localStorage.setItem('cf_prefill_rule', JSON.stringify(detail));
    window.dispatchEvent(new CustomEvent('cf_open_monitor_page', { detail }));
    showToast(rule ? 'Regra carregada no Monitoramento.' : 'Abrindo criação de regra para este Job.', 'info');
    window.history.pushState({}, '', '/monitor');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDelete = async (rule: MonitorRule) => {
    if (!window.confirm(`Excluir a regra "${rule.name}"?`)) return;
    try {
      await api.delete(`/v1/monitor/rules/${rule.id}`);
      setRules((current) => current.filter((item) => item.id !== rule.id));
      showToast('Regra removida com sucesso.', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao remover regra.', 'error');
    }
  };

  if (!isJobModalOpen || !activeJob || !portalTarget) return null;

  return createPortal(
    <section className="space-y-3 pt-1" aria-label="Regras de monitoramento do job">
      <div className="h-px bg-indigo-950/40" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Regras de Monitoramento</h4>
            <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-bold text-indigo-300 uppercase">{linkedRules.length} vinculada(s)</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Este Job recebe suas regras específicas e também as regras globais ativas.</p>
        </div>
        <button
          type="button"
          onClick={() => openMonitorForJob()}
          className="px-3 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-[10px] font-bold text-white transition-colors cursor-pointer"
        >
          + Criar regra para este Job
        </button>
      </div>

      {loading ? (
        <div className="p-4 rounded-xl border border-indigo-950/40 bg-slate-950/30 text-center text-[11px] text-slate-500 animate-pulse">Carregando regras...</div>
      ) : visibleRules.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-indigo-950/40 bg-slate-950/20 text-center">
          <p className="text-[11px] text-slate-500">Nenhuma regra ativa afeta este Job.</p>
          <button type="button" onClick={() => openMonitorForJob()} className="mt-2 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer">Criar a primeira regra →</button>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleRules.map((rule) => {
            const specific = getJobId(rule) === activeJob.id;
            const webhook = rule.webhookUrl ?? rule.webhook_url;
            return (
              <div key={rule.id} className="p-3 rounded-xl border border-indigo-950/40 bg-slate-950/30 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-200 truncate">{rule.name}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase border ${specific ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'}`}>
                      {specific ? 'Job' : 'Global'}
                    </span>
                    {!isEnabled(rule) && <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase border border-slate-700 text-slate-500">Desativada</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
                    <code className="text-cyan-400">{rule.key}</code>
                    <span>{operatorLabel[rule.operator] || rule.operator}</span>
                    <code className="text-slate-300">{getThreshold(rule)}</code>
                    {rule.alertEmail && <span className="text-emerald-400">✉ e-mail</span>}
                    {webhook && <span className="text-amber-400">⚡ webhook</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => openMonitorForJob(rule)} className="px-2.5 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 text-[9px] font-bold text-indigo-300 cursor-pointer">Editar</button>
                  <button type="button" onClick={() => handleDelete(rule)} className="px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15 text-[9px] font-bold text-rose-300 cursor-pointer">Excluir</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isPro && visibleRules.length >= 1 && (
        <p className="text-[9px] text-amber-400/80">🔒 Plano Free: 1 regra ativa. Faça upgrade para criar regras adicionais.</p>
      )}
    </section>,
    portalTarget
  );
};
