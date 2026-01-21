# Code Patterns Reference: TypeScript Adaptations

**Reusable implementation patterns adapted from Agentic Design research**
*January 2026*

> **Source:** Patterns extracted from `Agentic_Design_Patterns.pdf` in the NotebookLM project "Agentic Design Patterns: Frameworks and Architectures". Original code examples are in Python (ADK/CrewAI frameworks). This document adapts them to TypeScript for Vercel Edge Functions.

---

## 1. Structured Validation with Zod (from Pydantic Pattern)

**Original Source:** `Agentic_Design_Patterns.pdf` → Section on "Content Policy Enforcer" pattern using Pydantic `BaseModel` for guardrail validation.

**Original Python Pattern:**
```python
from pydantic import BaseModel, Field, ValidationError

class PolicyEvaluation(BaseModel):
    compliance_status: str = Field(..., description="Must be 'compliant' or 'non-compliant'")
    evaluation_summary: str = Field(..., description="Summary of the evaluation")
    triggered_policies: List[str] = Field(default_factory=list, description="List of triggered policies")

# Validation
evaluation = PolicyEvaluation.model_validate(data)
```

### TypeScript Adaptation (using Zod)

```typescript
import { z } from 'zod';

// ============================================================
// Verifier Result Schema (Section 4: Grounding Enforcement)
// ============================================================

const VerifierIssueSchema = z.object({
  sentence: z.string().describe('The sentence being flagged'),
  issue: z.enum(['missing_citation', 'contradicts_source', 'ungrounded_entity']),
  severity: z.enum(['error', 'warning']),
  details: z.string().optional(),
});

const VerifierResultSchema = z.object({
  passed: z.boolean(),
  issues: z.array(VerifierIssueSchema),
});

export type VerifierIssue = z.infer<typeof VerifierIssueSchema>;
export type VerifierResult = z.infer<typeof VerifierResultSchema>;

// ============================================================
// Usage in Verifier Function
// ============================================================

export function parseVerifierResponse(rawOutput: unknown): VerifierResult {
  try {
    // Handle string output (LLM returns JSON as string)
    const data = typeof rawOutput === 'string'
      ? JSON.parse(rawOutput)
      : rawOutput;

    // Validate against schema
    return VerifierResultSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Return structured failure instead of throwing
      return {
        passed: false,
        issues: [{
          sentence: '[Verifier output parsing failed]',
          issue: 'ungrounded_entity',
          severity: 'error',
          details: `Validation error: ${error.errors.map(e => e.message).join(', ')}`,
        }],
      };
    }
    throw error;
  }
}
```

### Coverage Metadata Schema

```typescript
// ============================================================
// Coverage Metadata Schema (Section 3: Thin Coverage)
// ============================================================

const CoverageMetadataSchema = z.object({
  sourceCount: z.number(),
  uniqueDomains: z.array(z.string()),
  leaningDistribution: z.record(z.string(), z.number()),
  dateRange: z.object({
    earliest: z.string(),
    latest: z.string(),
  }),
  coverageConfidence: z.enum(['high', 'medium', 'low']),
});

export type CoverageMetadata = z.infer<typeof CoverageMetadataSchema>;

// Helper to compute coverage confidence
export function computeCoverageConfidence(metadata: Omit<CoverageMetadata, 'coverageConfidence'>): CoverageMetadata['coverageConfidence'] {
  const { sourceCount, uniqueDomains, leaningDistribution } = metadata;
  const leaningCount = Object.keys(leaningDistribution).length;

  if (sourceCount >= 5 && uniqueDomains.length >= 3 && leaningCount >= 2) {
    return 'high';
  } else if (sourceCount >= 2 || uniqueDomains.length >= 2) {
    return 'medium';
  }
  return 'low';
}
```

---

## 2. Stage-Specific Error Handling

**Original Source:** `Agentic_Design_Patterns.pdf` → Section on structured error handling with `try...except` blocks distinguishing `JSONDecodeError`, `ValidationError` from generic `Exception`.

