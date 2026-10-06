import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../services/api';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useEntitlements } from '../../hooks/useEntitlements';
import type { Job, JobLog } from '../../types/jobs';
import type { RuleEvaluation } from '../../types/logs';
import { responseFields, type MonitorRule } from '../../types/monitoring';

interface Props { job: Job; logs: JobLog[]; initialLogId?: string; onRulesChanged?: () => void }
interface Draft {
  id?: string;
  name: string;
  key: string;
  operator: string;
  threshold: string;
  mode: MonitorRule['mode'];
  valueType: MonitorRule['valueType'];
  alertEmail: boolean;
  webhookUrl: string;
  isEnabled: boolean;
}
const blankDraft: Draft = { name: '', key: '', operator: 'eq', threshold: '', mode: 'observe', valueType: 'legacy', alertEmail: true, webhookUrl: '', isEnabled: true };
const typeLabels: Record<string, string> = { number: 'número', string: 'texto', boolean: 'verdadeiro/falso', null: 'nulo' };
const statusLabels: Record<string, string> = { success: 'Sucesso', failed: 'Falha HTTP', timeout: 'Timeout', validation_failed: 'Resultado inválido' };
const operators: Record<string, string> = { eq: 'Igual a', ne: 'Diferente de', gt: 'Maior que', gte: 'Maior ou igual', lt: 'Menor que', lte: 'Menor ou igual', contains: 'Contém texto' };
const errorMessage = (error: unknown) => (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Não foi possível concluir a operação.';

export const JobMonitorRulesPanel: React.FC<Props> = ({ job, logs, initialLogId, onRulesChanged }) => {
  const showToast = useUiStore((state) => state.showToast);
  const { isPro } = useEntitlements();
  const setPlansModalOpen = useUiStore((state) => state.setPlansModalOpen);
  const projectId = useAuthStore((state) => state.activeProject?.id);
  const appliedSample = useRef<string | undefined>(undefined);
  const [rules, setRules] = useState<MonitorRule[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState('');
  const [sampleLog, setSampleLog] = useState('');
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [preview, setPreview] = useState<{ signature: string; evaluations: RuleEvaluation[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const signature = JSON.stringify({ jobId: job.id, sample, draft });
  const currentPreview = preview?.signature === signature ? preview.evaluations : null;

  useEffect(() => {
    if (!initialLogId || appliedSample.current) return;
    const log = logs.find((item) => item.id === initialLogId);
    if (log) { setSampleLog(log.id); setSample(log.responseBody || ''); appliedSample.current = initialLogId; }
  }, [initialLogId, logs]);

  useEffect(() => {
    const controller = new AbortController();
    api.get<MonitorRule[]>('/v1/monitor/rules', { signal: controller.signal }).then(({ data }) => {
      if (!controller.signal.aborted) { setRules(data || []); setLoadError(''); }
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(errorMessage(error));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [job.id, projectId, refresh]);

  const sampleInfo = useMemo(() => {
    if (!sample.trim()) return { fields: [], error: '' };
    try { return { fields: responseFields(sample), error: '' }; }
    catch { return { fields: [], error: 'A resposta não é um JSON completo. A prévia do log pode estar cortada; cole uma resposta completa para testar.' }; }
  }, [sample]);
  const visibleRules = rules.filter((rule) => rule.jobId === job.id || !rule.jobId);
  const availableOperators = draft.valueType === 'legacy' ? Object.keys(operators) : draft.valueType === 'number' ? ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'] : draft.valueType === 'string' ? ['eq', 'ne', 'contains'] : ['eq', 'ne'];
  const updateDraft = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));
  const explainMode = (mode: MonitorRule['mode']) => {
    if (mode === 'require_success') {
      showToast('Exigir sucesso: após receber a resposta HTTP, o Cronflow valida o payload. Se a condição falhar ou não puder ser avaliada, a execução fica com resultado inválido e o próximo job é bloqueado. Isso não repete a chamada HTTP. Vale após salvar.', 'warning', 12000);
    } else {
      showToast('Apenas acompanhar: se esta condição não for atendida, o resultado será registrado e os alertas configurados poderão ser enviados. Essa validação não bloqueia o próximo job; o fluxo segue conforme o resultado HTTP. Vale após salvar.', 'info', 12000);
    }
  };
  const chooseField = (path: string) => {
    const field = sampleInfo.fields.find((item) => item.path === path);
    if (!field) { updateDraft({ key: '' }); return; }
    updateDraft({ key: path, valueType: field.type, operator: field.type === 'number' ? 'gt' : 'eq', threshold: field.type === 'number' ? '0' : field.type === 'boolean' ? 'true' : field.value, name: draft.name || `Verificar ${field.label}`.slice(0, 100) });
  };
  const rulePayload = () => ({
    job_id: job.id, name: draft.name, key: draft.key, operator: draft.operator,
    threshold_value: draft.threshold, mode: draft.mode, value_type: draft.valueType,
    alert_email: draft.alertEmail, webhook_url: draft.webhookUrl || null, is_enabled: draft.isEnabled,
  });
  const testDraft = async () => {
    if (!draft.key || !sample.trim()) { showToast('Escolha um campo de uma resposta para testar.', 'warning'); return; }
    const testedSignature = signature;
    setBusy(true);
    try {
      const { data } = await api.post<{ evaluations: RuleEvaluation[] }>('/v1/monitor/preview-rule', { rule: rulePayload(), response_body: sample });
      setPreview({ signature: testedSignature, evaluations: data.evaluations });
    } catch (error) { showToast(errorMessage(error), 'error'); }
    finally { setBusy(false); }
  };
  const saveDraft = async () => {
    if (!currentPreview || !draft.name.trim()) { showToast('Informe um nome e teste esta configuração antes de salvar.', 'warning'); return; }
    if (!draft.id && !isPro && rules.length >= 1) {
      setPlansModalOpen(true); showToast('O Plano Free permite uma condição. Faça upgrade para criar mais condições.', 'warning'); return;
    }
    setBusy(true);
    try {
      if (draft.id) await api.put(`/v1/monitor/rules/${draft.id}`, rulePayload());
      else await api.post('/v1/monitor/rules', rulePayload());
      setRefresh((value) => value + 1); onRulesChanged?.();
      setDraft(blankDraft); setPreview(null);
      showToast('Condição salva para as próximas execuções.', 'success');
    } catch (error) { showToast(errorMessage(error), 'error'); }
    finally { setBusy(false); }
  };
  const editRule = (rule: MonitorRule) => {
    setDraft({ id: rule.id, name: rule.name, key: rule.key, operator: rule.operator, threshold: rule.thresholdValue, mode: rule.mode || 'observe', valueType: rule.valueType || 'legacy', alertEmail: rule.alertEmail, webhookUrl: rule.webhookUrl || '', isEnabled: rule.isEnabled });
    setPreview(null);
  };
  const removeRule = async (rule: MonitorRule) => {
    setBusy(true);
    try {
      await api.delete(`/v1/monitor/rules/${rule.id}`);
      setRules((current) => current.filter((item) => item.id !== rule.id)); onRulesChanged?.();
      if (draft.id === rule.id) { setDraft(blankDraft); setPreview(null); }
      showToast('Condição removida.', 'info');
    } catch (error) { showToast(errorMessage(error), 'error'); }
    finally { setBusy(false); }
  };

  const inputStyle = 'w-full min-w-0 rounded-xl bg-slate-950/50 border border-indigo-950/60 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500';
  return <section aria-label="Monitoramento do job" className="@container min-w-0 space-y-5 border-t border-indigo-950/40 pt-5 text-left select-text">
    <h4 className="text-sm font-bold text-slate-200">Monitoramento do resultado</h4>
    <p className="text-xs text-slate-400">Configure a partir de uma resposta real. O teste usa somente a amostra e não executa o job nem envia alertas.</p>
    {loadError && <p role="alert" className="text-xs text-rose-300">{loadError}</p>}
    <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
      <div className="min-w-0 space-y-2">
        <label htmlFor="monitor-sample-log" className="block text-xs font-semibold text-slate-300">1. Escolha uma resposta registrada</label>
        <select id="monitor-sample-log" className={inputStyle} value={sampleLog} onChange={(event) => {
          setSampleLog(event.target.value);
          const log = logs.find((item) => item.id === event.target.value);
          setSample(log?.responseBody || ''); setPreview(null);
        }}>
          <option value="">Selecionar execução ou colar resposta abaixo</option>
          {logs.filter((log) => log.httpStatus && log.responseBody).map((log) => <option key={log.id} value={log.id}>{new Date(log.triggeredAt).toLocaleString('pt-BR')} · HTTP {log.httpStatus} · {statusLabels[log.status]}</option>)}
        </select>
        <label htmlFor="monitor-sample" className="block text-xs text-slate-400">Corpo da resposta de exemplo (JSON)</label>
        <textarea id="monitor-sample" className={`${inputStyle} font-mono min-h-24`} value={sample} onChange={(event) => { setSample(event.target.value); setSampleLog(''); }} placeholder={'{"data":{"synced":true,"errors":0}}'} />
        {sampleInfo.error && <p role="alert" className="text-xs text-amber-300">{sampleInfo.error}</p>}
        {sample.trim() && !sampleInfo.error && !sampleInfo.fields.length && <p className="text-xs text-amber-300">Nenhum campo escalar selecionável nesta amostra. Use um objeto ou array com campos simples.</p>}
      </div>
      <div className="grid gap-3 @min-[560px]:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <label htmlFor="monitor-field" className="block text-xs font-semibold text-slate-300">2. Campo e expectativa</label>
          <select id="monitor-field" className={inputStyle} value={draft.key} onChange={(event) => chooseField(event.target.value)}>
            <option value="">Selecione um campo da resposta</option>
            {draft.key && !sampleInfo.fields.some((field) => field.path === draft.key) && <option value={draft.key}>Campo configurado: {draft.key}</option>}
            {sampleInfo.fields.map((field) => <option key={field.path} value={field.path}>{field.label} ({typeLabels[field.type]})</option>)}
          </select>
          <label htmlFor="monitor-operator" className="sr-only">Operador esperado</label>
          <select id="monitor-operator" className={inputStyle} value={draft.operator} onChange={(event) => updateDraft({ operator: event.target.value })}>
            {availableOperators.map((op) => <option key={op} value={op}>{operators[op]}</option>)}
          </select>
          <label htmlFor="monitor-expected" className="block text-xs text-slate-400">Valor esperado · {draft.valueType === 'legacy' ? 'configuração existente' : typeLabels[draft.valueType]}</label>
          {draft.valueType === 'boolean' ? <select id="monitor-expected" className={inputStyle} value={draft.threshold} onChange={(event) => updateDraft({ threshold: event.target.value })}><option value="true">true</option><option value="false">false</option></select> : <input id="monitor-expected" className={inputStyle} value={draft.threshold} readOnly={draft.valueType === 'null'} onChange={(event) => updateDraft({ threshold: event.target.value })} />}
        </div>
        <div className="min-w-0 space-y-2">
          <span className="block text-xs font-semibold text-slate-300">3. Como esta condição afeta o job?</span>
          <label className="flex gap-2 rounded-lg border border-slate-700 p-3 text-xs text-slate-300"><input type="radio" name="monitor-mode" value="observe" checked={draft.mode === 'observe'} onClick={() => explainMode('observe')} onChange={() => updateDraft({ mode: 'observe' })} /><span>Apenas acompanhar<br /><small>Avise quando não atender. A pipeline pode continuar.</small></span></label>
          <label className="flex gap-2 rounded-lg border border-amber-500/30 p-3 text-xs text-slate-300"><input type="radio" name="monitor-mode" value="require_success" checked={draft.mode === 'require_success'} onClick={() => explainMode('require_success')} onChange={() => updateDraft({ mode: 'require_success' })} /><span>Exigir para considerar sucesso<br /><small>Se falhar ou não puder avaliar, o próximo job fica bloqueado. A chamada não é repetida por isso.</small></span></label>
        </div>
      </div>
      <label className="block text-xs text-slate-300">Nome da condição<input className={`${inputStyle} mt-1`} maxLength={100} value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} /></label>
      <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={draft.isEnabled} onChange={(event) => updateDraft({ isEnabled: event.target.checked })} />Condição ativa nas próximas execuções</label>
      <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={draft.alertEmail} onChange={(event) => updateDraft({ alertEmail: event.target.checked })} />Enviar e-mail em caso de violação</label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={testDraft} disabled={!draft.key || !sample.trim() || !!sampleInfo.error} className="px-3 py-2 rounded-lg bg-cyan-600 text-xs font-bold text-white disabled:opacity-40">4. Testar antes de salvar</button>
        <button type="button" onClick={saveDraft} disabled={loading || !!loadError || !currentPreview || !draft.name.trim()} className="px-3 py-2 rounded-lg bg-indigo-600 text-xs font-bold text-white disabled:opacity-40">{draft.id ? 'Salvar alteração' : 'Salvar condição'}</button>
        {draft.id && <button type="button" className="text-xs text-slate-400" onClick={() => { setDraft(blankDraft); setPreview(null); }}>Cancelar edição</button>}
      </div>
    </fieldset>
    {currentPreview && <div role="status" className="rounded-xl border border-slate-700 p-3 text-xs space-y-2">
      {currentPreview.map((evaluation, index) => <div key={index}>
        <strong className={evaluation.passed ? 'text-emerald-300' : 'text-amber-300'}>{evaluation.status === 'error' ? 'Não foi possível avaliar a amostra' : evaluation.passed ? 'A amostra atende à condição' : 'A amostra não atende à condição'}</strong>
        {evaluation.observedValueText !== undefined && <p className="font-mono text-slate-300 break-all">Observado: {evaluation.observedValueText}</p>}
        {evaluation.message && <p className="text-slate-400">{evaluation.message}</p>}
        {!evaluation.passed && draft.mode === 'require_success' && <p className="text-amber-300">Em uma execução real, este resultado bloquearia o próximo job.</p>}
      </div>)}
      <p className="text-slate-500">Somente simulação. Nenhum alerta enviado.</p>
    </div>}
    <div className="min-w-0 space-y-2">
      <h5 className="text-xs font-bold text-slate-300">Condições configuradas</h5>
      {loading ? <p className="text-xs text-slate-500">Carregando...</p> : !visibleRules.length ? <p className="text-xs text-slate-500">Nenhuma condição configurada para este job.</p> : visibleRules.map((rule) => <div key={rule.id} className="rounded-lg border border-slate-800 p-3 text-xs space-y-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><strong className="min-w-0 break-words text-slate-200">{rule.name}</strong><span className="text-slate-400">{rule.mode === 'require_success' ? 'Obrigatória para sucesso' : 'Acompanhamento'}{!rule.isEnabled && ' · Pausada'}{!rule.jobId && ' · Global'}</span></div>
        <p className="font-mono text-slate-400 break-all">{rule.key} {operators[rule.operator]} {rule.thresholdValue}</p>
        {rule.jobId === job.id && <div className="flex gap-3 pt-1"><button type="button" disabled={busy} onClick={() => editRule(rule)} className="text-cyan-400">Editar e testar</button><button type="button" disabled={busy} onClick={() => removeRule(rule)} className="text-rose-400">Excluir</button></div>}
      </div>)}
    </div>
  </section>;
};
