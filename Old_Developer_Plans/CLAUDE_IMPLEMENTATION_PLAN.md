# Implementation Plan: DEVELOPER_PLAN.md P0-P1 Items

**Saved: January 2026 | For context recovery if session is compacted**

## Overview

This plan implements the remaining P0 item and all P1 items from DEVELOPER_PLAN.md:

- **P0.3**: Thin Coverage as First-Class Outcome
- **P1.4**: Grounding Enforcement (Citations)
- **P1.5**: Evidence Bundle UX
- **P1.6**: Query Sanity Checks
- **P1.7**: Hard Gate Validations
- **P1.8**: Resilience Patterns

## Implementation Order

Based on dependencies and impact:

1. **P0.3 Thin Coverage** - Foundational metadata structure
2. **P1.6 Query Sanity Checks** - Prevents broken queries upstream
3. **P1.7 Hard Gate Validations** - Data quality gates
4. **P1.8 Resilience Patterns** - API reliability
5. **P1.4 Grounding Enforcement** - Citation requirements
6. **P1.5 Evidence Bundle UX** - Final UI polish

## Key File Locations (Verified)

| File                             | Key Lines | Purpose                                 |
| -------------------------------- | --------- | --------------------------------------- |
| `types.ts`                     | L34-46    | Report interface to extend              |
| `api/_shared.ts`               | ~45 lines | Add validation utilities                |
| `api/translate.ts`             | L53-56    | Returns `{ persianQuery, modelUsed }` |
| `api/search.ts`                | L75-103   | Article mapping & filtering             |
| `api/analyze.ts`               | L47-83    | Analysis prompt                         |
| `components/Dashboard.tsx`     | L218-245  | Sources footer                          |
| `services/monitoringEngine.ts` | L89-112   | Orchestration flow                      |
| `services/apiService.ts`       | L5-47     | API client wrappers                     |

---

## Phase 1: P0.3 - Thin Coverage as First-Class Outcome

### Goal

0-1 sources reporting is a valid signal, not a failure. Display coverage metadata prominently.

### Files to Modify

| File                             | Changes                                         |
| -------------------------------- | ----------------------------------------------- |
| `types.ts`                     | Add `CoverageMetadata` interface              |
| `services/monitoringEngine.ts` | Compute coverage metadata after search          |
| `components/Dashboard.tsx`     | Display coverage badge and confidence indicator |

### Implementation Details

**1. types.ts - Add interfaces and update Report (after line 32)**

```typescript
export type EvidenceQuality = 'full' | 'short-text' | 'truncated';

export interface CoverageMetadata {
  sourceCount: number;
  uniqueDomains: string[];
  leaningDistribution: Record<string, number>;
  dateRange: { earliest: string; latest: string } | null;
  coverageConfidence: 'high' | 'medium' | 'low';
}

// Update ArticleResult to include:
export interface ArticleResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  text: string;
  domain: string;
  evidenceQuality?: EvidenceQuality;  // NEW
}

// Update Report interface to include these new fields:
export interface Report {
  // ... existing fields ...
  coverage?: CoverageMetadata;         // NEW: Coverage metadata
  queryWarnings?: string[];            // NEW: Translation warnings
  verifierWarnings?: string[];         // NEW: Citation check warnings
}
```

**2. monitoringEngine.ts - Compute coverage (after line 99)**

```typescript
function computeCoverageMetadata(
  articles: ArticleResult[],
  domainLeanings: Record<string, string>
): CoverageMetadata {
  const uniqueDomains = [...new Set(articles.map(a => a.domain))];
  const leaningDistribution: Record<string, number> = {};

  for (const article of articles) {
    const leaning = domainLeanings[article.domain] || 'Unknown';
    leaningDistribution[leaning] = (leaningDistribution[leaning] || 0) + 1;
  }

  const dates = articles
    .map(a => a.publishedDate)
    .filter(Boolean)
    .sort();

  const dateRange = dates.length > 0
    ? { earliest: dates[0]!, latest: dates[dates.length - 1]! }
    : null;

  // Confidence based on source diversity
  let coverageConfidence: 'high' | 'medium' | 'low';
  const leaningCount = Object.keys(leaningDistribution).length;

  if (articles.length >= 5 && uniqueDomains.length >= 3 && leaningCount >= 2) {
    coverageConfidence = 'high';
  } else if (articles.length >= 2 || uniqueDomains.length >= 2) {
    coverageConfidence = 'medium';
  } else {
    coverageConfidence = 'low';
  }

  return {
    sourceCount: articles.length,
    uniqueDomains,
    leaningDistribution,
    dateRange,
    coverageConfidence,
  };
}
```