**Original Python Pattern:**
```python
try:
    data = json.loads(output)
    evaluation = PolicyEvaluation.model_validate(data)
except (json.JSONDecodeError, ValidationError) as e:
    # Handle parsing/validation errors (Agent output format issues)
    logging.error(f"Guardrail FAILED: Output failed validation: {e}")
    return False, f"Output failed validation: {e}"
except Exception as e:
    # Handle unexpected system errors
    logging.error(f"Guardrail FAILED: An unexpected error occurred: {e}")
    return False, f"An unexpected error occurred during validation: {e}"
```

### TypeScript Adaptation (Discriminated Union)

```typescript
// ============================================================
// Pipeline Error Types (Section 8: Resilience Patterns)
// ============================================================

export type PipelineStage = 'translate' | 'search' | 'analyze';

export type PipelineError = {
  stage: PipelineStage;
  code: string;
  message: string;
  retryable: boolean;
  rawError?: unknown;
};

// Error factory functions for each stage
export const PipelineErrors = {
  translate: (code: string, message: string, retryable = false, rawError?: unknown): PipelineError => ({
    stage: 'translate',
    code,
    message,
    retryable,
    rawError,
  }),

  search: (code: string, message: string, retryable = false, rawError?: unknown): PipelineError => ({
    stage: 'search',
    code,
    message,
    retryable,
    rawError,
  }),

  analyze: (code: string, message: string, retryable = false, rawError?: unknown): PipelineError => ({
    stage: 'analyze',
    code,
    message,
    retryable,
    rawError,
  }),
};

// ============================================================
// Stage-Specific Error Handling Wrapper
// ============================================================

export async function withStageErrorHandling<T>(
  stage: PipelineStage,
  operation: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: PipelineError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    // Categorize error by type
    if (error instanceof SyntaxError) {
      // JSON parsing error
      return {
        success: false,
        error: PipelineErrors[stage](
          'PARSE_ERROR',
          `Failed to parse ${stage} response: ${error.message}`,
          false,
          error
        ),
      };
    }

    if (error instanceof z.ZodError) {
      // Validation error
      return {
        success: false,
        error: PipelineErrors[stage](
          'VALIDATION_ERROR',
          `Invalid ${stage} output: ${error.errors.map(e => e.message).join(', ')}`,
          false,
          error
        ),
      };
    }

    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status;
      // HTTP errors - determine retryability
      const retryable = status === 429 || (status >= 500 && status < 600);
      return {
        success: false,
        error: PipelineErrors[stage](
          `HTTP_${status}`,
          `${stage} API returned ${status}: ${error.message}`,
          retryable,
          error
        ),
      };
    }

    // Generic unexpected error
    return {
      success: false,
      error: PipelineErrors[stage](
        'UNEXPECTED_ERROR',
        `Unexpected error in ${stage}: ${error instanceof Error ? error.message : String(error)}`,
        false,
        error
      ),
    };
  }
}

// ============================================================
// Usage Example
// ============================================================

async function translateQuery(topic: string): Promise<string> {
  const result = await withStageErrorHandling('translate', async () => {
    const response = await fetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
      const error = new Error(`Translation failed`) as Error & { status: number };
      error.status = response.status;
      throw error;
    }

    return response.json();
  });

  if (!result.success) {
    // Error is now typed with stage information
    console.error(`[${result.error.stage}] ${result.error.code}: ${result.error.message}`);
    throw result.error;
  }

  return result.data.query;
}
```

---

## 3. Retry with Adaptive Backoff

**Original Source:** `Agentic_Design_Patterns.pdf` → Conceptual guidance on "implement retry logic with exponential backoff for transient issues" (no explicit code, references `tenacity` library).

### TypeScript Implementation

```typescript
// ============================================================
// Retry Configuration (Section 8: Resilience Patterns)
// ============================================================

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

// ============================================================
// Retry with Exponential Backoff + Retry-After Support
// ============================================================

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

      // Check if error is retryable
      if (!retryableStatuses.includes(response.status)) {
        throw new Error(`Non-retryable error: ${response.status} ${response.statusText}`);
      }

      // Calculate delay
      let delayMs: number;

      // Respect Retry-After header if present
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        // Retry-After can be seconds or HTTP date
        const retryAfterSeconds = parseInt(retryAfter, 10);
        if (!isNaN(retryAfterSeconds)) {
          delayMs = Math.min(Math.max(retryAfterSeconds * 1000, 0), maxDelayMs);
        } else {
          // Parse as HTTP date
          const retryDate = new Date(retryAfter);
          delayMs = Math.min(Math.max(retryDate.getTime() - Date.now(), 0), maxDelayMs);
        }
      } else {
        // Exponential backoff: 1s, 2s, 4s, ...
        delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      }

      console.log(`[Retry] Attempt ${attempt}/${maxAttempts} failed with ${response.status}. Retrying in ${delayMs}ms...`);

      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Network errors are retryable
      if (attempt < maxAttempts) {
        const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        console.log(`[Retry] Attempt ${attempt}/${maxAttempts} threw error. Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// Usage Example
