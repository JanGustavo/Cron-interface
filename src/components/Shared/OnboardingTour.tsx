import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';

interface Step {
  targetId: string;
  title: string;
  description: string;
  icon: string;
  tip?: string;
}

const steps: Step[] = [
  {
    targetId: 'tour-nav-dashboard',
    title: '🚀 Painel de Controle',
    description: 'Este é o seu painel central. Aqui você acompanha a cota de tarefas criadas, taxa de sucesso de requisições e a latência de webhooks.',
    icon: '📊',
    tip: 'Monitore métricas em tempo real divididas por abas de Volume, Latência, Erros e Fila Redis.',
  },
  {
    targetId: 'tour-nav-jobs',
    title: '📋 Quadro Kanban de Tarefas',
    description: 'Gerencie todos os seus jobs divididos visualmente por status: Rascunho, Agendado, Executando, Sucesso ou Falha.',
    icon: '⚙️',
    tip: 'Arraste os cards entre colunas para alterar o status ou clique para ver detalhes de execução.',
  },
  {
    targetId: 'tour-btn-create',
    title: '⚡ Criar Nova Tarefa',
    description: 'Configure URLs, cron, fuso horário, cabeçalhos, payloads personalizados ou cole um cURL para importar agendamentos na hora.',
    icon: '📥',
    tip: 'Suporta a expressão amigável customizada "every:5m" além do formato cron tradicional.',
  },
  {
    targetId: 'tour-floating-chat',
    title: '🤖 Assistente de IA Integrado',
    description: 'Fale com o CronFlow AI para criar tarefas de agendamento, depurar logs de falha ou traduzir expressões cron em linguagem natural.',
    icon: '🧠',
    tip: 'Tente digitar: "Agende um ping GET para a api.com a cada 20 minutos".',
  }
];

export const OnboardingTour: React.FC = () => {
  const { isOnboardingOpen: isOpen, setOnboardingOpen: setIsOpen } = useUiStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [popoverWidth, setPopoverWidth] = useState(280);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({ display: 'none' });

  const popoverRef = useRef<HTMLDivElement>(null);

  const handleDismiss = () => {
    localStorage.setItem('cf_first_run_seen', '1');
    setIsOpen(false);
    setCurrentStep(0);
  };

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

  useEffect(() => {
    // Verifica se o usuário já viu o tutorial no primeiro acesso
    const seen = localStorage.getItem('cf_first_run_seen');
    if (!seen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const step = steps[currentStep];
    
    const updatePosition = () => {
      const targetEl = document.getElementById(step.targetId);
      const widthVal = Math.min(280, window.innerWidth - 24);

      requestAnimationFrame(() => {
        setPopoverWidth(widthVal);

        // Dynamically measure the popover element layout height
        const popoverHeight = popoverRef.current ? popoverRef.current.offsetHeight : (step.tip ? 240 : 160);

        if (targetEl) {
          const rect = targetEl.getBoundingClientRect();
          
          // Spotlight helper style
          setSpotlightStyle({
            display: 'block',
            top: `${rect.top + window.scrollY}px`,
            left: `${rect.left + window.scrollX}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          });

          // Position above target. If too high or close to screen top, show below.
          let top = rect.top + window.scrollY - popoverHeight - 16;
          
          // Overlap safety check: if positioning above pushes the card off-screen, display it below the target
          if (rect.top - popoverHeight - 20 < 10) {
            top = rect.bottom + window.scrollY + 16;
          }

          // Align horizontally to target center
          let left = rect.left + window.scrollX + (rect.width - widthVal) / 2;
          if (left < 12) left = 12;
          if (left + widthVal > window.innerWidth - 12) {
            left = window.innerWidth - widthVal - 12;
          }

          setPopoverPos({ top, left });
        } else {
          // Fallback: hide spotlight helper and center popover on viewport
          setSpotlightStyle({ display: 'none' });
          
          const top = window.innerHeight / 2 - popoverHeight / 2 + window.scrollY;
          const left = window.innerWidth / 2 - widthVal / 2 + window.scrollX;
          setPopoverPos({ top, left });
        }
      });
    };

    // Run positioning update. We use a tiny timeout to guarantee React committed
    // the text/content updates to the DOM, so offsetHeight yields a accurate measurement.
    const updateTimer = setTimeout(updatePosition, 50);

    // Event listeners to handle page resize or scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(updateTimer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {/* Root Portal / Overlay Container */}
      <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-none">
        
        {/* Dark overlay backdrop handler */}
        {spotlightStyle.display === 'none' ? (
          <div 
            className="tour-overlay-fallback pointer-events-auto"
            onClick={handleDismiss}
          />
        ) : (
          <div 
            className="fixed inset-0 bg-transparent pointer-events-auto"
            onClick={handleDismiss}
          />
        )}

        {/* Dynamic Spotlight helper div */}
        <div
          className="tour-spotlight-helper"
          style={spotlightStyle}
        />

        {/* Floating Popover Step Card */}
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            width: `${popoverWidth}px`,
          }}
          className="pointer-events-auto z-[9999] rounded-2xl border border-indigo-500/35 bg-[#0a0d1c] p-5 text-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_20px_rgba(99,102,241,0.2)] overflow-hidden"
        >
          {/* Colorful top border strip decoration */}
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500" />

          {/* Step progress details */}
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl filter drop-shadow select-none">{step.icon}</span>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                Passo {currentStep + 1} de {steps.length}
              </span>
              <h3 className="text-sm font-bold text-slate-100 mt-0.5 leading-snug">{step.title}</h3>
            </div>
          </div>

          {/* Main description text */}
          <p className="text-[11px] text-slate-350 leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Tooltip detail element */}
          {step.tip && (
            <div className="p-2.5 mb-4 rounded-xl border border-indigo-950/40 bg-[#060814]/65 text-[9px] text-slate-450 flex items-start gap-1.5 leading-relaxed select-none">
              <span className="text-indigo-400 text-xs">💡</span>
              <span>{step.tip}</span>
            </div>
          )}

          {/* Action button menu */}
          <div className="flex items-center justify-between pt-3 border-t border-indigo-950/40">
            {/* Progress dots indicator */}
            <div className="flex gap-1 select-none">
              {steps.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep ? 'w-4 bg-indigo-500' : 'w-1.5 bg-indigo-950/80'
                  }`}
                />
              ))}
            </div>

            {/* Skip / Next Controls */}
            <div className="flex gap-2">
              {currentStep > 0 ? (
                <button
                  onClick={handlePrev}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-950/75 hover:bg-slate-900/35 text-[10px] font-semibold text-slate-300 transition-all cursor-pointer"
                >
                  Voltar
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 rounded-lg border border-indigo-950/75 hover:bg-slate-900/35 text-[10px] font-semibold text-slate-450 hover:text-slate-300 transition-all cursor-pointer"
                >
                  Pular
                </button>
              )}

              <button
                onClick={handleNext}
                className="inline-flex min-w-[80px] items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-650 text-slate-100 font-bold hover:bg-indigo-550 transition-all text-[10px] uppercase tracking-wider cursor-pointer shadow-md"
              >
                {isLast ? 'Concluir' : 'Próximo'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
