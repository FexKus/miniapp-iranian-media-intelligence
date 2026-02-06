export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, "");
}

export function isValidHostname(hostname: string): boolean {
  const trimmed = hostname.trim().toLowerCase();
  if (!trimmed || trimmed.length > 253) return false;
  if (trimmed.includes("://") || trimmed.includes("/") || trimmed.includes(" ")) return false;
  if (trimmed.endsWith(".")) return false;

  const normalized = normalizeHostname(trimmed);
  const labels = normalized.split(".");
  if (labels.some((label) => !label || label.length > 63)) return false;

  const labelRegex = /^[a-z0-9-]+$/;
  for (const label of labels) {
    if (!labelRegex.test(label)) return false;
    if (label.startsWith("-") || label.endsWith("-")) return false;
  }

  return true;
}

export function safeHostnameFromUrl(url: string): string | null {
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

export async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text) throw new Error("Missing JSON body");
  return JSON.parse(text) as T;
}

// ============================================================
// Query Validation (P1.6: Query Sanity Checks)
// ============================================================

const PERSIAN_REGEX = /[\u0600-\u06FF]/;
const MAX_QUERY_LENGTH = 200;

export interface QueryValidationResult {
  valid: boolean;
  query: string;
  warnings: string[];
  shouldRegenerate: boolean;
}

export function validatePersianQuery(
  query: string,
  _originalTopic: string
): QueryValidationResult {
  const warnings: string[] = [];
  let shouldRegenerate = false;
  let finalQuery = query;

  // Empty check
  if (!query.trim()) {
    warnings.push('Query is empty');
    shouldRegenerate = true;
    return { valid: false, query, warnings, shouldRegenerate };
  }

  // Persian script check
  if (!PERSIAN_REGEX.test(query)) {
    warnings.push('Query does not contain Persian characters');
    shouldRegenerate = true;
  }

  // Length guard
  if (query.length > MAX_QUERY_LENGTH) {
    warnings.push(`Query exceeds ${MAX_QUERY_LENGTH} characters (${query.length})`);
    finalQuery = query.slice(0, MAX_QUERY_LENGTH);
    shouldRegenerate = true;
  }

  return {
    valid: warnings.length === 0,
    query: finalQuery,
    warnings,
    shouldRegenerate,
  };
}

// ============================================================
// Article Validation (P1.7: Hard Gate Validations)
// ============================================================

export type EvidenceQuality = 'full' | 'short-text' | 'truncated';

const MIN_TEXT_LENGTH = 100;
const JUNK_PATTERNS = [
  /cookie|consent|accept all/i,
  /sign in|log in|subscribe now/i,
  /page not found|404|error occurred/i,
  /javascript (is )?required/i,
];

export function validateArticle(article: {
  title?: string;
  url?: string;
  text?: string;
  publishedDate?: string;
}): { valid: boolean; evidenceQuality: EvidenceQuality; reason?: string } {
  // Required fields
  if (!article.title?.trim()) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Missing title' };
  }
  if (!article.url?.trim()) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Missing URL' };
  }

  const hostname = safeHostnameFromUrl(article.url);
  if (!hostname || !isValidHostname(hostname)) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Invalid URL hostname' };
  }

  const textLength = article.text?.trim().length ?? 0;

  // Junk detection — only for short texts (likely scrape failures, not real articles)
  if (article.text && textLength < 500 && JUNK_PATTERNS.some(p => p.test(article.text!))) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Junk content detected' };
  }

  // Determine evidence quality
  if (textLength === 0) {
    return { valid: true, evidenceQuality: 'truncated' };
  }
  if (textLength < MIN_TEXT_LENGTH) {
    return { valid: true, evidenceQuality: 'short-text' };
  }
  return { valid: true, evidenceQuality: 'full' };
}

// ============================================================
// Soft Consistency Warnings (P2.10)
// ============================================================

const ENTITY_STOPWORDS = new Set([
  'The', 'A', 'An', 'And', 'Or', 'But', 'Of', 'To', 'In', 'For', 'On', 'At', 'By', 'From', 'With',
  'Sources', 'Source', 'Executive', 'Summary', 'Narratives', 'Bloc', 'Blocs', 'Key', 'Themes',
  'Significance', 'What', 'Watch', 'Next', 'Level', 'Rationale', 'Unknown', 'Medium', 'High', 'Low',
]);

