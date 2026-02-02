import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from "../client";
import { getAdminDb } from "../../lib/firebaseAdmin";
import {
  buildConsistencyWarnings,
  isValidHostname,
  normalizeHostname,
  requireEnv,
  safeHostnameFromUrl,
  validateArticle,
  validatePersianQuery,
  withRetry,
  withRetryAsync,
} from "../../api/_shared";
import { ArticleResult, CoverageMetadata, EvaluatorResult } from "../../types";

const MAX_DOMAINS = 25;
const MAX_ARTICLES = 5;
const EVALUATOR_MAX_ARTICLES = 5;
const EVALUATOR_TIMEOUT_MS = 30000;

function computeCoverageMetadata(
  articles: ArticleResult[],
  domainLeanings: Record<string, string>
): CoverageMetadata {
  const uniqueDomains = [...new Set(articles.map(a => a.domain))];
  const leaningDistribution: Record<string, number> = {};

  for (const article of articles) {
    const leaning = domainLeanings[article.domain] || 'Unknown';
    leaningDistribution[leaning] = (leaningDistribution[leaning] || 0) + 1;
  }

  const dates = articles
    .map(a => a.publishedDate)
    .filter((d): d is string => Boolean(d))
    .sort();

  const dateRange = dates.length > 0
    ? { earliest: dates[0], latest: dates[dates.length - 1] }
    : null;

  let coverageConfidence: 'high' | 'medium' | 'low';
  const leaningCount = Object.keys(leaningDistribution).length;

  if (articles.length >= 5 && uniqueDomains.length >= 3 && leaningCount >= 2) {
    coverageConfidence = 'high';
  } else if (articles.length >= 2 || uniqueDomains.length >= 2) {
    coverageConfidence = 'medium';
  } else {
    coverageConfidence = 'low';
  }

  return {
    sourceCount: articles.length,
    uniqueDomains,
    leaningDistribution,
    dateRange,
    coverageConfidence,
  };
}

export function isPersian(text: string): boolean {
  const persianPattern = /[\u0600-\u06FF]/;
  return persianPattern.test(text);
}

async function translateTopic(topic: string): Promise<{ query: string; warnings?: string[] }> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const modelName = process.env.GEMINI_TRANSLATION_MODEL || "gemini-3-flash-preview";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const trimmed = topic.trim();
  const persianInput = isPersian(trimmed);
  const prompt = persianInput
    ? `Optimize this Persian monitoring topic '${trimmed}' into a high-quality search query for finding news articles in Iranian media. Return ONLY the optimized Persian string, no explanations or quotes.`
    : `Translate this monitoring topic '${trimmed}' into a high-quality Persian search query optimized for finding news articles in Iranian media. Return ONLY the Persian string, no explanations or quotes.`;

  const result = await withRetryAsync(() => model.generateContent(prompt));
  const text = result.response.text();
  const validation = validatePersianQuery(text, trimmed);

  if (validation.shouldRegenerate) {
    const strictPrompt = persianInput
      ? `Convert this topic into a SHORT Persian search query (max 100 chars). Topic: "${trimmed}". Return ONLY Persian text, nothing else.`
      : `Translate to a SHORT Persian search query (max 100 chars). Topic: "${trimmed}". Return ONLY Persian text, nothing else.`;
    const retryResult = await withRetryAsync(() => model.generateContent(strictPrompt));
    const retryText = retryResult.response.text();
    const retryValidation = validatePersianQuery(retryText, trimmed);
    const warnings = [...validation.warnings, ...retryValidation.warnings];
    return {
      query: (retryValidation.query || retryText || trimmed).trim(),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  return {
    query: (validation.query || text || trimmed).trim(),
    warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
  };
}

export function computeDateRange(timeRange?: string, customStartDate?: string, customEndDate?: string) {
  let startPublishedDate: string | undefined;
  let endPublishedDate: string | undefined;

  if (timeRange === "custom" && customStartDate && customEndDate) {
    startPublishedDate = new Date(customStartDate).toISOString();
    endPublishedDate = new Date(customEndDate).toISOString();
  } else if (timeRange === "last24h") {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    startPublishedDate = oneDayAgo.toISOString();
  } else if (timeRange === "last30d") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    startPublishedDate = thirtyDaysAgo.toISOString();
  } else {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    startPublishedDate = sevenDaysAgo.toISOString();
  }

  return { startPublishedDate, endPublishedDate };
}

