# Iranian Media Intelligence Platform - Architecture Documentation

**Version 3 (V3) - February 2026**

> This document provides everything an AI assistant needs to understand, maintain, and extend this codebase.

---

## Executive Summary

The Iranian Media Intelligence Platform is a professional monitoring tool that tracks Iranian media coverage across multiple outlets. It automatically translates topics to Persian, searches Persian-language sources, and produces comprehensive English intelligence reports.

**Current Status:** V3 is live with Firebase + Inngest integration, providing persistent storage and background processing.

---

## 1. Technology Stack

### Frontend

| Technology   | Purpose             |
| ------------ | ------------------- |
| React 19     | UI framework        |
| TypeScript   | Type safety         |
| Vite         | Build tool          |
| Tailwind CSS | Styling             |
| shadcn/ui    | Component library   |
| Sonner       | Toast notifications |
| Lucide React | Icons               |

### Backend

| Technology               | Purpose                                       |
| ------------------------ | --------------------------------------------- |
| Vercel Node.js Functions | API routes (`runtime: "nodejs"`)            |
| Inngest                  | Background job processing (15+ min runtime)   |
| Firebase Auth            | User authentication (Google + Email/Password) |
| Cloud Firestore          | NoSQL database for persistent storage         |
| Firebase Admin SDK       | Server-side Firestore access                  |

**Important:** API routes use `VercelRequest`/`VercelResponse` (Node.js style), NOT Web API `Request`/`Response`.

### External APIs

| Service                 | Purpose                                |
| ----------------------- | -------------------------------------- |
| Google Gemini 3.0 Flash | Translation & analysis                 |
| Exa AI                  | Semantic search across Iranian domains |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Dashboard  │  │  Watchlist  │  │   Sources   │  │   Reports   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │                │            │
│         └────────────────┴────────────────┴────────────────┘            │
│                                   │                                      │
│                          Firebase SDK (Real-time)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FIREBASE                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Cloud Firestore                             │   │
│  │  users/{userId}/                                                 │   │
│  │  ├── watchlist/{itemId}   ← User's monitoring topics            │   │
│  │  ├── sources/{sourceId}   ← User's media source config          │   │
│  │  └── reports/{reportId}   ← Generated intelligence reports      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Firebase Auth                               │   │
│  │  Google Sign-in (primary) + Email/Password (fallback)           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE FUNCTIONS                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ /api/search │  │/api/reports │  │ /api/inngest│  │ /api/health │    │
│  │             │  │  /create    │  │  (webhook)  │  │             │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            INNGEST                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              analyzeReport (Background Function)                 │   │
│  │  1. Search Exa API for Persian articles (up to 20)              │   │
│  │  2. Analyze with Gemini (up to 15 articles)                     │   │
│  │  3. Run evaluator agent (citation + faithfulness)               │   │
│  │  4. Write results to Firestore                                  │   │
│  │  Runtime: 15+ minutes OK (no Edge timeout)                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL APIS                                    │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐      │
│  │         Exa AI              │  │      Google Gemini          │      │
│  │  Semantic search across     │  │  Translation (topic→Persian)│      │
│  │  Iranian media domains      │  │  Analysis (articles→report) │      │
│  │  Up to 50 domains/query     │  │  Evaluator (quality check)  │      │
│  │  Up to 50 results/query     │  │                             │      │
│  └─────────────────────────────┘  └─────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### Running Monitoring

```
1. User clicks "Run Monitoring" on Dashboard
2. Frontend generates idempotency key (prevents duplicate jobs)
3. POST /api/reports/create with topic, domains, timeRange
4. Edge Function:
   a. Checks idempotency (returns existing report if duplicate)
   b. Creates report stub in Firestore (status: 'pending')
   c. Triggers Inngest event
   d. Returns { reportId, status: 'pending' }
5. Frontend subscribes to Firestore report doc (real-time updates)
6. Inngest background function:
   a. Updates status='running', stage='Searching...'
   b. Calls Exa API for articles
   c. Updates stage='Analyzing...'
   d. Calls Gemini for analysis
   e. Updates stage='Evaluating...'
   f. Runs evaluator agent
   g. Updates report with results, status='completed'
7. Frontend sees real-time updates, displays completed report
```

---

## 4. Project Structure

