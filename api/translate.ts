import { GoogleGenAI } from "@google/genai";
import { readJson, requireEnv } from "./_shared";

export const config = {
  runtime: "nodejs",
};

type TranslateBody = {
  topic: string;
};

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { topic } = await readJson<TranslateBody>(req);
    if (!topic?.trim()) return new Response("Missing topic", { status: 400 });

    const apiKey = requireEnv("GEMINI_API_KEY");
    const model = process.env.GEMINI_TRANSLATION_MODEL || "gemini-3-pro-preview";

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Translate this monitoring topic '${topic}' into a high-quality Persian search query optimized for finding news articles in Iranian media. Return ONLY the Persian string, no explanations or quotes.`;

    const resp = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return Response.json({
      persianQuery: (resp.text || topic).trim(),
      modelUsed: model,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}


