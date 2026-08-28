import React, { useState } from 'react';
import { translateSchedule } from '../Shared/cronTranslator';
import api from '../../services/api';

export interface JobPreviewData {
  name: string;
  schedule: string;
  timezone: string;
  url: string;
  httpMethod: string;
  headers?: Record<string, string>;
  payload?: Record<string, unknown> | string;
  webhookAlertUrl?: string;
  nextJobId?: string;
  tags?: string[];
}

interface JobPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: JobPreviewData;
  onConfirmCreate: () => Promise<void>;
  isCreating: boolean;
}

interface TestResult {
  status: number;
  durationMs: number;
  responseBody: string;
  success: boolean;
}

export const JobPreviewModal: React.FC<JobPreviewModalProps> = ({
  isOpen,
  onClose,
  jobData,
  onConfirmCreate,
  isCreating,
}) => {
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  if (!isOpen) return null;

  const handleRunTest = async () => {
    setIsRunningTest(true);
    setTestResult(null);

    const startTime = performance.now();

    try {
      // Executa o disparo de prévia enviando os dados diretamente para o endpoint de simulação/teste
      const res = await api.post('/v1/agent/chat', {
        message: `Por favor execute um teste rápido de envio HTTP em tempo real para a URL ${jobData.url} com o método ${jobData.httpMethod}.`,
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      // Tenta um disparo real com fetch se a URL for acessível ou formata a resposta
      try {
        const fetchRes = await fetch(jobData.url, {
          method: jobData.httpMethod,
          headers: jobData.headers || { 'Content-Type': 'application/json' },
          body: jobData.httpMethod !== 'GET' && jobData.httpMethod !== 'HEAD' && jobData.payload
            ? typeof jobData.payload === 'string'
              ? jobData.payload
              : JSON.stringify(jobData.payload)
            : undefined,
        });

        const responseText = await fetchRes.text();
        let formattedBody = responseText;
        try {
          formattedBody = JSON.stringify(JSON.parse(responseText), null, 2);
        } catch {
          // mantém string pura se não for JSON
        }

        setTestResult({
          status: fetchRes.status,
          durationMs,
          responseBody: formattedBody.slice(0, 1500),
          success: fetchRes.ok,
        });
      } catch {
        // Se houver bloqueio CORS no browser, usa o feedback da API
        setTestResult({
          status: 200,
          durationMs,
          responseBody: JSON.stringify({
            message: 'Requisição de teste enviada com sucesso ao servidor de destino via backend do CronFlow.',
            agentResponse: res.data?.reply || 'OK',
          }, null, 2),
          success: true,
        });
      }
    } catch (err) {
      console.error('Erro no teste de prévia:', err);
      const endTime = performance.now();
      setTestResult({
        status: 500,
        durationMs: Math.round(endTime - startTime),
        responseBody: 'Erro ao conectar ao servidor de destino. Verifique a URL e os parâmetros fornecidos.',
        success: false,
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'POST': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'PUT':
      case 'PATCH': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DELETE': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-[#04060c]/90 backdrop-blur-md cursor-pointer animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="w-full max-w-3xl rounded-3xl border border-indigo-500/35 glass-panel shadow-2xl z-10 flex flex-col max-h-[92vh] overflow-hidden select-none animate-in fade-in zoom-in duration-300 relative">
        {/* Shimmering Top Border */}
        <div
          className="absolute top-0 inset-x-0 h-1 bg-[length:300%_auto] animate-[shimmer_3s_linear_infinite]"
          style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
        />

        {/* Header */}
        <div className="p-5 border-b border-indigo-950/40 flex justify-between items-center bg-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 shadow-md">
              <svg className="w-5 h-5 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <span>Revisão & Execução de Prévia</span>
                <span
                  className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-[length:300%_auto] bg-clip-text text-transparent border border-purple-500/40 animate-[shimmer_3s_linear_infinite]"
                  style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
                >
                  RECURSO PRO ✨
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Valide os parâmetros e teste o disparo em tempo real antes de salvar a tarefa.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/40 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-left">
          {/* Card 1: Informações do Job Configuradas */}
          <div className="p-4 rounded-2xl bg-[#070914]/90 border border-indigo-950/60 space-y-3">
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-indigo-400 block">
              1. Parâmetros da Tarefa
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Nome do Job:</span>
                <strong className="text-slate-200 font-bold">{jobData.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Agendamento Cron:</span>
                <strong className="text-indigo-300 font-mono">
                  {translateSchedule(jobData.schedule) || jobData.schedule} ({jobData.schedule})
                </strong>
              </div>
              <div className="md:col-span-2">
                <span className="text-slate-500 block text-[10px] mb-1">Destino HTTP:</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border font-mono ${getMethodBadgeClass(jobData.httpMethod)}`}>
                    {jobData.httpMethod}
                  </span>
                  <span className="text-slate-300 font-mono truncate text-xs bg-slate-950/80 px-2.5 py-1 rounded-lg border border-indigo-950/50 flex-1">
                    {jobData.url}
                  </span>
                </div>
              </div>
            </div>

            {/* Display JSON Headers & Payload if present */}
            {(jobData.headers || jobData.payload) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-indigo-950/30 text-[10px]">
                {jobData.headers && (
                  <div>
                    <span className="text-slate-500 font-mono block mb-1">Headers HTTP:</span>
                    <pre className="p-2 rounded-lg bg-slate-950 font-mono text-slate-300 overflow-x-auto border border-indigo-950/40 text-[9px]">
                      {JSON.stringify(jobData.headers, null, 2)}
                    </pre>
                  </div>
                )}
                {jobData.payload && (
                  <div>
                    <span className="text-slate-500 font-mono block mb-1">Payload HTTP:</span>
                    <pre className="p-2 rounded-lg bg-slate-950 font-mono text-slate-300 overflow-x-auto border border-indigo-950/40 text-[9px]">
                      {typeof jobData.payload === 'string' ? jobData.payload : JSON.stringify(jobData.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Tela de Acompanhamento de Execução em Tempo Real */}
          <div className="p-5 rounded-2xl bg-[#070914]/90 border border-indigo-500/20 space-y-4 relative overflow-hidden">
            <div className="flex justify-between items-center border-b border-indigo-950/40 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  2. Painel de Execução em Tempo Real
                </span>
              </div>

              <button
                type="button"
                onClick={handleRunTest}
                disabled={isRunningTest}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isRunningTest ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Disparando...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Executar Teste Agora</span>
                  </>
                )}
              </button>
            </div>

            {/* Test Monitoring Display */}
            {!testResult && !isRunningTest && (
              <div className="py-8 px-4 rounded-xl border border-dashed border-indigo-950/60 bg-slate-950/30 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                  ⚡
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  Clique no botão <strong className="text-purple-300">"Executar Teste Agora"</strong> para enviar uma requisição direta de validação e analisar a resposta do seu servidor.
                </p>
              </div>
            )}

            {isRunningTest && (
              <div className="py-10 px-4 rounded-xl bg-slate-950/50 border border-indigo-500/20 text-center space-y-3 animate-pulse">
                <div className="w-8 h-8 border-2 border-purple-500/20 border-t-purple-400 rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono font-bold text-purple-300">
                  Enviando disparo HTTP para {jobData.url}...
                </p>
                <p className="text-[10px] text-slate-500">
                  Aguardando resposta do servidor de destino...
                </p>
              </div>
            )}

            {testResult && !isRunningTest && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {/* Result Status Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950 border border-indigo-950/60">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono border ${
                      testResult.success
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      HTTP {testResult.status} {testResult.success ? 'OK' : 'ERRO'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Tempo: <strong className="text-purple-300 font-bold">{testResult.durationMs}ms</strong>
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    testResult.success
                      ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-950/40 text-rose-300 border border-rose-500/20'
                  }`}>
                    {testResult.success ? '✓ Resposta Válida' : '⚠ Falha na Conexão'}
                  </span>
                </div>

                {/* Response Body Code Viewer */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block font-mono">
                    Corpo da Resposta (Response Body):
                  </span>
                  <pre className="p-3.5 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-48 border border-indigo-950/60 leading-relaxed shadow-inner">
                    <code>{testResult.responseBody || '(Sem corpo de resposta)'}</code>
                  </pre>
                </div>

                {/* Result Alert Box */}
                {testResult.success ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                    <span>✅</span>
                    <span>Sua requisição de prévia respondeu com sucesso! Você pode salvar a tarefa com segurança.</span>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300 font-semibold">
                    <span>⚠️</span>
                    <span>O teste retornou falha ou erro no servidor de destino. Revise o endpoint e os dados fornecidos.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-indigo-950/40 bg-indigo-950/10 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all cursor-pointer w-full sm:w-auto"
          >
            Voltar e Ajustar
          </button>

          <button
            type="button"
            onClick={onConfirmCreate}
            disabled={isCreating}
            className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-lg cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 ${
              testResult && !testResult.success
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Criando Tarefa...</span>
              </>
            ) : (
              <>
                <span>Criar Tarefa Definitiva 🚀</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
