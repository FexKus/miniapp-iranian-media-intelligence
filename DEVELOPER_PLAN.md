# Developer Plan: Iranian Media Intelligence Improvements

**Actionable implementation roadmap for developers**
*January 2026 | Version 1.0*

> **Reference:** For detailed rationale, trade-off analysis, and architectural context, see [ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md)

---

## P0: Must-Do (Correctness + Risk Reduction)

### 1. Dynamic Sources End-to-End ✅
**Goal:** Sources added in UI must actually be searchable by backend.

**Tasks:**
- [x] Validate source URLs on add (format check, domain allowlist optional)
  - *Implemented in `api/_shared.ts`: `isValidHostname()` with comprehensive validation*
- [x] Pass user-configured sources to `/api/search` endpoint
  - *Removed hardcoded `INITIAL_SOURCES` filter from `api/search.ts`*
- [x] Add UI feedback if a source is unsearchable or returns errors
  - *Added `searchWarning` field to Report type, surfaced in Dashboard.tsx*
  - *Warning displayed when no valid domains or domain limit exceeded*
- [x] Prevent silent filtering/mismatches between UI and backend
  - *Domain validation now happens server-side with clear warnings*
  - *25-domain limit documented with `MAX_DOMAINS` constant and logged when triggered*

**Acceptance Criteria:**
- ✅ Adding a new source in UI → that source appears in search results
- ✅ Invalid source URL → clear error message to user

**Test Coverage:**
- Unit tests: `api/_shared.test.ts` (38 tests: hostname validation + query/article validation + retry helpers)
- Integration tests: `api/search.test.ts` (10 tests for domain flow + error handling)

---

### 2. No Secret Exposure in Frontend ✅
**Goal:** Never expose API keys in browser bundle.

**Tasks:**
- [x] Audit Vite config for any `GEMINI_API_KEY` or secret injection
  - *Removed `define` block from `vite.config.ts` that was injecting secrets*
- [x] Ensure all Gemini calls route through `/api/*` endpoints only
  - *All API calls go through `/api/translate`, `/api/search`, `/api/analyze`*
- [ ] Add build-time check that flags exposed secrets
  - *Deferred: Manual audit sufficient for now*
- [ ] Document which env vars are server-only vs public
  - *Deferred: Can add to README when needed*

**Acceptance Criteria:**
- ✅ `grep -r "GEMINI" dist/` returns zero matches
- ✅ All LLM calls happen server-side

---

### 3. Thin Coverage as First-Class Outcome ✅
**Goal:** 0-1 sources reporting is valid signal, not failure.

**Tasks:**
- [x] Add `coverageMetadata` to report schema:
  - *Implemented in `types.ts`: `CoverageMetadata` interface with all fields*
  - *Computed in `monitoringEngine.ts`: `computeCoverageMetadata()` function*
- [x] Display coverage badge in report UI (e.g., "1 source / reformist-leaning")
  - *Implemented in `Dashboard.tsx`: Color-coded badge showing source count and leaning distribution*
- [x] Add "thin coverage" explainer tooltip: "Limited reporting may itself be significant"
  - *Implemented in `Dashboard.tsx`: Info icon with tooltip for low confidence coverage*
- [x] Remove any logic that treats low count as error/retry trigger
  - *No such logic existed; coverage is purely informational*

**Acceptance Criteria:**
- ✅ Report with 1 source displays cleanly with coverage metadata
- ✅ No automatic retry triggered by source count alone

---

## P1: High Impact, Low Complexity (Reliability + Quality)

### 4. Grounding Enforcement (Citations) ✅
**Goal:** Key claims must cite sources; flag missing citations.

**Tasks:**
- [x] Update analysis prompt to require `(Source N)` citations in Executive Summary and Significance
  - *Enhanced prompt in `api/analyze.ts` with strict citation requirements*
- [x] Add lightweight verifier pass that checks:
  - *Implemented in `api/analyze.ts`: Regex-based citation checking*
  - *Checks Executive Summary for uncited sentences*
  - *Returns citation count and warnings*
