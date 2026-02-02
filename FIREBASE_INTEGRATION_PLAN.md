# Firebase Integration Plan (Version 3)

## Overview

This plan adds **persistent storage** via Firebase Firestore and **background job processing** via Inngest to solve:
1. **Data persistence**: Configurations and saved reports survive page refresh
2. **Timeout elimination**: Background jobs have 15+ minute runtime
3. **Scale to 20-40 articles**: No Edge Function timeout pressure

---

## Architecture

### Current (Version 2)
```
Browser (React State) ──► Edge Functions ──► Gemini/Exa
       │                        │
       └── Data lost on refresh ─┘ 60s timeout limit
```

### Target (Version 3)
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
                            │
                            ▼
                     ┌──────────────┐
                     │ Gemini/Exa   │
                     └──────────────┘
```

---

## Data Model

### Firestore Collections

```
firestore/
├── users/{userId}/
│   ├── profile
│   │   ├── email: string
│   │   └── createdAt: timestamp
│   │
│   ├── watchlist/{itemId}
│   │   ├── topic: string
│   │   ├── description: string
│   │   ├── persianQuery: string | null
│   │   ├── timeRange: 'last24h' | 'last7d' | 'last30d' | 'custom'
│   │   ├── customStartDate: string | null
│   │   ├── customEndDate: string | null
│   │   ├── createdAt: timestamp
│   │   └── updatedAt: timestamp
│   │
│   ├── sources/{sourceId}
│   │   ├── domain: string
│   │   ├── name: string
│   │   ├── leaning: 'Principlist' | 'Reformist' | 'State' | 'Economic' | 'Moderate'
│   │   ├── active: boolean
│   │   ├── description: string | null
│   │   └── createdAt: timestamp
│   │
│   └── reports/{reportId}
│       ├── watchlistItemId: string
│       ├── topic: string
│       ├── status: 'pending' | 'running' | 'completed' | 'failed'
│       ├── stage: string
│       ├── persianQuery: string | null
│       ├── domains: string[] | null
│       ├── domainLeanings: Record<string, string> | null
│       ├── timeRange: 'last24h' | 'last7d' | 'last30d' | 'custom' | null
│       ├── customStartDate: string | null
│       ├── customEndDate: string | null
│       ├── idempotencyKey: string | null
│       ├── summary: string | null (markdown)
│       ├── articleLinks: Array<{
│       │     title: string
│       │     url: string
│       │     domain: string
│       │     publishedDate: string | null
│       │     evidenceQuality: 'full' | 'short-text' | 'truncated'
│       │   }>
│       ├── coverage: {
│       │     sourceCount: number
│       │     uniqueDomains: string[]
│       │     leaningDistribution: Record<string, number>
│       │     coverageConfidence: 'high' | 'medium' | 'low'
│       │   } | null
│       ├── evaluatorResult: {
│       │     citationScore: number
│       │     faithfulnessScore: number
│       │     issues: Array<{ claim: string, issue: string }>
│       │   } | null
│       ├── verifierWarnings: string[] | null
│       ├── consistencyWarnings: string[] | null
│       ├── queryWarnings: string[] | null
│       ├── error: string | null
│       ├── saved: boolean (user toggle to keep report)
│       ├── expiresAt: timestamp | null (TTL field for auto-delete)
│       ├── createdAt: timestamp
│       └── updatedAt: timestamp
```

### Key Design Decisions

1. **No full article text stored**: Only URLs and metadata saved in reports
2. **User-scoped data**: All data under `users/{userId}/` for multi-tenancy
3. **TTL-based auto-delete**: Reports have `expiresAt = createdAt + 7 days` when `saved: false`
   - When `saved` toggles to `true`: clear `expiresAt` (set to `null`)
   - When `saved` toggles to `false`: set `expiresAt = now + 7 days`
   - **Requires**: Enable Firestore TTL policy in Firebase Console on `expiresAt` field
4. **Denormalized topic**: Stored in report for display without join

---

## Implementation Phases

### Phase 1: Firebase Setup (P0)

**Goal**: Basic Firebase integration with Firestore

**Tasks**:
- [ ] Create Firebase project in Firebase Console
- [ ] Install dependencies: `firebase`, `firebase-admin`
- [ ] Create `lib/firebase.ts` with client SDK initialization
- [ ] Create `lib/firebaseAdmin.ts` with Admin SDK for API routes
- [ ] Set up environment variables:
  - `NEXT_PUBLIC_FIREBASE_*` for client
  - `FIREBASE_ADMIN_*` for server
- [ ] Configure Firestore security rules

**Files to Create**:
| File | Purpose |
|------|---------|
| `lib/firebase.ts` | Client SDK init |
| `lib/firebaseAdmin.ts` | Admin SDK init |
| `lib/firestore.ts` | Firestore helper functions |

**Estimated Effort**: 2-3 hours

---

### Phase 2: Authentication (P0)

**Goal**: User authentication to scope data

**Decision: Firebase Auth with Google Sign-in (primary) + Email/Password (fallback)**

Rationale:
- Google Sign-in: One-click login, no password management, best UX
- Email/Password fallback: For environments where Google is blocked
- Proper multi-user support from day one
- Avoids migration headaches from anonymous auth

**Tasks**:
- [ ] Enable Google Sign-in and Email/Password in Firebase Console
- [ ] Implement Firebase Auth in frontend
- [ ] Create auth context/provider with loading state
- [ ] **Critical**: App must wait for auth to resolve before reading/writing Firestore
- [ ] Add sign-in/sign-out UI with both options
- [ ] Protect routes and data with userId

**Files to Create/Modify**:
| File | Purpose |
|------|---------|
| `contexts/AuthContext.tsx` | Auth state management with loading gate |
| `components/AuthGate.tsx` | Login UI wrapper (Google + Email options) |
| `hooks/useAuth.ts` | Auth hook |

**Estimated Effort**: 2-3 hours

---

### Phase 3: Data Migration (P1)

**Goal**: Move watchlist and sources to Firestore

**Tasks**:
- [ ] Create CRUD functions for watchlist items
- [ ] Create CRUD functions for media sources
- [ ] Update `App.tsx` to load from Firestore
- [ ] Update Dashboard to sync with Firestore
- [ ] Remove local state for configs (keep for reports temporarily)

**API Changes**:
```typescript
// lib/firestore.ts

