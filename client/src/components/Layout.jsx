import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('sidebar-collapsed', isSidebarCollapsed ? '1' : '0');
    } catch {
      // Ignore storage access errors.
    }
  }, [isSidebarCollapsed]);

  return (
    <div className="theme-shell min-h-screen">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
      />
      <div
        className={`flex flex-col min-h-screen transition-[margin] duration-300 ${
          isSidebarCollapsed ? 'ml-[92px]' : 'ml-[260px]'
        }`}
      >
        <Topbar />
        <main className="flex-1 px-6 pb-8 pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}
