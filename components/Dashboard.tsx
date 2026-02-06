import { useState } from 'react';
import { WatchlistItem, Report } from '../types';
import {
  Play,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  Trash2,
  RotateCw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { cn, linkifyUrls } from '../lib/utils';

interface DashboardProps {
  watchlist: WatchlistItem[];
  reports: Report[];
  isRunning: boolean;
  isLoading: boolean;
  savedOnly: boolean;
  onToggleSavedOnly: () => void;
  onRunMonitoring: () => void;
  onRunTopic: (watchlistItemId: string) => void;
  onCancelMonitoring: () => void;
  onToggleReportSaved: (reportId: string, saved: boolean) => void;
  onDeleteReport: (reportId: string) => void;
  onSignOut: () => void;
}

const getLeaningBadgeClass = (leaning?: string) => {
  switch (leaning) {
    case 'Principlist': return 'badge-principlist';
    case 'Reformist': return 'badge-reformist';
    case 'Moderate': return 'badge-moderate';
    case 'Economic': return 'badge-economic';
    default: return 'badge-state';
  }
};

const Dashboard = ({
  watchlist,
  reports,
  isRunning,
  isLoading,
  savedOnly,
  onToggleSavedOnly,
  onRunMonitoring,
  onRunTopic,
  onCancelMonitoring,
  onToggleReportSaved,
  onDeleteReport,
  onSignOut,
}: DashboardProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyReport = (report: Report) => {
    const content = `${report.topic}\n\n${report.summary || 'No analysis available'}\n\nSources:\n${report.articles.map(a => `- ${a.title} (${a.domain}) - ${a.url}`).join('\n')}`;
    navigator.clipboard.writeText(content);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const MarkdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong: ({ ...props }: any) => <span className="font-bold text-accent" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ ...props }: any) => <h3 className="text-xl font-bold text-foreground mt-6 mb-3" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ ...props }: any) => <h4 className="text-lg font-semibold text-foreground mt-5 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({ ...props }: any) => <h5 className="text-base font-semibold text-foreground mt-4 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul: ({ ...props }: any) => <ul className="list-disc pl-5 space-y-2 text-muted-foreground mb-4 marker:text-accent" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ ...props }: any) => <li className="pl-1" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ ...props }: any) => <p className="text-muted-foreground leading-relaxed mb-4" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({ ...props }: any) => (
      <a
        className="text-accent hover:underline font-medium"
        target="_blank"
        rel="noreferrer"
        {...props}
      />
    ),
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
          Intelligence Dashboard
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Monitoring <span className="font-semibold text-foreground">{watchlist.length}</span> objectives across media channels. Real-time analysis of emerging narratives.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant={savedOnly ? "default" : "outline"}
            size="sm"
            onClick={onToggleSavedOnly}
            className={cn(savedOnly && "bg-success hover:bg-success/90")}
          >
            {savedOnly ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
            {savedOnly ? 'Saved Reports' : 'All Reports'}
          </Button>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {isRunning && (
            <Button variant="outline" onClick={onCancelMonitoring}>
              <Ban className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}

          <Button
            onClick={onRunMonitoring}
            disabled={isRunning || watchlist.length === 0}
            className={cn(
              "bg-accent hover:bg-accent-hover text-accent-foreground shadow-glow",
              isRunning && "opacity-50 cursor-not-allowed shadow-none"
            )}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Analysis...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" fill="currentColor" />
                Run Monitoring
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading && (
          <Card className="animate-pulse">
            <CardContent className="py-10">
              <div className="h-4 bg-muted rounded w-1/3 mb-4" />
              <div className="h-3 bg-muted/50 rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted/50 rounded w-1/2" />
            </CardContent>
          </Card>
        )}

        {watchlist.map((item) => {
          const report = reports.find(r => r.watchlistItemId === item.id);

          if (!report) {
            return (
              <Card key={item.id} className="border-dashed border-2">
                <CardContent className="py-10 text-center">
                  <h3 className="text-lg font-semibold text-muted-foreground mb-1">{item.topic}</h3>
                  <p className="text-sm text-muted-foreground/60">No analysis data. Run monitoring to generate intelligence.</p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/30 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground tracking-tight">{item.topic}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                      <span>ID: {report.id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>{report.articles.length} Sources</span>
                    </div>
                    {report.persianQuery && (
                      <p className="text-sm text-muted-foreground font-farsi" dir="rtl">
                        Query: {report.persianQuery}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold uppercase tracking-wider",
                        report.status === 'running' && "bg-info-light border-info/30 text-info",
                        report.status === 'pending' && "bg-muted border-border text-muted-foreground",
                        report.status === 'failed' && "bg-destructive/10 border-destructive/30 text-destructive",
                        report.status === 'cancelled' && "bg-muted border-border text-muted-foreground",
                        report.status === 'completed' && "bg-success-light border-success/30 text-success"
                      )}
                    >
                      {report.status === 'running' ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {report.stage}</>
                      ) : report.status === 'pending' ? (
                        <>Queued</>
                      ) : report.status === 'completed' ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</>
                      ) : (
                        report.status
                      )}
                    </Badge>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleReportSaved(report.id, !report.saved)}
                        className={cn(
                          "text-xs",
                          report.saved ? "text-success" : "text-muted-foreground hover:text-success"
                        )}
                      >
                        {report.saved ? <BookmarkCheck className="w-3 h-3 mr-1" /> : <Bookmark className="w-3 h-3 mr-1" />}
                        {report.saved ? 'Saved' : 'Save'}
                      </Button>

                      {report.summary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyReport(report)}
                          className="text-xs text-muted-foreground hover:text-accent"
                        >
                          {copiedId === report.id ? (
                            <><Check className="w-3 h-3 mr-1 text-success" /> Copied!</>
                          ) : (
                            <><Copy className="w-3 h-3 mr-1" /> Copy</>
                          )}
                        </Button>
                      )}

                      {!isRunning && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRunTopic(item.id)}
                          className="text-xs text-muted-foreground hover:text-accent"
                        >
                          <RotateCw className="w-3 h-3 mr-1" />
                          Rerun
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteReport(report.id)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {report.error && (
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                    <div>
                      <p className="font-semibold text-destructive">Analysis Failed</p>
                      <p className="text-destructive/80">{report.error}</p>
                    </div>
                  </div>
                )}

                {report.searchWarning && (
                  <div className="bg-warning-light border border-warning/20 p-4 rounded-lg text-sm mb-6 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-warning shrink-0" />
                    <div>
                      <p className="font-semibold text-warning">Search Warning</p>
                      <p className="text-warning/80">{report.searchWarning}</p>
                    </div>
                  </div>
                )}

                {report.coverage && (
                  <div className="flex items-center gap-3 mb-4">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        report.coverage.coverageConfidence === 'high' && "bg-success-light border-success/30 text-success",
                        report.coverage.coverageConfidence === 'medium' && "bg-warning-light border-warning/30 text-warning",
                        report.coverage.coverageConfidence === 'low' && "bg-destructive/10 border-destructive/30 text-destructive"
                      )}
                    >
                      {report.coverage.sourceCount} source{report.coverage.sourceCount !== 1 ? 's' : ''} / {
                        Object.entries(report.coverage.leaningDistribution)
                          .map(([leaning, count]) => `${count} ${leaning}`)
                          .join(', ')
                      }
                    </Badge>
                    {report.coverage.coverageConfidence === 'low' && (
                      <span className="text-muted-foreground text-xs">
                        ⓘ Thin coverage
                      </span>
                    )}
                  </div>
                )}

                {report.queryWarnings && report.queryWarnings.length > 0 && (
                  <div className="bg-info-light border border-info/20 p-3 rounded-lg text-sm mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-info" />
                    <div>
                      <p className="font-medium text-info">Query Translation Warning</p>
                      <ul className="text-info/80 mt-1 text-xs">
                        {report.queryWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {report.verifierWarnings && report.verifierWarnings.length > 0 && (
                  <div className="bg-warning-light border border-warning/20 p-3 rounded-lg text-sm mb-4 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
                    <div>
                      <p className="font-medium text-warning">Citation Check</p>
                      <ul className="text-warning/80 mt-1 text-xs">
                        {report.verifierWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {report.consistencyWarnings && report.consistencyWarnings.length > 0 && (
                  <details className="bg-warning-light border border-warning/20 p-3 rounded-lg text-sm mb-4">
                    <summary className="flex items-center gap-2 cursor-pointer text-warning font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                      Soft Consistency Warnings
                    </summary>
                    <ul className="text-warning/80 mt-2 text-xs ml-6">
                      {report.consistencyWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </details>
                )}

                {report.evaluatorResult && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg text-sm mb-4">
                    <p className="font-medium text-purple-800 mb-2">Evaluator Scores</p>
                    <div className="flex flex-wrap gap-2 text-xs text-purple-700">
                      <span className="bg-purple-100 px-2 py-1 rounded">
                        Citation: {report.evaluatorResult.citationScore}
                      </span>
                      <span className="bg-purple-100 px-2 py-1 rounded">
                        Faithfulness: {report.evaluatorResult.faithfulnessScore}
                      </span>
                    </div>
                    {report.evaluatorResult.issues.length > 0 && (
                      <ul className="text-purple-700 mt-2 text-xs ml-2">
                        {report.evaluatorResult.issues.map((issue, i) => (
                          <li key={i}>• {issue.claim}: {issue.issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {report.summary ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown components={MarkdownComponents}>
                      {linkifyUrls(report.summary)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  report.status === 'running' && (
                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mb-3" />
                      <p className="animate-pulse font-medium">Generating intelligence summary...</p>
                    </div>
                  )
                )}
              </CardContent>

              {report.articles.length > 0 && (
                <div className="bg-muted/30 p-6 border-t border-border">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                    Monitored Media Articles
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.articles.map((article, idx) => {
                      const leaning = report.domainLeanings?.[article.domain] || 'Unknown';
                      return (
                        <a
                          key={idx}
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 bg-card border border-border rounded-lg hover:border-accent/50 hover:shadow-sm transition-all group block"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              #{idx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              {article.evidenceQuality === 'short-text' && (
                                <Badge variant="outline" className="text-[10px]">Short text</Badge>
                              )}
                              {article.evidenceQuality === 'truncated' && (
                                <Badge variant="outline" className="text-[10px]">No text</Badge>
                              )}
                              <Badge variant="outline" className={cn("text-[10px]", getLeaningBadgeClass(leaning))}>
                                {leaning}
                              </Badge>
                            </div>
                          </div>
                          <h5 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors line-clamp-2 mb-1">
                            {article.title}
                          </h5>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="truncate">{article.domain}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {watchlist.length === 0 && !isLoading && (
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground font-medium mb-2">No monitoring objectives configured</p>
              <p className="text-sm text-muted-foreground/60">Add topics to your watchlist to begin monitoring</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;