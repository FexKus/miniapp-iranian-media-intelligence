
# Iranian Media Intelligence

A professional intelligence monitoring dashboard that tracks Iranian media coverage across multiple outlets, automatically translating topics, searching Persian-language sources, and producing comprehensive English analysis reports.

## Overview

This tool enables analysts to monitor Iranian media narratives by:

- Tracking user-defined topics across 17 Iranian news sources
- Automatically translating English topics to Persian (or accepting Persian input directly)
- Searching targeted Iranian domains using AI-powered semantic search
- Analyzing articles by political leaning (Principlist, Reformist, State, Economic, Moderate)
- Generating detailed intelligence briefings in English

## Features

### 🎯 Smart Monitoring

- **Bilingual Input**: Write watchlist topics in English or Persian - automatic detection
- **Pre-Optimized Queries**: Default topics include expert-crafted Persian search queries
- **Flexible Time Ranges**: Monitor last 24 hours, 7 days, 30 days, or custom date ranges
- **Political Leaning Analysis**: Track how different media blocs frame the same issue

### 📊 Intelligence Dashboard

- **3 Sophisticated Default Topics**:
  1. IAEA pressure, enrichment steps, and sanctions snapback risk
  2. Hijab enforcement laws, policing methods, and public pushback
  3. Currency, inflation, and subsidy/price-policy changes
- **One-Click Copy**: Copy full reports with sources for sharing
- **Clickable Source Links**: All URLs are active and open in new tabs
- **Real-Time Status**: Track translation → search → analysis progress

### 🗞️ Media Source Coverage

- **17 Iranian News Outlets** across the political spectrum
- **6-Source Starter Pack** (active by default):
  - Mehr News (Principlist)
  - IRNA (State)
  - Hamshahri (State)
  - Donya-e-Eqtesad (Economic)
  - Shargh (Reformist)
  - Raja News (Principlist)
- **11 Additional Sources** available (activate with one click)

### 🎨 Professional Design

- Light, editorial-inspired interface (think Foreign Affairs journal)
- Clean typography with Crimson Pro serif and Inter sans-serif
- Red accent borders for high contrast and visual clarity
- Responsive layout with fixed sidebar navigation

## Architecture

### Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **Backend**: Vercel Edge Functions (serverless API routes)
- **AI Models**:
  - Translation: Google Gemini 3.0 Flash
  - Analysis: Google Gemini 3.0 Flash
- **Search**: Exa AI (semantic search across Iranian domains)

### Data Flow

```
User Input (English or Persian)
    ↓
Gemini 3.0 Flash Translation/Optimization
    ↓
Persian Search Query
    ↓
Exa AI Search (Iranian domains, 7-day window)
    ↓
Persian Articles (up to 5 per topic)
    ↓
Gemini 3.0 Flash Analysis (2000 chars/article)
    ↓
English Intelligence Report (Markdown)
```

### API Endpoints

#### `POST /api/translate`

- Detects input language (English vs Persian)
- Translates or optimizes query for Exa search
- Returns Persian search query

#### `POST /api/search`

- Searches specified Iranian domains via Exa AI
- Filters to allowed sources only
- Returns article metadata + full text

#### `POST /api/analyze`

- Analyzes Persian articles using Gemini 3.0 Flash
- Groups findings by political leaning
- Produces structured English intelligence briefing

#### `GET /api/health`

- Checks API key configuration
- Reports active model versions

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel account (for deployment)
- Google AI Studio API key
- Exa AI API key

