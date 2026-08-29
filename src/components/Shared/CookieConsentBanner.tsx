import React, { useState, useEffect } from 'react';

interface CookieConsentBannerProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPrivacy, onOpenTerms }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cf_cookie_consent');
    if (!consent) {
      // Delay slightly for smooth entrance animation
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cf_cookie_consent', 'accepted');
    localStorage.setItem('cf_cookie_consent_date', new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-indigo-500/30 bg-[#0a0d1d]/95 p-4 sm:p-5 shadow-[0_10px_35px_rgba(0,0,0,0.7)] backdrop-blur-md text-left space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 shrink-0 text-lg">
            🍪
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>Privacidade & Cookies (LGPD)</span>
              <span className="px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                100% Seguro
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Utilizamos cookies essenciais de sessão e armazenamento local para autenticação, segurança e integridade do agendamento. Ao navegar, você concorda com nossos{' '}
              <button
                type="button"
                onClick={onOpenTerms}
                className="text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
              >
                Termos
              </button>{' '}
              e{' '}
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
              >
                Privacidade
              </button>.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-indigo-950/40">
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 bg-slate-900 border border-indigo-950/80 rounded-xl transition-all cursor-pointer"
          >
            Saber mais
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-1.5 text-[10px] uppercase font-black tracking-wider text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            Aceitar e Continuar ✓
          </button>
        </div>
      </div>
    </div>
  );
};
