import { INITIAL_SOURCES } from "../constants.js";
import { ArticleResult } from "../types.js";
import { normalizeHostname, readJson, requireEnv, safeHostnameFromUrl } from "./_shared.js";

export const config = {
  runtime: "nodejs",
};

type SearchBody = {
  query: string;
  includeDomains: string[];
  numResults?: number;
};

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const apiKey = requireEnv("EXA_API_KEY");
    const { query, includeDomains, numResults, startPublishedDate, endPublishedDate } = await readJson<SearchBody & { startPublishedDate?: string; endPublishedDate?: string }>(req);
    if (!query?.trim()) return new Response("Missing query", { status: 400 });

    const allowed = new Set(INITIAL_SOURCES.map((s) => normalizeHostname(s.domain)));
    const requested = Array.isArray(includeDomains) ? includeDomains : [];
    const gatedDomains = Array.from(
      new Set(requested.map(normalizeHostname).filter((d) => allowed.has(d)))
    );
    if (gatedDomains.length === 0) {
      return Response.json({ results: [] satisfies ArticleResult[] });
    }

    const body = {
      query,
      includeDomains: gatedDomains,
      numResults: Math.max(1, Math.min(20, numResults ?? 5)),
      contents: { text: true },
      startPublishedDate,
      endPublishedDate,
    };

    const resp = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return Response.json(
        { error: `Exa error: ${resp.status} ${resp.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}` },
        { status: 502 }
      );
    }

    const data = (await resp.json().catch(() => null)) as any;
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

    // Extra hard gate: keep only URLs whose hostname is in our allowed set + selected set.
    const gated = mapped.filter((r) => {
      const host = safeHostnameFromUrl(r.url);
      if (!host) return false;
      return allowed.has(host) && gatedDomains.includes(host);
    });

    // Dedupe by URL
    const seen = new Set<string>();
    const deduped = gated.filter((r) => {
      const key = r.url?.trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return Response.json({ results: deduped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}


