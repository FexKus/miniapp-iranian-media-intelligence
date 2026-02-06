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

// Evidence quality for article validation (P1.7)
export type EvidenceQuality = 'full' | 'short-text' | 'truncated';

export interface ArticleResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text: string;
  domain: string;
  evidenceQuality?: EvidenceQuality; // Quality tag for validation
}

// Coverage metadata for thin coverage signaling (P0.3)
export interface CoverageMetadata {
  sourceCount: number;
  uniqueDomains: string[];
  leaningDistribution: Record<string, number>;
  dateRange: { earliest: string; latest: string } | null;
  coverageConfidence: 'high' | 'medium' | 'low';
}

export interface SearchResponse {
  results: ArticleResult[];
  warning?: string;
}

export interface EvaluatorIssue {
  claim: string;
  issue: string;
}

export interface EvaluatorResult {
  citationScore: number; // 0-100
  faithfulnessScore: number; // 0-100
  issues: EvaluatorIssue[];
}

export interface Report {
  id: string;
  watchlistItemId: string;
  topic: string;
  timestamp: number;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  stage: string; // e.g., "Translating...", "Searching...", "Analyzing..."
  persianQuery?: string;
  domains?: string[];
  domainLeanings?: Record<string, string>;
  timeRange?: 'last24h' | 'last7d' | 'last30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  idempotencyKey?: string;
  summary?: string; // Markdown content
  articles: ArticleResult[];
  error?: string;
  searchWarning?: string; // Warning from search (e.g., invalid domains)
  searchDiagnostics?: {
    query: string;
    domainsSearched: number;
    dateRange: { startPublishedDate: string | null; endPublishedDate: string | null };
    rawExaCount: number;
    afterDomainFilter: number;
    afterValidation: number;
    afterDedup: number;
    finalCount?: number;
    searchMode?: string;
  };
  // New fields for P0.3, P1.4, P1.5, P1.6
  coverage?: CoverageMetadata; // Coverage metadata (P0.3)
  queryWarnings?: string[]; // Translation/query warnings (P1.6)
  verifierWarnings?: string[]; // Citation check warnings (P1.4)
  consistencyWarnings?: string[]; // Soft consistency warnings (P2.10)
  evaluatorResult?: EvaluatorResult; // Evaluator scores/issues (P2.11)
  saved?: boolean;
  createdAt?: number;
  updatedAt?: number;
  expiresAt?: number;
}

export interface AppState {
  exaApiKey: string;
  geminiApiKey: string;
  sources: MediaSource[];
  watchlist: WatchlistItem[];
  reports: Report[];
}