'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { buildFormalReportHtml, downloadHtmlFile, type ChartPayload, type ReportDatasetInfo } from '@/lib/formal-report-html';
import { cn } from '@/lib/utils';

const ANALYZE_TIMEOUT_MS = 180000;

function withTimeout(ms: number): AbortSignal {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export function DatasetReportDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  filename: string;
  apiBaseUrl: string;
}) {
  const { open, onOpenChange, datasetId, filename, apiBaseUrl } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const loadReport = useCallback(async () => {
    setBusy(true);
    setError(null);
    setHtml(null);
    setWarnings([]);
    const warn: string[] = [];

    const base = apiBaseUrl.replace(/\/$/, '');
    const id = datasetId.trim();

    let info: ReportDatasetInfo;
    try {
      const infoRes = await fetch(`${base}/dataset-info/${encodeURIComponent(id)}`);
      if (!infoRes.ok) {
        let detail = `${infoRes.status} ${infoRes.statusText}`;
        try {
          const j = (await infoRes.json()) as { detail?: unknown };
          if (j.detail != null) detail = String(j.detail);
        } catch {
          /* ignore */
        }
        throw new Error(`Dataset profile unavailable: ${detail}`);
      }
      info = (await infoRes.json()) as ReportDatasetInfo;
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message === 'Failed to fetch'
            ? `Cannot reach the API at ${base}. Use NEXT_PUBLIC_API_URL=/api with the dev server (proxies to the backend), or ensure the Python server is running and CORS is OK.`
            : e.message
          : 'Report generation failed';
      setError(msg);
      setBusy(false);
      return;
    }

    let charts: ChartPayload | null = null;
    try {
      const chartsRes = await fetch(`${base}/dataset-charts/${encodeURIComponent(id)}`);
      if (chartsRes.ok) {
        charts = (await chartsRes.json()) as ChartPayload;
      } else {
        warn.push('Chart aggregates were skipped (endpoint returned an error).');
      }
    } catch {
      warn.push('Chart aggregates were skipped (network error).');
    }

    let analysis: Record<string, unknown> | null = null;
    try {
      const analysisRes = await fetch(`${base}/analyze-dataset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id: id, analysis_type: 'comprehensive' }),
        signal: withTimeout(ANALYZE_TIMEOUT_MS),
      });
      if (analysisRes.ok) {
        const a = (await analysisRes.json()) as { analysis?: Record<string, unknown> };
        analysis = a.analysis ?? null;
      } else {
        let detail = `${analysisRes.status}`;
        try {
          const j = (await analysisRes.json()) as { detail?: unknown };
          if (j.detail != null) detail = String(j.detail);
        } catch {
          /* ignore */
        }
        warn.push(`AI narrative omitted: ${detail}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        warn.push('AI narrative omitted: analysis timed out.');
      } else {
        warn.push('AI narrative omitted (network or server error).');
      }
    }

    let numericSummary = '';
    try {
      const numericRes = await fetch(`${base}/dataset-numeric-summary/${encodeURIComponent(id)}`);
      if (numericRes.ok) {
        const n = (await numericRes.json()) as { summary?: string };
        numericSummary = n.summary ?? '';
      } else {
        warn.push('Numeric describe() section omitted.');
      }
    } catch {
      warn.push('Numeric describe() section omitted (network error).');
    }

    setWarnings(warn);
    const doc = buildFormalReportHtml({
      info,
      charts,
      analysis,
      numericSummary: numericSummary || undefined,
    });
    setHtml(doc);
    setBusy(false);
  }, [apiBaseUrl, datasetId]);

  useEffect(() => {
    if (open && datasetId) {
      void loadReport();
    } else if (!open) {
      setHtml(null);
      setError(null);
      setWarnings([]);
    }
  }, [open, datasetId, loadReport]);

  const safeName = filename.replace(/[^\w.\-]+/g, '_').slice(0, 80) || 'dataset-report';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(92vh,900px)] overflow-hidden flex flex-col sm:max-w-[min(96vw,880px)] gap-0 p-0',
          'border-border bg-background'
        )}
        showCloseButton
      >
        <div className="p-6 pb-3 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl">Formal dataset report</DialogTitle>
            <DialogDescription>
              Comprehensive profile for <span className="font-medium text-foreground">{filename}</span>, including
              dictionary, statistics, AI narrative, and chart summaries suitable for stakeholders.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-6 pb-4">
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Compiling report…
            </div>
          )}
          {error && !busy && <p className="text-sm text-destructive py-6">{error}</p>}
          {warnings.length > 0 && !busy && !error && (
            <ul className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md p-3 mb-2 list-disc pl-4 space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          {html && !busy && (
            <iframe
              title="Report preview"
              className="w-full flex-1 min-h-[420px] rounded-md border border-border bg-white"
              srcDoc={html}
              sandbox="allow-same-origin"
            />
          )}
        </div>

        <DialogFooter className="p-6 pt-3 border-t border-border shrink-0 gap-2 sm:gap-2 flex-row flex-wrap justify-end bg-muted/20">
          <Button
            type="button"
            variant="default"
            className="rounded-full"
            disabled={!html || busy}
            onClick={() => html && downloadHtmlFile(`report-${safeName}`, html)}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Download HTML report
          </Button>
          <Button type="button" variant="outline" className="rounded-full" disabled={busy} onClick={() => void loadReport()}>
            Regenerate
          </Button>
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