const MAX_ENTITIES = 12;

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSourcesSection(summary: string): string {
  const split = summary.split(/##\s*Sources/i);
  return split[0] || summary;
}

export function extractCandidateEntitiesFromSummary(summary: string): string[] {
  const scoped = stripSourcesSection(summary);
  const normalized = scoped.replace(/#+\s+/g, '').replace(/[-*]\s+/g, '');

  const matches: string[] = [];
  // Use [ \t]+ (horizontal whitespace) instead of \s+ to avoid matching across newlines
  const titleCaseMatches = normalized.match(/\b[A-Z][a-zA-Z]+(?:[ \t]+[A-Z][a-zA-Z]+){0,3}\b/g) || [];
  const acronymMatches = normalized.match(/\b[A-Z]{2,}\b/g) || [];
  const persianMatches = normalized.match(/[\u0600-\u06FF]{2,}/g) || [];

  for (const m of [...titleCaseMatches, ...acronymMatches, ...persianMatches]) {
    const trimmed = m.trim();
    if (!trimmed || ENTITY_STOPWORDS.has(trimmed)) continue;
    if (trimmed.length < 3) continue;
    matches.push(trimmed);
  }

  const unique = Array.from(new Set(matches));
  return unique.slice(0, MAX_ENTITIES);
}

export function buildConsistencyWarnings(
  summary: string,
  articles: Array<{ title?: string; text?: string }>
): string[] {
  if (!summary.trim() || articles.length === 0) return [];

  const entities = extractCandidateEntitiesFromSummary(summary);
  if (entities.length === 0) return [];

  const sourcesText = normalizeForSearch(
    articles.map((a) => `${a.title || ''} ${a.text || ''}`).join(' ')
  );

  const warnings: string[] = [];
  for (const entity of entities) {
    const needle = normalizeForSearch(entity);
    if (!needle) continue;
    if (!sourcesText.includes(needle)) {
      warnings.push(`Possible ungrounded claim: "${entity}" not found in sources`);
    }
  }

  return warnings.slice(0, MAX_ENTITIES);
}

// ============================================================
// Domain Diversity (round-robin to prevent single-source dominance)
// ============================================================

export function diversifyByDomain<T extends { domain: string }>(
  articles: T[],
  max: number
): T[] {
  const byDomain = new Map<string, T[]>();
  for (const a of articles) {
    const list = byDomain.get(a.domain) || [];
    list.push(a);
    byDomain.set(a.domain, list);
  }

  const result: T[] = [];
  const domains = [...byDomain.keys()];
  let round = 0;

  while (result.length < max) {
    let added = false;
    for (const domain of domains) {
      const list = byDomain.get(domain)!;
      if (round < list.length) {
        result.push(list[round]);
        added = true;
        if (result.length >= max) break;
      }
    }
    if (!added) break;
    round++;
  }

  return result;
}

// ============================================================
// Retry with Backoff (P1.8: Resilience Patterns)
// ============================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  operation: () => Promise<Response>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, retryableStatuses } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await operation();

      if (response.ok) {
        return await response.json();
      }

      if (!retryableStatuses.includes(response.status)) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Non-retryable error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      // Calculate delay (respect Retry-After if present)
      const retryAfter = response.headers.get('Retry-After');
      let delayMs = baseDelayMs * Math.pow(2, attempt - 1);

      if (retryAfter) {
        const retryAfterSeconds = parseInt(retryAfter, 10);
        if (!isNaN(retryAfterSeconds)) {
          delayMs = Math.min(retryAfterSeconds * 1000, maxDelayMs);
        }
      }
      delayMs = Math.min(delayMs, maxDelayMs);

      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed with ${response.status}. Retrying in ${delayMs}ms...`);

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs));
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      // If it's already a non-retryable error, throw immediately
      if (error instanceof Error && error.message.startsWith('Non-retryable')) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        console.log(`[Retry] Attempt ${attempt}/${maxAttempts} threw error: ${lastError.message}. Retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}

export interface RetryAsyncConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_RETRY_ASYNC_CONFIG: RetryAsyncConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  isRetryable: () => true,
};

export async function withRetryAsync<T>(
  operation: () => Promise<T>,
  config: Partial<RetryAsyncConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, isRetryable } = {
    ...DEFAULT_RETRY_ASYNC_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isRetryable ? isRetryable(error) : true;
      if (!retryable) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        console.log(`[RetryAsync] Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}