**3. Dashboard.tsx - Coverage Badge (after line ~180)**

```tsx
{report.coverage && (
  <div className="flex items-center gap-2 text-sm mb-4">
    <span className={`px-2 py-1 rounded text-xs font-medium ${
      report.coverage.coverageConfidence === 'high' ? 'bg-green-100 text-green-800' :
      report.coverage.coverageConfidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
      'bg-orange-100 text-orange-800'
    }`}>
      {report.coverage.sourceCount} source{report.coverage.sourceCount !== 1 ? 's' : ''} / {
        Object.entries(report.coverage.leaningDistribution)
          .map(([leaning, count]) => `${count} ${leaning}`)
          .join(', ')
      }
    </span>
    {report.coverage.coverageConfidence === 'low' && (
      <span className="text-gray-500 text-xs" title="Limited reporting may itself be significant - this topic may be underreported or censored">
        ⓘ Thin coverage
      </span>
    )}
  </div>
)}
```

---

## Phase 2: P1.6 - Query Sanity Checks

### Goal

Catch broken queries before they degrade retrieval quality.

### Files to Modify

| File                 | Changes                                     |
| -------------------- | ------------------------------------------- |
| `api/_shared.ts`   | Add `validatePersianQuery()` utility      |
| `api/translate.ts` | Add post-translation validation, auto-retry |
| `types.ts`         | Add `QueryValidationResult` interface     |

### Implementation Details

**1. api/_shared.ts - Query validation utilities (add at end)**

```typescript
const PERSIAN_REGEX = /[\u0600-\u06FF]/;
const MAX_QUERY_LENGTH = 200;

export interface QueryValidationResult {
  valid: boolean;
  query: string;
  warnings: string[];
  shouldRegenerate: boolean;
}

export function validatePersianQuery(
  query: string,
  originalTopic: string
): QueryValidationResult {
  const warnings: string[] = [];
  let shouldRegenerate = false;
  let finalQuery = query;

  // Empty check
  if (!query.trim()) {
    warnings.push('Query is empty');
    shouldRegenerate = true;
    return { valid: false, query, warnings, shouldRegenerate };
  }

  // Persian script check
  if (!PERSIAN_REGEX.test(query)) {
    warnings.push('Query does not contain Persian characters');
    shouldRegenerate = true;
  }

  // Length guard
  if (query.length > MAX_QUERY_LENGTH) {
    warnings.push(`Query exceeds ${MAX_QUERY_LENGTH} characters (${query.length})`);
    finalQuery = query.slice(0, MAX_QUERY_LENGTH);
    shouldRegenerate = true;
  }

  return {
    valid: warnings.length === 0,
    query: finalQuery,
    warnings,
    shouldRegenerate,
  };
}
```

**2. api/translate.ts - Add validation and retry logic (after line 49)**

```typescript
const text = response.text();

// Import validatePersianQuery from _shared.ts
const validation = validatePersianQuery(text, topicTrimmed);

if (validation.shouldRegenerate) {
  // Retry with stricter prompt (one attempt only per DEVELOPER_PLAN guardrails)
  console.log(`[Translate] Regenerating query: ${validation.warnings.join(', ')}`);
  const strictPrompt = isPersian(topicTrimmed)
    ? `Convert this topic into a SHORT Persian search query (max 100 chars). Topic: "${topicTrimmed}". Return ONLY Persian text, nothing else.`
    : `Translate to a SHORT Persian search query (max 100 chars). Topic: "${topicTrimmed}". Return ONLY Persian text, nothing else.`;

  const retryResult = await model.generateContent(strictPrompt);
  const retryText = retryResult.response.text();
  const retryValidation = validatePersianQuery(retryText, topicTrimmed);

  console.log(`[Translate API] Retry result: "${retryText}"`);

  return Response.json({
    persianQuery: (retryValidation.query || retryText || topicTrimmed).trim(),
    modelUsed: modelName,
    queryWarnings: [...validation.warnings, ...retryValidation.warnings],
    regenerated: true,
  });
}

console.log(`[Translate API] Result: "${text}"`);

return Response.json({
  persianQuery: (validation.query || text || topicTrimmed).trim(),
  modelUsed: modelName,
  queryWarnings: validation.warnings.length > 0 ? validation.warnings : undefined,
  regenerated: false,
});
```

**3. services/apiService.ts - Update translateQuery() to capture warnings**

