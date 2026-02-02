# Architecture Reference: Iranian Media Intelligence Platform

**Strategic design document with detailed rationale and trade-off analysis**
*January 2026 | Prepared for Felix Kufus*

> **For implementation:** See [DEVELOPER_PLAN.md](./DEVELOPER_PLAN.md) for actionable tasks and acceptance criteria.

---

## Executive Summary

This document provides the architectural rationale behind the Iranian Media Intelligence tool.

**Current State (V2):** All P0-P1 items implemented and deployed at https://iranian-media-intelligence-v2.vercel.app/. Grounding enforcement, coverage signaling, and resilience patterns are production-ready. P2.10 (consistency warnings) complete. P2.11 (evaluator agent) deferred to V3 due to Edge timeout constraints.

**V3 Direction:** Firebase + Inngest integration will add persistent storage and background processing, enabling evaluator agent and scaling to 20-40 articles per topic. See [FIREBASE_INTEGRATION_PLAN.md](./FIREBASE_INTEGRATION_PLAN.md).

The guiding principle is: **grounding, clear "coverage is thin" signaling, and resilient API handling matter more than adding complex agent layers.**

---

## 1. Semantic Search vs. Agentic Search

### Key Differences

| Aspect | Semantic Search | Agentic Search (RAG) |
|--------|-----------------|----------------------|
| **Definition** | Query → ranked results in one shot; retrieves by conceptual similarity | LLM plans searches, inspects results, refines queries, changes sources/time windows in a loop |
| **Speed/Cost** | Fast (2-5s), cheap, predictable | Slower (15-60+s), more expensive, less deterministic |
| **Strengths** | Broad recall, consistent pipeline, good for building candidate sets | Handles hard queries (ambiguous topics, multiple spellings), multi-hop reasoning |
| **Weaknesses** | Doesn't reason about gaps or cross-check; flat knowledge retrieval | Can "overfit" to early results; can hallucinate rationale if not grounded |
| **Best For** | Daily monitoring, trend scans, known domains, routine watchlist | Evidence-driven retrieval, incident-mode monitoring |

### Decision: Conservative Hybrid with Manual Deep Dive

**Key insight:** If fallback triggers on "<2 articles" or "single leaning," it will fire constantly for underreported topics or niche issues. In those cases, fallback often **can't conjure coverage that doesn't exist**—it just burns time/cost and creates confusing behavior. Low volume and unbalanced leaning are often **valid monitoring outcomes and the actual signal you're looking for**.

**Architecture:**

- **Normal Mode (Default):** Keep Exa semantic search for routine watchlist scans. Fast, reliable, cost-effective.

- **Deep Dive Mode (User-Invoked Toggle):** Manual button that:
  - Broadens time window
  - Tries multiple query variants
  - Optionally does "deep fetch" for full text
  - Produces a longer, more comprehensive brief

- **Automatic Repair (Rare):** Only triggers when there are **signs of query/search malfunction**, NOT when coverage is legitimately thin:
  - **Good automatic triggers (robust, low false positives):**
    - Zero results AND query looks suspicious (not Persian script when expected, extremely long query, obvious model verbosity)
    - Results exist but are clearly irrelevant (very low keyword/entity overlap with topic across all returned texts/titles)
    - Text is missing/truncated for most results (retrieval-quality failure)
  - **Guardrails:**
    - Deterministic rules, NOT an "adaptive router agent"
    - Max 1 fallback attempt per topic (never infinite refinement loops)
    - Always log WHY fallback happened for explainability

**What NOT to do:**
- ❌ Don't auto-trigger on "<2 articles" — low volume is a valid outcome
- ❌ Don't auto-trigger on "single leaning" — that's often the signal you're monitoring
- ❌ Don't implement an "Adaptive Router Agent" — too much behavior opacity early on

---

## 2. Exa API vs. Building Custom Agentic Search

### Trade-off Analysis

