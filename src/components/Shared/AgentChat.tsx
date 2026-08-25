import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../services/api';
import { useJobsStore } from '../../store/jobsStore';
import { useUiStore } from '../../store/uiStore';
import { useEntitlements } from '../../hooks/useEntitlements';

interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response?: Record<string, unknown>;
  };
}

interface GeminiMessage {
  role: 'user' | 'model' | 'tool';
  parts: GeminiPart[];
}

interface Message {
  role: 'user' | 'model' | 'tool';
  text: string;
  parts?: GeminiPart[];
}

export const AgentChat: React.FC = () => {
  const { isPro } = useEntitlements();
  const { setPlansModalOpen, showToast } = useUiStore();
  const [isOpen, setIsOpen] = useState(false);
  const [freeQueriesUsed, setFreeQueriesUsed] = useState<number>(0);

  useEffect(() => {
    localStorage.removeItem('cf_ai_free_used');
    const fetchAIUsage = async () => {
      try {
        const res = await api.get('/v1/users/profile');
        if (typeof res.data?.aiQueriesUsed === 'number') {
          setFreeQueriesUsed(res.data.aiQueriesUsed);
        }
      } catch (err) {
        console.error('Erro ao sincronizar cota de uso da IA:', err);
      }
    };
    fetchAIUsage();
  }, []);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Olá! Sou o **CronFlow AI Agent**. Como posso te ajudar hoje? Você pode me pedir para listar, criar ou disparar tarefas. Ex: *"Crie um job de teste para rodar todo dia às 8h"*'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { fetchJobs } = useJobsStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 50);
    }
  }, [isOpen, messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!isPro && freeQueriesUsed >= 3) {
      showToast('Você atingiu o limite de 3 mensagens gratuitas da IA no Plano Free. Faça upgrade para o Plano PRO!', 'info');
      setPlansModalOpen(true);
      return;
    }

    const userText = input.trim();
    setInput('');
    setIsLoading(true);

    // Adiciona a mensagem do usuário localmente
    setMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
      // Mapeia o histórico local para a estrutura de GeminiMessage que o backend espera
      const geminiHistory: GeminiMessage[] = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts || [{ text: msg.text }]
      }));

      const response = await api.post('/v1/agent/chat', {
        message: userText,
        history: geminiHistory
      });

      const data = response.data; // { reply: string, history: [] }

      if (!isPro) {
        const nextCount = typeof data.aiQueriesUsed === 'number' ? data.aiQueriesUsed : Math.min(3, freeQueriesUsed + 1);
        setFreeQueriesUsed(nextCount);
      }
      
      // Atualiza as mensagens apenas com conversas e respostas em texto visíveis
      if (data.history) {
        const newMsgs: Message[] = [];
        (data.history as GeminiMessage[]).forEach((h) => {
          const textPart = h.parts?.find((p) => p.text && p.text.trim() !== '');
          if (textPart && textPart.text) {
            newMsgs.push({
              role: h.role,
              text: textPart.text,
              parts: h.parts
            });
          }
        });
        if (newMsgs.length > 0) {
          setMessages(newMsgs);
        } else if (data.reply) {
          setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      }

      // Verifica se houve modificação ou disparo de jobs no histórico retornado pelo backend
      const hasJobModification = (data.history as GeminiMessage[] | undefined)?.some((h) => 
        h.parts?.some((p) => 
          p.functionCall && (p.functionCall.name === 'createJob' || p.functionCall.name === 'triggerJob')
        )
      );

      if (hasJobModification) {
        // Atualiza a lista de jobs no Zustand para refletir as alterações no Kanban na hora!
        fetchJobs();
      }

    } catch (err: any) {
      console.error(err);
      const isLimitError = err.response?.data?.code === 'FREE_AI_LIMIT_REACHED' || err.response?.data?.code === 'LIMIT_EXCEEDED' || err.response?.status === 402;
      const backendError = err.response?.data?.error;
      if (isLimitError) {
        const errorMsg = backendError || 'Você atingiu o limite de 3 mensagens gratuitas da IA no Plano Free. Faça o upgrade para o Plano PRO para uso ilimitado! 🚀';
        showToast(errorMsg, 'info');
        setFreeQueriesUsed(3);
        localStorage.setItem('cf_ai_free_used', '3');
        setPlansModalOpen(true);
        setMessages(prev => [...prev, {
          role: 'model',
          text: '🔒 **Limite de Teste Gratuito da IA Atingido (3/3)**\n\nVocê utilizou as suas 3 mensagens gratuitas no Plano Free. Faça o upgrade para o **Plano PRO ✨** para continuar conversando com a IA sem limites!'
        }]);
      } else {
        const errorMessage = backendError ? `❌ Erro: ${backendError}` : '❌ Ops, ocorreu um erro ao processar sua solicitação.';
        showToast('Falha ao se comunicar com o assistente de IA.', 'error');
        setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auxiliar para formatação básica de markdown (textos em negrito e blocos de código)
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    // Divide texto em blocos de código
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).trim();
        return (
          <pre key={index} className="my-2 p-3 bg-slate-950/80 border border-cyan-500/10 rounded-lg font-mono text-[11px] text-cyan-400 overflow-x-auto whitespace-pre-wrap select-all shadow-inner leading-relaxed">
            <code>{code}</code>
          </pre>
        );
      }

      // Destaca textos em negrito: **texto**
      const boldParts = part.split(/(\*\*.*?\*\*)/g);
      return (
        <span key={index} className="whitespace-pre-line">
          {boldParts.map((bp, bIndex) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return <strong key={bIndex} className="font-extrabold text-slate-100">{bp.slice(2, -2)}</strong>;
            }
            return bp;
          })}
        </span>
      );
    });
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-[calc(100vw-2rem)] sm:w-[380px] h-[480px] mb-4 flex flex-col rounded-2xl border border-indigo-500/25 bg-[#0a0d1d]/95 shadow-[0_12px_40px_rgba(99,102,241,0.25)] overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between px-4 py-3 bg-[#0c1026]/90 border-b border-indigo-950/40">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500" />
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-950/50 border border-indigo-500/20 shadow-md text-cyan-400">
                  <svg className="w-4.5 h-4.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
                    <span>CronFlow AI Agent</span>
                    {!isPro ? (
                      <span className="text-[8px] font-black uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20" title="Cota de degustação no plano Free">
                        🎁 {Math.max(0, 3 - freeQueriesUsed)}/3 Grátis
                      </span>
                    ) : (
                      <span
                        className="text-[8px] font-black uppercase tracking-widest bg-[length:300%_auto] bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite]"
                        style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
                        title="Recurso Exclusivo PRO ✨"
                      >
                        PRO ✨
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-mono">
                      {isLoading ? 'IA Processando...' : 'Online · Pronto'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-450 hover:text-white hover:bg-slate-900/60 transition-colors cursor-pointer focus:outline-none"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5 custom-scrollbar bg-[#080a18]/45">
              {messages.map((msg, index) => {
                // Não exibe mensagens de ferramentas cruas ou chamadas internas na bolha do chat
                if (msg.role === 'tool') return null;
                const hasFunction = msg.parts?.some((p) => p.functionCall || p.functionResponse);
                if (hasFunction) return null;

                const isUser = msg.role === 'user';
                return (
                  <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      {!isUser && (
                        <div className="flex items-center justify-center w-6.5 h-6.5 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-cyan-400 shrink-0 text-[11px] shadow">
                          🤖
                        </div>
                      )}
                      {/* Message Bubble */}
                      <div
                        className={`rounded-xl px-3 py-2 text-xs leading-relaxed border ${
                          isUser
                            ? 'bg-indigo-650/15 text-slate-200 border-indigo-500/20 rounded-tr-none shadow-sm font-medium'
                            : 'bg-slate-900/40 text-slate-350 border-slate-800/40 rounded-tl-none shadow-[0_2px_10px_rgba(0,0,0,0.15)]'
                        }`}
                      >
                        {renderMessageContent(msg.text)}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-2.5 max-w-[85%]">
                    <div className="flex items-center justify-center w-6.5 h-6.5 rounded-lg bg-indigo-950/60 border border-indigo-500/20 text-cyan-400 shrink-0 text-[11px]">
                      🤖
                    </div>
                    <div className="rounded-xl px-3 py-2 bg-slate-900/40 border border-slate-800/40 rounded-tl-none shadow-sm">
                      <div className="flex items-center gap-1.5 py-1">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="p-2.5 border-t border-indigo-950/40 bg-[#0c1026]/90 flex gap-2">
              {!isPro && freeQueriesUsed >= 3 ? (
                <div
                  className="flex-1 flex items-center justify-between px-3.5 py-2 bg-indigo-950/30 border border-purple-500/30 rounded-xl cursor-pointer hover:bg-purple-950/40 transition-colors"
                  onClick={() => setPlansModalOpen(true)}
                >
                  <span className="text-[10px] text-purple-300 font-bold font-mono">
                    🔒 Cota de 3 testes gratuitos consumida. Upgrade para o PRO ✨
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder={!isPro ? `Pergunte à IA (${3 - freeQueriesUsed} testes grátis restantes)...` : "Pergunte algo ao CronFlow AI..."}
                  className="flex-1 px-3.5 py-1.5 bg-slate-950/50 border border-indigo-950/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/35 transition-all disabled:opacity-50"
                />
              )}
              <button
                type="submit"
                disabled={isLoading || !input.trim() || (!isPro && freeQueriesUsed >= 3)}
                className="px-3 py-1.5 rounded-xl bg-indigo-650 text-slate-100 font-bold hover:bg-indigo-550 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-wider"
              >
                Enviar
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        id="tour-floating-chat"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={isOpen ? {} : {
          boxShadow: [
            "0 4px 20px rgba(99, 102, 241, 0.4)",
            "0 0 25px rgba(0, 217, 255, 0.8)",
            "0 4px 20px rgba(99, 102, 241, 0.4)"
          ],
          scale: [1, 1.03, 1]
        }}
        transition={isOpen ? {} : {
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className={`w-13 h-13 rounded-full flex items-center justify-center border text-white shadow-lg cursor-pointer focus:outline-none transition-all ${
          isOpen
            ? 'bg-slate-900 border-slate-800 shadow-[0_0_15px_rgba(255,255,255,0.15)]'
            : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500/40 neon-glow-primary'
        }`}
      >
        {isOpen ? (
          <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-5.5 h-5.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span
              className="absolute -top-2.5 -right-2.5 px-1 py-0.5 rounded-full text-[7.5px] font-black uppercase tracking-widest text-slate-950 bg-[length:300%_auto] animate-[shimmer_3s_linear_infinite] border border-amber-300/40 shadow-sm"
              style={{ backgroundImage: 'linear-gradient(90deg, #facc15, #a855f7, #ec4899, #facc15, #a855f7, #facc15)' }}
            >
              PRO
            </span>
          </div>
        )}
      </motion.button>
    </div>
  );
};
