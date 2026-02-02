import { Bookmark, FileText, Trash2, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Report } from '../types';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

interface SavedReportsProps {
  reports: Report[];
  onToggleReportSaved: (reportId: string, saved: boolean) => void;
  onDeleteReport: (reportId: string) => void;
}

const SavedReports = ({ reports, onToggleReportSaved, onDeleteReport }: SavedReportsProps) => {
  const savedReports = reports.filter((r) => r.saved);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Reports</h1>
          <p className="text-muted-foreground mt-1">
            Your bookmarked analysis reports
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {savedReports.length} saved
        </Badge>
      </div>

      {/* Reports List */}
      {savedReports.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bookmark className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No saved reports</h3>
            <p className="text-muted-foreground text-sm text-center max-w-sm">
              When you save reports from the Dashboard, they will appear here for easy access.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {savedReports.map((report) => {
            const isExpanded = expandedIds.has(report.id);
            return (
              <Collapsible key={report.id} open={isExpanded} onOpenChange={() => toggleExpanded(report.id)}>
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">{report.topic}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {report.coverage?.sourceCount || 0} sources analyzed
                          </p>
                        </div>
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onToggleReportSaved(report.id, false); }}
                          className="text-accent hover:text-accent h-8 w-8"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onDeleteReport(report.id); }}
                          className="text-muted-foreground hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{report.summary || ''}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedReports;
