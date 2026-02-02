import { useState } from 'react';
import { WatchlistItem } from '../types';
import { Plus, Trash2, Edit2, X, Save, Calendar, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';

interface WatchlistProps {
  watchlist: WatchlistItem[];
  loading?: boolean;
  onAdd: (item: Omit<WatchlistItem, 'id'>) => Promise<void>;
  onUpdate: (id: string, updates: Partial<WatchlistItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const Watchlist = ({ watchlist, loading, onAdd, onUpdate, onDelete }: WatchlistProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTimeRange, setNewTimeRange] = useState<'last24h' | 'last7d' | 'last30d' | 'custom'>('last7d');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTimeRange, setEditTimeRange] = useState<'last24h' | 'last7d' | 'last30d' | 'custom'>('last7d');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const handleAdd = async () => {
    if (!newTopic.trim()) return;
    try {
      await onAdd({
        topic: newTopic,
        description: newDesc,
        timeRange: newTimeRange,
        customStartDate: newTimeRange === 'custom' ? newStartDate : undefined,
        customEndDate: newTimeRange === 'custom' ? newEndDate : undefined
      });
      // Only clear form on success
      setNewTopic('');
      setNewDesc('');
      setNewTimeRange('last7d');
      setNewStartDate('');
      setNewEndDate('');
      setIsAdding(false);
    } catch {
      // Error already handled by parent (toast shown), just preserve form state
    }
  };

  const startEdit = (item: WatchlistItem) => {
    setEditingId(item.id);
    setEditTopic(item.topic);
    setEditDesc(item.description);
    setEditTimeRange(item.timeRange || 'last7d');
    setEditStartDate(item.customStartDate || '');
    setEditEndDate(item.customEndDate || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTopic('');
    setEditDesc('');
    setEditTimeRange('last7d');
    setEditStartDate('');
    setEditEndDate('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const original = watchlist.find((w) => w.id === editingId);
    const nextTopic = editTopic.trim() || original?.topic || editTopic;
    try {
      await onUpdate(editingId, {
        topic: nextTopic,
        description: editDesc,
        timeRange: editTimeRange,
        customStartDate: editTimeRange === 'custom' ? editStartDate : undefined,
        customEndDate: editTimeRange === 'custom' ? editEndDate : undefined,
      });
      // Only exit edit mode on success
      cancelEdit();
    } catch {
      // Error already handled by parent (toast shown), keep edit mode open
    }
  };

  const TimeRangeButton = ({
    value,
    current,
    onClick,
    children
  }: {
    value: string;
    current: string;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        value === current
          ? "bg-accent text-accent-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      {children}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Intelligence Watchlist</h1>
          <p className="text-muted-foreground">Define topics for the engine to monitor, translate, and analyze.</p>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-glow"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Objective
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-8 animate-in border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <h3 className="font-bold text-foreground text-lg">New Monitoring Objective</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                Topic (English)
              </label>
              <Input
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                placeholder="e.g. Internet Censorship Bill"
                className="bg-muted/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                Context / Description
              </label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief context for the analyst..."
                className="bg-muted/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                Monitoring Period
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <TimeRangeButton value="last24h" current={newTimeRange} onClick={() => setNewTimeRange('last24h')}>
                  <Clock className="w-4 h-4" />
                  24 Hours
                </TimeRangeButton>
                <TimeRangeButton value="last7d" current={newTimeRange} onClick={() => setNewTimeRange('last7d')}>
                  <Clock className="w-4 h-4" />
                  7 Days
                </TimeRangeButton>
                <TimeRangeButton value="last30d" current={newTimeRange} onClick={() => setNewTimeRange('last30d')}>
                  <Clock className="w-4 h-4" />
                  30 Days
                </TimeRangeButton>
                <TimeRangeButton value="custom" current={newTimeRange} onClick={() => setNewTimeRange('custom')}>
                  <Calendar className="w-4 h-4" />
                  Custom
                </TimeRangeButton>
              </div>

              {newTimeRange === 'custom' && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg animate-in">
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                    />
                  </div>
                  <div className="text-muted-foreground mt-5">→</div>
                  <div className="flex-1">
                    <label className="block text-xs text-muted-foreground mb-1">End Date</label>
                    <Input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                Save to Watchlist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {loading && watchlist.length === 0 && (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-3 bg-muted/50 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted/50 rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {watchlist.map((item) => (
          <Card key={item.id} className="hover:border-accent/30 hover:shadow-sm transition-all group">
            <CardContent className="py-5">
              {editingId === item.id ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-foreground">Edit Objective</h3>
                    <Button variant="ghost" size="icon" onClick={cancelEdit}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Topic
                      </label>
                      <Input
                        value={editTopic}
                        onChange={(e) => setEditTopic(e.target.value)}
                        className="bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Context
                      </label>
                      <Input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="bg-muted/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                        Period
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(['last24h', 'last7d', 'last30d', 'custom'] as const).map((range) => (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setEditTimeRange(range)}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                              editTimeRange === range
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            )}
                          >
                            {range === 'last24h' ? '24h' : range === 'last7d' ? '7 Days' : range === 'last30d' ? '30 Days' : 'Custom'}
                          </button>
                        ))}
                      </div>
                      {editTimeRange === 'custom' && (
                        <div className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                          <Input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                          />
                          <span className="text-muted-foreground self-center">→</span>
                          <Input
                            type="date"
                            value={editEndDate}
                            onChange={(e) => setEditEndDate(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                    <Button onClick={saveEdit} className="bg-accent hover:bg-accent-hover text-accent-foreground">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground text-lg">{item.topic}</h3>
                    <p className="text-muted-foreground text-sm">{item.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {item.timeRange === 'custom' ? (
                        <>
                          <Calendar className="w-3 h-3 mr-1" />
                          {item.customStartDate} to {item.customEndDate}
                        </>
                      ) : item.timeRange === 'last30d' ? (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Last 30 days
                        </>
                      ) : item.timeRange === 'last24h' ? (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Last 24h
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Last 7 days
                        </>
                      )}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(item)}
                      className="text-muted-foreground hover:text-accent"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(item.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {watchlist.length === 0 && !loading && (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground font-medium">No active monitoring objectives.</p>
              <Button variant="link" onClick={() => setIsAdding(true)} className="text-accent mt-2">
                Add your first topic
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Watchlist;