| Dimension | Search API (Exa) | Custom Scrape/Navigate |
|-----------|------------------|------------------------|
| **Coverage** | Limited to indexed domains and their crawl cadence | Target exact sites/pages, niche outlets, PDFs; fetch newest items immediately |
| **Reliability** | Low maintenance; predictable latency; fewer breakages | High maintenance (layout changes, bot defenses, dynamic rendering, paywalls) |
| **Extraction** | Content can be truncated, noisy; less control | Per-domain extractors, "gold" parsing; full control but heavy engineering |
| **Cost** | Pay per query; easy to forecast | Infra + proxy + headless browser + engineering time |
| **Compliance** | Provider handles crawling responsibility | Full compliance burden (robots/ToS, legal risk, IP blocks). Iranian outlets have high variability. |
| **Vercel Edge** | Works well within Edge constraints | **Not a good fit for Edge** — needs Node serverless, containers, or separate worker |

### Decision: Keep Exa as Default

**Keep Exa as the default discovery layer.** Add targeted "deep fetch" only as a fallback for:

1. **Missing article text** — when Exa returns truncated/empty content
2. **High-value site allowlist** — specific critical sources that need real-time monitoring
3. **"Must have primary source" workflows** — when verification requires original statements

This gets most of the benefit of scraping without turning your system into a scraper maintenance shop.

---

## 3. Work Validation Layer

### Philosophy

Validation should be **mostly automatic, lightweight, and evidence-linked**. Focus on grounding and clear signaling rather than complex multi-agent architectures.

### 3.1 Hard Gates (Schema + Contract Checks)

Enforce structured outputs with required fields. Validate automatically:

- Query string present and non-empty
- Article text length exceeds minimum threshold (100+ characters)
- **Short text handling (quality-first):** do **not** blindly drop short items (official statements/bulletins can be critical). Instead, tag them as low-evidence (e.g., `evidenceQuality: "short-text"`) and surface that in the UI; only exclude obvious junk (cookie banners/nav/error pages).
- URLs are valid and match allowed domains
- Timestamps are within expected range (e.g., last 30 days)
- Required fields present: `title`, `url`, `publishedDate`, `text`

### 3.2 Translation/Query Quality Checks

- **Script detection:** Verify Persian query contains Persian characters (Unicode U+0600-U+06FF)
- **Length guard:** Enforce max 200 character limit to prevent over-specific queries that kill recall
- **Topic ↔ Query alignment:** Verify query contains core entities/keywords from topic
- **Auto-regenerate:** If checks fail, retry once with stricter prompt

### 3.3 Coverage Metadata (NOT Enforcement)

**Key insight:** For media monitoring, "only one outlet reported this" can be *the point*. Don't enforce minimum diversity—measure and signal it.

**Replace "minimum diversity rule" with coverage metadata + analyst-facing flags:**

```typescript
interface CoverageMetadata {
  sourceCount: number;
  uniqueDomains: string[];
  leaningDistribution: Record<string, number>;
  dateRange: { earliest: string; latest: string };
  coverageConfidence: 'high' | 'medium' | 'low';
}
```

Display as:
- "Coverage: 1 outlet / 1 leaning"
- "Coverage confidence: low (thin sourcing)"
- "This is underreported; treat as tentative"

**Do NOT:**
- ❌ Auto-retry just because diversity is low
- ❌ Enforce minimum diversity rules
- ❌ Use diversity-based auto-triggers

Retries should be driven by "this looks broken/irrelevant," not by "this is narrow."

### 3.4 Grounding Checks (No Claims Without Sources)

- Require every key claim to include explicit citations (e.g., "(Source 2)")
- Automated pass flags sentences without citations in Executive Summary and Significance sections
- **Quote extraction (optional):** For top claims, extract 1-2 short Persian snippets from article text that support them

### 3.5 Consistency Checks (Soft Warnings) ✅ IMPLEMENTED

**Status:** Implemented in V2

**What it is:** A hallucination detector and "analysis hygiene" signal.

**Example:** The summary says "Parliament approved X yesterday" but NONE of the provided article texts/titles mention Parliament/Majles at all. That's usually:
- A hallucination
- An overconfident inference
- The model "importing" background knowledge not in the evidence

**Implementation:**

- `api/_shared.ts`: `extractCandidateEntitiesFromSummary()` extracts named entities (title-case words, acronyms, Persian text)
- `api/_shared.ts`: `buildConsistencyWarnings()` checks entities against source text
- `api/analyze.ts`: Returns `consistencyWarnings` array in response
- `Dashboard.tsx`: Displays warnings in collapsible amber warning section

**Example Output:**
```
⚠️ Possible ungrounded claim: "Majles" not found in sources
```

