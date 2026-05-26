import React from 'react';
import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const Sidebar: React.FC = () => {
  const { sidebarOpen, activeTab, setActiveTab, toggleSidebar } = useUiStore();
  const { user, logout } = useAuthStore();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Painel',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      ),
    },
    {
      id: 'jobs',
      label: 'Tarefas (Jobs)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'logs',
      label: 'Histórico (Logs)',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out border-r border-indigo-950/40 glass-panel flex flex-col justify-between ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Top Brand Logo Section */}
      <div>
        <div
          className={`relative flex items-center h-16 px-4 border-b border-indigo-950/30 ${
            sidebarOpen ? 'justify-between' : 'justify-center'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`group flex items-center overflow-hidden text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-0 ${
              sidebarOpen ? 'gap-3' : 'w-10 justify-center mx-auto'
            }`}
            aria-label="Ir para a home"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-950/40 border border-indigo-500/20 shadow-lg neon-glow-primary flex-shrink-0 overflow-hidden transition-colors duration-200 ease-out group-hover:border-indigo-400/40 group-hover:shadow-[0_0_18px_rgba(99,102,241,0.35)]">
              <img src="/logo.svg" alt="Logo CronFlow" className="block w-full h-full object-contain p-1" />
            </div>
            {sidebarOpen && (
              <span className="font-extrabold text-lg tracking-wider text-gradient-cyber select-none transition-opacity duration-200 ease-out group-hover:opacity-95">
                CRONFLOW
              </span>
            )}
          </button>
          
          <button
            onClick={toggleSidebar}
            className={`absolute top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-indigo-950/30 transition-colors hidden md:block ${
              sidebarOpen ? 'right-4' : 'right-3'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              )}
            </svg>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 select-none ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-indigo-950/20 border border-transparent'
                }`}
              >
                <div className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {item.icon}
                </div>
                {sidebarOpen && (
                  <span className="text-sm tracking-wide transition-opacity duration-300">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom User / Logout Section */}
      <div className="p-3 border-t border-indigo-950/30">
        {sidebarOpen ? (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-950/30">
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-slate-500 truncate">Autenticado como</span>
              <span className="text-xs font-medium text-slate-300 truncate">
                {user?.email || 'admin@cronflow.sh'}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors flex-shrink-0"
              title="Sair"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex items-center justify-center py-3 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent transition-colors"
            title="Sair"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
};
