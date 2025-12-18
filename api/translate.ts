import { GoogleGenerativeAI } from "@google/generative-ai";
import { readJson, requireEnv } from "./_shared.js";

export const config = {
  runtime: "edge",
};

type TranslateBody = {
  topic: string;
};

/**
 * Detects if the input text contains Persian characters.
 * Persian uses Unicode range U+0600 to U+06FF (Arabic/Persian script).
 */
function isPersian(text: string): boolean {
  const persianPattern = /[\u0600-\u06FF]/;
  return persianPattern.test(text);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { topic } = await readJson<TranslateBody>(req);
    if (!topic?.trim()) return new Response("Missing topic", { status: 400 });

    const apiKey = requireEnv("GEMINI_API_KEY");
    // Use Gemini 3.0 Flash for fast, efficient translation/optimization
    const modelName = process.env.GEMINI_TRANSLATION_MODEL || "gemini-3-flash-preview";

    const topicTrimmed = topic.trim();
    const isPersianInput = isPersian(topicTrimmed);

    console.log(`[Translate API] Processing topic: "${topicTrimmed}" | Detected language: ${isPersianInput ? 'Persian' : 'English'} | Model: ${modelName}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Adjust prompt based on input language
    const prompt = isPersianInput
      ? `Optimize this Persian monitoring topic '${topicTrimmed}' into a high-quality search query for finding news articles in Iranian media. Return ONLY the optimized Persian string, no explanations or quotes.`
      : `Translate this monitoring topic '${topicTrimmed}' into a high-quality Persian search query optimized for finding news articles in Iranian media. Return ONLY the Persian string, no explanations or quotes.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log(`[Translate API] Result: "${text}"`);

    return Response.json({
      persianQuery: (text || topicTrimmed).trim(),
      modelUsed: modelName,
    });
  } catch (e) {
    console.error("[Translate API] Error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}