### Local Development

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd MiniApp_iranian-media-intelligence
   ```
2. **Install dependencies**

   ```bash
   npm install
   ```
3. **Create local environment file** (optional, for local testing)

   ```bash
   # .env.local
   GEMINI_API_KEY=your_google_ai_key
   EXA_API_KEY=your_exa_key
   ```
4. **Start development server**

   ```bash
   npm run dev
   # Or for full local API testing:
   vercel dev
   ```
5. **Build for production**

   ```bash
   npm run build
   ```

### Vercel Deployment

1. **Connect your repository to Vercel**

   - Import project from GitHub
   - Select this repository
   - Framework: Vite
2. **Set environment variables** in Vercel dashboard:

   **Required**:

   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com/apikey)
   - `EXA_API_KEY` - Get from [Exa.ai](https://exa.ai)

   **Optional** (have smart defaults):

   - `GEMINI_TRANSLATION_MODEL` - Default: `gemini-3-flash-preview`
   - `GEMINI_ANALYSIS_MODEL` - Default: `gemini-3-flash-preview`
3. **Deploy**

   ```bash
   git push origin main
   # Vercel auto-deploys on push
   ```

## Usage Guide

### Adding Monitoring Objectives

1. Go to **Watchlist** tab
2. Click "Add Objective"
3. Enter:
   - **Topic**: In English or Persian (e.g., "Nuclear negotiations" or "مذاکرات هسته‌ای")
   - **Description**: Context for the analyst
   - **Time Range**: Choose 24 Hours, 7 Days, or Custom
4. Click "Save to Watchlist"

### Running Monitoring

1. Go to **Dashboard** tab
2. Click "Run Monitoring" to analyze all topics
3. Or click "Run Again" on individual topics
4. Wait for analysis (typically 20-30 seconds per topic)

### Managing Sources

1. Go to **Media Sources** tab
2. Toggle sources on/off as needed
3. View descriptions and political leanings
4. Changes apply immediately to next monitoring run

### Copying Reports

1. Click "Copy Report" button on any completed analysis
2. Report is copied to clipboard in plain text format
3. Includes topic, full summary, and all source URLs
4. Paste into emails, documents, or other tools

## Analysis Output Format

Each intelligence report includes:

- **Executive Summary**: 2-3 sentence overview
- **Narratives by Bloc**: Coverage grouped by political leaning
- **Key Themes**: Bullet-pointed analysis
- **Significance**: Level (Low/Medium/High) with rationale
- **What to Watch Next**: Follow-up angles and emerging issues
- **Sources**: Complete list with titles, domains, and URLs

## Performance & Optimization

### Quality Settings (V2 - Vercel Pro)

- **Articles per Topic**: 5 articles (optimized for 60s timeout)
- **Article Content**: 2,000 characters per article (reliability optimized)
- **Search Window**: 7-day default (customizable)
- **AI Model**: Gemini 3.0 Flash
- **Timeout**: 60 seconds (Vercel Pro maxDuration)
- **Evaluator Agent**: Currently disabled (planned for V3 with background processing)

### Speed Expectations

- Translation: ~2-3 seconds
- Search: ~3-5 seconds
- Analysis (5 articles): ~20-30 seconds
- **Total per topic**: ~25-40 seconds

### V2 Quality Features

- **Coverage Metadata**: Source count, leaning distribution, confidence indicators
- **Citation Enforcement**: All claims must cite sources (Source 1, Source 2...)
- **Evidence Quality Tags**: Articles tagged as full/short-text/truncated
- **Query Validation**: Persian script detection, auto-retry on failures
- **Consistency Warnings**: Flags potential ungrounded claims

## Supported Media Sources

### Principlist (Hardline Conservative)

- Kayhan, Raja News, Mehr News, Resalat, Afkar News

### State-Aligned

- IRNA, Iran Newspaper, Jame Jam, Hamshahri, Nour News

### Reformist

- Shargh, Etemad, Aftab Yazd, Arman Meli, Hammihan

### Economic

- Donya-e-Eqtesad

### Moderate

- Ettelaat

## Technical Details

### Project Structure

```
├── api/                    # Vercel Edge Functions
│   ├── translate.ts        # English→Persian translation
│   ├── search.ts           # Exa AI search integration
│   ├── analyze.ts          # Gemini analysis engine
│   ├── health.ts           # System health check
│   └── _shared.ts          # Shared utilities
├── inngest/                # Background jobs (V3)
│   ├── client.ts           # Inngest client
│   └── functions/          # Inngest functions
├── lib/                    # Firebase helpers
│   ├── firebase.ts         # Client SDK init
│   ├── firebaseAdmin.ts    # Admin SDK init
│   └── firestore.ts        # Firestore CRUD
├── legacy/                 # Archived V2 client pipeline
│   └── services/           # Legacy services
├── components/             # React components
│   ├── Dashboard.tsx       # Main intelligence dashboard
│   ├── Watchlist.tsx       # Topic management
│   ├── Sources.tsx         # Media source configuration
│   └── Sidebar.tsx         # Navigation
├── contexts/               # Auth context
├── hooks/                  # Auth hooks
├── types.ts                # TypeScript interfaces
├── constants.ts            # Default data
└── index.css              # Global styles
```

### Key Technologies

- **React 19**: Latest stable release
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tooling
- **React Markdown**: Safe markdown rendering
- **Lucide React**: Beautiful icons

### Security Features

- **Environment variables** for API keys (never exposed to client)
- **Domain allowlist**: Only approved Iranian sources searchable
- **Sanitized markdown**: Safe rendering of AI-generated content
- **CORS-safe**: API routes properly configured

## Troubleshooting

### No Articles Found

- **Expand time range**: Try 7 days or 30 days instead of 24 hours
- **Activate more sources**: Enable additional media outlets in Sources tab
- **Broaden query**: Use more general keywords in Persian query
- **Check Exa quota**: Verify API key has remaining credits

### Analysis Timeout

- V2 optimized for Vercel Pro with 60s timeout
- Using Gemini 3.0 Flash for maximum speed
- Analyzing 2,000 chars per article (reliability optimized)
- 5 articles per topic with current settings
- If still timing out: Check Vercel logs for API errors

### Translation Issues

- Verify `GEMINI_API_KEY` is set correctly in Vercel
- Check API key permissions in Google AI Studio
- View logs in Vercel dashboard for detailed errors

### Module Import Errors

- Ensure all imports use `.js` extensions (e.g., `import { x } from "./file.js"`)
- Required for Vercel Edge runtime ES module compatibility

## API Keys & Setup

### Google AI Studio (Gemini)

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create new API key
3. Copy key (starts with `AIza...`)
4. Add to Vercel as `GEMINI_API_KEY`

### Exa AI

1. Sign up at [Exa.ai](https://exa.ai)
2. Navigate to API settings
3. Generate API key
4. Add to Vercel as `EXA_API_KEY`

## Version History

### V2 (January 2026) - Current

**Deployed at**: https://iranian-media-intelligence-v2.vercel.app/

- ✅ All P0 items: Dynamic sources, secret protection, thin coverage signaling
- ✅ All P1 items: Citations, evidence bundle UX, query validation, resilience
- ✅ P2.10: Soft consistency warnings (entity grounding)
- ⏸️ P2.11: Evaluator agent disabled (moved to V3)
- 🔧 Optimized for Vercel Pro: 5 articles, 2000 chars, 60s timeout

### V3 (Planned)

- Firebase Firestore for persistent storage (data survives page refresh)
- Inngest for background jobs (15+ min runtime)
- Re-enable evaluator agent with constraints
- Scale to 20-40 articles per topic
- User authentication and multi-tenant support

See [FIREBASE_INTEGRATION_PLAN.md](./FIREBASE_INTEGRATION_PLAN.md) for detailed V3 roadmap.

## Current Architecture (V2)

### Edge Function Constraints

V2 runs on Vercel Edge Functions with:

- **Timeout**: 60 seconds (Vercel Pro)
- **Article Limit**: 5 articles per topic
- **Content**: 2,000 chars per article
- **Evaluator**: Disabled (requires background processing)

### V3 Architecture (Planned)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────►│ Edge Function│────►│   Firebase   │
│   (React)    │◄────│  (instant)   │     │  Firestore   │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                     ▲
                            ▼                     │
                     ┌──────────────┐             │
                     │   Inngest    │─────────────┘
                     │ (Background) │  Stores results
                     │  15+ min OK  │
                     └──────────────┘
```

V3 will enable:
- Data persistence (watchlists, sources, reports survive page refresh)
- Background processing (no timeout pressure)
- Evaluator agent (quality scoring)
- Scale to 20-40 articles per topic

## Contributing

This is a personal intelligence tool. For issues or suggestions:

1. Check existing issues
2. Provide detailed reproduction steps
3. Include error logs from Vercel dashboard

## License

Private use only. Not licensed for redistribution.

## Acknowledgments

- **Google Gemini 3.0**: Translation and intelligence analysis
- **Exa AI**: Semantic search across Iranian media
- **Vercel**: Serverless deployment platform
- **Iranian Media Outlets**: For providing publicly accessible news coverage

---

**Built with Claude Code** • Last updated: January 2026 • **V2 Live**: https://iranian-media-intelligence-v2.vercel.app/
