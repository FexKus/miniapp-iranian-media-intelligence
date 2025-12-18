import { ArticleResult, Report, WatchlistItem } from "../types";
import { analyzeArticles, searchExa, translateQuery } from "./apiService";

export interface RunMonitoringParams {
  exaApiKey: string; // unused (kept for backward compatibility)
  geminiApiKey: string; // unused (kept for backward compatibility)
  geminiTranslationModel: string; // unused (kept for backward compatibility)
  geminiAnalysisModel: string; // unused (kept for backward compatibility)
  activeDomains: string[];
  domainLeanings: Record<string, string>;
  items: WatchlistItem[];
  isCancelled: () => boolean;
  onReportInit: (report: Report) => void;
  onReportUpdate: (watchlistItemId: string, update: Partial<Report>) => void;
}

export async function runMonitoring(params: RunMonitoringParams): Promise<void> {
  const {
    exaApiKey,
    geminiApiKey,
    geminiTranslationModel,
    geminiAnalysisModel,
    activeDomains,
    domainLeanings,
    items,
    isCancelled,
    onReportInit,
    onReportUpdate,
  } = params;

  for (const item of items) {
    if (isCancelled()) {
      onReportUpdate(item.id, { status: "cancelled", stage: "Cancelled" });
      continue;
    }

    const report: Report = {
      id: Date.now().toString() + item.id,
      watchlistItemId: item.id,
      topic: item.topic,
      timestamp: Date.now(),
      status: "running",
      stage: "Initializing...",
      articles: [],
    };
    onReportInit(report);

    try {
      onReportUpdate(item.id, { stage: "Translating Topic..." });
      const persianQuery = await translateQuery(geminiApiKey, item.topic, geminiTranslationModel);
      if (isCancelled()) throw new Error("Cancelled");
      onReportUpdate(item.id, { persianQuery, stage: "Scanning Media..." });

      // Small delay to be nice to APIs
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isCancelled()) throw new Error("Cancelled");

      // Calculate dates
      let startPublishedDate: string | undefined;
      let endPublishedDate: string | undefined;

      if (item.timeRange === 'custom' && item.customStartDate && item.customEndDate) {
        startPublishedDate = new Date(item.customStartDate).toISOString();
        endPublishedDate = new Date(item.customEndDate).toISOString();
      } else {
        // Default to last 24h
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        startPublishedDate = yesterday.toISOString();
        // endPublishedDate left undefined means "now"
      }

      const articles: ArticleResult[] = await searchExa(
        exaApiKey, 
        persianQuery, 
        activeDomains, 
        5, 
        startPublishedDate, 
        endPublishedDate
      );
      if (isCancelled()) throw new Error("Cancelled");
      onReportUpdate(item.id, { articles, stage: "Analyzing Intelligence..." });

      const summary = await analyzeArticles(
        geminiApiKey,
        item.topic,
        articles,
        geminiAnalysisModel,
        domainLeanings
      );
      if (isCancelled()) throw new Error("Cancelled");
      onReportUpdate(item.id, { summary, status: "completed", stage: "Complete" });
    } catch (error) {
      if (error instanceof Error && error.message === "Cancelled") {
        onReportUpdate(item.id, { status: "cancelled", stage: "Cancelled" });
        continue;
      }
      console.error(error);
      onReportUpdate(item.id, {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error occurred",
        stage: "Failed",
      });
    }
  }
}


