import React, { useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Watchlist from './components/Watchlist';
import Sources from './components/Sources';
import { Report } from './types';
import { INITIAL_SOURCES, INITIAL_WATCHLIST } from './constants';
import { runMonitoring } from './services/monitoringEngine';

const App: React.FC = () => {
  // --- State Management ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Persist sensitive keys in state (mocking local storage behavior safely)
  // Keys/models are now server-side (Vercel env vars). The client never sees them.
  
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [reports, setReports] = useState<Report[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const runTokenRef = useRef(0);

  // --- Persistence Effects ---
  // (no localStorage persistence for keys/models)

  // --- Handlers ---

  const toggleSource = (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const upsertReport = (report: Report) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.watchlistItemId !== report.watchlistItemId);
      next.unshift(report);
      return next;
    });
  };

  const updateReport = (watchlistItemId: string, update: Partial<Report>) => {
    setReports((prev) => {
      const next = [...prev];
      const idx = next.findIndex((r) => r.watchlistItemId === watchlistItemId);
      if (idx !== -1) next[idx] = { ...next[idx], ...update };
      return next;
    });
  };

  const handleCancelMonitoring = () => {
    runTokenRef.current += 1; // invalidate current run
    setIsRunning(false);
  };

  const handleRunMonitoring = async (items = watchlist) => {
    if (items.length === 0) {
        alert("Watchlist is empty. Add a topic to monitor.");
        setActiveTab('watchlist');
        return;
    }

    setIsRunning(true);
    const runToken = runTokenRef.current + 1;
    runTokenRef.current = runToken;

    const activeSources = sources.filter(s => s.active).map(s => s.domain);
    const domainLeanings = Object.fromEntries(
      sources.map((s) => [s.domain.replace(/^www\./, '').toLowerCase(), s.leaning])
    );
    if (activeSources.length === 0) {
        alert("No media sources selected.");
        setIsRunning(false);
        return;
    }

    try {
      await runMonitoring({
        exaApiKey: "",
        geminiApiKey: "",
        geminiTranslationModel: "",
        geminiAnalysisModel: "",
        activeDomains: activeSources,
        domainLeanings,
        items,
        isCancelled: () => runTokenRef.current !== runToken,
        onReportInit: upsertReport,
        onReportUpdate: (watchlistItemId, update) => updateReport(watchlistItemId, update),
      });
    } finally {
      // Only end the spinner if this is still the active run.
      if (runTokenRef.current === runToken) setIsRunning(false);
    }
  };

  // --- Render ---

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        {activeTab === 'dashboard' && (
          <Dashboard 
            watchlist={watchlist} 
            reports={reports} 
            isRunning={isRunning} 
            onRunMonitoring={() => handleRunMonitoring(watchlist)}
            onRunTopic={(watchlistItemId) => {
              const item = watchlist.find((w) => w.id === watchlistItemId);
              if (item) handleRunMonitoring([item]);
            }}
            onCancelMonitoring={handleCancelMonitoring}
          />
        )}
        {activeTab === 'watchlist' && (
          <Watchlist watchlist={watchlist} setWatchlist={setWatchlist} />
        )}
        {activeTab === 'sources' && (
          <Sources sources={sources} toggleSource={toggleSource} />
        )}
      </main>
    </div>
  );
};

export default App;