```
MiniApp_iranian-media-intelligence/
├── api/                          # Vercel Edge Functions
│   ├── _shared.ts                # Shared utilities (validation, retry, etc.)
│   ├── health.ts                 # Health check endpoint
│   ├── inngest.ts                # Inngest webhook handler
│   ├── reports/
│   │   └── create.ts             # Create report + trigger Inngest
│   └── search.ts                 # Direct Exa search (legacy, used by Inngest)
│
├── inngest/                      # Background job infrastructure
│   ├── client.ts                 # Inngest client instance
│   └── functions/
│       └── analyzeReport.ts      # Main analysis background function
│
├── lib/                          # Firebase integration
│   ├── firebase.ts               # Client SDK initialization
│   ├── firebaseAdmin.ts          # Admin SDK for server-side
│   ├── firestore.ts              # Firestore CRUD helpers
│   └── utils.ts                  # Utility functions (cn, etc.)
│
├── components/                   # React UI components
│   ├── ui/                       # shadcn/ui primitives
│   ├── AppSidebar.tsx            # Navigation sidebar
│   ├── AuthGate.tsx              # Login UI
│   ├── Dashboard.tsx             # Main monitoring dashboard
│   ├── ErrorBoundary.tsx         # Error handling wrapper
│   ├── SavedReports.tsx          # Saved reports view
│   ├── Settings.tsx              # User settings
│   ├── Sources.tsx               # Media source configuration
│   └── Watchlist.tsx             # Topic management
│
├── contexts/
│   └── AuthContext.tsx           # Firebase Auth state management
│
├── hooks/
│   └── useAuth.ts                # Auth hook
│
├── legacy/                       # Archived V2 code (for reference)
│   └── services/
│       └── monitoringEngine.ts   # Old client-side pipeline
│
├── types.ts                      # TypeScript interfaces
├── constants.ts                  # Default sources, watchlist items
├── App.tsx                       # Main app component
├── index.tsx                     # React entry point
└── index.css                     # Global styles (Tailwind + custom)
```

---

## 5. Key Files Reference

### Configuration

| File                   | Purpose                     |
| ---------------------- | --------------------------- |
| `.env.local`         | Local environment variables |
| `vite.config.ts`     | Vite build configuration    |
| `vercel.json`        | Vercel deployment config    |
| `tailwind.config.js` | Tailwind CSS config         |
| `tsconfig.json`      | TypeScript config           |

### Core Logic

| File                                   | Purpose                                                      |
| -------------------------------------- | ------------------------------------------------------------ |
| `inngest/functions/analyzeReport.ts` | **Main analysis pipeline** - search, analyze, evaluate |
| `api/reports/create.ts`              | Creates report stub, triggers Inngest                        |
| `api/_shared.ts`                     | Validation, retry logic, utilities                           |
| `lib/firestore.ts`                   | All Firestore CRUD operations                                |

### UI Components

| File                         | Purpose                           |
| ---------------------------- | --------------------------------- |
| `App.tsx`                  | Main app state, routing, handlers |
| `components/Dashboard.tsx` | Displays reports, run monitoring  |
| `components/Watchlist.tsx` | Add/edit/delete topics            |
| `components/Sources.tsx`   | Toggle media sources on/off       |

---

## 6. Environment Variables

### CRITICAL: Two Sets of Firebase Variables Required

Firebase needs **both** client-side AND server-side variables. Missing either causes different failures:

| Prefix     | When Injected | Used By                         | If Missing                                       |
| ---------- | ------------- | ------------------------------- | ------------------------------------------------ |
| `VITE_*` | Build time    | Browser (Firebase JS SDK)       | Firestore shows `projects/undefined/databases` |
| No prefix  | Runtime       | API routes (Firebase Admin SDK) | "Missing FIREBASE\_PROJECT\_ID" error            |

**After changing `VITE_*` variables, you MUST redeploy with cache cleared!**

### Client-side (VITE\_ prefix - baked into build)

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=           # MUST have VITE_ prefix!
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Server-side (no prefix - runtime only)

