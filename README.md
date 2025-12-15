<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Iranian Media Intelligence (Iran Watcher)

Single-page React dashboard that translates English monitoring topics into Persian queries, searches strictly scoped Iranian domains via Exa, and produces English intel summaries via Gemini.

## Run locally (UI only)

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Start the dev server:
   `npm run dev`

Note: Gemini/Exa calls are now served by Vercel Serverless Functions under `/api/*`. For a full local end-to-end run, use Vercel’s local dev (`vercel dev`).

## Build / Preview

- Build: `npm run build`
- Preview: `npm run preview`

## Deployment (Vercel)

Set these environment variables in Vercel for **Preview** and **Production**:
- `EXA_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_TRANSLATION_MODEL` (optional; default: `gemini-3-pro-preview`)
- `GEMINI_ANALYSIS_MODEL` (optional; default: `gemini-3-pro-preview`)

You can confirm what the server is configured to use by visiting `GET /api/health` after deployment.