// Watchlist
export async function getWatchlist(userId: string): Promise<WatchlistItem[]>
export async function addWatchlistItem(userId: string, item: Omit<WatchlistItem, 'id'>): Promise<string>
export async function updateWatchlistItem(userId: string, id: string, updates: Partial<WatchlistItem>): Promise<void>
export async function deleteWatchlistItem(userId: string, id: string): Promise<void>

// Sources
export async function getSources(userId: string): Promise<MediaSource[]>
export async function addSource(userId: string, source: Omit<MediaSource, 'id'>): Promise<string>
export async function updateSource(userId: string, id: string, updates: Partial<MediaSource>): Promise<void>
export async function deleteSource(userId: string, id: string): Promise<void>
```

**Estimated Effort**: 3-4 hours

---

### Phase 4: Inngest Setup (P1)

**Goal**: Background job infrastructure

**Tasks**:
- [ ] Create Inngest account and project
- [ ] Install dependency: `inngest`
- [ ] Create `inngest/client.ts` for Inngest client
- [ ] Create `api/inngest.ts` Vercel route for Inngest
- [ ] Set up environment variables:
  - `INNGEST_EVENT_KEY`
  - `INNGEST_SIGNING_KEY`

**Files to Create**:
| File | Purpose |
|------|---------|
| `inngest/client.ts` | Inngest client instance |
| `inngest/functions/` | Background job definitions |
| `api/inngest.ts` | Inngest webhook handler |

**Estimated Effort**: 2 hours

---

### Phase 4.5: API Design (P1)

**Goal**: Define API contracts for report creation and status tracking

**Endpoints**:

```typescript
// POST /api/reports/create
// Creates report stub + triggers Inngest job in one call
Request: {
  watchlistItemId: string;
  topic: string;
  persianQuery?: string;
  domains: string[];
  domainLeanings: Record<string, string>;
  timeRange: 'last24h' | 'last7d' | 'last30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  idempotencyKey: string;  // Prevents duplicate jobs from double-clicks
}

Response: {
  reportId: string;
  status: 'pending';
}

