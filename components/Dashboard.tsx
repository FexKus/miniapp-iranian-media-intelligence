import React, { useState } from 'react';
import { WatchlistItem, Report } from '../types';
import { Play, Loader2, FileText, ExternalLink, AlertTriangle, CheckCircle2, Ban, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  watchlist: WatchlistItem[];
  reports: Report[];
  isRunning: boolean;
  onRunMonitoring: () => void;
  onRunTopic: (watchlistItemId: string) => void;
  onCancelMonitoring: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ watchlist, reports, isRunning, onRunMonitoring, onRunTopic, onCancelMonitoring }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyReport = (report: Report) => {
    const content = `${report.topic}\n\n${report.summary || 'No analysis available'}\n\nSources:\n${report.articles.map(a => `- ${a.title} (${a.domain}) - ${a.url}`).join('\n')}`;
    navigator.clipboard.writeText(content);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render markdown content safely and cleanly
  const MarkdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong: ({ node, ...props }: any) => <span className="font-bold text-accent" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ node, ...props }: any) => <h3 className="text-xl font-bold font-serif text-gray-900 mt-6 mb-3" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ node, ...props }: any) => <h4 className="text-lg font-bold font-serif text-gray-900 mt-5 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({ node, ...props }: any) => <h5 className="text-md font-bold font-serif text-gray-800 mt-4 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-2 text-gray-700 mb-4 marker:text-accent" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ node, ...props }: any) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({ node, ...props }: any) => (
      <a
        className="text-accent hover:text-accent-hover underline font-medium"
        target="_blank"
        rel="noreferrer"
        {...props}
      />
    ),
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Site Header (Only visible on Dashboard to match prototype layout) */}
      <header className="mb-12 pb-8 border-b border-gray-200">
        <h1 className="text-4xl font-bold font-serif text-gray-900 mb-3 tracking-tight">Iranian Media Intelligence</h1>
        <p className="text-lg text-gray-600 max-w-2xl font-light">
          Monitoring and analyzing media coverage across Iranian news outlets. Real-time intelligence on emerging narratives and geopolitical developments.
        </p>
      </header>

      {/* Dashboard Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-10 pb-6 border-b border-gray-200">
        <div>
          <h2 className="text-3xl font-bold font-serif text-gray-900 mb-1">Intelligence Dashboard</h2>
          <p className="text-gray-500 text-sm">
            Monitoring <strong className="text-gray-900 font-semibold">{watchlist.length}</strong> objectives across active channels.
          </p>
        </div>
        <div className="mt-6 md:mt-0 flex items-center gap-3">
          <button
            onClick={onRunMonitoring}
            disabled={isRunning || watchlist.length === 0}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium text-[15px] transition-all shadow-sm hover:shadow-md ${
              isRunning 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                : 'bg-accent hover:bg-accent-hover text-white transform hover:-translate-y-px'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" />
                <span>Running Analysis...</span>
              </>
            ) : (
              <>
                <Play fill="currentColor" className="w-4 h-4" />
                <span>Run Monitoring</span>
              </>
            )}
          </button>

          {isRunning && (
            <button
              onClick={onCancelMonitoring}
              className="flex items-center space-x-2 px-5 py-3 rounded-lg font-medium text-[15px] transition-all border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
            >
              <Ban className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Reports Grid */}
      <div className="space-y-8">
        {watchlist.map((item) => {
          const report = reports.find(r => r.watchlistItemId === item.id);
          
          if (!report) {
            return (
              <div key={item.id} className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-10 text-center">
                <h3 className="text-lg font-serif font-semibold text-gray-500 mb-1">{item.topic}</h3>
                <p className="text-sm text-gray-400">No analysis data available. Run monitoring to generate intelligence.</p>
              </div>
            );
          }

          return (
            <article key={item.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
              {/* Report Header */}
              <div className="bg-surface-secondary p-6 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-2xl font-bold font-serif text-gray-900 tracking-tight">{item.topic}</h3>
                  </div>
                  <div className="text-xs text-gray-500 font-mono space-x-2">
                     <span>ID: {report.id.slice(0, 8)}</span>
                     <span>•</span>
                     <span>{report.articles.length} Sources Found</span>
                  </div>
                  {report.persianQuery && (
                    <p className="text-sm text-gray-600 mt-3 font-farsi" dir="rtl">
                      Query: {report.persianQuery}
                    </p>
                  )}
                </div>
                
                <div className="text-right flex flex-col items-end gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                    report.status === 'running' ? 'bg-cyan-100 text-cyan-800' :
                    report.status === 'failed' ? 'bg-red-100 text-red-800' :
                    report.status === 'cancelled' ? 'bg-stone-200 text-stone-600' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {report.status === 'running' ? (
                       <><Loader2 size={12} className="animate-spin"/> {report.stage}</>
                    ) : report.status === 'completed' ? (
                       <><CheckCircle2 size={12} /> COMPLETED</>
                    ) : (
                       report.status
                    )}
                  </span>

                  <div className="flex items-center gap-2">
                    {report.summary && (
                      <button
                        onClick={() => handleCopyReport(report)}
                        className="text-xs font-semibold text-gray-500 hover:text-accent flex items-center gap-1 transition-colors"
                        title="Copy full report"
                      >
                        {copiedId === report.id ? (
                          <><Check size={12} className="text-emerald-600" /> Copied!</>
                        ) : (
                          <><Copy size={12} /> Copy Report</>
                        )}
                      </button>
                    )}
                    {!isRunning && (
                      <button
                        onClick={() => onRunTopic(item.id)}
                        className="text-xs font-semibold text-gray-500 hover:text-accent flex items-center gap-1 transition-colors"
                      >
                        <Play size={12} /> Run Again
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Report Body */}
              <div className="p-8">
                {report.error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-md text-red-700 text-sm mb-6 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Analysis Failed</p>
                      <p>{report.error}</p>
                    </div>
                  </div>
                )}

                {report.summary ? (
                  <div className="prose prose-slate prose-headings:font-serif prose-headings:text-gray-900 prose-p:text-gray-700 max-w-none">
                    <ReactMarkdown components={MarkdownComponents}>
                      {report.summary}
                    </ReactMarkdown>
                  </div>
                ) : (
                   report.status === 'running' && (
                     <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                        <p className="animate-pulse font-medium">Generating intelligence summary...</p>
                     </div>
                   )
                )}
              </div>

              {/* Sources Footer */}
              {report.articles.length > 0 && (
                <div className="bg-surface-secondary p-6 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Intercepted Media Sources</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.articles.map((article, idx) => (
                      <a 
                        key={idx} 
                        href={article.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-start space-x-3 p-3 bg-white border border-gray-200 rounded-md hover:border-accent hover:bg-accent-light/10 transition-all group"
                      >
                        <FileText size={16} className="text-gray-400 mt-0.5 group-hover:text-accent shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 font-medium truncate group-hover:text-accent transition-colors leading-snug">
                            {article.title}
                          </p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[11px] text-gray-500">{article.domain}</span>
                            <span className="text-[10px] text-gray-400">{article.publishedDate ? article.publishedDate.split('T')[0] : ''}</span>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;