async function searchArticles(query: string, includeDomains: string[], timeRange?: string, customStartDate?: string, customEndDate?: string) {
  const apiKey = requireEnv("EXA_API_KEY");
  const normalizedDomains = includeDomains
    .map((domain) => normalizeHostname(domain))
    .filter((domain) => isValidHostname(domain));
  const uniqueDomains = Array.from(new Set(normalizedDomains));
  const gatedDomains = uniqueDomains.slice(0, MAX_DOMAINS);

  let warning: string | undefined;
  if (uniqueDomains.length > MAX_DOMAINS) {
    warning = `Domain limit reached: only the first ${MAX_DOMAINS} of ${uniqueDomains.length} sources will be searched.`;
  }
  if (gatedDomains.length === 0) {
    return { results: [] as ArticleResult[], warning: "No valid domains provided. Check your media source list." };
  }

  const { startPublishedDate, endPublishedDate } = computeDateRange(timeRange, customStartDate, customEndDate);
  const body = {
    query,
    includeDomains: gatedDomains,
    numResults: MAX_ARTICLES,
    contents: { text: true },
    startPublishedDate,
    endPublishedDate,
  };

  const data = await withRetry<any>(() =>
    fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    })
  );
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
  const gated = mapped.filter((r) => {
    const host = safeHostnameFromUrl(r.url);
    if (!host) return false;
    return selectedDomains.has(host);
  });

  const validated: ArticleResult[] = gated
    .map((article) => {
      const validation = validateArticle(article);
      if (!validation.valid) {
        return null;
      }
      return { ...article, evidenceQuality: validation.evidenceQuality } as ArticleResult;
    })
    .filter((a): a is ArticleResult => a !== null);

  const seen = new Set<string>();
  const deduped = validated.filter((r) => {
    const key = r.url?.trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { results: deduped, warning };
}

async function analyzeArticles(
  topic: string,
  articles: ArticleResult[],
  domainLeanings: Record<string, string>
) {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const modelName = process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-flash-preview";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const getLeaning = (domain: string) => {
    const key = domain.replace(/^www\./, "").toLowerCase();
    return domainLeanings[key] || domainLeanings[domain] || "Unknown";
  };

  const articlesContext = articles
    .map((a, i) => {
      const leaning = getLeaning(a.domain);
      return `Source ${i + 1}\nDomain: ${a.domain}\nLeaning: ${leaning}\nTitle: ${a.title}\nURL: ${a.url}\nContent: ${a.text.substring(0, 2000)}${a.text.length > 2000 ? '...' : ''}`;
    })
    .join("\n\n---\n\n");

  const prompt = `
You are an expert intelligence analyst specializing in Iranian affairs.

TOPIC: ${topic}

TASK:
Read the following Persian articles found on specific Iranian domains.
Produce a concise, decision-oriented intelligence briefing in English using Markdown.

OUTPUT FORMAT (use these exact headings):
## Executive Summary
(2-3 sentences)

## Narratives by Bloc
(Group by leaning when possible: Principlist, State, Reformist, Moderate, Economic. If Unknown, say so.)

## Key Themes
- Bullet points

## Significance
- **Level:** Low / Medium / High
- **Rationale:** 1-3 bullets referencing specific sources (Source 1, Source 2...)

## What to watch next
- Bullet points with concrete follow-up angles

## Sources
- A bullet list: Source N — Title (Domain) — URL

RULES:
- CRITICAL: Every factual statement MUST include a citation like (Source 1) or (Sources 2-3).
- In Executive Summary: Every sentence must cite at least one source.
- In Significance: Every bullet point must cite supporting sources.
- DO NOT make claims without source references.
- If sources disagree, cite both sides: "X claims... (Source 1) while Y argues... (Source 2)".
- Stay objective; do not add facts not supported by the provided text.

DATA:
${articlesContext}
`;

  const result = await withRetryAsync(() => model.generateContent(prompt));
  const text = result.response.text();
  const verifierWarnings: string[] = [];

  const citationPattern = /\(Source[s]?\s*\d+(?:[,\-–—]\s*\d+)*\)/gi;
  const citationMatches = text.match(citationPattern) || [];

  const execSummaryMatch = text.match(/## Executive Summary\n([\s\S]*?)(?=\n##|$)/i);
  const execSummary = execSummaryMatch?.[1] || '';
  const execSummarySentences = execSummary.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const uncitedSentences = execSummarySentences.filter(
    s => s.trim() && !citationPattern.test(s)
  );

  if (uncitedSentences.length > 0) {
    verifierWarnings.push(`${uncitedSentences.length} sentence(s) in Executive Summary may lack citations`);
  }
  if (citationMatches.length === 0 && articles.length > 0) {
    verifierWarnings.push('No source citations found in analysis');
  }

  return {
    summary: text || "Analysis complete, but no text was generated.",
    verifierWarnings: verifierWarnings.length > 0 ? verifierWarnings : undefined,
  };
}

async function runEvaluator(
  topic: string,
  summary: string,
  articles: ArticleResult[]
): Promise<EvaluatorResult | null> {
  if (articles.length < 2) return null;
  const truncatedCount = articles.filter((a) => a.evidenceQuality === "truncated").length;
  if (truncatedCount > Math.floor(articles.length / 2)) return null;

  const selected = articles.slice(0, EVALUATOR_MAX_ARTICLES);
  const apiKey = requireEnv("GEMINI_API_KEY");
  const modelName = process.env.GEMINI_EVALUATOR_MODEL || "gemini-3-flash-preview";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName });

  const articlesContext = selected
    .map((a, i) => {
      return `Source ${i + 1}\nTitle: ${a.title}\nURL: ${a.url}\nContent: ${a.text.substring(0, 1500)}${a.text.length > 1500 ? '...' : ''}`;
    })
    .join("\n\n---\n\n");

  const prompt = `
You are a strict evaluator for an intelligence summary about: ${topic}.
Evaluate citation coverage and faithfulness against the provided sources.

Return ONLY valid JSON with the following shape:
{
  "citationScore": number (1-5),
  "faithfulnessScore": number (1-5),
  "issues": [
    { "claim": string, "issue": string, "severity": "low" | "medium" | "high" }
  ]
}

Summary:
${summary}

Sources:
${articlesContext}
`;

  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), EVALUATOR_TIMEOUT_MS);
  });

  const result = await Promise.race([
    withRetryAsync(() => model.generateContent(prompt)),
    timeout,
  ]);

  if (!result) return null;
  const text = (result as any).response?.text?.() ?? "";
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      citationScore: parsed.citationScore ?? 0,
      faithfulnessScore: parsed.faithfulnessScore ?? 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    };
  } catch {
    return null;
  }
}

