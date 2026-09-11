import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useUiStore } from '../store/uiStore';
import { useEntitlements } from '../hooks/useEntitlements';
import { useJobsStore } from '../store/jobsStore';

interface MonitorRule {
  id: string;
  name: string;
  key: string;
  operator: string;
  jobId?: string;
  job_id?: string;
  thresholdValue?: string;
  threshold_value?: string;
  alertEmail?: boolean;
  alert_email?: boolean;
  webhookUrl?: string;
  webhook_url?: string;
  isEnabled?: boolean;
  is_enabled?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface CheckResult {
  key: string;
  currentValue?: string;
  current_value?: string;
  evaluated: boolean;
  violated: boolean;
  rules: {
    ruleId?: string;
    rule_id?: string;
    ruleName?: string;
    rule_name?: string;
    passed: boolean;
    message?: string;
  }[];
}

export const MonitorPage: React.FC = () => {
  const { showToast, setPlansModalOpen } = useUiStore();
  const { isPro, alertsWebhooksEnabled } = useEntitlements();
  const { jobs, fetchJobs } = useJobsStore();

  const [rules, setRules] = useState<MonitorRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(true);

  // Form de ingestão/teste de chave
  const [checkKey, setCheckKey] = useState('accountsOnline');
  const [checkValue, setCheckValue] = useState('450');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Form de criação de regra
  const [name, setName] = useState('');
  const [targetJobId, setTargetJobId] = useState('global');
  const [ruleKey, setRuleKey] = useState('accountsOnline');
  const [operator, setOperator] = useState('gte');
  const [thresholdValue, setThresholdValue] = useState('1000');
  const [alertEmail, setAlertEmail] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [creatingRule, setCreatingRule] = useState(false);

  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      const res = await api.get('/v1/monitor/rules');
      setRules(res.data || []);
    } catch (err: any) {
      console.error('Erro ao buscar regras de monitoramento:', err);
    } finally {
      setLoadingRules(false);
    }
  };

  useEffect(() => {
    fetchRules();
    fetchJobs();

    // Tenta carregar valores pré-preenchidos se vieram de um log ou do modal de job
    try {
      const stored = localStorage.getItem('cf_prefill_rule');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.key) setRuleKey(parsed.key);
        if (parsed.value) setCheckValue(parsed.value);
        if (parsed.value) setThresholdValue(parsed.value);
        if (parsed.jobId) setTargetJobId(parsed.jobId);
        if (parsed.name) setName(parsed.name);
        localStorage.removeItem('cf_prefill_rule');
      }
    } catch {
      // ignore
    }

    const handlePrefillEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const d = customEvent.detail;
        if (d.key) setRuleKey(d.key);
        if (d.value) setCheckValue(d.value);
        if (d.value) setThresholdValue(d.value);
        if (d.jobId) setTargetJobId(d.jobId);
        if (d.name) setName(d.name);
      }
    };

    window.addEventListener('cf_open_monitor_page', handlePrefillEvent);
    return () => {
      window.removeEventListener('cf_open_monitor_page', handlePrefillEvent);
    };
  }, [fetchJobs]);

  const handleCheckPayload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkKey.trim() || !checkValue.trim()) {
      showToast('Preencha a chave e o valor', 'warning');
      return;
    }
    try {
      setChecking(true);
      setCheckResult(null);
      const res = await api.post('/v1/monitor/check', {
        key: checkKey.trim(),
        value: checkValue.trim(),
      });
      setCheckResult(res.data);
      if (res.data.violated) {
        showToast(`⚠️ Alerta: Regra de negócio violada para ${checkKey}!`, 'warning');
      } else {
        showToast('✓ Payload verificado com sucesso!', 'success');
      }
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao verificar payload', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ruleKey.trim() || !thresholdValue.trim()) {
      showToast('Preencha o nome, chave e valor limite', 'warning');
      return;
    }

    // Regra do Plano Free: Máximo 1 regra ativa no plano Free
    if (!isPro && rules.length >= 1) {
      setPlansModalOpen(true);
      showToast('O Plano Free permite apenas 1 regra ativa. Faça upgrade para o PRO para criar regras ilimitadas!', 'warning');
      return;
    }

    // Se tentar adicionar Webhook sem ser PRO
    if (webhookUrl.trim() && !alertsWebhooksEnabled) {
      setPlansModalOpen(true);
      showToast('Alertas por Webhook exigem o Plano PRO!', 'warning');
      return;
    }

    try {
      setCreatingRule(true);
      await api.post('/v1/monitor/rules', {
        name: name.trim(),
        key: ruleKey.trim(),
        operator,
        threshold_value: thresholdValue.trim(),
        job_id: targetJobId === 'global' ? undefined : targetJobId,
        alert_email: alertEmail,
        webhook_url: webhookUrl.trim() || undefined,
      });
      showToast('Regra de monitoramento criada com sucesso!', 'success');
      setName('');
      setWebhookUrl('');
      fetchRules();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Erro ao criar regra', 'error');
    } finally {
      setCreatingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await api.delete(`/v1/monitor/rules/${id}`);
      showToast('Regra removida com sucesso', 'info');
      fetchRules();
    } catch (err: any) {
      showToast('Erro ao remover regra', 'error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Banner / Header com Anúncio PRO */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-linear-to-r from-[#0d1326] via-[#111827] to-[#0f172a] p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Regras de Negócio & Monitoramento
              </h1>
              <span className={`px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded-full ${isPro ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-linear-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-md'}`}>
                {isPro ? 'PRO Active' : 'Plano Free (1/1 Regra)'}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400 max-w-3xl leading-relaxed">
              Monitore métricas por <strong>Ingestão de API</strong> ou <strong>Avaliação Automática de Payloads HTTP</strong> de Jobs. Regras podem ser <em>Globais</em> (aplicadas a todas as métricas) ou <em>Vinculadas a um Job Específico</em>. Alertas são disparados via **Webhook (HMAC-SHA256)** e **E-mail HTML**.
            </p>
          </div>

          {!isPro && (
            <div className="w-full md:w-auto p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-amber-300">Recurso PRO Exclusivo</p>
                <p className="text-[11px] text-amber-200/80">Regras ilimitadas, Webhooks HMAC e Avaliação por Job!</p>
              </div>
              <button
                onClick={() => setPlansModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-950 bg-linear-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-xl shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                Fazer Upgrade PRO ✨
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Explicação Mercado / Guia Prático */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border border-indigo-950/60 bg-slate-950/40 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <span>🌐 Regras Globais & Ingestão API</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            Aplique regras para métricas gerais do sistema (ex: <code className="text-cyan-300">accountsOnline</code>, <code className="text-cyan-300 font-mono">error_count</code>). Qualquer envio via <code className="text-cyan-400">POST /v1/monitor/check</code> ou qualquer job com essa chave ativará os alertas.
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-indigo-950/60 bg-slate-950/40 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <span>📌 Regras Vinculadas a um Job</span>
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            Conecte o monitoramento ao retorno HTTP de um job específico (ex: validar se <code className="text-indigo-300">data.synced == true</code> no Job de Vendas). Avaliado automaticamente a cada execução do Worker!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Painel 1: Testar Ingestão & Verificar Payload (POST /v1/monitor/check) */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0d1222]/90 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-indigo-950/60 pb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Verificar Payload & Consultar Chave</h2>
              <p className="text-xs text-slate-400">Simule o envio de uma métrica (<code className="text-cyan-400 font-mono">POST /v1/monitor/check</code>)</p>
            </div>
          </div>

          <form onSubmit={handleCheckPayload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Chave</label>
              <input
                type="text"
                value={checkKey}
                onChange={(e) => setCheckKey(e.target.value)}
                placeholder="Ex: accountsOnline, active_users, error_count"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Atual</label>
              <input
                type="text"
                value={checkValue}
                onChange={(e) => setCheckValue(e.target.value)}
                placeholder="Ex: 450, 120.50, active"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={checking}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 transition-all shadow-lg cursor-pointer"
            >
              {checking ? 'Verificando...' : 'Testar Ingestão & Regras'}
            </button>
          </form>

          {/* Resultado da Avaliação */}
          {checkResult && (
            <div className={`p-4 rounded-xl border ${checkResult.violated ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} space-y-3 animate-in fade-in duration-200`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Chave: <code className="text-cyan-400">{checkResult.key}</code> = <span className="text-white font-mono">{checkResult.currentValue ?? checkResult.current_value}</span>
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${checkResult.violated ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {checkResult.violated ? '⚠️ Regra Violada' : '✓ OK (Passou)'}
                </span>
              </div>

              {checkResult.rules.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma regra ativa encontrada para esta chave.</p>
              ) : (
                <div className="space-y-2">
                  {checkResult.rules.map((r, i) => (
                    <div key={i} className="text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-200">{r.ruleName ?? r.rule_name}</span>
                        {r.message && <p className="text-[11px] text-red-400 mt-0.5">{r.message}</p>}
                      </div>
                      <span className={r.passed ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {r.passed ? 'PASSOU' : 'VIOLADO'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Painel 2: Criar Regra de Negócio (POST /v1/monitor/rules) */}
        <div className="rounded-2xl border border-indigo-500/20 bg-[#0d1222]/90 p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-indigo-950/60 pb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Criar Regra de Negócio</h2>
              <p className="text-xs text-slate-400">Configure um gatilho de alerta para métricas críticas</p>
            </div>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Regra</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mínimo de Contas Online ou Status Vendas OK"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alvo do Monitoramento (Escopo)
              </label>
              <select
                value={targetJobId}
                onChange={(e) => setTargetJobId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="global">🌐 Global (API Ingestão & Todos os Jobs)</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    📌 Job: {j.name} ({j.url})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chave da Métrica</label>
                <input
                  type="text"
                  value={ruleKey}
                  onChange={(e) => setRuleKey(e.target.value)}
                  placeholder="accountsOnline ou data.synced"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Operador Esperado</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="gte">Maior ou igual (&gt;=)</option>
                  <option value="gt">Maior que (&gt;)</option>
                  <option value="lte">Menor ou igual (&lt;=)</option>
                  <option value="lt">Menor que (&lt;)</option>
                  <option value="eq">Igual a (==)</option>
                  <option value="ne">Diferente de (!=)</option>
                  <option value="contains">Contém texto</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Limite (Threshold)</label>
              <input
                type="text"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                placeholder="Ex: 1000, true, success"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-slate-300">Notificar por E-mail quando violada</span>
              </label>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">URL do Webhook (Opcional)</label>
                  {!alertsWebhooksEnabled && (
                    <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      EXCLUSIVO PRO
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://sua-api.com/webhook (Discord, Slack, Ntfy ou HMAC)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingRule}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg cursor-pointer"
            >
              {creatingRule ? 'Salvando...' : 'Cadastrar Regra de Monitoramento'}
            </button>
          </form>
        </div>
      </div>

      {/* Lista de Regras Cadastradas */}
      <div className="rounded-2xl border border-indigo-500/20 bg-[#0d1222]/90 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-indigo-950/60 pb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white">Regras de Monitoramento Ativas</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {!isPro ? `${rules.length}/1 Ativa (Free)` : `${rules.length} Regra(s) (PRO)`}
            </span>
          </div>
          <span className="text-xs text-slate-400">{rules.length} regra(s) configurada(s)</span>
        </div>

        {loadingRules ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Carregando regras...</div>
        ) : rules.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Nenhuma regra de monitoramento cadastrada ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Nome da Regra</th>
                  <th className="py-3 px-4">Alvo / Escopo</th>
                  <th className="py-3 px-4">Chave</th>
                  <th className="py-3 px-4">Condição</th>
                  <th className="py-3 px-4">Canais</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {rules.map((r) => {
                  const threshold = r.thresholdValue ?? r.threshold_value ?? '';
                  const hasEmail = r.alertEmail ?? r.alert_email ?? false;
                  const webhook = r.webhookUrl ?? r.webhook_url;
                  const targetId = r.jobId ?? r.job_id;
                  const linkedJob = targetId ? jobs.find(j => j.id === targetId) : null;

                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">{r.name}</td>
                      <td className="py-3 px-4">
                        {linkedJob ? (
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1 w-fit" title={linkedJob.name}>
                            📌 Job: {linkedJob.name}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1 w-fit">
                            🌐 Global / Ingestão API
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400">{r.key}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-900 border border-slate-800 text-amber-400">
                          {r.operator === 'gte' && `>= ${threshold}`}
                          {r.operator === 'gt' && `> ${threshold}`}
                          {r.operator === 'lte' && `<= ${threshold}`}
                          {r.operator === 'lt' && `< ${threshold}`}
                          {r.operator === 'eq' && `== ${threshold}`}
                          {r.operator === 'ne' && `!= ${threshold}`}
                          {r.operator === 'contains' && `contém "${threshold}"`}
                          {!['gte','gt','lte','lt','eq','ne','contains'].includes(r.operator) && `${r.operator} ${threshold}`}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {hasEmail && (
                            <span className="px-2 py-0.5 text-[10px] rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              E-mail
                            </span>
                          )}
                          {webhook && (
                            <span className="px-2 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Webhook
                            </span>
                          )}
                          {!hasEmail && !webhook && (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-colors"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
