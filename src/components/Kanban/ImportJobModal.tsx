import React, { useState } from 'react';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { parseCurl } from '../Shared/cronTranslator';

const EXAMPLE_JSON_FREE = `[
  {
    "name": "Monitor PromoPulse",
    "schedule": "every:1m",
    "timezone": "America/Sao_Paulo",
    "url": "https://jangustavo.me/apis/promopulse/health",
    "httpMethod": "HEAD",
    "headers": {
      "accept": "application/json"
    }
  },
  {
    "name": "Monitor BrasilAPI",
    "schedule": "every:5m",
    "timezone": "America/Sao_Paulo",
    "url": "https://brasilapi.com.br/api/banks/v1",
    "httpMethod": "GET",
    "headers": {
      "accept": "application/json"
    }
  }
]`;

const EXAMPLE_JSON_PAID = `[
  {
    "name": "Monitor PromoPulse",
    "schedule": "every:1m",
    "timezone": "America/Sao_Paulo",
    "url": "https://jangustavo.me/apis/promopulse/health",
    "httpMethod": "HEAD",
    "headers": {
      "accept": "application/json"
    },
    "webhookAlertUrl": "https://ntfy.sh/monitor-promopulse-jangustavo"
  },
  {
    "name": "Gerar Relatório Diário",
    "schedule": "0 8 * * *",
    "timezone": "America/Sao_Paulo",
    "url": "https://minha-api.com/relatorio/gerar",
    "httpMethod": "POST",
    "headers": {
      "accept": "application/json",
      "x-api-key": "minha-chave"
    },
    "webhookAlertUrl": "https://ntfy.sh/relatorio-jangustavo",
    "nextJobId": "uuid-do-job-enviar-email"
  }
]`;

