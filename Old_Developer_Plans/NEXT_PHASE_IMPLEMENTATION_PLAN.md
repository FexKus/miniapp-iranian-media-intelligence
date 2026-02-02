# Next Phase Implementation Plan (P2: Reliability First, Deep Dive Later)

This plan covers the **next phase of changes** in `DEVELOPER_PLAN.md` under **P2: Capability Upgrades (Opt-In)**, with a **reliability-first sequence**.

## Scope (P2) and Order
1. **Reliability Improvements** (Soft Consistency Warnings → Evaluator Agent)
2. **End-to-End Tool Test** (run monitoring after changes)
3. **Deep Dive Mode (Manual Toggle)** – added after reliability is verified

---

## Phase 1: Reliability Improvements

### 1) Soft Consistency Warnings

### Goals
- Allow analysts to opt into a deeper, slower run for important topics.
- Increase recall (more results + broader time window) without altering default behavior.

### Files to Update
- `components/Dashboard.tsx` (Deep Dive toggle and UI labels)
- `services/monitoringEngine.ts` (pass deepDive flag + adjust search parameters)
- `types.ts` (add `deepDive?: boolean` in `Report`, plus optional per-run metadata)
- `services/apiService.ts` (no change unless API needs new params)
- `api/search.ts` (support higher `numResults` and optional wider windows)

### Implementation Outline
- Add a **Deep Dive toggle** per run (global or per-topic) in Dashboard UI.
- Extend `runMonitoring()` to accept a `deepDive` flag and set:
  - `numResults` higher (e.g., 10–25)
  - Wider time range (e.g., 7 → 30 days)
  - Optional stricter/exploratory query prompt for translate (if needed later)
- Mark reports with a **Deep Dive badge** and store the flag in `Report`.
- Track **quality telemetry** fields in report (source count delta, missing citation warnings, truncated/full text ratio).

### Acceptance Criteria
- Deep Dive is **manual only** and clearly indicated in the UI.
- Deep Dive results include **more sources** than default runs (when available).
- Normal runs remain unchanged.

---

### Goals
- Flag possible hallucinations without blocking output.
- Add lightweight checks that stay deterministic and low-risk.

### Files to Update
- `api/analyze.ts` (post-processing check)
- `services/apiService.ts` (return warnings)
- `types.ts` (add `consistencyWarnings?: string[]` to `Report`)
- `components/Dashboard.tsx` (display warnings)

### Implementation Outline
- Extract named entities or key nouns from the **summary** (simple regex or small NLP helper).
- Verify at least one source contains each entity.
- Create warnings like: `Possible ungrounded claim: "Majles" not found in sources`.
- Display warnings in the report UI as collapsible notices.

### Acceptance Criteria
- Warnings appear only when evidence is missing.
- Reports always render (no blocking).

---

### 2) Evaluator Agent (Narrow Scope, Optional)

### Goals
- Add a second-pass evaluator for **faithfulness + citation coverage**.
- Keep it optional and lightweight.

### Files to Update
- `api/analyze.ts` (optional evaluator call)
- `services/apiService.ts` (return scores)
- `types.ts` (add `evaluatorScore` + `evaluatorIssues`)
- `components/Dashboard.tsx` (display scores)

### Implementation Outline
- Add a **single evaluator prompt** that checks only:
  - Citation coverage
  - Faithfulness to sources
- Return structured output:
  ```typescript
  interface EvaluatorResult {
    citationScore: number;
    faithfulnessScore: number;
    issues: Array<{ claim: string; issue: string }>;
  }
  ```
- Do not block output, only annotate.

### Acceptance Criteria
- Evaluator runs within a few seconds.
- Scores correlate with obvious quality issues in practice.

---

## Phase 2: End-to-End Tool Test

- Run a full monitoring cycle with 1–2 topics and confirm:
  - Consistency warnings appear only when expected.
  - Reports still render without blocking.
- If any warnings feel noisy, adjust thresholds before adding Deep Dive.

## Phase 3: Deep Dive Mode (Manual Toggle)

---

### Goals
- Allow analysts to opt into a deeper, slower run for important topics.
- Increase recall (more results + broader time window) without altering default behavior.

### Files to Update
- `components/Dashboard.tsx` (Deep Dive toggle and UI labels)
- `services/monitoringEngine.ts` (pass deepDive flag + adjust search parameters)
- `types.ts` (add `deepDive?: boolean` in `Report`, plus optional per-run metadata)
- `services/apiService.ts` (no change unless API needs new params)
- `api/search.ts` (support higher `numResults` and optional wider windows)

### Implementation Outline
- Add a **Deep Dive toggle** per run (global or per-topic) in Dashboard UI.
- Extend `runMonitoring()` to accept a `deepDive` flag and set:
  - `numResults` higher (e.g., 10–25)
  - Wider time range (e.g., 7 → 30 days)
  - Optional stricter/exploratory query prompt for translate (if needed later)
- Mark reports with a **Deep Dive badge** and store the flag in `Report`.
- Track **quality telemetry** fields in report (source count delta, missing citation warnings, truncated/full text ratio).

### Acceptance Criteria
- Deep Dive is **manual only** and clearly indicated in the UI.
- Deep Dive results include **more sources** than default runs (when available).
- Normal runs remain unchanged.

## Validation & Testing
- Add unit tests for any new helpers (entity extraction, consistency checks).
- Manual sanity check: run monitoring after Phase 1 changes.
- After Deep Dive is added, run a sparse topic and confirm expected behavior.

## Agentic Design Patterns alignment
- The local `Agentic Design Patterns.md` file is a **table of contents** with external links; it does not contain embedded code blocks.
- Relevant inspirations (from the linked chapters) for the **current reliability work**:
  - **Guardrails/Safety Patterns** → Soft consistency warnings (non-blocking guardrails)
  - **Evaluation and Monitoring** → Evaluator Agent (scoped quality check)
  - **Resource-Aware Optimization** → Keep Deep Dive opt-in to avoid expensive default behavior
  - **Routing / Planning / Reasoning** → Deep Dive as a distinct, user‑triggered path with multi‑step reasoning

## Notes
- Keep the system **opt-in** and **predictable**.
- Avoid adding automatic search routing in this phase.