// Idempotency: If same idempotencyKey seen within 5 minutes, return existing reportId
```

**Idempotency Key Generation** (client-side):
```typescript
// Derive from userId + watchlistItemId + 5-minute time bucket
const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
const idempotencyKey = `${userId}-${watchlistItemId}-${bucket}`;
```

**Status Tracking Options**:
1. **Firestore real-time listener** (recommended): Client subscribes to report doc
2. **Polling endpoint** (fallback): `GET /api/reports/{reportId}/status`

**Client creates minimal stub, server writes analysis results**:
- Client via API: `watchlistItemId`, `topic`, `status: 'pending'`, `stage`, `saved`, `createdAt`, `updatedAt`, `expiresAt`, `persianQuery`, `domains`, `domainLeanings`, `timeRange`, `customStartDate`, `customEndDate`, `idempotencyKey`
- Server (Inngest): `status`, `stage`, `summary`, `articleLinks`, `coverage`, `evaluatorResult`, `verifierWarnings`, `consistencyWarnings`, `queryWarnings`, `error`, `updatedAt`

**Estimated Effort**: 1-2 hours (included in Phase 5)

---

### Phase 5: Background Analysis (P1)

**Goal**: Move analysis to background jobs

**Tasks**:
- [ ] Create `inngest/functions/analyzeReport.ts` background function
- [ ] Create `api/reports/create.ts` endpoint (stub + trigger Inngest)
- [ ] Implement idempotency check (same key within 5 min returns existing report)
- [ ] Store results directly to Firestore from background job
- [ ] Update frontend to use Firestore real-time listener for status

**New Flow**:
```
1. User clicks "Run Monitoring"
2. Client generates idempotencyKey
3. Client calls POST /api/reports/create
4. Edge Function:
   a. Checks idempotencyKey - if exists, return existing reportId
   b. Creates report stub with status='pending' in Firestore
   c. Sets expiresAt = createdAt + 7 days (since saved: false by default)
   d. Triggers Inngest event with reportId
   e. Returns { reportId, status: 'pending' }
5. Client subscribes to Firestore report doc for real-time updates
6. Inngest background function:
   a. Updates status='running', stage='Searching...'
   b. Calls Exa for articles (can take 30s+)
   c. Updates stage='Analyzing...'
   d. Calls Gemini for analysis (can take 60s+)
   e. Calls Gemini for evaluator (with constraints, can take 30s+)
   f. Updates report with results, status='completed'
7. Client sees real-time status/stage updates via Firestore listener
```

**Inngest Function**:
```typescript
// inngest/functions/analyzeReport.ts
import { inngest } from "../client";

export const analyzeReport = inngest.createFunction(
  { id: "analyze-report", retries: 3 },
  { event: "report/analyze.requested" },
  async ({ event, step }) => {
    const { reportId, userId, topic, persianQuery, domains, domainLeanings, timeRange } = event.data;

    // Step 1: Search (can scale to 20-40 articles now!)
    const articles = await step.run("search-articles", async () => {
      await updateReport(userId, reportId, { status: 'running', stage: 'Searching media...' });
      return await searchExa(persianQuery, domains, 30, timeRange);
    });

    // Step 2: Analyze
    const analysis = await step.run("analyze-articles", async () => {
      await updateReport(userId, reportId, { stage: 'Analyzing intelligence...' });
      return await analyzeArticles(topic, articles, domainLeanings);
    });

    // Step 3: Evaluate (with constraints - see below)
    const evaluator = await step.run("evaluate-analysis", async () => {
      // EVALUATOR CONSTRAINTS:
      // - Skip if coverage < 2 sources (not enough to evaluate)
      // - Limit to max 5 articles for evaluator (subset of full results)
      // - 30s timeout with fail-open (return null on timeout/error)
      // - Skip if majority of articles have evidenceQuality === 'truncated'

      const validArticles = articles.filter(a => a.evidenceQuality !== 'truncated');
      if (validArticles.length < 2) {
        return null; // Skip evaluator - insufficient evidence
      }

      await updateReport(userId, reportId, { stage: 'Evaluating citations...' });

      try {
        const evaluatorArticles = validArticles.slice(0, 5); // Max 5 for evaluator
        return await Promise.race([
          runEvaluator(topic, analysis.summary, evaluatorArticles),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Evaluator timeout')), 30000))
        ]);
      } catch (error) {
        console.log('[Evaluator] Failed with error, continuing without:', error);
        return null; // Fail-open: continue without evaluator result
      }
    });

    // Step 4: Save to Firestore
    await step.run("save-results", async () => {
      await updateReport(userId, reportId, {
        status: 'completed',
        stage: 'Complete',
        summary: analysis.summary,
        articleLinks: articles.map(a => ({
          title: a.title,
          url: a.url,
          domain: a.domain,
          publishedDate: a.publishedDate,
          evidenceQuality: a.evidenceQuality,
        })),
        coverage: analysis.coverage,
        evaluatorResult: evaluator,
        verifierWarnings: analysis.verifierWarnings,
        consistencyWarnings: analysis.consistencyWarnings,
      });
    });

    return { success: true, reportId };
  }
);
```

**Evaluator Constraints Summary**:
| Constraint | Value | Rationale |
|------------|-------|-----------|
| Min sources | 2 | Not enough evidence to evaluate with < 2 |
| Max articles | 5 | Cap token cost and latency |
| Timeout | 30s | Fail-open to avoid blocking completion |
| Skip truncated majority | Yes | Can't verify claims against missing text |

**Estimated Effort**: 4-5 hours

---

### Phase 6: Report Persistence (P1)

**Goal**: Save and retrieve reports from Firestore

**Tasks**:
- [ ] Create CRUD functions for reports
- [ ] Add "Save Report" toggle to Dashboard
- [ ] Implement report listing with saved filter
- [ ] Add auto-cleanup job for unsaved reports (7 days) **only if TTL is not used**
- [ ] Real-time updates with Firestore listeners

**Report Functions**:
```typescript
// lib/firestore.ts