export const ImportJobModal: React.FC = () => {
  const { addJob } = useJobsStore();
  const { isImportModalOpen, setImportModalOpen, showToast } = useUiStore();
  const { user } = useAuthStore();
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isImportModalOpen) return null;

  const isPaid = !!(user?.limits?.alertsWebhooksEnabled || user?.limits?.workflowsEnabled);
  const EXAMPLE_JSON = isPaid ? EXAMPLE_JSON_PAID : EXAMPLE_JSON_FREE;

  const handleClose = () => {
    setImportModalOpen(false);
    setJsonText('');
    setErrorMsg(null);
  };

  const handleCopyExample = () => {
    try {
      navigator.clipboard.writeText(EXAMPLE_JSON);
      showToast('Estrutura de exemplo copiada para o clipboard! 📋', 'success');
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!jsonText.trim()) {
      setErrorMsg('Por favor, cole o conteúdo JSON ou comando cURL.');
      return;
    }

    setLoading(true);

    try {
      type RawJob = {
        name?: string;
        schedule?: string;
        url?: string;
        timezone?: string;
        httpMethod?: string;
        headers?: Record<string, string>;
        payload?: Record<string, unknown> | string;
        webhookAlertUrl?: string;
        nextJobId?: string;
        region?: string; // campo opcional, ignorado pelo backend
      };

      const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

      const validateAndNormalize = (parsed: RawJob, idx?: number) => {
        const label = idx !== undefined ? `Job #${idx + 1}` : 'Job';
        if (!parsed.name || typeof parsed.name !== 'string' || !parsed.name.trim())
          throw new Error(`${label}: o campo "name" é obrigatório.`);
        if (!parsed.schedule || typeof parsed.schedule !== 'string' || !parsed.schedule.trim())
          throw new Error(`${label}: o campo "schedule" é obrigatório.`);
        if (!parsed.url || typeof parsed.url !== 'string' || !parsed.url.trim())
          throw new Error(`${label}: o campo "url" é obrigatório.`);

        const method = (parsed.httpMethod || 'POST').toUpperCase();
        if (!VALID_METHODS.includes(method))
          throw new Error(`${label}: "httpMethod" deve ser ${VALID_METHODS.join(', ')}.`);

        return {
          name: parsed.name.trim(),
          schedule: parsed.schedule.trim(),
          timezone: parsed.timezone ? parsed.timezone.trim() : 'UTC',
          url: parsed.url.trim(),
          httpMethod: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD',
          headers: parsed.headers || undefined,
          payload: parsed.payload || undefined,
          status: 'active' as const,
          webhookAlertUrl: parsed.webhookAlertUrl ? parsed.webhookAlertUrl.trim() : undefined,
          nextJobId: parsed.nextJobId ? parsed.nextJobId.trim() : undefined,
        };
      };

      const text = jsonText.trim();
      let jobs: ReturnType<typeof validateAndNormalize>[];

      if (text.startsWith('curl')) {
        const curlParsed = parseCurl(text);
        if (!curlParsed) throw new Error('Comando cURL inválido ou impossível de extrair parâmetros.');
        jobs = [validateAndNormalize(curlParsed)];
      } else {
        let rawParsed: unknown;
        try {
          rawParsed = JSON.parse(text);
        } catch (err) {
          throw new Error(`JSON inválido: ${(err as Error).message}`, { cause: err });
        }

        if (Array.isArray(rawParsed)) {
          jobs = rawParsed.map((item, i) => validateAndNormalize(item as RawJob, i));
        } else {
          jobs = [validateAndNormalize(rawParsed as RawJob)];
        }
      }

      // Importa todos em paralelo, coletando erros individuais
      const results = await Promise.allSettled(jobs.map((j) => addJob(j)));
      const failures = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

      if (failures.length === results.length) {
        // Exibe a mensagem real do primeiro erro (vinda do backend)
        const firstError = failures[0]?.reason as Error | undefined;
        throw new Error(firstError?.message || 'Nenhum job importado. Verifique os dados e tente novamente.');
      }

      const successCount = results.length - failures.length;
      showToast(
        failures.length === 0
          ? `${successCount} tarefa${successCount > 1 ? 's importadas' : ' importada'} com sucesso! 🚀`
          : `${successCount} importada${successCount > 1 ? 's' : ''}, ${failures.length} falhou. Verifique o console.`,
        failures.length === 0 ? 'success' : 'error',
      );
      handleClose();
    } catch (err) {
      console.error(err);
      setErrorMsg((err as Error).message || 'Erro ao importar a tarefa.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/60 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl flex flex-col rounded-2xl border border-indigo-500/30 bg-[#0a0d1d]/95 p-6 shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden transition-all duration-300">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 opacity-90" />
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/20 shadow-lg text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-wide">Importar via JSON ou cURL</h3>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Crie um job instantaneamente</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 my-4 flex-1">
          {/* Explanation Banner */}
          <div className="p-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl text-slate-400 text-xs leading-relaxed space-y-1.5 select-none">
            <p>
              Cole um <strong>objeto JSON</strong> único ou um <strong>array</strong> para importar vários jobs de uma vez. Aceita também um <strong>comando cURL</strong> direto do terminal.
            </p>
            <p className="text-[10px] text-slate-500">
              Métodos suportados: <code className="text-cyan-400">GET POST PUT DELETE PATCH HEAD</code>
              {isPaid ? (
                <> · <code className="text-violet-400">webhookAlertUrl</code> e <code className="text-violet-400">nextJobId</code> disponíveis no seu plano ✨</>
              ) : (
                <> · <code className="text-slate-600">webhookAlertUrl</code> e <code className="text-slate-600">nextJobId</code> exclusivos do Plano PRO</>
              )}
            </p>
            <div className="flex justify-between items-center pt-1 border-t border-indigo-950/40">
              <span className="text-[10px] text-slate-500 font-mono">{"[ {...}, {...} ]  ou  { ... }  ou  curl ..."}</span>
              <button
                type="button"
                onClick={handleCopyExample}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
              >
                Copiar Exemplo {isPaid ? 'PRO' : 'Free'} 📋
              </button>
            </div>
          </div>

          {/* JSON/cURL Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block font-mono">
              Conteúdo JSON ou Comando cURL
            </label>
            <textarea
              placeholder='Cole aqui seu JSON ou curl...'
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-44 px-3.5 py-2.5 bg-[#070913]/95 border border-indigo-950/60 rounded-xl text-indigo-400 placeholder-slate-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono text-xs custom-scrollbar"
              disabled={loading}
            />
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 select-none animate-shake">
              <span className="font-bold">Erro:</span> {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-indigo-950/40">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 rounded-xl transition-all cursor-pointer"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/35 neon-glow-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Importando...' : 'Importar e Criar Job 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
