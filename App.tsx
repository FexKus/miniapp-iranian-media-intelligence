import React, { useEffect, useRef, useState } from 'react';
import AppSidebar from './components/AppSidebar';
import Dashboard from './components/Dashboard';
import Watchlist from './components/Watchlist';
import Sources from './components/Sources';
import SavedReports from './components/SavedReports';
import Settings from './components/Settings';
import { Report } from './types';
import { INITIAL_SOURCES, INITIAL_WATCHLIST } from './constants';
import AuthGate from './components/AuthGate';
import { useAuth } from './hooks/useAuth';
import {
  addSource,
  addWatchlistItem,
  deleteReport,
  deleteSource,
  deleteWatchlistItem,
  getSources,
  getWatchlist,
  subscribeToReports,
  subscribeToSources,
  subscribeToWatchlist,
  toggleReportSaved,
  updateSource,
  updateWatchlistItem,
} from './lib/firestore';
import { toast } from 'sonner';

const REPORT_BATCH_LIMIT = 5;

const App: React.FC = () => {
  const { user, signOutUser } = useAuth();

  // --- State Management ---
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Persist sensitive keys in state (mocking local storage behavior safely)
  // Keys/models are now server-side (Vercel env vars). The client never sees them.
  
  const [sources, setSources] = useState(INITIAL_SOURCES);
  const [watchlist, setWatchlist] = useState(INITIAL_WATCHLIST);
  const [reports, setReports] = useState<Report[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const runTokenRef = useRef(0);
  const seededRef = useRef(false);
  const watchlistReadyRef = useRef(false);
  const sourcesReadyRef = useRef(false);
  const reportsReadyRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    let unwatchWatchlist: (() => void) | null = null;
    let unwatchSources: (() => void) | null = null;
    let unwatchReports: (() => void) | null = null;

    setDataReady(false);
    watchlistReadyRef.current = false;
    sourcesReadyRef.current = false;
    reportsReadyRef.current = false;
    seededRef.current = false;  // Reset for each user to ensure new users get defaults

    const maybeReady = () => {
      if (watchlistReadyRef.current && sourcesReadyRef.current && reportsReadyRef.current) {
        setDataReady(true);
      }
    };

    const ensureDefaults = async () => {
      if (seededRef.current) return;
      const existingWatchlist = await getWatchlist(user.uid);
      const existingSources = await getSources(user.uid);
      if (existingWatchlist.length === 0) {
        await Promise.all(
          INITIAL_WATCHLIST.map((item) => addWatchlistItem(user.uid, item))
        );
      }
      if (existingSources.length === 0) {
        await Promise.all(
          INITIAL_SOURCES.map((source) =>
            addSource(user.uid, {
              name: source.name,
              domain: source.domain,
              leaning: source.leaning,
              active: source.active,
              description: source.description,
            })
          )
        );
      }
      seededRef.current = true;
    };

    ensureDefaults().catch((error) => {
      console.error("Failed seeding defaults", error);
    });

    unwatchWatchlist = subscribeToWatchlist(user.uid, (items) => {
      setWatchlist(items);
      if (!watchlistReadyRef.current) {
        watchlistReadyRef.current = true;
        maybeReady();
      }
    });
    unwatchSources = subscribeToSources(user.uid, (items) => {
      setSources(items);
      if (!sourcesReadyRef.current) {
        sourcesReadyRef.current = true;
        maybeReady();
      }
    });
    unwatchReports = subscribeToReports(user.uid, (items) => {
      setReports(items);
      if (!reportsReadyRef.current) {
        reportsReadyRef.current = true;
        maybeReady();
      }
    });

    return () => {
      unwatchWatchlist?.();
      unwatchSources?.();
      unwatchReports?.();
    };
  }, [user]);

  // --- Persistence Effects ---
  // (no localStorage persistence for keys/models)

  // --- Handlers ---

  const toggleSource = async (id: string) => {
    if (!user) return;
    const source = sources.find((s) => s.id === id);
    if (!source) return;
    try {
      await updateSource(user.uid, id, { active: !source.active });
    } catch (error) {
      console.error('Failed to toggle source:', error);
      toast.error('Failed to update source. Please try again.');
    }
  };

  const handleCancelMonitoring = () => {
    runTokenRef.current += 1; // invalidate current run
    setIsRunning(false);
  };

  const createReport = async (itemId: string) => {
    if (!user) return;
    const item = watchlist.find((w) => w.id === itemId);
    if (!item) return;
    const activeSources = sources.filter(s => s.active).map(s => s.domain);
    const domainLeanings = Object.fromEntries(
      sources.map((s) => [s.domain.replace(/^www\./, '').toLowerCase(), s.leaning])
    );
    if (activeSources.length === 0) {
      alert("No media sources selected.");
      return;
    }

    const nowHour = new Date().toISOString().slice(0, 13);
    const idempotencyKey = [
      user.uid,
      item.id,
      item.timeRange || "last7d",
      item.customStartDate || "",
      item.customEndDate || "",
      [...activeSources].sort().join(","),
      nowHour,
    ].join(":");

    const token = await user.getIdToken();
    const response = await fetch("/api/reports/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        watchlistItemId: item.id,
        topic: item.topic,
        persianQuery: item.persianQuery,
        domains: activeSources,
        domainLeanings,
        timeRange: item.timeRange || "last7d",
        customStartDate: item.customStartDate,
        customEndDate: item.customEndDate,
        idempotencyKey,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(errorText);
    }
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

    try {
      for (const item of items.slice(0, REPORT_BATCH_LIMIT)) {
        if (runTokenRef.current !== runToken) break;
        try {
          await createReport(item.id);
        } catch (error: any) {
          console.error("Failed to create report", error);
          alert(error?.message || "Failed to create report");
        }
      }
    } finally {
      // Only end the spinner if this is still the active run.
      if (runTokenRef.current === runToken) setIsRunning(false);
    }
  };

  // --- Render ---

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-background text-foreground font-sans">
        <AppSidebar activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={signOutUser} />

        <main className="flex-1 ml-64 p-8 md:p-12 overflow-y-auto h-screen">
          {activeTab === 'dashboard' && (
            <Dashboard 
              watchlist={watchlist} 
              reports={savedOnly ? reports.filter((r) => r.saved) : reports} 
              isRunning={isRunning} 
              isLoading={!dataReady}
              savedOnly={savedOnly}
              onToggleSavedOnly={() => setSavedOnly((prev) => !prev)}
              onRunMonitoring={() => handleRunMonitoring(watchlist)}
              onRunTopic={(watchlistItemId) => {
                const item = watchlist.find((w) => w.id === watchlistItemId);
                if (item) handleRunMonitoring([item]);
              }}
              onCancelMonitoring={handleCancelMonitoring}
              onToggleReportSaved={async (reportId, saved) => {
                if (!user) return;
                await toggleReportSaved(user.uid, reportId, saved);
              }}
              onDeleteReport={async (reportId) => {
                if (!user) return;
                if (!confirm("Delete this report?")) return;
                await deleteReport(user.uid, reportId);
              }}
              onSignOut={() => signOutUser()}
            />
          )}
          {activeTab === 'watchlist' && (
            <Watchlist
              watchlist={watchlist}
              loading={!dataReady}
              onAdd={async (item) => {
                if (!user) return;
                try {
                  await addWatchlistItem(user.uid, item);
                  toast.success('Watchlist item added');
                } catch (error) {
                  console.error('Failed to add watchlist item:', error);
                  toast.error('Failed to add item. Please try again.');
                  throw error;
                }
              }}
              onUpdate={async (id, updates) => {
                if (!user) return;
                try {
                  await updateWatchlistItem(user.uid, id, updates);
                } catch (error) {
                  console.error('Failed to update watchlist item:', error);
                  toast.error('Failed to update item. Please try again.');
                }
              }}
              onDelete={async (id) => {
                if (!user) return;
                try {
                  await deleteWatchlistItem(user.uid, id);
                  toast.success('Watchlist item deleted');
                } catch (error) {
                  console.error('Failed to delete watchlist item:', error);
                  toast.error('Failed to delete item. Please try again.');
                }
              }}
            />
          )}
          {activeTab === 'sources' && (
            <Sources
              sources={sources}
              loading={!dataReady}
              toggleSource={toggleSource}
              onAdd={async (source) => {
                if (!user) return;
                try {
                  await addSource(user.uid, source);
                  toast.success('Media source added');
                } catch (error) {
                  console.error('Failed to add source:', error);
                  toast.error('Failed to add source. Please try again.');
                  throw error;
                }
              }}
              onDelete={async (id) => {
                if (!user) return;
                try {
                  await deleteSource(user.uid, id);
                  toast.success('Media source deleted');
                } catch (error) {
                  console.error('Failed to delete source:', error);
                  toast.error('Failed to delete source. Please try again.');
                }
              }}
            />
          )}
          {activeTab === 'saved-reports' && (
            <SavedReports
              reports={reports}
              onToggleReportSaved={async (reportId, saved) => {
                if (!user) return;
                await toggleReportSaved(user.uid, reportId, saved);
              }}
              onDeleteReport={async (reportId) => {
                if (!user) return;
                if (!confirm("Delete this report?")) return;
                await deleteReport(user.uid, reportId);
              }}
            />
          )}
          {activeTab === 'settings' && (
            <Settings
              userEmail={user?.email || undefined}
              onSignOut={signOutUser}
            />
          )}
        </main>
      </div>
    </AuthGate>
  );
};

export default App;