Reports are never blocked — warnings are informational for analyst review.

### 3.6 Lightweight Verifier Pass ✅ IMPLEMENTED / ⏸️ EVALUATOR DEFERRED

**Citation Verification (V2 - IMPLEMENTED):**

Regex-based citation checking in `api/analyze.ts`:
- Checks Executive Summary for uncited sentences (sentences > 20 chars without `(Source N)` pattern)
- Returns `citationCount` and `verifierWarnings` array
- Warnings displayed in `Dashboard.tsx` amber warning section

**Evaluator Agent (V3 - DEFERRED):**

Due to Edge Function timeout constraints (60s max), the full evaluator agent is deferred to V3 where background processing via Inngest allows 15+ minute runtime.

**V3 Evaluator Constraints:**

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Min sources | 2 | Not enough evidence to evaluate with < 2 |
| Max articles | 5 | Cap token cost and latency |
| Timeout | 30s | Fail-open to avoid blocking completion |
| Skip truncated majority | Yes | Can't verify claims against missing text |

See [FIREBASE_INTEGRATION_PLAN.md](./FIREBASE_INTEGRATION_PLAN.md) Phase 5 for V3 implementation details.

### 3.7 Human-in-the-Loop Triggers

Only escalate when flags trip (not for every report):

- No articles found for topic (after repair attempt)
- Missing citations in key sections
- Consistency check warnings fired
- High-importance or sensitive topic
- "High significance" label (warrants extra scrutiny)

---

## 4. Multi-User / Multi-Tenant Architecture

### Decision: Shared System with Strict Logical Isolation

Do NOT spin up separate instances per user. One backend service, multi-tenant DB; every request carries a tenantId/userId.

### Architecture Design

**1. Stateless Runtime**

Your current Vercel Edge Functions approach is correct. Each request spins up resources, processes, and releases. This scales from zero to millions of requests automatically.

**2. Session Isolation ("The Desk")**

Each user interaction encapsulated in a unique Session:
- Session = temporary container for conversation history and immediate state
- Enforce strict isolation via Access Control Lists
- One user can never access another user's session data

**3. Memory Scoping ("The Filing Cabinet")**

Three levels of persistent memory:
- **User-Level Scope:** Personal watchlists, source preferences, past reports — tied to user_id
- **Organization-Level Scope:** Shared source configurations, team watchlists, common prompts
- **Application-Level Scope:** General knowledge shared by all users (e.g., source political leanings)

**4. Jobs, Not Instances**

Model "agents" as stateless runs/jobs:
- Each monitoring run = job with inputs (tenant config + topics + time range) and outputs (reports + evidence)
- If you need "memory," store it in DB (e.g., "last week's baseline narratives," "known entity aliases")
- Per-tenant quotas/rate limits to prevent noisy neighbors

### Implementation Approach

1. **Add Authentication:** Integrate Clerk, Auth0, or Supabase Auth
2. **Add Database:** Use Supabase or PlanetScale for user data, watchlists, and reports
3. **Scope All Data:** Every database query includes user_id or org_id filter
4. **Configuration Templates:** Create region-specific templates (Iran, Syria, Yemen) that users can customize
5. **API Key Model:** Platform keys (simplest) or let tenants bring their own keys (stored encrypted and scoped)

---

## 5. Additional Architectural Considerations

### 5.1 Reliability Patterns

- **Retry Logic with Exponential Backoff:** 3 attempts with 1s, 2s, 4s delays for 429/5xx errors
- **Respect `Retry-After`:** when upstream returns `Retry-After`, prefer it over calculated backoff (still bounded).
- **Stage-Specific Errors:** Return error codes indicating translate vs search vs analyze failure
- **Circuit Breaker Pattern:** If a source consistently fails (3+ times), temporarily disable for 5 minutes rather than failing whole scan
- **Timeout Handling:** 30s per API call with graceful degradation; **Deep Dive mode** may allow longer timeouts (e.g. 60s) because the user explicitly opts for thoroughness over speed.

### 5.2 Quality Improvements

- **Coverage Metadata:** Display as metadata, don't enforce minimums
- **Temporal Awareness:** Weight recent articles higher; flag stale information
- **Entity Extraction:** Track key entities (people, organizations, locations) across reports

