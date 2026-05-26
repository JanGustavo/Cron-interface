import React, { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const TopNav: React.FC = () => {
  const { theme, toggleTheme, activeTab } = useUiStore();
  const { activeProject, projects, setActiveProject } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Painel de Controle';
      case 'jobs':
        return 'Agendamentos';
      case 'logs':
        return 'Histórico de Execuções';
      case 'profile':
        return 'Minha Conta';
      default:
        return 'CronFlow';
    }
  };

  // Mock workspace if none exists for setup
  const currentProjectName = activeProject?.name || 'Projeto Pessoal';
  const availableProjects = projects.length > 0 ? projects : [
    { id: '1', userId: 'user', name: 'Projeto Pessoal', createdAt: '' },
    { id: '2', userId: 'user', name: 'Produção SaaS', createdAt: '' },
    { id: '3', userId: 'user', name: 'Dev Environment', createdAt: '' },
  ];

  return (
    <header className="h-16 border-b border-indigo-950/40 glass-panel sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Page Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-slate-100 tracking-wide select-none">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right Side Options (Theme Toggle, Workspace Selector, Profile) */}
      <div className="flex items-center gap-4">
        
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-indigo-950/30 border border-indigo-950/40 transition-colors"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M16.24 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Workspace Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-indigo-950/20 hover:bg-indigo-950/30 border border-indigo-950/40 transition-all select-none"
          >
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="max-w-[120px] truncate">{currentProjectName}</span>
            <svg className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <>
              {/* Overlay background to dismiss */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2.5 w-56 rounded-xl border border-indigo-950/40 glass-panel shadow-2xl z-20 py-1.5 focus:outline-none">
                <div className="px-3.5 py-1.5 border-b border-indigo-950/20">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                    Projetos / Workspaces
                  </span>
                </div>
                
                <div className="max-h-48 overflow-y-auto py-1">
                  {availableProjects.map((proj) => {
                    const isSelected = activeProject ? proj.id === activeProject.id : proj.id === '1';
                    return (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setActiveProject(proj);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between text-left px-3.5 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'text-indigo-400 font-semibold bg-indigo-950/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/10'
                        }`}
                      >
                        <span className="truncate">{proj.name}</span>
                        {isSelected && (
                          <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Info Indicator */}
        <div className="flex items-center gap-2 border-l border-indigo-950/40 pl-4 select-none">
          <div className="w-8.5 h-8.5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md border border-indigo-400/20">
            A
          </div>
        </div>

      </div>
    </header>
  );
};
