import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useUiStore } from '../../store/uiStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex overflow-hidden">
      {/* Structural Sidebar Navigation */}
      <Sidebar />

      {/* Backdrop overlay on mobile when sidebar is open */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 border-none cursor-pointer focus:outline-none w-full h-full text-left"
          aria-label="Fechar menu"
        />
      )}

      {/* Main Structural Right Area Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out pl-0 ${
          sidebarOpen ? 'md:pl-64' : 'md:pl-20'
        }`}
      >
        {/* Sticky Header Top Navigation */}
        <TopNav />

        {/* Dynamic Panel Content Area */}
        <main className="flex-1 w-full px-4 py-6 md:px-6 md:py-8 xl:px-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
