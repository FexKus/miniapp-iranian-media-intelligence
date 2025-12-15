import { requireEnv } from "./_shared";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

    // Only validate presence; do not leak values.
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    const hasExaKey = !!process.env.EXA_API_KEY;

    // If present but empty, requireEnv will throw.
    if (hasGeminiKey) requireEnv("GEMINI_API_KEY");
    if (hasExaKey) requireEnv("EXA_API_KEY");

    return Response.json({
      ok: true,
      hasGeminiKey,
      hasExaKey,
      geminiTranslationModel: process.env.GEMINI_TRANSLATION_MODEL || "gemini-3-pro-preview",
      geminiAnalysisModel: process.env.GEMINI_ANALYSIS_MODEL || "gemini-3-pro-preview",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}