```typescript
export async function translateQuery(_unusedApiKey: string, topic: string, _unusedModel: string): Promise<{
  query: string;
  warnings?: string[];
}> {
  const resp = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic }),
  });
  if (!resp.ok) throw new Error(`Translation failed: ${resp.status}`);
  const data = await resp.json();
  return {
    query: data?.persianQuery ?? topic,
    warnings: data?.queryWarnings,
  };
}
```

**4. services/monitoringEngine.ts - Surface query warnings (after line 65)**

```typescript
const { query: persianQuery, warnings: queryWarnings } = await translateQuery(...);
// Store queryWarnings in report if present
onReportUpdate(item.id, {
  persianQuery,
  queryWarnings, // Add to Report interface
  stage: "Scanning Media...",
});
```

---

## Phase 3: P1.7 - Hard Gate Validations

### Goal

Enforce data contracts at pipeline boundaries.

### Files to Modify

| File               | Changes                                 |
| ------------------ | --------------------------------------- |
| `api/_shared.ts` | Add `validateArticle()` utility       |
| `api/search.ts`  | Add article validation before returning |
| `types.ts`       | Add `EvidenceQuality` type            |

### Implementation Details

**1. types.ts - Add EvidenceQuality**

```typescript
export type EvidenceQuality = 'full' | 'short-text' | 'truncated';

export interface ArticleResult {
  // ... existing fields ...
  evidenceQuality?: EvidenceQuality;
}
```

**2. api/_shared.ts - Article validation**

```typescript
const MIN_TEXT_LENGTH = 100;
const JUNK_PATTERNS = [
  /cookie|consent|accept all/i,
  /sign in|log in|subscribe now/i,
  /page not found|404|error occurred/i,
  /javascript (is )?required/i,
];

export function validateArticle(article: {
  title?: string;
  url?: string;
  text?: string;
  publishedDate?: string;
}): { valid: boolean; evidenceQuality: EvidenceQuality; reason?: string } {
  // Required fields
  if (!article.title?.trim()) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Missing title' };
  }
  if (!article.url?.trim()) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Missing URL' };
  }

  const textLength = article.text?.trim().length ?? 0;

  // Junk detection
  if (article.text && JUNK_PATTERNS.some(p => p.test(article.text!))) {
    return { valid: false, evidenceQuality: 'truncated', reason: 'Junk content detected' };
  }

  // Determine evidence quality
  if (textLength === 0) {
    return { valid: true, evidenceQuality: 'truncated' };
  }
  if (textLength < MIN_TEXT_LENGTH) {
    return { valid: true, evidenceQuality: 'short-text' };
  }
  return { valid: true, evidenceQuality: 'full' };
}
```

**3. api/search.ts - Apply validation (after line 84)**

```typescript
// Tag articles with evidence quality
const validated = mapped.map(article => {
  const validation = validateArticle(article);
  return validation.valid
    ? { ...article, evidenceQuality: validation.evidenceQuality }
    : null;
}).filter(Boolean) as ArticleResult[];
```

---

## Phase 4: P1.8 - Resilience Patterns

### Goal

Handle transient failures gracefully.

### Files to Modify

| File                 | Changes                     |
| -------------------- | --------------------------- |
| `api/_shared.ts`   | Add `withRetry()` utility |
| `api/search.ts`    | Wrap Exa call with retry    |
| `api/analyze.ts`   | Wrap Gemini call with retry |
| `api/translate.ts` | Wrap Gemini call with retry |

### Implementation Details

**1. api/_shared.ts - Retry utility**

```typescript
export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

export async function withRetry<T>(
  operation: () => Promise<Response>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, retryableStatuses } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await operation();

      if (response.ok) {
        return await response.json();
      }

      if (!retryableStatuses.includes(response.status)) {
        throw new Error(`Non-retryable error: ${response.status}`);
      }

      // Calculate delay (respect Retry-After if present)
      const retryAfter = response.headers.get('Retry-After');
      let delayMs = baseDelayMs * Math.pow(2, attempt - 1);

      if (retryAfter) {
        const retryAfterSeconds = parseInt(retryAfter, 10);
        if (!isNaN(retryAfterSeconds)) {
          delayMs = Math.min(retryAfterSeconds * 1000, maxDelayMs);
        }
      }
      delayMs = Math.min(delayMs, maxDelayMs);

      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed with ${response.status}. Retrying in ${delayMs}ms...`);

      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, delayMs));
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}
```

**2. api/search.ts - Wrap Exa call**

```typescript
// Replace direct fetch with retry wrapper
const data = await withRetry<{ results: any[] }>(
  () => fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  }),
  { maxAttempts: 3, baseDelayMs: 1000 }
);
```

---

## Phase 5: P1.4 - Grounding Enforcement (Citations)

### Goal

Key claims must cite sources; flag missing citations.

### Files to Modify

| File                         | Changes                          |
| ---------------------------- | -------------------------------- |
| `api/analyze.ts`           | Update prompt, add verifier pass |
| `types.ts`                 | Add `VerifierResult` interface |
| `components/Dashboard.tsx` | Display citation warnings        |

### Implementation Details

**1. api/analyze.ts - Enhanced prompt (update lines 47-83)**
Add stronger citation requirements:

```typescript
RULES:
- CRITICAL: Every factual statement MUST include a citation like (Source 1) or (Sources 2-3).
- In Executive Summary: Every sentence must cite at least one source.
- In Significance: Every bullet point must cite supporting sources.
- DO NOT make claims without source references.
- If sources disagree, cite both sides: "X claims... (Source 1) while Y argues... (Source 2)".
```

**2. api/analyze.ts - Simple citation check (after getting response)**

```typescript
// Check for citation presence
const citationPattern = /\(Source[s]?\s*\d+(?:[,-]\s*\d+)*\)/gi;
const citationMatches = text.match(citationPattern) || [];

