import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet } from 'react-router-dom';
import type { AppUser } from '../types';

interface DashboardLayoutProps {
  onLogout: () => void;
  user: AppUser | null;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onLogout, user }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={sidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header onMenuClick={() => setSidebarOpen(true)} onLogout={onLogout} user={user} />
        {/* Full width container, no max-w constraint */}
        <main className="p-6 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