export const analyzeReport = inngest.createFunction(
  { id: "analyze-report" },
  { event: "reports/analyze" },
  async ({ event, step }) => {
    const { userId, reportId } = event.data as { userId: string; reportId: string };
    const db = getAdminDb();
    const reportRef = db.collection("users").doc(userId).collection("reports").doc(reportId);

    try {
      const reportSnap = await reportRef.get();
      if (!reportSnap.exists) return { ok: false };
      const report = reportSnap.data() as any;

      await reportRef.update({ status: "running", stage: "Translating...", updatedAt: new Date() });

      let persianQuery = report.persianQuery as string | undefined;
      let queryWarnings: string[] | undefined;

      if (!persianQuery) {
        const translated = await step.run("translate", () => translateTopic(report.topic));
        persianQuery = translated.query;
        queryWarnings = translated.warnings;
        await reportRef.update({
          persianQuery,
          queryWarnings: queryWarnings || null,
          stage: "Searching sources...",
          updatedAt: new Date(),
        });
      } else {
        await reportRef.update({
          stage: "Searching sources...",
          updatedAt: new Date(),
        });
      }

      const { results: articles, warning: searchWarning } = await step.run("search", () =>
        searchArticles(
          persianQuery || report.topic,
          report.domains || [],
          report.timeRange,
          report.customStartDate,
          report.customEndDate
        )
      );

      const coverage = computeCoverageMetadata(articles, report.domainLeanings || {});
      await reportRef.update({
        articleLinks: articles.map((a) => ({
          title: a.title,
          url: a.url,
          domain: a.domain,
          publishedDate: a.publishedDate || null,
          text: a.text || "",
          evidenceQuality: a.evidenceQuality || null,
        })),
        coverage,
        searchWarning: searchWarning || null,
        stage: "Analyzing intelligence...",
        updatedAt: new Date(),
      });

      const analysis = await step.run("analyze", () =>
        analyzeArticles(report.topic, articles, report.domainLeanings || {})
      );

      const consistencyWarnings = buildConsistencyWarnings(analysis.summary, articles);
      const evaluatorResult = await step.run("evaluator", () =>
        runEvaluator(report.topic, analysis.summary, articles)
      );

      await reportRef.update({
        summary: analysis.summary,
        verifierWarnings: analysis.verifierWarnings || null,
        consistencyWarnings: consistencyWarnings.length > 0 ? consistencyWarnings : null,
        evaluatorResult: evaluatorResult || null,
        status: "completed",
        stage: "Complete",
        updatedAt: new Date(),
      });

      return { ok: true };
    } catch (error: any) {
      await reportRef.update({
        status: "failed",
        stage: "Failed",
        error: error?.message || "Unknown error",
        updatedAt: new Date(),
      });
      return { ok: false };
    }
  }
);