// Extract Executive Summary and check citations
const execSummaryMatch = text.match(/## Executive Summary\n([\s\S]*?)(?=\n##|$)/i);
const execSummary = execSummaryMatch?.[1] || '';
const execSummarySentences = execSummary.split(/[.!?]+/).filter(s => s.trim());
const uncitedSentences = execSummarySentences.filter(
  s => s.trim() && !citationPattern.test(s)
);

const verifierWarnings = uncitedSentences.length > 0
  ? [`${uncitedSentences.length} sentence(s) in Executive Summary may lack citations`]
  : [];

return Response.json({
  summary: text,
  modelUsed: modelName,
  citationCount: citationMatches.length,
  verifierWarnings,
});
```

**3. services/apiService.ts - Update analyzeArticles() to return warnings**

```typescript
export async function analyzeArticles(
  _unusedApiKey: string,
  topic: string,
  articles: ArticleResult[],
  _unusedModel: string,
  domainLeanings?: Record<string, string>
): Promise<{ summary: string; verifierWarnings?: string[] }> {
  const resp = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, articles, domainLeanings }),
  });
  if (!resp.ok) throw new Error(`Analysis failed: ${resp.status}`);
  const data = await resp.json();
  return {
    summary: data?.summary || "Analysis complete, but no text was generated.",
    verifierWarnings: data?.verifierWarnings,
  };
}
```

**4. Dashboard.tsx - Display all warnings (after searchWarning block, ~line 201)**

```tsx
{/* Query warnings */}
{report.queryWarnings?.length > 0 && (
  <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm mb-4 flex items-start gap-2">
    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-blue-600" />
    <div>
      <p className="font-medium text-blue-800">Query Translation Warning</p>
      <ul className="text-blue-700 mt-1 text-xs">
        {report.queryWarnings.map((w, i) => <li key={i}>• {w}</li>)}
      </ul>
    </div>
  </div>
)}

{/* Citation/verifier warnings */}
{report.verifierWarnings?.length > 0 && (
  <div className="bg-amber-50 border border-amber-200 p-3 rounded text-sm mb-4 flex items-start gap-2">
    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
    <div>
      <p className="font-medium text-amber-800">Citation Check</p>
      <ul className="text-amber-700 mt-1 text-xs">
        {report.verifierWarnings.map((w, i) => <li key={i}>• {w}</li>)}
      </ul>
    </div>
  </div>
)}
```

---

## Phase 6: P1.5 - Evidence Bundle UX

### Goal

Analysts can quickly verify claims against sources.

### Files to Modify

| File                             | Changes                                     |
| -------------------------------- | ------------------------------------------- |
| `types.ts`                     | Add `domainLeanings` to Report interface  |
| `services/monitoringEngine.ts` | Include domainLeanings in report            |
| `components/Dashboard.tsx`     | Enhanced source display with leaning labels |

### Implementation Details

**1. types.ts - Add domainLeanings to Report**

```typescript
export interface Report {
  // ... existing fields ...
  domainLeanings?: Record<string, string>;  // NEW: For Evidence Bundle display
}
```

**2. monitoringEngine.ts - Include domainLeanings in report (line ~100)**

```typescript
onReportUpdate(item.id, {
  articles,
  searchWarning,
  coverage,
  domainLeanings, // Pass to report for UI display
  stage: "Analyzing Intelligence...",
});
```

**3. Dashboard.tsx - Enhanced article cards (replace sources footer ~L222-243)**

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
  {report.articles.map((article, idx) => (
    <div key={idx} className="p-3 bg-white border border-gray-200 rounded-md hover:border-accent transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-bold text-accent">Source {idx + 1}</span>
        <div className="flex gap-1">
          {article.evidenceQuality === 'short-text' && (
            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">
              Short text
            </span>
          )}
          {article.evidenceQuality === 'truncated' && (
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              No text
            </span>
          )}
        </div>
      </div>
      <a href={article.url} target="_blank" rel="noreferrer" className="block group">
        <p className="text-sm text-gray-900 font-medium truncate group-hover:text-accent transition-colors mb-2">
          {article.title}
        </p>
      </a>
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{article.domain}</span>
        {report.domainLeanings?.[article.domain] && (
          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            {report.domainLeanings[article.domain]}
          </span>
        )}
        {article.publishedDate && (
          <span className="text-gray-400">{article.publishedDate.split('T')[0]}</span>
        )}
      </div>
      <a href={article.url} target="_blank" rel="noreferrer"
         className="text-accent text-xs hover:underline mt-2 inline-flex items-center gap-1">
        <ExternalLink size={10} /> View original
      </a>
    </div>
  ))}
</div>
```