// ============================================================

async function searchWithRetry(query: string, sources: string[]): Promise<SearchResult[]> {
  return withRetry<SearchResult[]>(
    () => fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, sources }),
    }),
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
    }
  );
}
```

---

## 4. Circuit Breaker Pattern

**Original Source:** `Agentic_Design_Patterns.pdf` → Section on "Graceful Degradation" and "Fallbacks" using a `Sequential Agent` pattern with state flag `primary_location_failed`.

**Original Python Pattern (ADK Framework):**
```python
# Agent 2: Acts as the fallback handler, checking state
fallback_handler = Agent(
    name="fallback_handler",
    instruction="""
    Check if the primary location lookup failed by looking at state["primary_location_failed"]
    - If it is True, extract the city from the user's original query and use...
    - If it is False, do nothing.
    """,
    tools=[get_general_area_info]
)

robust_location_agent = SequentialAgent(
    name="robust_location_agent",
    sub_agents=[primary_handler, fallback_handler, response_agent]
)
```

### TypeScript Adaptation (Simple State-Based Circuit Breaker)

**Applicability note:** This pattern assumes **per-source requests** so you can attribute failures to a specific domain. The current Exa implementation calls a single `/search` with `includeDomains`, so this circuit breaker is **not directly applicable** unless the search strategy is changed to per-source fetching.

```typescript
// ============================================================
// Circuit Breaker for Sources (Section 8: Resilience Patterns)
// ============================================================

interface CircuitState {
  failures: number;
  lastFailure: number | null;
  isOpen: boolean;
}

const CIRCUIT_THRESHOLD = 3;        // failures before opening
const CIRCUIT_RESET_MS = 5 * 60 * 1000;  // 5 minutes

export class SourceCircuitBreaker {
  private circuits: Map<string, CircuitState> = new Map();

  private getState(sourceId: string): CircuitState {
    if (!this.circuits.has(sourceId)) {
      this.circuits.set(sourceId, {
        failures: 0,
        lastFailure: null,
        isOpen: false,
      });
    }
    return this.circuits.get(sourceId)!;
  }

  /**
   * Check if a source is available (circuit is closed or has reset)
   */
  isAvailable(sourceId: string): boolean {
    const state = this.getState(sourceId);

    if (!state.isOpen) {
      return true;
    }

    // Check if circuit should reset (half-open state)
    if (state.lastFailure && Date.now() - state.lastFailure > CIRCUIT_RESET_MS) {
      console.log(`[CircuitBreaker] ${sourceId}: Circuit reset after timeout`);
      state.isOpen = false;
      state.failures = 0;
      return true;
    }

    return false;
  }

  /**
   * Record a successful call (resets failure count)
   */
  recordSuccess(sourceId: string): void {
    const state = this.getState(sourceId);
    state.failures = 0;
    state.isOpen = false;
    state.lastFailure = null;
  }

  /**
   * Record a failure (may open circuit)
   */
  recordFailure(sourceId: string): void {
    const state = this.getState(sourceId);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_THRESHOLD) {
      state.isOpen = true;
      console.log(`[CircuitBreaker] ${sourceId}: Circuit OPEN after ${state.failures} failures`);
    }
  }

  /**
   * Get list of currently unavailable sources
   */
  getUnavailableSources(): string[] {
    return Array.from(this.circuits.entries())
      .filter(([_, state]) => state.isOpen &&
        (!state.lastFailure || Date.now() - state.lastFailure <= CIRCUIT_RESET_MS))
      .map(([sourceId]) => sourceId);
  }

  /**
   * Get status for monitoring/debugging
   */
  getStatus(): Record<string, { failures: number; isOpen: boolean; resetIn?: number }> {
    const status: Record<string, any> = {};

    for (const [sourceId, state] of this.circuits.entries()) {
      status[sourceId] = {
        failures: state.failures,
        isOpen: state.isOpen,
      };

      if (state.isOpen && state.lastFailure) {
        const resetIn = CIRCUIT_RESET_MS - (Date.now() - state.lastFailure);
        if (resetIn > 0) {
          status[sourceId].resetIn = Math.ceil(resetIn / 1000); // seconds
        }
      }
    }

    return status;
  }
}

