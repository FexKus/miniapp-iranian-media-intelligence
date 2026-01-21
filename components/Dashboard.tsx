import React, { useState } from 'react';
import { WatchlistItem, Report } from '../types';
import { Play, Loader2, ExternalLink, AlertTriangle, CheckCircle2, Ban, Copy, Check } from 'lucide-react';
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

                {report.searchWarning && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-md text-amber-800 text-sm mb-6 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Search Warning</p>
                      <p>{report.searchWarning}</p>
                    </div>
                  </div>
                )}

                {/* Coverage Badge (P0.3) */}
                {report.coverage && (
                  <div className="flex items-center gap-2 text-sm mb-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      report.coverage.coverageConfidence === 'high' ? 'bg-green-100 text-green-800' :
                      report.coverage.coverageConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {report.coverage.sourceCount} source{report.coverage.sourceCount !== 1 ? 's' : ''} / {
                        Object.entries(report.coverage.leaningDistribution)
                          .map(([leaning, count]) => `${count} ${leaning}`)
                          .join(', ')
                      }
                    </span>
                    {report.coverage.coverageConfidence === 'low' && (
                      <span className="text-gray-500 text-xs" title="Limited reporting may itself be significant - this topic may be underreported or censored">
                        ⓘ Thin coverage
                      </span>
                    )}
                  </div>
                )}

                {/* Query Translation Warnings (P1.6) */}
                {report.queryWarnings && report.queryWarnings.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm mb-4 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Query Translation Warning</p>
                      <ul className="text-blue-700 mt-1 text-xs">
                        {report.queryWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Citation/Verifier Warnings (P1.4) */}
                {report.verifierWarnings && report.verifierWarnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm mb-4 flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">Citation Check</p>
                      <ul className="text-amber-700 mt-1 text-xs">
                        {report.verifierWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Soft Consistency Warnings (P2.10) */}
                {report.consistencyWarnings && report.consistencyWarnings.length > 0 && (
                  <details className="bg-amber-50 border border-amber-200 p-3 rounded-md text-sm mb-4">
                    <summary className="flex items-center gap-2 cursor-pointer text-amber-800 font-medium">
                      <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                      Soft Consistency Warnings
                    </summary>
                    <ul className="text-amber-700 mt-2 text-xs ml-6">
                      {report.consistencyWarnings.map((w, i) => <li key={i}>• {w}</li>)}
                    </ul>
                  </details>
                )}

                {/* Evaluator Scores (P2.11) */}
                {report.evaluatorResult && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-md text-sm mb-4">
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

              {/* Sources Footer (P1.5: Enhanced Evidence Bundle UX) */}
              {report.articles.length > 0 && (
                <div className="bg-surface-secondary p-6 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Intercepted Media Sources</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {report.articles.map((article, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-gray-200 rounded-md hover:border-accent transition-all group"
                      >
                        {/* Source number and quality badges */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-accent">Source {idx + 1}</span>
                          <div className="flex gap-1">
                            {article.evidenceQuality === 'short-text' && (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
                                Short text
                              </span>
                            )}
                            {article.evidenceQuality === 'truncated' && (
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                No text
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Article title with link */}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <p className="text-sm text-gray-900 font-medium truncate group-hover:text-accent transition-colors leading-snug mb-2">
                            {article.title}
                          </p>
                        </a>
                        {/* Domain, leaning, and date info */}
                        <div className="flex flex-wrap gap-1.5 text-[11px] mb-2">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{article.domain}</span>
                          {report.domainLeanings?.[article.domain] && (
                            <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              {report.domainLeanings[article.domain]}
                            </span>
                          )}
                          {article.publishedDate && (
                            <span className="text-gray-400">{article.publishedDate.split('T')[0]}</span>
                          )}
                        </div>
                        {/* External link */}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent text-xs hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink size={10} /> View original
                        </a>
                      </div>
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