### 5.3 UX Improvements (Future)

- **Scheduled Monitoring:** Cron-based automatic daily/weekly scans with email digests
- **Alert System:** Push notifications for high-significance events
- **Report History:** Store and compare reports over time for trend analysis
- **Export Functionality:** PDF/DOCX export for sharing reports

### 5.5 Deep Dive Telemetry (Quality, not cost)

Deep Dive is opt-in and should be measured by whether it improves **quality outcomes**, e.g.:
- Did Deep Dive materially increase relevant source count?
- Did it increase full-text retrieval success rate?
- Did it reduce missing-citation or ungrounded-entity warnings?

### 5.4 Context-Independent Generalization (Future)

- **Region Configuration Files:** Move source lists, political leanings, translation prompts to config
- **Language Module System:** Abstract translation to support Arabic, Russian, Chinese
- **Political Spectrum Templates:** Define categories per region (e.g., Assad-aligned vs Opposition for Syria)

---

## 6. Version Status & Priority Summary

### V2 Completion Status (Current)

**Deployed:** https://iranian-media-intelligence-v2.vercel.app/

| Priority | Focus Area | Status |
|----------|------------|--------|
| **P0** | Correctness + Risk | ✅ Complete |
| **P1** | Reliability + Quality | ✅ Complete |
| **P2.10** | Soft Consistency Warnings | ✅ Complete |
| **P2.11** | Evaluator Agent | ⏸️ Deferred to V3 |
| **P2.9** | Deep Dive Mode | ⏸️ Future |
| **P3** | Productization | ⏸️ Future |

### V3 Architecture Preview

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

**V3 Benefits:**
- Data persistence (watchlists, sources, reports survive page refresh)
- Background jobs (15+ min runtime, no Edge timeout pressure)
- Re-enable evaluator agent with proper constraints
- Scale to 20-40 articles per topic
- Multi-user support with Firebase Auth

**Full V3 Plan:** [FIREBASE_INTEGRATION_PLAN.md](./FIREBASE_INTEGRATION_PLAN.md)

### Deferred / Dropped (to avoid complexity)

- ❌ **Adaptive Router Agent** — too much behavior opacity early
- ❌ **Back-translation validation** — often expensive/noisy relative to benefit
- ❌ **Multi-model fallback (Claude/GPT)** — unless you truly need redundancy
- ❌ **Diversity-based auto-triggers** — low diversity is often the signal, not a failure
- ❌ **Complex multi-agent "court" architecture** — start with lightweight verifier first

### Deferred to Future (P2+): Query Optimization Layer

To avoid premature complexity, defer these until (and unless) query quality is proven to be a major failure mode in practice:
- **LLM-based query grader**
- **Alias/transliteration expansion**
- **Multiple query repair attempts**

These are valuable, but together they constitute a scoped **Query Optimization Layer** and should not be bolted onto basic sanity checks.

---

## 7. Conclusion

V2 delivers a production-grade intelligence monitoring platform with **grounding, clear signaling, and resilience** as the core pillars:

### V2 Implemented Features

1. ✅ **Grounding checks** — citations required, uncited sentences flagged
2. ✅ **Retry/backoff logic** — API resilience with exponential backoff
3. ✅ **Coverage metadata** — measure and display, thin coverage as valid signal
4. ✅ **Translation/query sanity checks** — Persian script detection, length guards, auto-retry
5. ✅ **Lightweight verifier pass** — citation counting, consistency warnings
6. ✅ **Evidence quality tags** — articles tagged as full/short-text/truncated
7. ✅ **Conservative auto-repair** — query regeneration for pipeline failures only

### V3 Roadmap

V3 will add persistent storage and background processing via Firebase + Inngest:
- Re-enable evaluator agent with proper timeout constraints
- Scale to 20-40 articles per topic
- Multi-user support with authentication
- Data persistence across page refreshes

The north star remains: **robust, usable, reliable; avoid over-complexity.**

---

**V2 Deployed:** https://iranian-media-intelligence-v2.vercel.app/
**V3 Plan:** [FIREBASE_INTEGRATION_PLAN.md](./FIREBASE_INTEGRATION_PLAN.md)
*For implementation tasks and acceptance criteria, see [DEVELOPER_PLAN.md](./DEVELOPER_PLAN.md)*