- [x] Return structured verification result:
  - *Implemented: `verifierWarnings` array in response*
  - *Includes uncited sentence count and missing citation warnings*
- [x] Display warnings in UI if citations missing (don't block report)
  - *Implemented in `Dashboard.tsx`: Amber warning box for citation check warnings*

**Optional Enhancement:**
- [ ] Extract 1-3 short supporting snippets (< 50 words each) for top claims
  - *Deferred: Can add later if needed*

**Acceptance Criteria:**
- ✅ Generated reports include inline citations
- ✅ Missing citation → structured warning displayed to analyst
- ✅ Verifier issues are actionable (specific sentence + issue type)

---

### 5. Evidence Bundle UX ✅
**Goal:** Analysts can quickly verify claims against sources.

**Tasks:**
- [x] Ensure report UI shows:
  - *Source count and domains: Shown in coverage badge and source cards*
  - *Publication dates: Displayed on each source card*
  - *Political leaning labels: Purple badges on each source card*
  - *Direct links to original articles: "View original" links with external icon*
- [x] Add source numbering (Source 1, Source 2...) matching analysis citations
  - *Implemented in `Dashboard.tsx`: Bold "Source N" labels on each card*
- [x] Keep source links prominent (not buried in footnotes)
  - *Enhanced sources footer with clickable cards and prominent links*

**Optional Enhancement:**
- [ ] Add "View Evidence" expandable section per claim (if quote extraction enabled)
  - *Deferred: Requires quote extraction feature*

**Acceptance Criteria:**
- ✅ Every claim's source is one click away
- ✅ Coverage metadata visible at report header

---

### 6. Query Sanity Checks ✅
**Goal:** Catch broken queries before they degrade retrieval quality.

**Tasks:**
- [x] **Persian script check:** Verify translated query contains Persian characters (Unicode U+0600-U+06FF)
  - *Implemented in `api/_shared.ts`: `validatePersianQuery()` function with regex check*
- [x] **Length guard:** Max 200 characters for search query; truncate or regenerate if exceeded
  - *Implemented in `api/_shared.ts`: `MAX_QUERY_LENGTH = 200` with truncation*
- [x] **Auto-regenerate once:** If query fails checks, retry translation with stricter prompt
  - *Implemented in `api/translate.ts`: Automatic retry with stricter prompt on validation failure*
- [x] Surface warning if regenerated query still looks weak
  - *Warnings returned via `queryWarnings` field and displayed in `Dashboard.tsx`*

**Deferred:**
- [ ] **Topic alignment:** Check that query contains at least one core entity from original topic
  - *Deferred: Adds complexity, can revisit if query quality issues arise*

**Acceptance Criteria:**
- ✅ Query without Persian script → auto-regenerate + warning
- ✅ Query > 200 chars → auto-truncate or regenerate
- ✅ Warnings logged and optionally shown to user

---

### 7. Hard Gate Validations ✅
**Goal:** Enforce data contracts at pipeline boundaries.

**Tasks:**
- [x] **URL validation:** Check format and validate hostname
  - *Implemented in `api/_shared.ts`: `validateArticle()` checks for valid URL*
- [x] **Short text handling:** Tag articles with < 100 characters as `evidenceQuality: 'short-text'`
  - *Implemented in `api/_shared.ts`: `MIN_TEXT_LENGTH = 100` with quality tagging*
  - *Articles tagged as 'full', 'short-text', or 'truncated' based on text length*
- [x] **Junk detection:** Exclude if text is clearly junk (cookie banners, nav text, error pages)
  - *Implemented in `api/_shared.ts`: `JUNK_PATTERNS` regex array for common junk content*
- [x] **Required fields:** Ensure `title`, `url` present before analysis
  - *Implemented in `api/_shared.ts`: `validateArticle()` checks required fields*
- [x] Display evidence quality indicator in UI
  - *Implemented in `Dashboard.tsx`: Badges for "Short text" and "No text" on source cards*

**Deferred:**
- [ ] **Timestamp validation:** Article dates within expected range
  - *Deferred: Date filtering already handled by Exa search parameters*

**Acceptance Criteria:**
- ✅ Malformed data caught before analysis stage
- ✅ Clear error messages for validation failures
- ✅ Short but legitimate articles are included with quality tag, not dropped

---

### 8. Resilience Patterns (Exa/Gemini) ✅
**Goal:** Handle transient failures gracefully.

**Tasks:**
- [x] **Retry with adaptive backoff:**
  - *Implemented in `api/_shared.ts`: `withRetry()` utility function*
  - *3 attempts with exponential backoff (1s, 2s, 4s) for 429/5xx errors*
  - *Respects `Retry-After` header when present*
  - *Configurable via `RetryConfig` interface*
- [x] **Stage-specific errors:** Return error codes indicating which stage failed
  - *Already implemented: Each API endpoint returns clear error messages*
  - *Errors surface to UI with stage indication (translate/search/analyze)*
- [x] **Timeout handling:**
  - *`api/analyze.ts`: `maxDuration: 60` for thorough analysis*
  - *`withRetry()`: Configurable `maxDelayMs` (default 10s)*

**Deferred:**
- [ ] **Circuit breaker:** If a source fails 3+ consecutive times, disable for 5 minutes
  - *Deferred: Can add if source-specific failures become an issue*

**Acceptance Criteria:**
- ✅ Transient 429 error → automatic retry succeeds
- ✅ Persistent failure → clear error message indicating which stage failed
- ✅ `Retry-After` header respected when present

---

## P2: Capability Upgrades (Opt-In)

**Order note:** Prioritize reliability improvements first (Soft Consistency Warnings → Evaluator Agent), **run an end-to-end monitoring test**, then add **Deep Dive** as the final step.
**Design note:** Agentic Design Patterns chapters 18/14/4/19/16/6/17 inform guardrails, evaluator checks, and Deep Dive reasoning.

### 9. Deep Dive Mode (Manual Toggle)
**Goal:** Analyst-triggered comprehensive search for difficult topics.

**Tasks:**
- [ ] Add "Deep Dive" toggle button in UI
- [ ] When enabled:
  - Broaden time window (e.g., 7 days → 30 days)
  - Try 2-3 query variants (synonyms, alternative transliterations)
  - Increase result limit (e.g., 10 → 25 articles)
  - Optionally fetch full article text if truncated
  - Allow longer API timeouts (60s vs 30s default)
- [ ] Display "Deep Dive" badge on resulting report
- [ ] Track Deep Dive for **quality telemetry** (not just cost):
  - Did Deep Dive materially increase relevant source count?
  - Did it increase full-text retrieval success rate?
  - Did it reduce hallucination warnings / missing citations?
- [ ] Show time increase to user (usability, not cost concern)

**Acceptance Criteria:**
- Toggle is manual, not automatic
- Deep Dive produces more comprehensive results
- Quality metrics tracked to validate Deep Dive effectiveness

---

### 10. Soft Consistency Warnings
**Goal:** Flag likely hallucinations without blocking reports.

**Tasks:**
- [ ] Extract named entities from generated summary
- [ ] Check if each entity appears in at least one source text
- [ ] If entity has zero presence in sources, add warning:
  ```
  ⚠️ Possible ungrounded claim: "Majles" not found in sources
  ```
- [ ] Display warnings in report UI (collapsible section)
- [ ] Never block report generation based on these warnings

**Acceptance Criteria:**
- Ungrounded entity → warning displayed
- Report still generates and displays

---

### 11. Evaluator Agent (Narrow Scope)
**Goal:** Automated quality check for faithfulness + citation coverage.

**Prerequisite:** Only implement after P1 verifier pass is validated.

**Tasks:**
- [ ] Single LLM call that reviews report against evidence bundle
- [ ] Check only:
  - Citation coverage (are key claims cited?)
  - Faithfulness (do claims match source content?)
- [ ] Output structured result:
  ```typescript
  interface EvaluatorResult {
    citationScore: number; // 0-100
    faithfulnessScore: number; // 0-100
    issues: Array<{ claim: string; issue: string }>;
  }
  ```
- [ ] Display scores in report metadata

**Acceptance Criteria:**
- Evaluator runs in < 5 seconds
- Scores correlate with actual quality issues
- Does not block report generation

---

## P3: Productization (After Core Stability)

### 12. Multi-Tenant Architecture
**Goal:** Shared backend with strict user isolation.

**Tasks:**
- [ ] Integrate auth provider (Clerk, Auth0, or Supabase Auth)
- [ ] Add database for user data (Supabase or PlanetScale)
- [ ] Scope all queries by `user_id` or `org_id`
- [ ] Implement per-tenant rate limits and quotas
- [ ] Create configuration templates per region (Iran, Syria, Yemen)
- [ ] Support platform API keys or tenant-provided keys (encrypted)

**Acceptance Criteria:**
- User A cannot see User B's data
- Rate limits prevent noisy neighbors
- New user onboarding < 5 minutes

---

### 13. Scheduling and Alerts
**Goal:** Automated monitoring with notifications.

**Prerequisite:** Only implement after core pipeline is reliable.

**Tasks:**
- [ ] Cron-based scheduled scans (daily/weekly)
- [ ] Email digest delivery
- [ ] Push notifications for high-significance events
- [ ] Report history storage and comparison
- [ ] Trend analysis across time periods

**Acceptance Criteria:**
- Scheduled scan runs reliably
- High-significance event → notification delivered

---

## Automatic Repair Triggers (Reference)

**Conservative auto-repair only triggers for clear pipeline malfunctions:**

| Trigger | Condition | Action |
|---------|-----------|--------|
| Broken query | Zero results AND query fails sanity checks | Regenerate query once |
| Irrelevant results | Results have < 20% keyword overlap with topic | Regenerate query once |
| Missing content | > 50% of results have empty/truncated text | Try deep fetch for top results |

**Guardrails:**
- Max 1 automatic repair attempt per topic
- Always log trigger reason
- Never trigger on low count or single-leaning alone

---

## Explicit Non-Goals (Dropped or Deferred)

To maintain focus and avoid over-engineering:

- ❌ **Adaptive Router Agent** — behavior opacity, hard to debug
- ❌ **Back-translation validation** — expensive, noisy signal
- ❌ **Multi-model fallback** — defer unless critical
- ❌ **Diversity-based auto-triggers** — thin coverage is valid signal
- ❌ **Complex multi-agent architecture** — start with lightweight verifier

### Deferred to Future (P2+): Query Optimization Layer

The following were considered but deferred to avoid premature complexity. Revisit if query quality proves to be a major failure mode in practice:

- ⏸️ **LLM-based query grader** — adds an LLM call before search; essentially a mini query-planning agent
- ⏸️ **Alias/transliteration expansion** — auto-expanding entities to variants (e.g., "مجلس / مجلس شورای اسلامی")
- ⏸️ **Multiple repair attempts** — allowing 2+ query regeneration attempts

**Rationale:** These are valuable quality upgrades, but they constitute a "Query Optimization Layer" that should be scoped and implemented deliberately — not bolted onto sanity checks. Get the basic pipeline rock-solid first, then layer on intelligence.

---

## Implementation Order

```
Phase 1 (Week 1-2): P0 items — correctness and security
Phase 2 (Week 3-4): P1 items — reliability and quality
Phase 3 (Week 5):   P2 reliability improvements + end-to-end test
Phase 4 (Week 6):   P2 Deep Dive mode (opt-in)
Phase 5 (Future):   P3 items — productization
```

---

*For architectural rationale and detailed trade-off analysis, see [ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md)*
