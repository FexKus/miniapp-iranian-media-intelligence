import React from 'react';
import { WatchlistItem, Report } from '../types';
import { Play, Loader2, FileText, ExternalLink, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';
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
  
  // Helper to render markdown content safely and cleanly
  const MarkdownComponents = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    strong: ({ node, ...props }: any) => <span className="font-bold text-emerald-400" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h1: ({ node, ...props }: any) => <h3 className="text-xl font-bold text-white mt-4 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h2: ({ node, ...props }: any) => <h4 className="text-lg font-bold text-slate-200 mt-4 mb-2" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    h3: ({ node, ...props }: any) => <h5 className="text-md font-bold text-slate-300 mt-3 mb-1" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 space-y-1 text-slate-300 mb-4" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    li: ({ node, ...props }: any) => <li className="pl-1 marker:text-emerald-500" {...props} />,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: ({ node, ...props }: any) => <p className="text-slate-300 leading-relaxed mb-4" {...props} />,
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header Action Area */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8 mb-10 flex flex-col md:flex-row justify-between items-center shadow-2xl">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Intelligence Dashboard</h2>
          <p className="text-slate-400">
            Monitoring <span className="text-white font-semibold">{watchlist.length}</span> objectives across active channels.
          </p>
        </div>
        <div className="mt-6 md:mt-0 flex items-center gap-3">
          <button
            onClick={onRunMonitoring}
            disabled={isRunning || watchlist.length === 0}
            className={`flex items-center space-x-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-emerald-500/20 ${
              isRunning 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white transform hover:-translate-y-1'
            }`}
          >
            {isRunning ? (
              <>
                <Loader2 className="animate-spin" />
                <span>Running Analysis...</span>
              </>
            ) : (
              <>
                <Play fill="currentColor" />
                <span>Run Monitoring</span>
              </>
            )}
          </button>

          {isRunning && (
            <button
              onClick={onCancelMonitoring}
              className="flex items-center space-x-2 px-5 py-4 rounded-xl font-bold text-lg transition-all border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
            >
              <Ban />
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
              <div key={item.id} className="bg-slate-900/50 border border-slate-800 border-dashed rounded-xl p-8 text-center">
                <h3 className="text-lg font-medium text-slate-500 mb-1">{item.topic}</h3>
                <p className="text-sm text-slate-600">No analysis data available. Run monitoring to generate intelligence.</p>
              </div>
            );
          }

          return (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              {/* Report Header */}
              <div className="bg-slate-950/50 p-6 border-b border-slate-800 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-xl font-bold text-white">{item.topic}</h3>
                    {report.status === 'completed' && <span className="text-emerald-500"><CheckCircle2 size={18} /></span>}
                    {report.status === 'running' && <span className="text-blue-500"><Loader2 size={18} className="animate-spin" /></span>}
                    {report.status === 'failed' && <span className="text-rose-500"><AlertTriangle size={18} /></span>}
                    {report.status === 'cancelled' && <span className="text-slate-500"><Ban size={18} /></span>}
                  </div>
                  <p className="text-sm text-slate-500 font-mono">
                     ID: {report.id.slice(0, 8)} • {report.articles.length} Sources Found
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                    report.status === 'running' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    report.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    report.status === 'cancelled' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {report.status === 'running' ? report.stage : report.status.toUpperCase()}
                  </div>
                  {report.persianQuery && (
                    <p className="text-xs text-slate-600 mt-2 font-farsi text-right" dir="rtl">
                      Query: {report.persianQuery}
                    </p>
                  )}
                  {!isRunning && (
                    <div className="mt-3">
                      <button
                        onClick={() => onRunTopic(item.id)}
                        className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200"
                      >
                        <Play size={14} />
                        <span>Run this topic</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Report Body */}
              <div className="p-6">
                {report.error && (
                  <div className="bg-rose-950/30 border border-rose-900/50 p-4 rounded-lg text-rose-300 text-sm mb-4">
                    Error: {report.error}
                  </div>
                )}

                {report.summary ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown components={MarkdownComponents}>
                      {report.summary}
                    </ReactMarkdown>
                  </div>
                ) : (
                   report.status === 'running' && (
                     <div className="h-32 flex items-center justify-center text-slate-600 animate-pulse">
                        Generating intelligence summary...
                     </div>
                   )
                )}
              </div>

              {/* Sources Footer */}
              {report.articles.length > 0 && (
                <div className="bg-slate-950 p-4 border-t border-slate-800">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Intercepted Media Sources</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {report.articles.map((article, idx) => (
                      <a 
                        key={idx} 
                        href={article.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-start space-x-2 p-2 rounded hover:bg-slate-900 transition-colors group"
                      >
                        <FileText size={14} className="text-slate-600 mt-1 group-hover:text-emerald-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 font-medium truncate group-hover:text-emerald-400 transition-colors">
                            {article.title}
                          </p>
                          <p className="text-[10px] text-slate-600 flex justify-between">
                            <span>{article.domain}</span>
                            {article.publishedDate && <span>{article.publishedDate.split('T')[0]}</span>}
                          </p>
                        </div>
                        <ExternalLink size={12} className="text-slate-700 group-hover:text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;