```env
# External APIs
GEMINI_API_KEY=           # Google AI Studio
EXA_API_KEY=              # Exa.ai

# Firebase Admin SDK (three separate vars, NOT base64 encoded)
FIREBASE_PROJECT_ID=      # Same value as VITE_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=    # From service account JSON: client_email
FIREBASE_PRIVATE_KEY=     # From service account JSON: private_key (include \n chars)

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

---

## 7. Firestore Data Model

```
firestore/
└── users/{userId}/
    ├── watchlist/{itemId}
    │   ├── topic: string
    │   ├── description: string
    │   ├── persianQuery?: string
    │   ├── timeRange: 'last24h' | 'last7d' | 'last30d' | 'custom'
    │   ├── customStartDate?: string
    │   ├── customEndDate?: string
    │   └── createdAt: timestamp
    │
    ├── sources/{sourceId}
    │   ├── domain: string
    │   ├── name: string
    │   ├── leaning: 'Principlist' | 'Reformist' | 'State' | 'Economic' | 'Moderate'
    │   ├── active: boolean
    │   ├── description?: string
    │   └── createdAt: timestamp
    │
    └── reports/{reportId}
        ├── watchlistItemId: string
        ├── topic: string
        ├── status: 'pending' | 'running' | 'completed' | 'failed'
        ├── stage: string (e.g., "Queued", "Searching...", "Analyzing...")
        ├── persianQuery?: string
        ├── domains: string[]
        ├── domainLeanings: Record<string, string>
        ├── timeRange: string
        ├── customStartDate?: string
        ├── customEndDate?: string
        ├── idempotencyKey: string
        ├── summary?: string (markdown)
        ├── articleLinks?: ArticleResult[]
        ├── coverage?: CoverageMetadata
        ├── evaluatorResult?: EvaluatorResult
        ├── verifierWarnings?: string[]
        ├── consistencyWarnings?: string[]
        ├── saved: boolean
        ├── expiresAt?: timestamp (TTL - auto-delete if unsaved)
        ├── createdAt: timestamp
        └── updatedAt: timestamp
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 8. Current Limits & Configuration

| Setting                  | Value | Location                                                  |
| ------------------------ | ----- | --------------------------------------------------------- |
| MAX\_DOMAINS             | 50    | `inngest/functions/analyzeReport.ts`, `api/search.ts` |
| MAX\_ARTICLES            | 20    | `inngest/functions/analyzeReport.ts`                    |
| EVALUATOR\_MAX\_ARTICLES | 15    | `inngest/functions/analyzeReport.ts`                    |
| numResults cap           | 50    | `api/search.ts`                                         |
| REPORT\_BATCH\_LIMIT     | 5     | `App.tsx` (topics per "Run Monitoring")                 |

---

## 9. Quality Features

### Implemented (V3)

| Feature                         | Description                                          |
| ------------------------------- | ---------------------------------------------------- |
| **Coverage Metadata**     | Source count, leaning distribution, confidence level |
| **Citation Enforcement**  | Analysis must cite sources (Source 1, Source 2...)   |
| **Consistency Warnings**  | Flags entities in summary not found in sources       |
| **Verifier Warnings**     | Counts uncited sentences in Executive Summary        |
| **Evidence Quality Tags** | Articles tagged as full/short-text/truncated         |
| **Query Validation**      | Persian script detection, max length guard           |
| **Evaluator Agent**       | Citation + faithfulness scoring (background job)     |
| **Toast Notifications**   | User feedback for success/error states               |

### Evaluator Constraints

| Constraint     | Value | Rationale                                |
| -------------- | ----- | ---------------------------------------- |
| Min sources    | 2     | Not enough evidence to evaluate with\< 2 |
| Max articles   | 15    | Cap token cost and latency               |
| Timeout        | 30s   | Fail-open to avoid blocking completion   |
| Skip truncated | Yes   | Can't verify claims against missing text |

---

## 10. Deferred / Not Implemented

These features were considered but deliberately NOT implemented:

| Feature                                     | Reason                                   |
| ------------------------------------------- | ---------------------------------------- |
| **Adaptive Router Agent**             | Too much behavior opacity, hard to debug |
| **Back-translation validation**       | Expensive, noisy signal                  |
| **Multi-model fallback (Claude/GPT)** | Unnecessary complexity                   |
| **Diversity-based auto-triggers**     | Thin coverage is often the valid signal  |
| **Deep Dive Mode**                    | Deferred - can add if needed             |
| **Scheduled monitoring**              | Deferred to future version               |
| **Email notifications**               | Deferred to future version               |

---

## 11. Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

---

## 12. Deployment

### Vercel (Production)

1. Push to main branch triggers auto-deploy
2. Environment variables set in Vercel dashboard
3. Edge Functions deployed to `/api/*`
4. Inngest webhook at `/api/inngest`

