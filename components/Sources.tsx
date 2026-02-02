import { useState } from 'react';
import { MediaSource } from '../types';
import { ShieldCheck, ShieldAlert, Check, Plus, Trash2, X, Save, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '../lib/utils';

interface SourcesProps {
  sources: MediaSource[];
  loading?: boolean;
  toggleSource: (id: string) => void;
  onAdd: (source: Omit<MediaSource, 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const getLeaningBadgeClass = (leaning: string) => {
  switch (leaning) {
    case 'Principlist': return 'badge-principlist';
    case 'Reformist': return 'badge-reformist';
    case 'Moderate': return 'badge-moderate';
    case 'Economic': return 'badge-economic';
    default: return 'badge-state';
  }
};

const Sources = ({ sources, loading, toggleSource, onAdd, onDelete }: SourcesProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [newLeaning, setNewLeaning] = useState<MediaSource['leaning']>('State');
  const [newDesc, setNewDesc] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newName.trim() || !newDomain.trim()) return;
    try {
      await onAdd({
        name: newName,
        domain: newDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        leaning: newLeaning,
        active: true,
        description: newDesc
      });
      // Only clear form on success
      setNewName('');
      setNewDomain('');
      setNewLeaning('State');
      setNewDesc('');
      setIsAdding(false);
    } catch {
      // Error already handled by parent (toast shown), just preserve form state
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this media source?')) {
      await onDelete(id);
    }
  };

  const activeCount = sources.filter(s => s.active).length;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 pb-6 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Media Sources</h1>
          <p className="text-muted-foreground">Configure the Iranian domains targeted by the search engine.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-mono">
            {activeCount} / {sources.length} Active
          </Badge>
          <Button
            onClick={() => setIsAdding(true)}
            className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-glow"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Source
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="mb-8 animate-in border-accent/20">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <h3 className="font-bold text-foreground text-lg">Add New Media Source</h3>
            <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Source Name
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Tehran Times"
                  className="bg-muted/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Domain
                </label>
                <Input
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="e.g. tehrantimes.com"
                  className="bg-muted/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Political Leaning
                </label>
                <Select value={newLeaning} onValueChange={(v) => setNewLeaning(v as MediaSource['leaning'])}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Select leaning" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="State">State-Aligned</SelectItem>
                    <SelectItem value="Principlist">Principlist (Hardline)</SelectItem>
                    <SelectItem value="Reformist">Reformist</SelectItem>
                    <SelectItem value="Moderate">Moderate / Centrist</SelectItem>
                    <SelectItem value="Economic">Economic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                  Description
                </label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief description of the outlet's background and bias..."
                  className="bg-muted/50 min-h-[80px]"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                Save Source
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && sources.length === 0 && (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="py-6">
                  <div className="h-4 bg-muted rounded w-1/2 mb-3" />
                  <div className="h-3 bg-muted/50 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted/50 rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </>
        )}
        {sources.map((source) => (
          <Card
            key={source.id}
            onClick={() => toggleSource(source.id)}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md group",
              source.active
                ? "border-accent/50 shadow-glow"
                : "opacity-70 hover:opacity-100"
            )}
          >
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSource(source.id); }}
                    className={cn(
                      "p-2 rounded-lg transition-all shrink-0",
                      source.active
                        ? "bg-accent text-accent-foreground shadow-glow"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {source.active ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0">
                    <h3 className={cn(
                      "font-bold text-sm truncate",
                      source.active ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {source.name}
                    </h3>
                    <a
                      href={`https://${source.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-muted-foreground font-mono hover:text-accent flex items-center gap-1 transition-colors truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {source.domain}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === source.id ? null : source.id); }}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  {expandedId === source.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between mt-3">
                <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getLeaningBadgeClass(source.leaning))}>
                  {source.leaning}
                </Badge>

                {source.active && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-accent text-accent-foreground">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              {expandedId === source.id && (
                <div
                  className="mt-4 pt-4 border-t border-border animate-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-sm text-muted-foreground mb-4">
                    {source.description || "No description available."}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(source.id, e)}
                      className="text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete Source
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sources.length === 0 && !loading && (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground font-medium">No media sources configured.</p>
            <Button variant="link" onClick={() => setIsAdding(true)} className="text-accent mt-2">
              Add your first source
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Sources;