# Visual Analysis Integration Plan

## Overview
This document outlines the strategy for upgrading the **Iranian Media Intelligence** dashboard from purely text-based analysis to a hybrid interface featuring data visualizations. The goal is to provide analysts with immediate visual insights into source bias, sentiment trends, and publication volume.

## Functionality
We will introduce three core visualizations to the Intelligence Report card:

1.  **Source Leaning Distribution (Donut Chart)**
    *   **What**: Shows the breakdown of intercepted articles by political bloc (e.g., "50% Principlist, 30% Reformist, 20% State").
    *   **Why**: Helps analysts instantly gauge if the coverage is balanced or dominated by a specific faction.

2.  **Sentiment Gauge (Linear/Radial Meter)**
    *   **What**: A visual meter indicating the overall tone of the coverage, ranging from "Hostile" (-10) to "Conciliatory" (+10).
    *   **Why**: Provides a quick-read metric for the intensity of the rhetoric.

3.  **Publication Timeline (Bar Chart)**
    *   **What**: A histogram showing the number of articles published per day over the selected time range.
    *   **Why**: Highlights spikes in coverage that correlate with specific events.

## Implementation Strategy

### 1. Architecture: Hybrid "Structured Extraction"
Instead of using experimental Generative UI (A2UI), we will use a robust, deterministic approach:
*   **AI (Gemini)**: Responsible for *extracting* structured data (JSON) alongside the text summary.
*   **Frontend (React)**: Responsible for *rendering* high-quality, pre-built chart components using that data.

### 2. Tech Stack
*   **Library**: `recharts` (Standard, lightweight React charting).
*   **Styling**: `clsx` + `tailwind-merge` for dynamic component styling.

### 3. Backend Changes (`api/analyze.ts`)
*   **Prompt Engineering**: Modify the Gemini system prompt to output a JSON object containing both the `summary` (markdown) and an `analytics` object.
*   **Data Structure**:
    ```typescript
    interface Analytics {
      leaningCounts: Record<string, number>; // e.g. { "Principlist": 5, "Reformist": 2 }
      sentimentScore: number; // -10 to +10
      topKeywords: string[];
      timeline: { date: string; count: number }[];
    }
    ```

### 4. Frontend Components
*   **`components/VisualAnalytics.tsx`**: The main container that safely renders charts if data exists.
*   **`components/analytics/LeaningChart.tsx`**: Renders the Donut chart with custom colors matching the source badges.
*   **`components/analytics/TimelineChart.tsx`**: Renders the Bar chart for temporal analysis.

## Future Expansion
*   **Heatmaps**: To show coverage intensity across different topics vs. sources.
*   **Narrative Comparison**: Side-by-side cards comparing specific narratives from opposing blocs.
