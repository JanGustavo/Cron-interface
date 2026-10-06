import React, { useState } from 'react';
import api from '../../services/api';
import { useUiStore } from '../../store/uiStore';
import { useEntitlements } from '../../hooks/useEntitlements';
import type { MonitorRule } from '../../types/monitoring';
import type { RuleEvaluation } from '../../types/logs';

interface Props { rules: MonitorRule[]; totalRules: number; onChange: () => void }
interface Preview { evaluated: boolean; violated: boolean; rules: RuleEvaluation[] }
const input = 'w-full min-w-0 rounded-xl border border-indigo-950/60 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500';
const message = (error: unknown) => (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Não foi possível concluir a operação.';

export const GlobalMonitorPanel: React.FC<Props> = ({ rules, totalRules, onChange }) => {
  const { isPro, alertsWebhooksEnabled } = useEntitlements();
  const { showToast, setPlansModalOpen } = useUiStore();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [operator, setOperator] = useState('gte');
  const [threshold, setThreshold] = useState('');
  const [email, setEmail] = useState(true);
  const [webhook, setWebhook] = useState('');
  const [sampleKey, setSampleKey] = useState('');
  const [sample, setSample] = useState('');
  const [preview, setPreview] = useState<{ signature: string; value: Preview } | null>(null);
  const signature = JSON.stringify([sampleKey, sample, rules]);
  const result = preview?.signature === signature ? preview.value : null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPro && totalRules >= 1) { setPlansModalOpen(true); showToast('O plano Free permite uma condição de monitoramento.', 'warning'); return; }
    setBusy(true);
    try {
      await api.post('/v1/monitor/rules', { name: name.trim(), key: key.trim(), operator, threshold_value: threshold, alert_email: email, webhook_url: webhook.trim() || null, mode: 'observe', value_type: 'legacy' });
      setCreating(false); setName(''); setKey(''); setThreshold(''); setWebhook('');
      showToast('Condição de métrica criada.', 'success'); onChange();
    } catch (error) { showToast(message(error), 'error'); }
    finally { setBusy(false); }
  };
  const simulate = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      let json = sample;
      try { JSON.parse(json); } catch { json = JSON.stringify(sample); }
      const scope = JSON.stringify({ key: sampleKey.trim() });
      const { data } = await api.post<Preview>('/v1/monitor/preview', `${scope.slice(0, -1)},"value":${json}}`);
      setPreview({ signature, value: data });
    } catch (error) { showToast(message(error), 'error'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try { await api.delete(`/v1/monitor/rules/${id}`); onChange(); showToast('Condição removida.', 'info'); }
    catch (error) { showToast(message(error), 'error'); }
    finally { setBusy(false); }
  };

  return <div className="min-w-0 space-y-5">
    <div className="glass-panel rounded-2xl border border-indigo-950/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><h2 className="text-base font-semibold text-slate-100">Métricas enviadas pela API</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-400">Acompanhe valores enviados por suas integrações. Para validar o retorno de uma tarefa, use a aba Jobs HTTP.</p></div>
        <button type="button" onClick={() => setCreating(!creating)} className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-xs font-semibold text-indigo-200">{creating ? 'Fechar formulário' : 'Adicionar condição'}</button>
      </div>
      <p className="mt-4 text-xs text-slate-500">Estas condições globais também são avaliadas nos jobs do projeto. Use condições vinculadas ao job para controlar seu sucesso.</p>
      {creating && <form onSubmit={save} className="mt-5 space-y-4 border-t border-indigo-950/40 pt-5">
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs text-slate-400 block">Nome<input required maxLength={100} className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Volume de pedidos" /></label><label className="space-y-1.5 text-xs text-slate-400 block">Chave da métrica<input required maxLength={100} className={input} value={key} onChange={(e) => setKey(e.target.value)} placeholder="orders_count" /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-xs text-slate-400 block">Comparação<select className={input} value={operator} onChange={(e) => setOperator(e.target.value)}><option value="gte">Maior ou igual</option><option value="gt">Maior que</option><option value="lte">Menor ou igual</option><option value="lt">Menor que</option><option value="eq">Igual a</option><option value="ne">Diferente de</option><option value="contains">Contém texto</option></select></label><label className="space-y-1.5 text-xs text-slate-400 block">Valor esperado<input required className={input} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></label></div>
        <label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} />Enviar e-mail quando não atender</label>
        {alertsWebhooksEnabled && <label className="block space-y-1.5 text-xs text-slate-400">Webhook de alerta (opcional)<input type="url" className={input} value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://" /></label>}
        <button disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar condição de métrica'}</button>
      </form>}
    </div>
    <div className="grid min-w-0 gap-5 xl:grid-cols-2">
      <section className="glass-panel min-w-0 rounded-2xl border border-indigo-950/40 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-100">Condições globais</h3>
        <div className="mt-4 space-y-3">{rules.length ? rules.map((rule) => <div key={rule.id} className="min-w-0 rounded-xl border border-indigo-950/50 bg-slate-950/30 p-4"><div className="flex items-start justify-between gap-3"><strong className="min-w-0 break-words text-sm text-slate-200">{rule.name}</strong><button type="button" disabled={busy} onClick={() => remove(rule.id)} className="shrink-0 text-xs text-rose-300 disabled:opacity-50">Excluir</button></div><p className="mt-2 break-all font-mono text-xs text-slate-400">{rule.key} {rule.operator} {rule.thresholdValue}</p><p className="mt-2 text-xs text-slate-500">{rule.isEnabled ? 'Acompanhamento ativo' : 'Pausada'}</p></div>) : <p className="py-6 text-sm text-slate-500">Nenhuma condição global neste projeto.</p>}</div>
      </section>
      <section className="glass-panel min-w-0 rounded-2xl border border-indigo-950/40 p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-slate-100">Simular uma métrica</h3><p className="mt-1 text-xs leading-relaxed text-slate-400">Teste as condições já configuradas. A simulação não grava valores nem envia alertas.</p>
        <form onSubmit={simulate} className="mt-4 space-y-4"><label className="block space-y-1.5 text-xs text-slate-400">Chave da amostra<input required maxLength={100} className={input} value={sampleKey} onChange={(e) => setSampleKey(e.target.value)} /></label><label className="block space-y-1.5 text-xs text-slate-400">Valor da amostra<input required className={input} value={sample} onChange={(e) => setSample(e.target.value)} placeholder={'Ex.: 450, true ou "ativo"'} /></label><button disabled={busy} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-200 disabled:opacity-50">{busy ? 'Avaliando…' : 'Simular sem enviar alertas'}</button></form>
        {result && <div role="status" className="mt-4 space-y-2 rounded-xl border border-indigo-950/50 bg-slate-950/40 p-4 text-xs"><p className={result.violated ? 'text-amber-300' : 'text-slate-300'}>{!result.evaluated ? 'Nenhuma condição ativa para esta chave.' : result.violated ? 'A amostra não atende às condições.' : 'A amostra atende às condições.'}</p>{result.rules.map((rule, index) => <p key={rule.ruleId || index} className="break-words text-slate-400">{rule.ruleName}: {rule.message || (rule.passed ? 'Atendida' : 'Não atendida')}</p>)}</div>}
      </section>
    </div>
  </div>;
};
