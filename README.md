# Iranian Media Intelligence

A professional intelligence monitoring dashboard that tracks Iranian media coverage across multiple outlets, automatically translating topics, searching Persian-language sources, and producing comprehensive English analysis reports.

**Version 3** - Firebase + Inngest architecture with persistent storage, user authentication, and background processing.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (frontend only)
npm run dev

# Start Inngest dev server (in separate terminal)
npx inngest-cli@latest dev
```

Then open `http://localhost:5173/` (use `localhost`, not `127.0.0.1` for Google Sign-in).

## Overview

This tool enables analysts to monitor Iranian media narratives by:

- **Tracking user-defined topics** across configurable Iranian news sources
- **Automatically translating** English topics to Persian (or accepting Persian input directly)
- **Searching targeted Iranian domains** using AI-powered semantic search
- **Analyzing articles by political leaning** (Principlist, Reformist, State, Economic, Moderate)
- **Generating detailed intelligence briefings** in English with citations

## Features

### User Authentication
- **Google Sign-in**: One-click authentication via Google
- **Email/Password**: Traditional authentication option
- **User-scoped data**: Each user has their own watchlist, sources, and reports

### Smart Monitoring
- **Bilingual Input**: Write watchlist topics in English or Persian - automatic detection
- **Pre-Optimized Queries**: Default topics include expert-crafted Persian search queries
- **Flexible Time Ranges**: Monitor last 24 hours, 7 days, 30 days, or custom date ranges
- **Political Leaning Analysis**: Track how different media blocs frame the same issue

### Intelligence Dashboard
- **Real-time Updates**: Reports stream in as analysis completes via Firestore subscriptions
- **One-Click Copy**: Copy full reports with sources for sharing
- **Clickable Source Links**: All URLs open in new tabs
- **Save/Archive**: Mark important reports as saved for later reference

### Media Source Management
- **17 Iranian News Outlets** across the political spectrum
- **6-Source Starter Pack** (active by default)
- **Add Custom Sources**: Define new domains with political leaning metadata
- **Toggle Sources**: Enable/disable sources for each monitoring run

### Professional Design
- **Dark Theme**: Modern dark interface optimized for extended use
- **Clean Typography**: Professional editorial styling
- **Responsive Layout**: Works on desktop and tablet
- **Toast Notifications**: User feedback for all actions

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript + Vite | Single-page application |
| **Styling** | Tailwind CSS + shadcn/ui | Component library |
| **Auth** | Firebase Authentication | Google + Email/Password |
| **Database** | Cloud Firestore | User data persistence |
| **Background Jobs** | Inngest | Long-running analysis tasks |
| **AI Translation** | Google Gemini 3.0 Flash | English → Persian |
| **AI Analysis** | Google Gemini 3.0 Flash | Article analysis |
| **Search** | Exa AI | Iranian domain search |
| **Hosting** | Vercel | Edge Functions + Static |

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    React Frontend                        │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │    │
│  │  │Dashboard │  │Watchlist │  │ Sources  │              │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │    │
│  │       │             │             │                      │    │
│  │       └─────────────┼─────────────┘                      │    │
│  │                     ▼                                    │    │
│  │           ┌─────────────────┐                           │    │
│  │           │  AuthContext    │ ◄── Firebase Auth         │    │
│  │           │  + App.tsx      │                           │    │
│  │           └────────┬────────┘                           │    │
│  │                    │                                     │    │
│  │                    ▼                                     │    │
│  │           ┌─────────────────┐                           │    │
│  │           │   Firestore     │ ◄── Real-time Listeners   │    │
│  │           │   Subscriptions │                           │    │
│  │           └─────────────────┘                           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE                                 │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │/api/reports/create│  │ /api/search  │  │ /api/inngest │      │
│  │ (triggers Inngest)│  │  (Exa AI)    │  │  (webhook)   │      │
│  └────────┬─────────┘  └──────────────┘  └──────────────┘      │
│           │                                                      │
│           │ Trigger event: "reports/analyze"                     │
│           ▼                                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      INNGEST CLOUD                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               analyzeReport Function                       │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │
│  │  │ Search   │─►│ Analyze  │─►│ Evaluate │─►│  Write   │  │   │
│  │  │ (Exa)    │  │ (Gemini) │  │ (Gemini) │  │(Firestore)│  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Writes results
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SERVICES                             │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │  Firebase Auth       │    │   Cloud Firestore    │          │
│  │  - Google Sign-in    │    │   users/{uid}/       │          │
│  │  - Email/Password    │    │     ├── watchlist/   │          │
│  │                      │    │     ├── sources/     │          │
│  │                      │    │     └── reports/     │          │
│  └──────────────────────┘    └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User authenticates** → Firebase Auth issues JWT
2. **User clicks "Run Monitoring"** → Frontend calls `POST /api/reports/create`
3. **API creates report stub** → Writes to Firestore with status "pending"
4. **API triggers Inngest** → Sends `reports/analyze` event
5. **Inngest processes in background**:
   - Searches Iranian domains (Exa AI)
   - Analyzes articles (Gemini)
   - Runs evaluator agent
   - Writes results to Firestore
