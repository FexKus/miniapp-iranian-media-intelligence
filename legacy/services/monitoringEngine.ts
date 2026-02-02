import { ArticleResult, CoverageMetadata, Report, WatchlistItem } from "../../types";
import { analyzeArticles, searchExa, translateQuery } from "./apiService";

// Legacy V2 client orchestration: retained for reference.

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
    .filter((d): d is string => Boolean(d))
    .sort();

  const dateRange = dates.length > 0
    ? { earliest: dates[0], latest: dates[dates.length - 1] }
    : null;

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

export interface RunMonitoringParams {
  exaApiKey: string;
  geminiApiKey: string;
  geminiTranslationModel: string;
  geminiAnalysisModel: string;
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
      let persianQuery: string;
      let queryWarnings: string[] | undefined;
      if (item.persianQuery) {
        persianQuery = item.persianQuery;
        onReportUpdate(item.id, { persianQuery, stage: "Scanning Media..." });
      } else {
        onReportUpdate(item.id, { stage: "Translating Topic..." });
        const translateResult = await translateQuery(geminiApiKey, item.topic, geminiTranslationModel);
        persianQuery = translateResult.query;
        queryWarnings = translateResult.warnings;
        if (isCancelled()) throw new Error("Cancelled");
        onReportUpdate(item.id, { persianQuery, queryWarnings, stage: "Scanning Media..." });
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isCancelled()) throw new Error("Cancelled");

      let startPublishedDate: string | undefined;
      let endPublishedDate: string | undefined;

      if (item.timeRange === 'custom' && item.customStartDate && item.customEndDate) {
        startPublishedDate = new Date(item.customStartDate).toISOString();
        endPublishedDate = new Date(item.customEndDate).toISOString();
      } else if (item.timeRange === 'last24h') {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        startPublishedDate = oneDayAgo.toISOString();
      } else if (item.timeRange === 'last30d') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startPublishedDate = thirtyDaysAgo.toISOString();
      } else {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startPublishedDate = sevenDaysAgo.toISOString();
      }

      const searchResponse = await searchExa(
        exaApiKey,
        persianQuery,
        activeDomains,
        5,
        startPublishedDate,
        endPublishedDate
      );
      if (isCancelled()) throw new Error("Cancelled");

      const { results: articles, warning: searchWarning } = searchResponse;
      const coverage = computeCoverageMetadata(articles, domainLeanings);

      onReportUpdate(item.id, {
        articles,
        searchWarning,
        coverage,
        domainLeanings,
        stage: "Analyzing Intelligence...",
      });

      const analyzeResult = await analyzeArticles(
        geminiApiKey,
        item.topic,
        articles,
        geminiAnalysisModel,
        domainLeanings
      );
      if (isCancelled()) throw new Error("Cancelled");
      onReportUpdate(item.id, {
        summary: analyzeResult.summary,
        verifierWarnings: analyzeResult.verifierWarnings,
        consistencyWarnings: analyzeResult.consistencyWarnings,
        evaluatorResult: analyzeResult.evaluatorResult,
        status: "completed",
        stage: "Complete",
      });
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
