# Multi-Agent Search Architecture Brainstorming

> Date: 2026-02-02
> Status: Proposal / Future Implementation

## Current Architecture

The current system uses a **single sequential pipeline**:

```
Translate → Search (1 Exa call) → Analyze → Evaluate
```

### Current Search Limitations

From `inngest/functions/analyzeReport.ts`:

```typescript
const MAX_DOMAINS = 50;      // Hard limit on domains per search
const MAX_ARTICLES = 20;     // Hard limit on articles returned
```

- **Single Exa API call** with one Persian query
- **Max 50 domains** searched at once
- **Max 20 articles** returned total
- Sequential execution = slower for large domain sets

---

## Proposed: Parallel Search Agents

### Concept

Split domains across multiple parallel search agents, merge results, then analyze.

```
┌─────────────────────────────────────────────────────────┐
│  30 domains → Split into 3 parallel searches            │
│                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ Search Agent │ │ Search Agent │ │ Search Agent │    │
│  │ Domains 1-10 │ │ Domains 11-20│ │ Domains 21-30│    │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘    │
│         │                │                │             │
│         ▼                ▼                ▼             │
│      Articles         Articles         Articles         │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│              Merge + Dedupe by URL                      │
│                          ▼                              │
│                 Analysis Agent                          │
└─────────────────────────────────────────────────────────┘
```

### Benefits

| Benefit | Description |
|---------|-------------|
| **Faster search** | ~3x speedup with parallel Exa calls |
| **Same cost** | 3 smaller searches ≈ 1 large search in API costs |
| **Better coverage** | Each batch can return up to 20 articles |
| **More articles** | Current: 20 max → Proposed: up to 60 before dedup |
| **Scalable** | Add more agents as domain list grows |

### Implementation Approach

1. **Split domains into chunks** based on count:
   - <15 domains → 1 agent (no change)
   - 15-30 domains → 2 agents
   - 30+ domains → 3 agents
   - Could scale further: 1 agent per 10-15 domains

2. **Parallel execution** using `Promise.all()`:
   ```typescript
   const chunks = splitIntoChunks(domains, 3);
   const searchPromises = chunks.map(chunk =>
     searchArticles(query, chunk, timeRange, ...)
   );
   const results = await Promise.all(searchPromises);
   ```

3. **Merge and deduplicate** results by URL:
   ```typescript
   const allArticles = results.flatMap(r => r.results);
   const seen = new Set<string>();
   const deduped = allArticles.filter(a => {
     if (seen.has(a.url)) return false;
     seen.add(a.url);
     return true;
   });
   ```

4. **Pass merged articles** to analysis step (unchanged)

### Code Location

Changes would be localized to:
- `inngest/functions/analyzeReport.ts` - search step (lines 394-402)
- Add helper function `splitIntoChunks()`
- Merge logic after parallel searches

The analysis step remains unchanged - it just receives more articles.

---

## Alternative Considered: Query Diversification

Another multi-agent approach was considered but **not prioritized**:

### Concept

Generate multiple Persian query variations for the same topic to capture different terminology.

```
Topic: "Iran nuclear negotiations"
       ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Query 1     │  │ Query 2     │  │ Query 3     │
│ مذاکرات     │  │ برنامه      │  │ تحریم‌های   │
│ هسته‌ای     │  │ اتمی ایران  │  │ هسته‌ای     │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Why Not Prioritized

- Adds complexity to translation step
- Current single-query approach is working adequately
- Domain parallelization gives better ROI for the use case
- Could be added later as a second optimization layer

---

## Multi-Agent Analysis (Not Recommended)

### Considered Options

| Strategy | Value | Reasoning |
|----------|-------|-----------|
| **Perspective lenses** | LOW-MEDIUM | Political vs. economic vs. social analysts - significant cost increase |
| **Cross-validation** | LOW | The evaluator step already validates citations |
| **Task specialization** | LOW | Current briefing format is comprehensive |

### Why Not Recommended

- The existing single-pass Gemini analysis produces comprehensive briefings
- The evaluator step already provides quality validation
- Multi-agent analysis would significantly increase API costs
- Diminishing returns compared to search parallelization

---

## Next Steps

1. [ ] Implement domain chunking logic
2. [ ] Add parallel search execution with `Promise.all()`
3. [ ] Implement merge/dedup for combined results
4. [ ] Update Firestore progress reporting for parallel searches
5. [ ] Test with 30+ domain configurations
6. [ ] Monitor performance improvements

---

## Configuration Considerations

```typescript
// Suggested new constants
const DOMAINS_PER_SEARCH_AGENT = 15;  // Split threshold
const MAX_SEARCH_AGENTS = 4;           // Cap parallel searches
const MAX_TOTAL_ARTICLES = 50;         // After merge/dedup
```

These could be environment variables for easy tuning.
