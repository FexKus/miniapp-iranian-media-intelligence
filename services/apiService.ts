import { ArticleResult } from "../types";

// Client calls same-origin serverless endpoints on Vercel.

export async function translateQuery(_unusedApiKey: string, topic: string, _unusedModel: string): Promise<string> {
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
  return (data?.persianQuery || topic).trim();
}

export async function searchExa(
  _unusedApiKey: string,
  query: string,
  domains: string[],
  numResults = 5
): Promise<ArticleResult[]> {
  const resp = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, includeDomains: domains, numResults }),
  });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `Search failed: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return Array.isArray(data?.results) ? data.results : [];
}

export async function analyzeArticles(
  _unusedApiKey: string,
  topic: string,
  articles: ArticleResult[],
  _unusedModel: string,
  domainLeanings?: Record<string, string>
): Promise<string> {
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
  return data?.summary || "Analysis complete, but no text was generated.";
}