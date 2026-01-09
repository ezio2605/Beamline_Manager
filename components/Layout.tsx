
import React, { useState } from 'react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl z-50 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
        <div className={`p-6 flex items-center gap-3 border-b border-slate-800 ${isSidebarCollapsed ? 'justify-center p-4' : ''}`}>
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-xl font-bold shrink-0">J</div>
          {!isSidebarCollapsed && <h1 className="text-lg font-bold leading-tight">Beamline Manager</h1>}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => onViewChange(ViewState.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === ViewState.DASHBOARD ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Dashboard' : ''}
          >
            <i className="fa-solid fa-chart-line w-5"></i>
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button
            onClick={() => onViewChange(ViewState.EXPLORER)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === ViewState.EXPLORER ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Beamline Explorer' : ''}
          >
            <i className="fa-solid fa-diagram-project w-5"></i>
            {!isSidebarCollapsed && <span>Beamline Explorer</span>}
          </button>
          <button
            onClick={() => onViewChange(ViewState.AUDITOR)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === ViewState.AUDITOR ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Structural Auditor' : ''}
          >
            <i className="fa-solid fa-list-check w-5"></i>
            {!isSidebarCollapsed && <span>Structural Auditor</span>}
          </button>
          <button
            onClick={() => onViewChange(ViewState.SYNC)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === ViewState.SYNC ? 'bg-indigo-600 shadow-lg' : 'hover:bg-slate-800'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
            title={isSidebarCollapsed ? 'Manual Comparison' : ''}
          >
            <i className="fa-solid fa-arrows-rotate w-5"></i>
            {!isSidebarCollapsed && <span>Manual Comparison</span>}
          </button>
        </nav>

        {/* Toggle Button */}
        <div className={`p-4 border-t border-slate-800 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-all"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <i className={`fa-solid ${isSidebarCollapsed ? 'fa-angles-right' : 'fa-angles-left'} w-5`}></i>
            {!isSidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-xl font-semibold text-slate-800">
            {activeView === ViewState.DASHBOARD && "Dashboard"}
            {activeView === ViewState.EXPLORER && ""}
            {/*Beamline Hierarchy Explorer */}
            {activeView === ViewState.AUDITOR && ""}
            {/* Documentation Structural Audit */}
            {activeView === ViewState.SYNC && ""}
            {/* Synchronization Engine (JASRI vs. Nichigagi) */}
          </h2>
          <div className="flex items-center gap-4">
            {/* <div className="relative">
              <input
                type="text"
                placeholder="Search procedures..."
                className="bg-slate-100 border-none rounded-full px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <i className="fa-solid fa-magnifying-glass absolute right-3 top-2.5 text-slate-400"></i>
            </div> */}
            <button className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center hover:bg-slate-300 transition-colors">
              <i className="fa-solid fa-user"></i>
            </button>
          </div>
        </header>
        <section className="flex-1 overflow-auto bg-slate-50">
          {children}
        </section>
      </main>
    </div>
  );
};

export default Layout;
