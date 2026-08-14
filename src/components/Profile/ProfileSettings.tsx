import React from 'react';

interface ProfileSettingsProps {
  avatarLabel: string;
  isProPlan: boolean;
  userHandle: string;
  profileFullName: string;
  userEmail: string;
  timezone: string;
  techStack: string;
  role: string;
  company: string;
  memberDays: number;
  memberSince: string;
  onOpenPlans: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  avatarLabel,
  isProPlan,
  userHandle,
  profileFullName,
  userEmail,
  timezone,
  techStack,
  role,
  company,
  memberDays,
  memberSince,
  onOpenPlans,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/10 via-[#0a0c1a] to-cyan-500/5 p-6 shadow-2xl transition-all duration-300 hover:border-indigo-500/40">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 opacity-80" />
      <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative space-y-6">
        {/* Profile Avatar / Title Section */}
        <div className="flex items-center gap-4.5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 text-xl font-extrabold text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.15)] relative">
            {avatarLabel}
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#090b17]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {isProPlan ? (
                <span className="relative inline-flex items-center gap-1 rounded-full border-2 border-[#ffd700]/50 bg-gradient-to-r from-[#856404] via-[#ffdf7e] to-[#856404] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#2d2200] shadow-[0_2px_6px_rgba(0,0,0,0.6),0_0_12px_rgba(255,215,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] transform hover:scale-105 transition-all select-none">
                  👑 PRO
                </span>
              ) : (
                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                  STARTER
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-semibold font-mono">
                #{userHandle}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-100 mt-1">{profileFullName || 'CronFlow User'}</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{userEmail}</p>
            <div className="mt-3.5 border-t border-indigo-950/30 pt-3 select-none flex flex-col gap-2.5">
              <p className="text-[10px] text-slate-450 leading-relaxed">
                {isProPlan 
                  ? '⭐ Plano PRO ativo: Limite de 20 tarefas por workspace, múltiplos projetos e 60 dias de logs.'
                  : '⚡ Plano STARTER: Limite de 5 tarefas por workspace, projeto único e 3 dias de logs.'}
              </p>
              <button
                type="button"
                onClick={onOpenPlans}
                className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-all bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/35 hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer focus-visible:outline-none"
              >
                💎 Ver Planos & Benefícios
              </button>
            </div>
          </div>
        </div>

        {/* Dev Info Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-indigo-950/40 text-left">
          <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Fuso Horário</span>
            <span className="text-[11px] font-semibold text-slate-350 block mt-1 truncate">{timezone}</span>
          </div>
          <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Stack Preferida</span>
            <span className="text-[11px] font-semibold text-slate-350 block mt-1 truncate">{techStack}</span>
          </div>
          {role && (
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Cargo</span>
              <span className="text-[11px] font-semibold text-slate-350 block mt-1 truncate">{role}</span>
            </div>
          )}
          {company && (
            <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Empresa</span>
              <span className="text-[11px] font-semibold text-slate-350 block mt-1 truncate">{company}</span>
            </div>
          )}
          <div className="p-3 bg-indigo-950/10 border border-indigo-950/30 rounded-xl col-span-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Cadastro</span>
            <span className="text-[11px] font-semibold text-slate-350 block mt-1 truncate">
              Membro há {memberDays} {memberDays === 1 ? 'dia' : 'dias'} (Desde {memberSince})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
