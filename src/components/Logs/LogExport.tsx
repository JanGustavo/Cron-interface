import React, { useState } from 'react';
import type { LogFilter } from '../../types/logs';
import { useUiStore } from '../../store/uiStore';
import { useEntitlements } from '../../hooks/useEntitlements';
import { LogExportModal } from './LogExportModal';

interface LogExportProps {
  filter: LogFilter;
}

export const LogExport: React.FC<LogExportProps> = ({ filter }) => {
  const { showToast, setPlansModalOpen } = useUiStore();
  const { isPro } = useEntitlements();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'clipboard'>('csv');

  const handleOpenExport = (format: 'csv' | 'json' | 'clipboard') => {
    if (!isPro) {
      showToast('A exportação de logs é um recurso exclusivo do Plano PRO. Faça o upgrade!', 'error');
      setPlansModalOpen(true);
      return;
    }
    setSelectedFormat(format);
    setIsModalOpen(true);
  };

  const btnBase =
    'p-1.5 rounded-lg transition-all duration-300 font-bold text-[10px] uppercase flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

  return (
    <div className="flex flex-col items-end gap-1 select-none">
      <div className="flex gap-2 items-center">
        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider hidden sm:inline">
          Exportar:
        </span>

        <div className="flex bg-[#0a0d1d]/80 border border-indigo-950/60 rounded-xl overflow-hidden p-1 gap-1">
          {/* Clipboard Button */}
          <button
            onClick={() => handleOpenExport('clipboard')}
            title="Copiar registros com parâmetros customizados"
            className={`${btnBase} text-slate-400 hover:text-indigo-400 hover:bg-indigo-955/30`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
              />
            </svg>
            Clipboard
          </button>

          {/* JSON Button */}
          <button
            onClick={() => handleOpenExport('json')}
            title="Exportar registros em formato JSON customizado"
            className={`${btnBase} text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/20`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            JSON
          </button>

          {/* CSV Button */}
          <button
            onClick={() => handleOpenExport('csv')}
            title="Exportar registros em formato CSV customizado"
            className={`${btnBase} text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2-8H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7l-4-4z"
              />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Export Modal Component */}
      <LogExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        filter={filter}
        initialFormat={selectedFormat}
      />
    </div>
  );
};