6. **Frontend receives update** → Firestore real-time subscription updates UI

### Firestore Data Model

```
users/{userId}/
├── watchlist/{topicId}
│   ├── topic: string
│   ├── description: string
│   ├── persianQuery?: string
│   ├── timeRange: "last24h" | "last7d" | "last30d" | "custom"
│   ├── customStartDate?: string
│   ├── customEndDate?: string
│   └── createdAt: timestamp
│
├── sources/{sourceId}
│   ├── name: string
│   ├── domain: string
│   ├── leaning: "State" | "Principlist" | "Reformist" | "Moderate" | "Economic"
│   ├── description?: string
│   ├── active: boolean
│   └── createdAt: timestamp
│
└── reports/{reportId}
    ├── watchlistItemId: string
    ├── topic: string
    ├── status: "pending" | "running" | "completed" | "failed"
    ├── stage: string (e.g., "Searching...", "Analyzing...")
    ├── persianQuery?: string
    ├── domains: string[]
    ├── domainLeanings: Record<string, string>
    ├── summary?: string (markdown)
    ├── articleLinks?: ArticleResult[]
    ├── coverage?: CoverageMetadata
    ├── evaluatorResult?: EvaluatorResult
    ├── verifierWarnings?: string[]
    ├── consistencyWarnings?: string[]
    ├── error?: string
    ├── saved: boolean
    ├── createdAt: timestamp
    ├── updatedAt: timestamp
    └── expiresAt?: timestamp (TTL for unsaved reports)
```

## Environment Variables

### Required (Server-side)

