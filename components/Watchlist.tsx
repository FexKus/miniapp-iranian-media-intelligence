import React, { useState } from 'react';
import { WatchlistItem } from '../types';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';

interface WatchlistProps {
  watchlist: WatchlistItem[];
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>>;
}

const Watchlist: React.FC<WatchlistProps> = ({ watchlist, setWatchlist }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleAdd = () => {
    if (!newTopic.trim()) return;
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      topic: newTopic,
      description: newDesc
    };
    setWatchlist([...watchlist, newItem]);
    setNewTopic('');
    setNewDesc('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setWatchlist(watchlist.filter(w => w.id !== id));
  };

  const startEdit = (item: WatchlistItem) => {
    setEditingId(item.id);
    setEditTopic(item.topic);
    setEditDesc(item.description);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTopic('');
    setEditDesc('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    setWatchlist((prev) =>
      prev.map((w) =>
        w.id === editingId
          ? { ...w, topic: editTopic.trim() || w.topic, description: editDesc }
          : w
      )
    );
    cancelEdit();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Intelligence Watchlist</h2>
          <p className="text-slate-400">Define topics for the engine to monitor, translate, and analyze.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20"
        >
          <Plus size={18} />
          <span>Add Objective</span>
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 bg-slate-900 border border-slate-700 rounded-xl p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-white">New Monitoring Objective</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Topic (English)</label>
              <input 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Internet Censorship Bill"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Context / Description</label>
              <input 
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                placeholder="Brief context for the analyst..."
              />
            </div>
            <div className="flex justify-end pt-2">
              <button 
                onClick={handleAdd}
                className="flex items-center space-x-2 bg-slate-800 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Save size={16} />
                <span>Save to Watchlist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {watchlist.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
            {editingId === item.id ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-white">Edit Objective</h3>
                  <button onClick={cancelEdit} className="text-slate-500 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Topic (English)</label>
                  <input
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Context / Description</label>
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save size={16} />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <div>
                  <h3 className="font-bold text-slate-200 text-lg">{item.topic}</h3>
                  <p className="text-slate-500 text-sm">{item.description}</p>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-lg"
                    aria-label="Edit objective"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                    aria-label="Delete objective"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {watchlist.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500">No active monitoring objectives.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;