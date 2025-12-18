export interface MediaSource {
  id: string;
  domain: string;
  name: string;
  leaning: 'Principlist' | 'Reformist' | 'State' | 'Economic' | 'Moderate';
  active: boolean;
  description?: string;
}

export interface WatchlistItem {
  id: string;
  topic: string;
  description: string;
  persianQuery?: string; // Optional pre-optimized Persian search query
  timeRange?: 'last24h' | 'last7d' | 'last30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
}

export interface ArticleResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text: string;
  domain: string;
}

export interface Report {
  id: string;
  watchlistItemId: string;
  topic: string;
  timestamp: number;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  stage: string; // e.g., "Translating...", "Searching...", "Analyzing..."
  persianQuery?: string;
  summary?: string; // Markdown content
  articles: ArticleResult[];
  error?: string;
}

export interface AppState {
  exaApiKey: string;
  geminiApiKey: string;
  sources: MediaSource[];
  watchlist: WatchlistItem[];
  reports: Report[];
}