---

## Verification Plan

### Unit Tests to Add/Update

- `api/_shared.test.ts`: Tests for `validatePersianQuery()`, `validateArticle()`, `withRetry()`
- `api/translate.test.ts`: Tests for query validation and retry logic
- `api/search.test.ts`: Tests for article validation and evidenceQuality tagging

### Manual Testing Checklist

1. **Coverage Metadata**: Run monitoring with 0, 1, 3, and 5+ articles - verify badges display correctly
2. **Query Validation**: Test with English topic, Persian topic, very long topic (>200 chars)
3. **Article Validation**: Verify short-text articles show indicator, junk is filtered
4. **Retry Logic**: Temporarily break API key to test retry behavior (check console logs)
5. **Citations**: Check that warnings appear when summary lacks `(Source N)` citations
6. **Evidence Bundle**: Verify leaning labels appear on article cards, Source N numbering matches analysis

### Smoke Test

```bash
npm run test:run
npm run build
npm run preview
# Then manually run a monitoring scan in the UI
```

---

## Summary of Changes

| Phase | Files Modified                                                | Priority |
| ----- | ------------------------------------------------------------- | -------- |
| 1     | types.ts, monitoringEngine.ts, Dashboard.tsx                  | P0       |
| 2     | _shared.ts, translate.ts, apiService.ts, monitoringEngine.ts  | P1       |
| 3     | _shared.ts, search.ts, types.ts                               | P1       |
| 4     | _shared.ts, search.ts, analyze.ts, translate.ts               | P1       |
| 5     | analyze.ts, apiService.ts, monitoringEngine.ts, Dashboard.tsx | P1       |
| 6     | types.ts, monitoringEngine.ts, Dashboard.tsx                  | P1       |

**Files to Modify:**

- `types.ts` - Add CoverageMetadata, EvidenceQuality, update Report & ArticleResult
- `api/_shared.ts` - Add validatePersianQuery(), validateArticle(), withRetry()
- `api/translate.ts` - Add query validation and retry logic
- `api/search.ts` - Add article validation, wrap Exa with retry
- `api/analyze.ts` - Enhance prompt, add citation check, wrap Gemini with retry
- `services/apiService.ts` - Update return types for translate and analyze
- `services/monitoringEngine.ts` - Compute coverage, pass new fields to report
- `components/Dashboard.tsx` - Display coverage badge, warnings, enhanced source cards

**Estimated New Lines**: ~350-450 lines of implementation code

---

## Risks & Mitigations

| Risk                                     | Mitigation                                           |
| ---------------------------------------- | ---------------------------------------------------- |
| Retry logic could slow down happy path   | Only retry on 429/5xx, not on 4xx client errors      |
| Citation regex could miss edge cases     | Use permissive pattern, warnings only (don't block)  |
| Coverage confidence thresholds arbitrary | Log and iterate based on user feedback               |
| Query validation too strict              | Allow fallback to original topic if all retries fail |

---

## DEVELOPER_PLAN.md Updates

After implementation, mark these items as complete:

- [X] P0.3: Thin Coverage as First-Class Outcome
- [X] P1.4: Grounding Enforcement (Citations)
- [X] P1.5: Evidence Bundle UX
- [X] P1.6: Query Sanity Checks
- [X] P1.7: Hard Gate Validations
- [X] P1.8: Resilience Patterns
