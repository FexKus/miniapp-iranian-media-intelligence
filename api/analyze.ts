import { GoogleGenerativeAI } from "@google/generative-ai";
import { ArticleResult } from "../types.js";
import { buildConsistencyWarnings, readJson, requireEnv, withRetryAsync } from "./_shared.js";

export const config = {
  runtime: "edge",
  maxDuration: 60, // Allow up to 60 seconds for thorough analysis
};

type AnalyzeBody = {
  topic: string;
  articles: ArticleResult[];
  domainLeanings?: Record<string, string>;
};

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const apiKey = requireEnv("GEMINI_API_KEY");
    // Use Gemini 3.0 Flash for fast, high-quality intelligence analysis
    const modelName = process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-flash-preview";

    const { topic, articles, domainLeanings } = await readJson<AnalyzeBody>(req);
    if (!topic?.trim()) return new Response("Missing topic", { status: 400 });
    if (!Array.isArray(articles) || articles.length === 0) {
      return Response.json({ summary: "No relevant articles were found for this topic within the selected sources.", modelUsed: modelName });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const getLeaning = (domain: string) => {
      if (!domainLeanings) return "Unknown";
      const key = domain.replace(/^www\./, "").toLowerCase();
      return domainLeanings[key] || domainLeanings[domain] || "Unknown";
    };

    const articlesContext = articles
      .map((a, i) => {
        const leaning = getLeaning(a.domain);
        // Reduced to 2000 chars for reliable Edge Function completion
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
    const response = result.response;
    const text = response.text();

    // P1.4: Citation verification
    const verifierWarnings: string[] = [];

    // Check for citation presence
    const citationPattern = /\(Source[s]?\s*\d+(?:[,\-–—]\s*\d+)*\)/gi;
    const citationMatches = text.match(citationPattern) || [];

    // Extract Executive Summary and check for uncited sentences
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

    // P2.10: Soft consistency warnings (entity grounding)
    const consistencyWarnings = buildConsistencyWarnings(text, articles);

    // P2.11: Evaluator agent - DISABLED for Edge Function reliability
    // Will be re-enabled with Firebase + Inngest background processing
    const evaluatorResult = undefined;

    return Response.json({
      summary: text || "Analysis complete, but no text was generated.",
      modelUsed: modelName,
      citationCount: citationMatches.length,
      verifierWarnings: verifierWarnings.length > 0 ? verifierWarnings : undefined,
      consistencyWarnings: consistencyWarnings.length > 0 ? consistencyWarnings : undefined,
      evaluatorResult,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}


