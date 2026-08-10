import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';

interface Step {
  title: string;
  description: string;
  icon: string;
  tip?: string;
  actionLabel?: string;
  action?: () => void;
}

export const OnboardingTour: React.FC = () => {
  const { setCreateModalOpen } = useUiStore();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Verifica se o usuário já viu o tutorial ou se acabou de fazer login
    const seen = localStorage.getItem('cf_first_run_seen');
    if (!seen) {
      // Pequeno delay para a UI carregar completamente antes de mostrar o tour
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('cf_first_run_seen', '1');
    setIsOpen(false);
  };

  const steps: Step[] = [
    {
      title: 'Bem-vindo ao CronFlow! 🚀',
      description: 'Olá! Vamos fazer um tour rápido de 1 minuto pelas funcionalidades fundamentais do seu novo painel de agendamento de tarefas distribuídas.',
      icon: '✨',
      tip: 'Você pode pular este tour a qualquer momento se já estiver familiarizado.',
      actionLabel: 'Iniciar Tour',
    },
    {
      title: 'Quadro Kanban de Tarefas 📊',
      description: 'Todas as suas tarefas agendadas são divididas visualmente por status: Ativas, Pausadas ou Falhando. Isso ajuda a identificar instantaneamente o status do seu ecossistema.',
      icon: '📋',
      tip: 'Clique nos cards de tarefas para ver detalhes, forçar disparo manual ou ver o histórico de execuções.',
    },
    {
      title: 'Criação Rápida de Jobs ⚡',
      description: 'Você pode criar agendamentos cron padrão (ex: `*/5 * * * *`) apontando para qualquer URL com cabeçalhos e payloads customizados. Quer testar rápido? Basta colar um comando cURL para importá-lo na hora!',
      icon: '⚙️',
      actionLabel: 'Criar Meu Primeiro Job',
      action: () => {
        setCreateModalOpen(true);
        handleDismiss();
      },
    },
    {
      title: 'Alertas Inteligentes & Webhooks 🔔',
      description: 'Configure um URL de alerta no seu perfil. Quando um job falhar por 3 vezes consecutivas, dispararemos payloads assinados via HMAC-SHA256 para seu Slack, Discord, ntfy ou servidor próprio.',
      icon: '🛡️',
      tip: 'Temos um guia de webhook completo em README_WEBHOOKS.md.',
    },
    {
      title: 'Agente de IA Integrado 🤖',
      description: 'No canto inferior direito está o CronFlow AI. Você pode conversar com ele para criar tarefas, monitorar o status do sistema ou pedir ajuda em linguagem natural.',
      icon: '🧠',
      tip: 'Experimente pedir: "Crie um job de teste para rodar a cada 10 minutos".',
      actionLabel: 'Concluir Tour',
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-2xl border border-indigo-500/25 bg-[#0a0d1c] p-6 text-slate-200 shadow-[0_20px_50px_rgba(99,102,241,0.3)] overflow-hidden"
        >
          {/* Top Line Decoration */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-450 hover:text-white hover:bg-slate-900/60 transition-all cursor-pointer focus:outline-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Step Icon */}
          <div className="flex items-center gap-3.5 mb-4">
            <span className="text-3xl filter drop-shadow">{step.icon}</span>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Passo {currentStep + 1} de {steps.length}
              </span>
              <h3 className="text-base font-bold text-slate-100 mt-0.5">{step.title}</h3>
            </div>
          </div>

          {/* Step Description */}
          <p className="text-xs text-slate-350 leading-relaxed mb-5">
            {step.description}
          </p>

          {/* Tip Alert if any */}
          {step.tip && (
            <div className="p-3 mb-5 rounded-xl border border-indigo-950/40 bg-[#060814]/60 text-[10px] text-slate-450 flex items-start gap-2 select-none leading-relaxed">
              <span className="text-indigo-400">💡</span>
              <span>{step.tip}</span>
            </div>
          )}

          {/* Steps Progress dots */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-indigo-950/40">
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-5 bg-indigo-500' : 'w-1.5 bg-indigo-950/70'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-lg border border-indigo-950/60 hover:bg-slate-900/40 text-[10px] font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  Voltar
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 rounded-lg border border-indigo-950/60 hover:bg-slate-900/40 text-[10px] font-semibold text-slate-400 transition-all cursor-pointer"
                >
                  Pular
                </button>
              )}

              {step.action ? (
                <button
                  onClick={step.action}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-650 text-slate-100 font-bold hover:bg-indigo-550 transition-all text-[10px] uppercase tracking-wider cursor-pointer shadow-md"
                >
                  {step.actionLabel || 'Executar'}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-650 text-slate-100 font-bold hover:bg-indigo-550 transition-all text-[10px] uppercase tracking-wider cursor-pointer shadow-md"
                >
                  {currentStep === steps.length - 1 ? 'Finalizar' : (step.actionLabel || 'Próximo')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
