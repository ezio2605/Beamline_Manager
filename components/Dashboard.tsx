
import React from 'react';
import { ViewState } from '../types';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="p-10 max-w-7xl mx-auto space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">System Overview</h1>
        {/* <p className="text-slate-500 text-lg">Integrated documentation lifecycle management for JASRI synchrotron beamlines.</p> */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Card 1 */}
        <div
          onClick={() => onNavigate(ViewState.EXPLORER)}
          className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-diagram-project text-8xl text-indigo-600"></i>
          </div>
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
            <i className="fa-solid fa-diagram-project text-2xl text-indigo-600"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Beamline Manual Explorer</h3>
          <p className="text-slate-500 leading-relaxed mb-6">Visualize the hierarchical structure of all beamline manuals and their core technical systems in an interactive mind map.</p>
          <div className="flex items-center text-indigo-600 font-bold text-sm">
            Launch Explorer <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>

        {/* Card 2 */}
        {/* <div
          onClick={() => onNavigate(ViewState.AUDITOR)}
          className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-magnifying-glass-chart text-8xl text-emerald-600"></i>
          </div>
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
            <i className="fa-solid fa-magnifying-glass-chart text-2xl text-emerald-600"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Structural Auditor</h3>
          <p className="text-slate-500 leading-relaxed mb-6">Perform cross-beamline gap analysis. Ensure every manual follows the 'Gold Standard' structural template.</p>
          <div className="flex items-center text-emerald-600 font-bold text-sm">
            Audit Documentation <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div> */}

        {/* <div
          onClick={() => onNavigate(ViewState.AUDITOR)}
          className="group relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-magnifying-glass-chart text-6xl text-emerald-600"></i>
          </div>
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
            <i className="fa-solid fa-magnifying-glass-chart text-xl text-emerald-600"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Structural Auditor</h3> */}
        {/* <p className="text-slate-500 leading-relaxed mb-6">Perform cross-beamline gap analysis. Ensure every manual follows the 'Gold Standard' structural template.</p> */}
        {/* <div className="flex items-center text-emerald-600 font-bold text-sm">
            Audit Documentation <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div> */}

        {/* Card 3 */}
        <div
          onClick={() => onNavigate(ViewState.SYNC)}
          className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-shuffle text-8xl text-amber-600"></i>
          </div>
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
            <i className="fa-solid fa-shuffle text-2xl text-amber-600"></i>
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Manual Comparison</h3>
          <p className="text-slate-500 leading-relaxed mb-6">Automate the comparison and synchronization of JASRI and 日技 operation manual files.</p>
          <div className="flex items-center text-amber-600 font-bold text-sm">
            Compare Now <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 text-white p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Total Beamlines</p>
          <p className="text-3xl font-extrabold">26</p>
        </div>
        {/* <div className="bg-white border border-slate-200 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Audit Compliance</p>
          <p className="text-3xl font-extrabold text-indigo-600">92%</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Pending Syncs</p>
          <p className="text-3xl font-extrabold text-amber-600">12</p>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Last AI Audit</p>
          <p className="text-lg font-bold">14 mins ago</p>
        </div> */}
      </div>
    </div>
  );
};

export default Dashboard;
