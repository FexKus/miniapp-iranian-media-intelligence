import { ArticleResult, SearchResponse } from "../../types";

// Legacy V2 client: retained for reference.

export interface TranslateResult {
  query: string;
  warnings?: string[];
}

export async function translateQuery(_unusedApiKey: string, topic: string, _unusedModel: string): Promise<TranslateResult> {
  const resp = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `Translate failed: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return {
    query: (data?.persianQuery || topic).trim(),
    warnings: data?.queryWarnings,
  };
}

export async function searchExa(
  _unusedApiKey: string,
  query: string,
  domains: string[],
  numResults = 5,
  startPublishedDate?: string,
  endPublishedDate?: string
): Promise<SearchResponse> {
  const resp = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      includeDomains: domains,
      numResults,
      startPublishedDate,
      endPublishedDate
    }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `Search failed: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return {
    results: Array.isArray(data?.results) ? data.results : [],
    warning: data?.warning,
  };
}

export interface AnalyzeResult {
  summary: string;
  verifierWarnings?: string[];
  consistencyWarnings?: string[];
  evaluatorResult?: {
    citationScore: number;
    faithfulnessScore: number;
    issues: Array<{ claim: string; issue: string }>;
  };
}

export async function analyzeArticles(
  _unusedApiKey: string,
  topic: string,
  articles: ArticleResult[],
  _unusedModel: string,
  domainLeanings?: Record<string, string>
): Promise<AnalyzeResult> {
  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, articles, domainLeanings }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `Analyze failed: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return {
    summary: data?.summary || "Analysis complete, but no text was generated.",
    verifierWarnings: data?.verifierWarnings,
    consistencyWarnings: data?.consistencyWarnings,
    evaluatorResult: data?.evaluatorResult,
  };
}
