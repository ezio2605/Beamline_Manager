
import React from 'react';
import { MOCK_AUDITS } from '../mockData';

const StructuralAuditor: React.FC = () => {
  const categories = MOCK_AUDITS[0].items.map(i => i.category);

  return (
    <div className="p-8 h-full">
      {/* <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">*/}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Compliance Matrix</h3>
            <p className="text-sm text-slate-500">Cross-beamline comparison against the JASRI Master Manual Template.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
              Complete
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
              Needs Update
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-3 h-3 bg-rose-500 rounded-sm"></span>
              Missing
            </div>
          </div>
        </div>

        <div className="overflow-auto">
          {/* <div className="flex-1 overflow-auto">*/}
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10">
              <tr>
                <th className="p-4 text-left border-b bg-white border-r text-xs font-bold text-slate-400 uppercase tracking-wider w-48">Standard Section</th>
                {MOCK_AUDITS.map(audit => (
                  <th key={audit.id} className="p-4 text-center border-b border-r text-xs font-bold text-indigo-600 min-w-[80px]">
                    {audit.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, catIdx) => (
                <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-700 border-b border-r bg-white sticky left-0">{cat}</td>
                  {MOCK_AUDITS.map(audit => {
                    const item = audit.items[catIdx];
                    return (
                      <td key={audit.id + cat} className="p-4 border-b border-r text-center">
                        <div className="flex justify-center group relative">
                          {item.status === 'complete' && <i className="fa-solid fa-circle-check text-emerald-500 text-lg"></i>}
                          {item.status === 'partial' && <i className="fa-solid fa-circle-exclamation text-amber-500 text-lg"></i>}
                          {item.status === 'missing' && <i className="fa-solid fa-circle-xmark text-rose-500 text-lg"></i>}

                          {item.comment && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-30">
                              {item.comment}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
              <i className="fa-solid fa-lightbulb text-indigo-600"></i>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">AI Structural Insight</h4>
              <p className="text-sm text-slate-600 mt-1">
                Beamline <span className="font-mono bg-slate-200 px-1 rounded">BL05B1</span> is missing the 'Cryogenic Refilling' procedure found in all other XAFS beamlines. Suggesting content generation based on <span className="font-mono bg-slate-200 px-1 rounded">BL04B1</span> standard.
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default StructuralAuditor;
