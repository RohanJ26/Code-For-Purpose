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
import { Card } from '@/components/ui/card';
import { Upload, Loader2, GitCompareArrows, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompareChartsColumn } from '@/components/compare-charts-columns';
import {
  buildComparisonReportHtml,
  type ComparisonSnapshotForReport,
} from '@/lib/comparison-report-html';
import { downloadHtmlFile, type ChartPayload, type ReportDatasetInfo } from '@/lib/formal-report-html';

function normalizeToStrings(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'string') {
    return v
      .split(/\n|•/)
      .map((s) => s.replace(/^[-*\d.)]+\s*/, '').trim())
      .filter(Boolean);
  }
  return [String(v)];
}

type SnapshotD = {
  id?: string;
  filename?: string;
  rows?: number;
  columns?: number;
  completeness_pct?: number;
};

type SnapshotSchema = {
  shared_columns?: string[];
  only_in_dataset_1?: string[];
  only_in_dataset_2?: string[];
  shared_numeric_columns?: string[];
};

type NumRow = {
  column?: string;
  dataset_1_mean?: number | null;
  dataset_2_mean?: number | null;
  dataset_1_sum?: number | null;
  dataset_2_sum?: number | null;
};

export function CompareDatasetsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryDatasetId: string;
  primaryFilename: string;
  apiBaseUrl: string;
}) {
  const { open, onOpenChange, primaryDatasetId, primaryFilename, apiBaseUrl } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [secondaryName, setSecondaryName] = useState<string | null>(null);
  const [chartsA, setChartsA] = useState<ChartPayload | null>(null);
  const [chartsB, setChartsB] = useState<ChartPayload | null>(null);
  const [infoA, setInfoA] = useState<ReportDatasetInfo | null>(null);
  const [infoB, setInfoB] = useState<ReportDatasetInfo | null>(null);
  const [extrasLoading, setExtrasLoading] = useState(false);

  const reset = useCallback(() => {
    setComparison(null);
    setSecondaryName(null);
    setError(null);
    setBusy(false);
    setChartsA(null);
    setChartsB(null);
    setInfoA(null);
    setInfoB(null);
    setExtrasLoading(false);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setComparison(null);
    setSecondaryName(null);
    const base = apiBaseUrl.replace(/\/$/, '');
    const id1 = primaryDatasetId.trim();
    try {
      const form = new FormData();
      form.append('file', file);
      const up = await fetch(`${base}/upload-dataset`, { method: 'POST', body: form });
      if (!up.ok) {
        const t = await up.text();
        throw new Error(t || `Upload failed (${up.status})`);
      }
      const upJson = (await up.json()) as { dataset_id: string; info?: { filename?: string } };
      const id2 = String(upJson.dataset_id ?? '').trim();
      if (!id2) throw new Error('Upload response missing dataset id');
      setSecondaryName(upJson.info?.filename ?? file.name);

      const cmp = await fetch(`${base}/compare-datasets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_id_1: id1, dataset_id_2: id2 }),
      });
      if (!cmp.ok) {
        const t = await cmp.text();
        throw new Error(t || `Compare failed (${cmp.status})`);
      }
      const body = (await cmp.json()) as { comparison?: Record<string, unknown> };
      setComparison(body.comparison ?? {});
    } catch (e) {
      let msg = e instanceof Error ? e.message : 'Comparison failed';
      if (msg === 'Failed to fetch') {
        msg =
          'Cannot reach the API. Use NEXT_PUBLIC_API_URL=/api while running `pnpm dev` (proxies to Python), or set NEXT_PUBLIC_API_URL to your backend URL and ensure the server is running.';
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!open || !comparison) return;
    const snap = comparison.snapshot as ComparisonSnapshotForReport | undefined;
    const idA = primaryDatasetId.trim();
    const idB = String(snap?.dataset_2?.id ?? '').trim();
    if (!snap?.dataset_1 || !snap?.dataset_2 || !idA || !idB) return;

    const ac = new AbortController();
    setExtrasLoading(true);
    (async () => {
      const base = apiBaseUrl.replace(/\/$/, '');
      try {
        const [ca, cb, ia, ib] = await Promise.all([
          fetch(`${base}/dataset-charts/${encodeURIComponent(idA)}`, { signal: ac.signal }),
          fetch(`${base}/dataset-charts/${encodeURIComponent(idB)}`, { signal: ac.signal }),
          fetch(`${base}/dataset-info/${encodeURIComponent(idA)}`, { signal: ac.signal }),
          fetch(`${base}/dataset-info/${encodeURIComponent(idB)}`, { signal: ac.signal }),
        ]);
        if (ac.signal.aborted) return;
        setChartsA(ca.ok ? ((await ca.json()) as ChartPayload) : null);
        setChartsB(cb.ok ? ((await cb.json()) as ChartPayload) : null);
        setInfoA(ia.ok ? ((await ia.json()) as ReportDatasetInfo) : null);
        setInfoB(ib.ok ? ((await ib.json()) as ReportDatasetInfo) : null);
      } catch {
        if (!ac.signal.aborted) {
          setChartsA(null);
          setChartsB(null);
          setInfoA(null);
          setInfoB(null);
        }
      } finally {
        if (!ac.signal.aborted) setExtrasLoading(false);
      }
    })();
    return () => ac.abort();
  }, [open, comparison, primaryDatasetId, apiBaseUrl]);

  const snapshot = comparison?.snapshot as
    | {
        dataset_1?: SnapshotD;
        dataset_2?: SnapshotD;
        schema?: SnapshotSchema;
        numeric_comparison?: NumRow[];
      }
    | undefined;

  const d1 = snapshot?.dataset_1;
  const d2 = snapshot?.dataset_2;
  const schema = snapshot?.schema;
  const numRows = snapshot?.numeric_comparison ?? [];

  const differences = normalizeToStrings(comparison?.differences ?? comparison?.comparison);
  const similarities = normalizeToStrings(comparison?.similarities);
  const performance =
    typeof comparison?.performance === 'string'
      ? comparison.performance
      : comparison?.performance != null
        ? String(comparison.performance)
        : '';
  const insights =
    typeof comparison?.insights === 'string'
      ? comparison.insights
      : comparison?.insights != null
        ? String(comparison.insights)
        : '';

  const handleDownloadComparison = () => {
    if (!comparison || !snapshot?.dataset_1 || !snapshot?.dataset_2) return;
    const html = buildComparisonReportHtml({
      snapshot: snapshot as ComparisonSnapshotForReport,
      chartsA,
      chartsB,
      infoA,
      infoB,
      differences,
      similarities,
      performance,
      insights,
      labelA: 'Dataset A',
      labelB: 'Dataset B',
    });
    const a = String(d1?.filename ?? 'a').replace(/[^\w.-]+/g, '_').slice(0, 40);
    const b = String(d2?.filename ?? 'b').replace(/[^\w.-]+/g, '_').slice(0, 40);
    downloadHtmlFile(html, `comparison-report-${a}-vs-${b}.html`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[min(90vh,920px)] overflow-y-auto sm:max-w-[min(96vw,960px)] gap-0 p-0',
          'border-border bg-background'
        )}
        showCloseButton
      >
        <div className="p-6 pb-2 border-b border-border bg-muted/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <GitCompareArrows className="h-5 w-5 text-primary" />
              Compare datasets
            </DialogTitle>
            <DialogDescription>
              Your active file <span className="font-medium text-foreground">{primaryFilename}</span> is Dataset A.
              Upload a second CSV or Excel file to compare structure, scale, and AI-generated commentary.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" className="rounded-full" disabled={busy} asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 inline" />
                {busy ? 'Working…' : 'Upload comparison file'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    void onPickFile(f ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
            </Button>
            {busy && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>

          {error && (
            <Card className="p-4 border-destructive/50 bg-destructive/5 text-sm text-destructive">{error}</Card>
          )}

          {comparison && d1 && d2 && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4 border border-primary/20 bg-primary/5">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">Dataset A (active)</p>
                  <p className="font-semibold mt-1 truncate" title={d1.filename}>
                    {d1.filename}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{String(d1.id).toUpperCase()}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Rows</p>
                      <p className="font-semibold tabular-nums">{(d1.rows ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Columns</p>
                      <p className="font-semibold tabular-nums">{d1.columns ?? 0}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Completeness</p>
                      <p className="font-semibold tabular-nums">{d1.completeness_pct ?? '—'}%</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dataset B (uploaded)</p>
                  <p className="font-semibold mt-1 truncate" title={d2.filename}>
                    {secondaryName ?? d2.filename}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{String(d2.id).toUpperCase()}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Rows</p>
                      <p className="font-semibold tabular-nums">{(d2.rows ?? 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Columns</p>
                      <p className="font-semibold tabular-nums">{d2.columns ?? 0}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Completeness</p>
                      <p className="font-semibold tabular-nums">{d2.completeness_pct ?? '—'}%</p>
                    </div>
                  </div>
                </Card>
              </div>

              {schema && (
                <Card className="p-4 border border-border space-y-3">
                  <h3 className="font-semibold text-sm">Schema alignment</h3>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Shared columns ({schema.shared_columns?.length ?? 0})</p>
                      <p className="font-mono leading-relaxed break-all max-h-24 overflow-y-auto">
                        {(schema.shared_columns ?? []).slice(0, 24).join(', ') || '—'}
                        {(schema.shared_columns?.length ?? 0) > 24 ? '…' : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Only in A</p>
                      <p className="font-mono leading-relaxed break-all max-h-24 overflow-y-auto">
                        {(schema.only_in_dataset_1 ?? []).slice(0, 20).join(', ') || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Only in B</p>
                      <p className="font-mono leading-relaxed break-all max-h-24 overflow-y-auto">
                        {(schema.only_in_dataset_2 ?? []).slice(0, 20).join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-4 border border-border">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h3 className="font-semibold text-sm">Visual comparison</h3>
                  {extrasLoading && (
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading charts…
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Same chart aggregates as the analytics dashboard, shown side by side for each file.
                </p>
                <div className="grid lg:grid-cols-2 gap-6">
                  <CompareChartsColumn
                    charts={chartsA}
                    heading={`Dataset A — ${d1.filename ?? 'active file'}`}
                    areaGradientId="cmpAreaA"
                  />
                  <CompareChartsColumn
                    charts={chartsB}
                    heading={`Dataset B — ${secondaryName ?? d2.filename ?? 'uploaded file'}`}
                    areaGradientId="cmpAreaB"
                  />
                </div>
              </Card>

              {numRows.length > 0 && (
                <Card className="p-4 border border-border overflow-x-auto">
                  <h3 className="font-semibold text-sm mb-3">Shared numeric columns — mean &amp; sum</h3>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-3">Column</th>
                        <th className="py-2 pr-3">Mean (A)</th>
                        <th className="py-2 pr-3">Mean (B)</th>
                        <th className="py-2 pr-3">Sum (A)</th>
                        <th className="py-2 pr-3">Sum (B)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numRows.map((row) => (
                        <tr key={row.column} className="border-b border-border/60">
                          <td className="py-2 pr-3 font-medium whitespace-nowrap">{row.column}</td>
                          <td className="py-2 pr-3 tabular-nums">
                            {row.dataset_1_mean != null ? row.dataset_1_mean.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {row.dataset_2_mean != null ? row.dataset_2_mean.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {row.dataset_1_sum != null ? row.dataset_1_sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {row.dataset_2_sum != null ? row.dataset_2_sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}

              {performance && (
                <Card className="p-4 border border-border bg-muted/20">
                  <h3 className="font-semibold text-sm mb-1">Comparative performance (AI)</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{performance}</p>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {differences.length > 0 && (
                  <Card className="p-4 border border-border">
                    <h3 className="font-semibold text-sm mb-2 text-amber-700 dark:text-amber-400">Key differences</h3>
                    <ul className="text-sm space-y-2 list-disc pl-4 text-muted-foreground">
                      {differences.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </Card>
                )}
                {similarities.length > 0 && (
                  <Card className="p-4 border border-border">
                    <h3 className="font-semibold text-sm mb-2 text-emerald-700 dark:text-emerald-400">Similarities</h3>
                    <ul className="text-sm space-y-2 list-disc pl-4 text-muted-foreground">
                      {similarities.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>

              {insights && (
                <Card className="p-4 border border-primary/25 bg-primary/5">
                  <h3 className="font-semibold text-sm mb-2">Strategic insights</h3>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{insights}</p>
                </Card>
              )}
            </>
          )}

          {!comparison && !busy && !error && (
            <p className="text-sm text-muted-foreground">Upload a second dataset to run the comparison pipeline.</p>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 border-t border-border bg-muted/20 flex flex-wrap gap-2 justify-end">
          {comparison && d1 && d2 && (
            <Button
              type="button"
              variant="default"
              className="rounded-full"
              onClick={handleDownloadComparison}
            >
              <FileDown className="w-4 h-4 mr-2" />
              Download comparison report
            </Button>
          )}
          <Button type="button" variant="outline" className="rounded-full" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