// ============================================================
// Usage with Search Function
// ============================================================

const circuitBreaker = new SourceCircuitBreaker();

async function searchSources(
  query: string,
  sources: string[]
): Promise<{ results: SearchResult[]; skippedSources: string[] }> {
  const availableSources = sources.filter(s => circuitBreaker.isAvailable(s));
  const skippedSources = sources.filter(s => !circuitBreaker.isAvailable(s));

  if (skippedSources.length > 0) {
    console.log(`[Search] Skipping ${skippedSources.length} sources due to circuit breaker:`, skippedSources);
  }

  const results: SearchResult[] = [];

  for (const source of availableSources) {
    try {
      const sourceResults = await searchSource(query, source);
      circuitBreaker.recordSuccess(source);
      results.push(...sourceResults);
    } catch (error) {
      circuitBreaker.recordFailure(source);
      console.error(`[Search] Source ${source} failed:`, error);
      // Continue with other sources
    }
  }

  return { results, skippedSources };
}
```

---

## 5. Query Sanity Checks

**Original Source:** Developer Plan Section 6 requirements + best practices for input validation.

### TypeScript Implementation

```typescript
// ============================================================
// Query Validation (Section 6: Query Sanity Checks)
// ============================================================

export interface QueryValidationResult {
  valid: boolean;
  query: string;
  warnings: string[];
  shouldRegenerate: boolean;
}

const PERSIAN_REGEX = /[\u0600-\u06FF]/;
const MAX_QUERY_LENGTH = 200;

export function validateQuery(
  query: string,
  originalTopic: string
): QueryValidationResult {
  const warnings: string[] = [];
  let shouldRegenerate = false;

  // 1. Persian script check
  if (!PERSIAN_REGEX.test(query)) {
    warnings.push('Query does not contain Persian characters');
    shouldRegenerate = true;
  }

  // 2. Length guard
  if (query.length > MAX_QUERY_LENGTH) {
    warnings.push(`Query exceeds ${MAX_QUERY_LENGTH} characters (${query.length})`);
    // Truncate as fallback, but flag for regeneration
    query = query.slice(0, MAX_QUERY_LENGTH);
    shouldRegenerate = true;
  }

  // 3. Topic alignment check (simple keyword overlap)
  if (PERSIAN_REGEX.test(originalTopic)) {
    const topicWords = originalTopic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const queryLower = query.toLowerCase();
    const hasTopicOverlap = topicWords.some(word => queryLower.includes(word));

    if (!hasTopicOverlap && topicWords.length > 0) {
      warnings.push('Query may not align with original topic (no keyword overlap)');
      // Don't auto-regenerate for this - just warn
    }
  }

  // 4. Empty or whitespace-only check
  if (!query.trim()) {
    warnings.push('Query is empty or whitespace-only');
    shouldRegenerate = true;
  }

  return {
    valid: warnings.length === 0,
    query,
    warnings,
    shouldRegenerate,
  };
}

// ============================================================
// Query Regeneration Wrapper
// ============================================================

export async function translateWithValidation(
  topic: string,
  translateFn: (topic: string, strict?: boolean) => Promise<string>,
  maxAttempts = 2 // 2 attempts = 1 regeneration
): Promise<{ query: string; warnings: string[]; attempts: number }> {
  let lastQuery = '';
  let allWarnings: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isStrictMode = attempt > 1; // Use stricter prompt on retry
    const query = await translateFn(topic, isStrictMode);
    lastQuery = query;

    const validation = validateQuery(query, topic);
    allWarnings = [...allWarnings, ...validation.warnings.map(w => `[Attempt ${attempt}] ${w}`)];

    if (!validation.shouldRegenerate) {
      return { query: validation.query, warnings: allWarnings, attempts: attempt };
    }

    if (attempt < maxAttempts) {
      console.log(`[QueryValidation] Regenerating query (attempt ${attempt + 1}): ${validation.warnings.join(', ')}`);
    }
  }

  // Return last attempt even if not perfect
  console.warn(`[QueryValidation] Query still has issues after ${maxAttempts} attempts:`, allWarnings);
  return { query: lastQuery, warnings: allWarnings, attempts: maxAttempts };
}
```

---

## 6. Evidence Quality Tagging

**Original Source:** Developer Plan Section 7 requirements for handling short articles.

### TypeScript Implementation

```typescript
// ============================================================
// Evidence Quality Tagging (Section 7: Hard Gate Validations)
// ============================================================