### Firebase

1. Project: `media-monitoring-3b75a`
2. Console: https://console.firebase.google.com/u/0/project/media-monitoring-3b75a
3. Auth: Google Sign-in + Email/Password enabled
4. Firestore: Production mode, nam5 region

### Inngest

1. Dashboard: https://app.inngest.com
2. Webhook configured to Vercel deployment
3. Background function: `analyze-report`

---

## 13. Troubleshooting

### Common Issues

| Issue                                                | Solution                                                                               |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Firebase Auth initialization failed"                | Check VITE\_FIREBASE\_\* env vars                                                      |
| Sources show "0 / 0 Active"                          | Missing `VITE_FIREBASE_PROJECT_ID` - check for `projects/undefined` in Network tab |
| "Missing FIREBASE\_PROJECT\_ID" error                | Add `FIREBASE_PROJECT_ID` (no VITE\_ prefix) for server-side                         |
| Toggle not working                                   | Check Firestore security rules OR missing VITE\_FIREBASE\_PROJECT\_ID                  |
| Reports stuck on "pending"                           | Check Inngest dashboard for errors                                                     |
| No articles found                                    | Expand time range, enable more sources                                                 |
| Timeout errors                                       | Inngest handles long jobs - check logs                                                 |
| `TypeError: request.headers.get is not a function` | API using Web API style but runtime is Node.js - use VercelRequest                     |

### Debug Locations

| What                  | Where                         |
| --------------------- | ----------------------------- |
| Frontend errors       | Browser DevTools Console      |
| API errors            | Vercel Dashboard → Logs      |
| Background job errors | Inngest Dashboard             |
| Firestore errors      | Firebase Console → Firestore |

---

## 14. Version History

### V3.1 (February 3, 2026) - Current

- **Fixed:** API routes converted to `VercelRequest`/`VercelResponse` (was causing TypeError)
- **Fixed:** Inngest import changed to `inngest/next` (was causing sync failures)
- **Fixed:** Environment variable documentation (VITE\_ vs non-VITE distinction)
- **Fixed:** Auto-seeding for new users (seededRef now resets when user changes)
- All functionality verified working in production

### V3 (February 2026)

- Firebase Auth (Google + Email/Password)
- Cloud Firestore for persistent storage
- Inngest background processing (15+ min runtime)
- Evaluator agent enabled
- Increased limits: 50 domains, 20 articles, 15 for evaluator
- Toast notifications with Sonner
- Proper error handling with form state preservation

### V2 (January 2026) - Archived

- Edge Functions only (60s timeout limit)
- No persistence (data lost on refresh)
- Evaluator disabled due to timeout constraints
- Limited to 5 articles per topic

### V1 (December 2025) - Archived

- Client-side API calls (security issue)
- Basic monitoring functionality

---

## 15. For AI Assistants

When helping with this codebase:

1. **Read this file first** - it contains everything you need
2. **Check `types.ts`** for TypeScript interfaces
3. **Check `constants.ts`** for default data
4. **Main logic is in `inngest/functions/analyzeReport.ts`**
5. **UI state management is in `App.tsx`**
6. **Toast notifications use `sonner`** - import `{ toast } from 'sonner'`
7. **Firestore operations are in `lib/firestore.ts`**

### Key Patterns

```typescript
// API Routes - MUST use VercelRequest/VercelResponse with runtime: "nodejs"
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs" };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;  // NOT .get()
  const body = req.body;                          // Already parsed
  return res.status(200).json({ data });          // NOT new Response()
}

// Inngest - use inngest/next (works with Node.js runtime)
import { serve } from "inngest/next";  // NOT inngest/edge

// Toast notifications
import { toast } from 'sonner';
toast.success('Success message');
toast.error('Error message');

// Firestore operations
import { addSource, updateSource, deleteSource } from './lib/firestore';
await addSource(user.uid, sourceData);

// Error handling in handlers (App.tsx)
try {
  await someOperation();
  toast.success('Done!');
} catch (error) {
  console.error('Failed:', error);
  toast.error('Failed. Please try again.');
  throw error; // Rethrow so UI components can preserve form state
}

// UI components catch and handle
try {
  await onAdd(data);
  // Only clear form on success
  clearForm();
} catch {
  // Error already toasted, just preserve form state
}
```

---

*Last updated: February 3, 2026*
