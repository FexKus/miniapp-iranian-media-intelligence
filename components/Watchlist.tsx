import React, { useState } from 'react';
import { WatchlistItem } from '../types';
import { Plus, Trash2, Edit2, X, Save, Calendar, Clock } from 'lucide-react';

interface WatchlistProps {
  watchlist: WatchlistItem[];
  setWatchlist: React.Dispatch<React.SetStateAction<WatchlistItem[]>>;
}

const Watchlist: React.FC<WatchlistProps> = ({ watchlist, setWatchlist }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTimeRange, setNewTimeRange] = useState<'24h' | 'custom'>('24h');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTimeRange, setEditTimeRange] = useState<'24h' | 'custom'>('24h');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const handleAdd = () => {
    if (!newTopic.trim()) return;
    const newItem: WatchlistItem = {
      id: Date.now().toString(),
      topic: newTopic,
      description: newDesc,
      timeRange: newTimeRange,
      customStartDate: newTimeRange === 'custom' ? newStartDate : undefined,
      customEndDate: newTimeRange === 'custom' ? newEndDate : undefined
    };
    setWatchlist([...watchlist, newItem]);
    setNewTopic('');
    setNewDesc('');
    setNewTimeRange('24h');
    setNewStartDate('');
    setNewEndDate('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setWatchlist(watchlist.filter(w => w.id !== id));
  };

  const startEdit = (item: WatchlistItem) => {
    setEditingId(item.id);
    setEditTopic(item.topic);
    setEditDesc(item.description);
    setEditTimeRange(item.timeRange || '24h');
    setEditStartDate(item.customStartDate || '');
    setEditEndDate(item.customEndDate || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTopic('');
    setEditDesc('');
    setEditTimeRange('24h');
    setEditStartDate('');
    setEditEndDate('');
  };

  const saveEdit = () => {
    if (!editingId) return;
    setWatchlist((prev) =>
      prev.map((w) =>
        w.id === editingId
          ? { 
              ...w, 
              topic: editTopic.trim() || w.topic, 
              description: editDesc,
              timeRange: editTimeRange,
              customStartDate: editTimeRange === 'custom' ? editStartDate : undefined,
              customEndDate: editTimeRange === 'custom' ? editEndDate : undefined
            }
          : w
      )
    );
    cancelEdit();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-3xl font-bold font-serif text-gray-900 mb-2">Intelligence Watchlist</h2>
          <p className="text-gray-600">Define topics for the engine to monitor, translate, and analyze.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span>Add Objective</span>
        </button>
      </div>

      {isAdding && (
        <div className="mb-8 bg-white border border-gray-200 rounded-xl p-8 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-900 text-lg font-serif">New Monitoring Objective</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Topic (English)</label>
              <input 
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="e.g. Internet Censorship Bill"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Context / Description</label>
              <input 
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
                placeholder="Brief context for the analyst..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Monitoring Period</label>
              <div className="flex items-center space-x-4 mb-3">
                <button
                  onClick={() => setNewTimeRange('24h')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    newTimeRange === '24h' 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Clock size={16} />
                  <span>Last 24 Hours</span>
                </button>
                <button
                  onClick={() => setNewTimeRange('custom')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    newTimeRange === 'custom' 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Calendar size={16} />
                  <span>Custom Range</span>
                </button>
              </div>

              {newTimeRange === 'custom' && (
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-100 animate-in fade-in">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div className="text-gray-400 mt-5">→</div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleAdd}
                className="flex items-center space-x-2 bg-gray-900 hover:bg-black text-white px-6 py-2.5 rounded-lg transition-colors font-medium"
              >
                <Save size={16} />
                <span>Save to Watchlist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {watchlist.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:border-accent/30 hover:shadow-sm transition-all">
            {editingId === item.id ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 font-serif">Edit Objective</h3>
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Topic</label>
                    <input
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Context</label>
                    <input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-surface-secondary border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Monitoring Period</label>
                    <div className="flex items-center space-x-3 mb-3">
                      <button
                        onClick={() => setEditTimeRange('24h')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          editTimeRange === '24h' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Last 24 Hours
                      </button>
                      <button
                        onClick={() => setEditTimeRange('custom')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          editTimeRange === 'custom' ? 'bg-accent text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Custom Range
                      </button>
                    </div>
                    {editTimeRange === 'custom' && (
                      <div className="flex gap-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                        <span className="text-gray-400 self-center">→</span>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={cancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={saveEdit}
                    className="flex items-center space-x-2 bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Save size={16} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg font-serif mb-1">{item.topic}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-2">{item.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                      {item.timeRange === 'custom' ? (
                        <>
                          <Calendar size={10} className="mr-1" />
                          {item.customStartDate} to {item.customEndDate}
                        </>
                      ) : (
                        <>
                          <Clock size={10} className="mr-1" />
                          Last 24h
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-2 text-gray-400 hover:text-accent hover:bg-accent-light rounded-md transition-colors"
                    aria-label="Edit objective"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
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
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <p className="text-gray-500 font-medium">No active monitoring objectives.</p>
            <button onClick={() => setIsAdding(true)} className="text-accent hover:underline text-sm mt-2">
              Add your first topic
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;