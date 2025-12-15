import React from 'react';
import { MediaSource } from '../types';
import { ShieldCheck, ShieldAlert, Check, X } from 'lucide-react';

interface SourcesProps {
  sources: MediaSource[];
  toggleSource: (id: string) => void;
}

const Sources: React.FC<SourcesProps> = ({ sources, toggleSource }) => {
  
  const getLeaningColor = (leaning: string) => {
    switch (leaning) {
      case 'Principlist': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'Reformist': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'State': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'Economic': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Media Sources</h2>
          <p className="text-slate-400">Configure the specific Iranian domains targeted by the search engine.</p>
        </div>
        <div className="text-sm text-slate-500">
          {sources.filter(s => s.active).length} / {sources.length} Active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => (
          <div 
            key={source.id}
            onClick={() => toggleSource(source.id)}
            className={`cursor-pointer group relative p-4 rounded-xl border transition-all duration-200 ${
              source.active 
                ? 'bg-slate-900 border-emerald-500/50 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]' 
                : 'bg-slate-900/50 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${source.active ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                  {source.active ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <ShieldAlert className="w-5 h-5 text-slate-500" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-200">{source.name}</h3>
                  <p className="text-xs text-slate-500">{source.domain}</p>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                source.active ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
              }`}>
                {source.active && <Check size={14} className="text-slate-950" />}
              </div>
            </div>

            <div className="mt-2">
              <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium border ${getLeaningColor(source.leaning)}`}>
                {source.leaning}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sources;