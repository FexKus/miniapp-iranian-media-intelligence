import { GoogleGenAI } from "@google/genai";
import { ArticleResult } from "../types";
import { readJson, requireEnv } from "./_shared";

export const config = {
  runtime: "nodejs",
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
    const model = process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-pro-preview";

    const { topic, articles, domainLeanings } = await readJson<AnalyzeBody>(req);
    if (!topic?.trim()) return new Response("Missing topic", { status: 400 });
    if (!Array.isArray(articles) || articles.length === 0) {
      return Response.json({ summary: "No relevant articles were found for this topic within the selected sources.", modelUsed: model });
    }

    const ai = new GoogleGenAI({ apiKey });

    const getLeaning = (domain: string) => {
      if (!domainLeanings) return "Unknown";
      const key = domain.replace(/^www\./, "").toLowerCase();
      return domainLeanings[key] || domainLeanings[domain] || "Unknown";
    };

    const articlesContext = articles
      .map((a, i) => {
        const leaning = getLeaning(a.domain);
        return `Source ${i + 1}\nDomain: ${a.domain}\nLeaning: ${leaning}\nTitle: ${a.title}\nURL: ${a.url}\nContent (truncated): ${a.text.substring(0, 3000)}...`;
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
- Stay objective; do not add facts not supported by the provided text.
- When making a claim, reference sources like (Source 1) or (Sources 2-3).
- If the articles disagree, explicitly describe the disagreement.

DATA:
${articlesContext}
`;

    const resp = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return Response.json({
      summary: resp.text || "Analysis complete, but no text was generated.",
      modelUsed: model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}


