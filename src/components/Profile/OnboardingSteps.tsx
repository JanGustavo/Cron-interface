import React from 'react';

interface OnboardingStepItem {
  id: string;
  title: string;
  done: boolean;
  detail: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingStepsProps {
  onboardingSteps: OnboardingStepItem[];
  completedSteps: number;
  progressPercent: number;
}

export const OnboardingSteps: React.FC<OnboardingStepsProps> = ({
  onboardingSteps,
  completedSteps,
  progressPercent,
}) => {
  return (
    <div className="rounded-3xl glass-panel border border-indigo-950/40 p-6 space-y-5 text-left">
      <div>
        <h4 className="text-base font-bold text-slate-250">Guia de Integração Rápida</h4>
        <p className="text-xs text-slate-400 mt-0.5">Conclua os passos fundamentais para colocar o CronFlow para trabalhar.</p>
      </div>

      {/* Stepper progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[9px] font-black uppercase text-slate-500 tracking-wider">
          <span>Passos Concluídos</span>
          <span className="text-indigo-400 font-mono">{completedSteps} / {onboardingSteps.length} ({progressPercent}%)</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-3.5 pt-1">
        {onboardingSteps.map((step, index) => (
          <div
            key={step.id}
            className="flex items-center justify-between p-3.5 rounded-2xl border border-indigo-950/45 bg-slate-950/30 transition-all hover:bg-slate-900/40 hover:border-indigo-500/25"
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black border ${
                step.done
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-indigo-950/40 text-indigo-400 border-indigo-950/60'
              }`}>
                {step.done ? '✓' : index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{step.title}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{step.detail}</p>
              </div>
            </div>

            {step.done ? (
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 shrink-0 select-none">OK</span>
            ) : step.action ? (
              <button
                type="button"
                onClick={step.action.onClick}
                className="px-2.5 py-1 text-[9px] uppercase font-black tracking-wider text-indigo-400 hover:text-white bg-indigo-950/40 hover:bg-indigo-950/70 rounded-lg border border-indigo-900/30 transition-all cursor-pointer shrink-0"
              >
                {step.action.label}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};
