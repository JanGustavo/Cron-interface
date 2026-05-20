import React from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useUiStore } from '../../store/uiStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { sidebarOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex overflow-hidden">
      {/* Structural Sidebar Navigation */}
      <Sidebar />

      {/* Main Structural Right Area Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'pl-64' : 'pl-20'
        }`}
      >
        {/* Sticky Header Top Navigation */}
        <TopNav />

        {/* Dynamic Panel Content Area */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