export async function createReport(userId: string, data: CreateReportData): Promise<string>
export async function getReport(userId: string, reportId: string): Promise<Report | null>
export async function getReports(userId: string, options?: { saved?: boolean }): Promise<Report[]>
export async function updateReport(userId: string, reportId: string, updates: Partial<Report>): Promise<void>
export async function toggleReportSaved(userId: string, reportId: string, saved: boolean): Promise<void>
export async function deleteReport(userId: string, reportId: string): Promise<void>

// Real-time listener
export function subscribeToReport(
  userId: string,
  reportId: string,
  callback: (report: Report) => void
): () => void
```

**Estimated Effort**: 3-4 hours

---

### Phase 7: Frontend Updates (P2)

**Goal**: Update UI for new data flow

**Tasks**:
- [ ] Replace local state with Firestore listeners
- [ ] Add loading states for async operations
- [ ] Show real-time progress during analysis
- [ ] Add "Saved Reports" view
- [ ] Add report deletion with confirmation
- [ ] Improve error handling and retry UX

**Component Changes**:
| Component | Changes |
|-----------|---------|
| `App.tsx` | Load from Firestore, auth gate |
| `Dashboard.tsx` | Real-time report updates, save toggle |
| `Watchlist.tsx` | CRUD synced to Firestore |
| `Sources.tsx` | CRUD synced to Firestore |
| `ReportCard.tsx` | Save toggle, delete button |

**Estimated Effort**: 4-5 hours

---

### Phase 8: Cleanup & Polish (P2)

**Goal**: Production-ready refinements

**Tasks**:
- [ ] Add Firestore indexes for queries
- [ ] Implement rate limiting (optional)
- [ ] Add error boundaries
- [ ] Optimize bundle size (lazy load Firebase)
- [ ] Add loading skeletons
- [ ] Write migration script for existing users (if any)

**Estimated Effort**: 2-3 hours

---

## Environment Variables

### Client-side (Vite)
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### Server-side (Vercel)
```env
# Existing
EXA_API_KEY=
GEMINI_API_KEY=

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

---

## Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user owns this data
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    // User profile - full access
    match /users/{userId}/profile {
      allow read, write: if isOwner(userId);
    }

    // Watchlist - full access (user-managed)
    match /users/{userId}/watchlist/{itemId} {
      allow read, write: if isOwner(userId);
    }

    // Sources - full access (user-managed)
    match /users/{userId}/sources/{sourceId} {
      allow read, write: if isOwner(userId);
    }

    // Reports - RESTRICTED field-level access
    match /users/{userId}/reports/{reportId} {
      // Anyone can read their own reports
      allow read: if isOwner(userId);

      // Client can only CREATE with minimal stub fields
      // (watchlistItemId, topic, status='pending', saved=false, createdAt, expiresAt)
      allow create: if isOwner(userId)
        && request.resource.data.status == 'pending'
        && request.resource.data.keys().hasOnly([
          'watchlistItemId', 'topic', 'status', 'stage', 'saved',
          'expiresAt', 'createdAt', 'updatedAt', 'persianQuery',
          'domains', 'domainLeanings', 'timeRange', 'customStartDate',
          'customEndDate', 'idempotencyKey'
        ]);

      // Client can ONLY update the 'saved' field (and expiresAt when toggling saved)
      // All other fields (summary, articles, evaluatorResult, etc.) are server-only
      allow update: if isOwner(userId)
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['saved', 'expiresAt', 'updatedAt']);

      // Client can delete their own reports
      allow delete: if isOwner(userId);
    }
  }
}
```

**Field Access Matrix**:
| Field | Client Create | Client Update | Server (Inngest) |
|-------|---------------|---------------|------------------|
| `watchlistItemId` | ✅ | ❌ | ❌ |
| `topic` | ✅ | ❌ | ❌ |
| `status` | ✅ (pending only) | ❌ | ✅ |
| `stage` | ✅ | ❌ | ✅ |
| `saved` | ✅ | ✅ | ❌ |
| `expiresAt` | ✅ | ✅ | ❌ |
| `updatedAt` | ✅ | ✅ | ✅ |
| `summary` | ❌ | ❌ | ✅ |
| `articleLinks` | ❌ | ❌ | ✅ |
| `coverage` | ❌ | ❌ | ✅ |
| `evaluatorResult` | ❌ | ❌ | ✅ |
| `verifierWarnings` | ❌ | ❌ | ✅ |
| `consistencyWarnings` | ❌ | ❌ | ✅ |
| `queryWarnings` | ❌ | ❌ | ✅ |
| `error` | ❌ | ❌ | ✅ |

**Note**: Server writes (Inngest) use Firebase Admin SDK which bypasses security rules.

---

## Testing Strategy

### Unit Tests
- [ ] Firestore helper functions (mock Firebase)
- [ ] Inngest function logic (mock APIs)
- [ ] Auth context behavior

### Integration Tests
- [ ] Full monitoring flow with Firestore
- [ ] Background job completion
- [ ] Real-time updates

### Manual Testing Checklist
- [ ] Sign in / sign out
- [ ] Add/edit/delete watchlist item (persists on refresh)
- [ ] Add/edit/delete source (persists on refresh)
- [ ] Run monitoring → see real-time progress
- [ ] Save report → persists after 7 days
- [ ] Unsaved report → auto-deleted after 7 days
- [ ] Multi-device: changes sync across tabs

---

## Cost Estimates

### Firebase (Free Tier - Spark Plan)
| Resource | Free Limit | Expected Usage |
|----------|------------|----------------|
| Firestore reads | 50K/day | ~1K/day |
| Firestore writes | 20K/day | ~500/day |
| Firestore deletes | 20K/day | ~100/day |
| Storage | 1 GB | < 100 MB |
| Auth | Unlimited | N/A |

**Verdict**: Free tier sufficient for moderate usage

### Inngest (Free Tier)
| Resource | Free Limit | Expected Usage |
|----------|------------|----------------|
| Function runs | 5K/month | ~500/month |
| Step runs | 25K/month | ~2K/month |

**Verdict**: Free tier sufficient

---

## Timeline

| Phase | Duration | Dependency |
|-------|----------|------------|
| 1. Firebase Setup | 2-3 hours | None |
| 2. Authentication | 2-3 hours | Phase 1 |
| 3. Data Migration | 3-4 hours | Phase 2 |
| 4. Inngest Setup | 2 hours | Phase 1 |
| 5. Background Analysis | 4-5 hours | Phase 3, 4 |
| 6. Report Persistence | 3-4 hours | Phase 5 |
| 7. Frontend Updates | 4-5 hours | Phase 6 |
| 8. Cleanup & Polish | 2-3 hours | Phase 7 |

**Total Estimate**: 2-3 days of focused development

---

## Rollback Plan

If issues arise:
1. Keep Version 2 as fallback (works without Firebase)
2. Feature flag for Firebase (`USE_FIREBASE=true`)
3. Gradual migration: configs first, then reports

---

## Success Criteria

- [ ] Page refresh preserves all configurations
- [ ] Saved reports accessible after 7+ days
- [ ] Analysis completes for 20+ articles without timeout
- [ ] Real-time progress visible during analysis
- [ ] All 52 existing tests still pass
- [ ] No regression in core functionality

---

## Developer Review Feedback (Resolved)

The following issues were identified in code review and have been addressed in this plan:

| Issue | Severity | Resolution |
|-------|----------|------------|
| **1. Auto-delete has no enforcement** | High | Added `expiresAt` timestamp field + Firestore TTL policy. When `saved=false`, set `expiresAt = createdAt + 7d`. When `saved=true`, clear `expiresAt`. |
| **2. Auth choice not finalized** | High | Decided: Firebase Auth with Google Sign-in (primary) + Email/Password (fallback). See Phase 2. |
| **3. API design missing** | High | Added Phase 4.5 with endpoint contracts, idempotency key generation, and status tracking options. |
| **4. Evaluator needs constraints** | Medium | Added: min 2 sources, max 5 articles, 30s timeout, fail-open, skip truncated articles. See Phase 5. |
| **5. Security rules too permissive** | Medium | Implemented field-level restrictions: client can only update `saved`/`expiresAt`, server writes analysis results. See Security Rules section. |

---

*This plan builds on the P0-P2 work completed in DEVELOPER_PLAN.md*

*Last updated: Incorporates developer review feedback*
