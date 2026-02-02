import { ArticleResult } from "../types.js";
import { isValidHostname, normalizeHostname, readJson, requireEnv, safeHostnameFromUrl, validateArticle, withRetry } from "./_shared.js";

export const config = {
  runtime: "edge",
};

type SearchBody = {
  query: string;
  includeDomains: string[];
  numResults?: number;
};

// Maximum domains allowed per search request (Exa API supports up to 100)
const MAX_DOMAINS = 50;

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const apiKey = requireEnv("EXA_API_KEY");
    const { query, includeDomains, numResults, startPublishedDate, endPublishedDate } = await readJson<SearchBody & { startPublishedDate?: string; endPublishedDate?: string }>(req);
    if (!query?.trim()) return new Response("Missing query", { status: 400 });

    const requested = Array.isArray(includeDomains) ? includeDomains : [];
    const normalizedDomains = requested
      .map((domain) => normalizeHostname(domain))
      .filter((domain) => isValidHostname(domain));
    const uniqueDomains = Array.from(new Set(normalizedDomains));
    const gatedDomains = uniqueDomains.slice(0, MAX_DOMAINS);

    // Log and track if domains were truncated
    let warning: string | undefined;
    if (uniqueDomains.length > MAX_DOMAINS) {
      console.log(`[Search] Domain limit reached: ${uniqueDomains.length} requested, truncated to ${MAX_DOMAINS}`);
      warning = `Domain limit reached: only the first ${MAX_DOMAINS} of ${uniqueDomains.length} sources will be searched.`;
    }

    if (gatedDomains.length === 0) {
      return Response.json({
        results: [] satisfies ArticleResult[],
        warning: "No valid domains provided. Check your media source list.",
      });
    }

    const body = {
      query,
      includeDomains: gatedDomains,
      numResults: Math.max(1, Math.min(50, numResults ?? 20)),
      contents: { text: true },
      startPublishedDate,
      endPublishedDate,
    };

    let data: any;
    try {
      data = await withRetry<any>(() => fetch("https://api.exa.ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(body),
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return Response.json(
        { error: `Exa error: ${msg}` },
        { status: 502 }
      );
    }
    const rawResults: any[] = Array.isArray(data?.results) ? data.results : [];

    const mapped: ArticleResult[] = rawResults.map((r) => ({
      title: r.title || "Untitled",
      url: r.url,
      publishedDate: r.publishedDate,
      author: r.author,
      text: (r.text || "").trim()
        ? r.text
        : "[No article text returned by Exa for this result. Open the source link to read it.]",
      domain: r.url ? normalizeHostname(new URL(r.url).hostname) : "unknown",
    }));

    const selectedDomains = new Set(gatedDomains);

    // Extra hard gate: keep only URLs whose hostname is in selected domains.
    const gated = mapped.filter((r) => {
      const host = safeHostnameFromUrl(r.url);
      if (!host) return false;
      return selectedDomains.has(host);
    });

    // P1.7: Validate articles and tag with evidence quality
    const validated: ArticleResult[] = gated
      .map((article) => {
        const validation = validateArticle(article);
        if (!validation.valid) {
          console.log(`[Search] Filtered article: ${validation.reason} - ${article.url}`);
          return null;
        }
        return { ...article, evidenceQuality: validation.evidenceQuality } as ArticleResult;
      })
      .filter((a): a is ArticleResult => a !== null);

    // Dedupe by URL
    const seen = new Set<string>();
    const deduped = validated.filter((r) => {
      const key = r.url?.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Response.json({ results: deduped, warning });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}