| Variable | Description | Get from |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google AI translation/analysis | [Google AI Studio](https://aistudio.google.com/apikey) |
| `EXA_API_KEY` | Iranian domain search | [Exa.ai](https://exa.ai) |
| `INNGEST_EVENT_KEY` | Inngest event authentication | [Inngest Dashboard](https://app.inngest.com) |
| `INNGEST_SIGNING_KEY` | Inngest webhook verification | Inngest Dashboard |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase Console → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Service account private key (with `\n` newlines) | Firebase Console → Service Accounts |

### Frontend (Public - VITE_ prefix)

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_TRANSLATION_MODEL` | `gemini-3-flash-preview` | Translation model |
| `GEMINI_ANALYSIS_MODEL` | `gemini-3-flash-preview` | Analysis model |

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm
- Firebase project with Auth + Firestore enabled
- Vercel account (for deployment)
- Inngest account (for background jobs)
- Google AI Studio API key
- Exa AI API key

### Local Development Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd MiniApp_iranian-media-intelligence
   npm install
   ```

2. **Create `.env.local`** with all required variables (see Environment Variables section)

3. **Configure Firebase**
   - Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Google + Email/Password providers)
   - Create Firestore database
   - Add `localhost` to authorized domains in Auth settings
   - Download service account key JSON
   - Extract these values for your `.env.local`:
     - `FIREBASE_PROJECT_ID` - from `project_id`
     - `FIREBASE_CLIENT_EMAIL` - from `client_email`
     - `FIREBASE_PRIVATE_KEY` - from `private_key` (include the full key with `\n` characters)

4. **Configure Firestore Security Rules**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

5. **Start development**
   ```bash
   # Terminal 1: Inngest dev server
   npx inngest-cli@latest dev

   # Terminal 2: Vite dev server
   npm run dev
   ```

6. **Open app** at `http://localhost:5173/` (must use `localhost` for Google Sign-in)

### Vercel Deployment

1. **Connect repository** to Vercel
2. **Set all environment variables** in Vercel dashboard
3. **Configure Inngest**:
   - Add Vercel integration in Inngest dashboard
   - Or manually set webhook URL to `https://your-domain.vercel.app/api/inngest`
4. **Deploy**: `git push origin main`

## Usage Guide

### First-Time Setup

1. Sign in with Google or create email/password account
2. Default watchlist topics and media sources are automatically created
3. Navigate using the sidebar: Dashboard, Watchlist, Media Sources

### Managing Watchlist Topics

1. Go to **Watchlist** tab
2. Click **"Add Objective"** to create new topic
3. Enter:
   - **Topic**: In English or Persian
   - **Description**: Context for the analyst
   - **Time Range**: 24 Hours, 7 Days, 30 Days, or Custom
4. Click **"Save"**
5. Edit existing topics by clicking the edit icon
6. Delete topics by hovering and clicking delete

### Running Analysis

1. Go to **Dashboard** tab
2. Click **"Run Monitoring"** to analyze all topics
3. Or click **"Rerun"** on individual reports
4. Watch real-time status updates: Pending → Running → Completed
5. Reports appear as Markdown with citations

### Managing Media Sources

1. Go to **Media Sources** tab
2. **Toggle sources**: Click card or shield icon to enable/disable
3. **Add source**: Click "Add Source", fill in name/domain/leaning
4. **Delete source**: Expand card and click delete
5. Only active sources are searched during monitoring

### Working with Reports

- **Copy**: Click "Copy Report" to copy full markdown with sources
- **Save**: Toggle star icon to mark as saved (persists across sessions)
- **Delete**: Remove report from history
- **View Sources**: Each report includes clickable source URLs

## Current Limits

| Parameter | Value | Notes |
|-----------|-------|-------|
| Max Domains | 50 | Active sources searched per run |
| Max Articles | 20 | Total articles fetched per topic |
| Evaluator Max Articles | 15 | Articles sent to evaluator |
| Content per Article | 2,000 chars | Truncated for reliability |
| Background Job Timeout | 15+ min | Via Inngest |

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

## Analysis Output Format

Each intelligence report includes:

- **Executive Summary**: 2-3 sentence overview
- **Narratives by Bloc**: Coverage grouped by political leaning
- **Key Themes**: Bullet-pointed analysis with citations
- **Significance**: Level (Low/Medium/High) with rationale
- **What to Watch Next**: Follow-up angles and emerging issues
- **Sources**: Complete list with titles, domains, and URLs

## Project Structure

```
├── api/                        # Vercel Edge Functions
│   ├── reports/
│   │   └── create.ts           # Creates report + triggers Inngest
│   ├── search.ts               # Exa AI search integration
│   ├── inngest.ts              # Inngest webhook endpoint
│   ├── health.ts               # System health check
│   └── _shared.ts              # Shared utilities
│
├── inngest/                    # Background job processing
│   ├── client.ts               # Inngest client configuration
│   └── functions/
│       └── analyzeReport.ts    # Main analysis pipeline
│
├── lib/                        # Firebase utilities
│   ├── firebase.ts             # Client SDK initialization
│   ├── firebaseAdmin.ts        # Admin SDK initialization
│   └── firestore.ts            # Firestore CRUD operations
│
├── components/                 # React components
│   ├── Dashboard.tsx           # Main intelligence dashboard
│   ├── Watchlist.tsx           # Topic management
│   ├── Sources.tsx             # Media source configuration
│   ├── AppSidebar.tsx          # Navigation sidebar
│   ├── AuthGate.tsx            # Login/signup forms
│   ├── ErrorBoundary.tsx       # Error handling wrapper
│   └── ui/                     # shadcn/ui components
│
├── contexts/
│   └── AuthContext.tsx         # Firebase Auth provider
│
├── hooks/
│   └── useAuth.ts              # Auth hook
│
├── types.ts                    # TypeScript interfaces
├── constants.ts                # Default topics and sources
├── App.tsx                     # Main app with Firestore subscriptions
└── index.tsx                   # React entry point
```

## Troubleshooting

### Google Sign-in Not Working

- Use `http://localhost:5173/` not `http://127.0.0.1:5173/`
- Ensure `localhost` is in Firebase Auth authorized domains
- Check browser console for specific errors

### Source Toggle Not Working

- Verify Firestore security rules allow authenticated writes
- Check browser DevTools Network tab for failed requests
- Ensure user is properly authenticated

### Analysis Not Completing

- Check Inngest dashboard for job status
- Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set
- Check Vercel function logs for errors
- Verify `FIREBASE_PRIVATE_KEY` includes proper newlines

### No Articles Found

- Expand time range (try 30 days)
- Activate more sources in Media Sources tab
- Verify Exa API key has remaining credits
- Check that domains are accessible

### Form Data Lost on Error

- This is expected behavior - form clears only on success
- Errors show toast notification
- Re-enter data and retry

## Deferred Features

Features designed but not yet implemented:

- **Scheduled Monitoring**: Automatic daily/weekly runs
- **Email Digests**: Scheduled report delivery
- **Collaboration**: Shared watchlists across team
- **Export**: PDF/CSV export of reports
- **Analytics**: Historical trend analysis

## Version History

### V3 (February 2026) - Current

- Firebase Authentication (Google + Email/Password)
- Cloud Firestore for persistent user data
- Inngest background processing (no timeout limits)
- Real-time UI updates via Firestore subscriptions
- Evaluator agent enabled
- Toast notification system
- Increased limits: 50 domains, 20 articles, 15 for evaluator

### V2 (January 2026)

- Vercel Edge Functions only
- In-memory state (lost on refresh)
- 60s timeout constraint
- 5 articles per topic limit

### V1 (December 2025)

- Initial prototype
- Single API endpoint
- Basic UI

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive technical documentation for AI assistants and developers
- **[MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md)** - Manual testing procedures

## License

Private use only. Not licensed for redistribution.

## Acknowledgments

- **Google Gemini 3.0**: Translation and intelligence analysis
- **Exa AI**: Semantic search across Iranian media
- **Firebase**: Authentication and database
- **Inngest**: Background job processing
- **Vercel**: Serverless deployment platform

---

**Built with Claude Code** • Last updated: February 2026 • **V3**