export type EvidenceQuality = 'full' | 'short-text' | 'truncated' | 'junk';

interface ArticleInput {
  title: string;
  url: string;
  publishedDate: string;
  text: string;
}

interface ValidatedArticle extends ArticleInput {
  evidenceQuality: EvidenceQuality;
  qualityWarnings: string[];
}

const MIN_TEXT_LENGTH = 100;
const JUNK_PATTERNS = [
  /cookie|consent|accept all/i,
  /sign in|log in|subscribe/i,
  /page not found|404|error/i,
  /navigation|menu|footer/i,
  /loading\.\.\./i,
];

export function validateArticle(article: ArticleInput): ValidatedArticle | null {
  const warnings: string[] = [];

  // Required fields check
  if (!article.title?.trim()) {
    return null; // Skip articles without titles
  }
  if (!article.url?.trim()) {
    return null;
  }

  const textLength = article.text?.trim().length ?? 0;

  // Check for junk content
  const isJunk = JUNK_PATTERNS.some(pattern => pattern.test(article.text));
  if (isJunk) {
    return null; // Exclude junk
  }

  // Determine evidence quality
  let evidenceQuality: EvidenceQuality = 'full';

  if (textLength === 0) {
    evidenceQuality = 'truncated';
    warnings.push('No article text available');
  } else if (textLength < MIN_TEXT_LENGTH) {
    evidenceQuality = 'short-text';
    warnings.push(`Short text (${textLength} chars) - may be official statement or bulletin`);
  }

  return {
    ...article,
    evidenceQuality,
    qualityWarnings: warnings,
  };
}

export function filterAndTagArticles(articles: ArticleInput[]): {
  validated: ValidatedArticle[];
  excluded: number;
  qualityBreakdown: Record<EvidenceQuality, number>;
} {
  const validated: ValidatedArticle[] = [];
  let excluded = 0;
  const qualityBreakdown: Record<EvidenceQuality, number> = {
    'full': 0,
    'short-text': 0,
    'truncated': 0,
    'junk': 0,
  };

  for (const article of articles) {
    const result = validateArticle(article);
    if (result) {
      validated.push(result);
      qualityBreakdown[result.evidenceQuality]++;
    } else {
      excluded++;
      qualityBreakdown['junk']++;
    }
  }

  return { validated, excluded, qualityBreakdown };
}
```

---

## Summary: Pattern Mapping

| Developer Plan Section | Pattern | Original Source Location |
|------------------------|---------|--------------------------|
| 4. Grounding Enforcement | Zod Validation Schema | `Agentic_Design_Patterns.pdf` → "Content Policy Enforcer" with Pydantic |
| 7. Hard Gate Validations | Evidence Quality Tagging | Developer Plan requirements |
| 6. Query Sanity Checks | Query Validation + Regeneration | Developer Plan requirements |
| 8. Resilience Patterns | Stage-Specific Errors | `Agentic_Design_Patterns.pdf` → Structured error handling |
| 8. Resilience Patterns | Retry with Backoff | `Agentic_Design_Patterns.pdf` → Conceptual (tenacity reference) |
| 8. Resilience Patterns | Circuit Breaker | `Agentic_Design_Patterns.pdf` → "Graceful Degradation" / Sequential Agent fallback |

---

## Installation Notes

To use these patterns, install Zod for runtime validation:

```bash
npm install zod
```

No other dependencies required — the retry, circuit breaker, and validation patterns are implemented with vanilla TypeScript.

---

*For implementation context and priority, see [DEVELOPER_PLAN.md](./DEVELOPER_PLAN.md)*
*For architectural rationale, see [ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md)*
