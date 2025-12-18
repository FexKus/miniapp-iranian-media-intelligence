import React, { useState } from 'react';
import { MediaSource } from '../types';
import { ShieldCheck, ShieldAlert, Check, Plus, Trash2, X, Save, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface SourcesProps {
  sources: MediaSource[];
  toggleSource: (id: string) => void;
  setSources: React.Dispatch<React.SetStateAction<MediaSource[]>>;
}

const Sources: React.FC<SourcesProps> = ({ sources, toggleSource, setSources }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newLeaning, setNewLeaning] = useState<MediaSource['leaning']>('State');
  const [newDesc, setNewDesc] = useState('');
  
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getLeaningColor = (leaning: string) => {
    switch (leaning) {
      case 'Principlist': return 'bg-red-50 text-red-700 border-red-200';
      case 'Reformist': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'State': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Economic': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const handleAdd = () => {
    if (!newName.trim() || !newDomain.trim()) return;
    const newSource: MediaSource = {
      id: Date.now().toString(),
      name: newName,
      domain: newDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      leaning: newLeaning,
      active: true,
      description: newDesc
    };
    setSources([...sources, newSource]);
    setNewName('');
    setNewDomain('');
    setNewLeaning('State');
    setNewDesc('');
    setIsAdding(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this media source?')) {
      setSources(sources.filter(s => s.id !== id));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-3xl font-bold font-serif text-gray-900 mb-2">Media Sources</h2>
          <p className="text-gray-600">Configure the specific Iranian domains targeted by the search engine.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            {sources.filter(s => s.active).length} / {sources.length} Active
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center space-x-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl p-8 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 text-lg font-serif">Add New Media Source</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Source Name</label>
              <input 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-accent"
                placeholder="e.g. Tehran Times"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Domain</label>
              <input 
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-accent"
                placeholder="e.g. tehrantimes.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Political Leaning</label>
              <select 
                value={newLeaning}
                onChange={(e) => setNewLeaning(e.target.value as MediaSource['leaning'])}
                className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-accent appearance-none"
              >
                <option value="State">State-Aligned</option>
                <option value="Principlist">Principlist (Hardline)</option>
                <option value="Reformist">Reformist</option>
                <option value="Moderate">Moderate / Centrist</option>
                <option value="Economic">Economic</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Description</label>
              <textarea 
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-accent min-h-[80px]"
                placeholder="Brief description of the outlet's background and bias..."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleAdd}
              className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
            >
              <Save size={16} />
              <span>Save Source</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {sources.map((source) => (
          <div 
            key={source.id}
            onClick={() => toggleSource(source.id)} // Make the whole card clickable
            className={`group relative rounded-lg border transition-all duration-200 shadow-sm cursor-pointer ${
              source.active 
                ? 'bg-white border-accent shadow-[0_0_0_1px_rgba(220,38,38,1)]' 
                : 'bg-gray-50 border-gray-200 opacity-80 hover:opacity-100 hover:border-gray-300'
            }`}
          >
            {/* Card Header (Visible Always) */}
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSource(source.id); }} // Keep button working too
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                      source.active ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                    }`}
                    title={source.active ? "Deactivate Source" : "Activate Source"}
                  >
                    {source.active ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-[15px] truncate ${source.active ? 'text-gray-900' : 'text-gray-500'}`}>{source.name}</h3>
                    <a 
                      href={`https://${source.domain}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-gray-400 font-mono hover:text-accent flex items-center gap-1 transition-colors truncate"
                      onClick={(e) => e.stopPropagation()} // Prevent card toggle when clicking link
                    >
                      {source.domain}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleExpand(source.id); }} // Prevent card toggle when expanding
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {expandedId === source.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getLeaningColor(source.leaning)}`}>
                  {source.leaning}
                </span>
                
                {source.active && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-accent text-white">
                    <Check size={12} />
                  </div>
                )}
              </div>
            </div>

            {/* Expandable Section */}
            {expandedId === source.id && (
              <div 
                className="px-5 pb-5 pt-0 border-t border-gray-100 mt-2 bg-gray-50/50 rounded-b-lg cursor-default" 
                onClick={(e) => e.stopPropagation()} // Prevent toggling when clicking inside description
              >
                <div className="pt-4 text-sm text-gray-600 leading-relaxed mb-4">
                  {source.description || "No description available."}
                </div>
                
                <div className="flex justify-end">
                  <button 
                    onClick={(e) => handleDelete(source.id, e)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                  >
                    <Trash2 size={14} />
                    <span>Delete Source</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sources;