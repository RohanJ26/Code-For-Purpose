'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { useDataset } from '@/contexts/dataset-context';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

type ChartPoint = { x?: number; y?: number; name?: string; value?: number };

type ChartPayload = {
  line?: { title?: string; data?: ChartPoint[] };
  bar?: { title?: string; data?: ChartPoint[] };
  scatter?: { title?: string; data?: ChartPoint[] };
  grouped_bar?: { title?: string; data?: ChartPoint[] };
  area?: { title?: string; data?: ChartPoint[] };
};

type ColumnInfo = {
  name: string;
  null_count: number;
};

type DatasetInfo = {
  dataset_id: string;
  filename: string;
  rows: number;
  columns: number;
  column_info: ColumnInfo[];
};

type SparkTrend = {
  metric: string;
  value: string;
  change: 'up' | 'down';
  description: string;
  data: number[];
};

function buildTrendsFromCharts(charts: ChartPayload | null): SparkTrend[] {
  if (!charts) return [];
  const out: SparkTrend[] = [];

  const addSeries = (title: string, ys: number[]) => {
    const clean = ys.map((y) => (Number.isFinite(y) ? y : 0));
    if (clean.length < 2) return;
    const first = clean[0] ?? 0;
    const last = clean[clean.length - 1] ?? 0;
    const change: 'up' | 'down' = last >= first ? 'up' : 'down';
    let valueStr: string;
    if (Math.abs(first) > 1e-9) {
      const pct = ((last - first) / Math.abs(first)) * 100;
      const sign = pct >= 0 ? '+' : '';
      valueStr = `${sign}${pct.toFixed(1)}%`;
    } else if (last === first) {
      valueStr = '0%';
    } else {
      const delta = last - first;
      valueStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} Δ`;
    }
    out.push({
      metric: title.slice(0, 48) || 'Series',
      value: valueStr,
      change,
      description: `Series across ${clean.length} points (start → end)`,
      data: clean,
    });
  };

  if (charts.line?.data && charts.line.data.length >= 2) {
    addSeries(
      charts.line.title || 'Line series',
      charts.line.data.map((p) => Number(p.y))
    );
  }
  if (charts.area?.data && charts.area.data.length >= 2) {
    addSeries(
      charts.area.title || 'Area series',
      charts.area.data.map((p) => Number(p.y))
    );
  }
  if (charts.bar?.data && charts.bar.data.length >= 2) {
    addSeries(
      charts.bar.title || 'Bar categories',
      charts.bar.data.map((p) => Number(p.value))
    );
  }
  if (charts.grouped_bar?.data && charts.grouped_bar.data.length >= 2) {
    addSeries(
      charts.grouped_bar.title || 'Grouped bars',
      charts.grouped_bar.data.map((p) => Number(p.value))
    );
  }
  if (charts.scatter?.data && charts.scatter.data.length >= 2) {
    const sorted = [...charts.scatter.data].sort(
      (a, b) => (Number(a.x) || 0) - (Number(b.x) || 0)
    );
    addSeries(
      charts.scatter.title || 'Scatter (y vs sorted x)',
      sorted.map((p) => Number(p.y))
    );
  }

  return out.slice(0, 4);
}

function padTrendsFromDataset(
  base: SparkTrend[],
  info: DatasetInfo | null,
  rows: number,
  cols: number
): SparkTrend[] {
  if (base.length >= 4) return base.slice(0, 4);
  const nullTotal = info?.column_info?.reduce((s, c) => s + (c.null_count ?? 0), 0) ?? 0;
  const cells = Math.max(rows * cols, 1);
  const completeness = Math.round(Math.max(0, Math.min(100, (1 - nullTotal / cells) * 100)));
  const flat = (v: number) => Array.from({ length: 7 }, () => v);

  const extra: SparkTrend[] = [
    {
      metric: 'Data completeness',
      value: `${completeness}%`,
      change: completeness >= 85 ? 'up' : 'down',
      description: 'Non-null cells vs total cells in the uploaded file',
      data: flat(completeness),
    },
    {
      metric: 'Row count',
      value: rows.toLocaleString(),
      change: 'up',
      description: 'Total rows in the active dataset',
      data: flat(Math.min(rows / Math.max(cols, 1), 1e6)),
    },
    {
      metric: 'Column count',
      value: String(cols),
      change: 'up',
      description: 'Number of columns detected',
      data: flat(cols * 10),
    },
    {
      metric: 'Total null cells',
      value: nullTotal.toLocaleString(),
      change: nullTotal < cells * 0.15 ? 'down' : 'up',
      description: 'Missing values across the grid',
      data: flat(Math.min(nullTotal / Math.max(cols, 1), 1e6)),
    },
  ];

  const seen = new Set(base.map((b) => b.metric));
  const merged = [...base];
  for (const e of extra) {
    if (merged.length >= 4) break;
    if (!seen.has(e.metric)) {
      seen.add(e.metric);
      merged.push(e);
    }
  }
  return merged.slice(0, 4);
}

type PredictionCard = {
  key: string;
  title: string;
  prediction: string;
  confidence: 'High' | 'Medium';
  rationale: string;
};

function buildPredictionsFromAnalysis(analysis: Record<string, unknown> | null): PredictionCard[] {
  if (!analysis) return [];
  const raw = analysis.trends;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
    .slice(0, 5)
    .map((text, i) => {
      const head = text.split(/[.!?\n]/)[0]?.trim() || `Trend ${i + 1}`;
      return {
        key: `ai-trend-${i}`,
        title: head.slice(0, 100),
        prediction: 'From dataset analysis',
        confidence: (/strong|significant|clear|high/i.test(text) ? 'High' : 'Medium') as 'High' | 'Medium',
        rationale: text,
      };
    });
}

function buildDataDrivenPredictions(
  sparkTrends: SparkTrend[],
  info: DatasetInfo | null,
  filename: string,
  rows: number,
  cols: number
): PredictionCard[] {
  const nullTotal = info?.column_info?.reduce((s, c) => s + (c.null_count ?? 0), 0) ?? 0;
  const cells = Math.max(rows * cols, 1);
  const completeness = Math.round(Math.max(0, Math.min(100, (1 - nullTotal / cells) * 100)));
  const colsRanked = [...(info?.column_info ?? [])].sort((a, b) => b.null_count - a.null_count);
  const worstCol = colsRanked[0];

  const out: PredictionCard[] = [];

  if (sparkTrends[0]) {
    const t = sparkTrends[0];
    out.push({
      key: 'data-series-a',
      title: `${t.metric} — directional outlook`,
      prediction: t.change === 'up' ? 'Upward momentum' : 'Downward drift',
      confidence: 'High',
      rationale: `From chart aggregates in "${filename}": ${t.description}. Net movement is ${t.value} from the first to the last point (${t.data.length} values).`,
    });
  } else {
    out.push({
      key: 'data-series-a',
      title: 'Aggregate series profile',
      prediction: 'Baseline view',
      confidence: 'Medium',
      rationale: `No multi-point chart series was returned for ${filename}. The cards above still reflect row, column, and completeness signals from your upload.`,
    });
  }

  if (sparkTrends[1]) {
    const t = sparkTrends[1];
    out.push({
      key: 'data-series-b',
      title: `${t.metric} — secondary signal`,
      prediction: t.value,
      confidence: 'Medium',
      rationale: `Cross-check metric: ${t.description}. Compare with the first series and with raw charts on Analytics.`,
    });
  } else {
    out.push({
      key: 'data-series-b',
      title: 'Dataset footprint',
      prediction: `${rows.toLocaleString()} × ${cols}`,
      confidence: 'High',
      rationale: `${rows.toLocaleString()} rows and ${cols} columns define the grid behind every aggregate. Larger samples usually stabilize noisy short series.`,
    });
  }

  out.push({
    key: 'data-quality',
    title: 'Completeness & missing values',
    prediction:
      completeness >= 92 ? 'Strong coverage' : completeness >= 75 ? 'Usable with care' : 'Needs cleanup',
    confidence: completeness >= 85 ? 'High' : 'Medium',
    rationale:
      worstCol && worstCol.null_count > 0
        ? `About ${completeness}% of cells are non-null (${nullTotal.toLocaleString()} nulls). Column "${worstCol.name}" has the heaviest gaps (${worstCol.null_count.toLocaleString()} nulls).`
        : `About ${completeness}% of cells are non-null (${nullTotal.toLocaleString()} nulls overall).`,
  });

  return out.slice(0, 3);
}

function buildFallbackObservations(
  sparkTrends: SparkTrend[],
  info: DatasetInfo | null,
  rows: number,
  cols: number,
  filename: string
): string[] {
  const nullTotal = info?.column_info?.reduce((s, c) => s + (c.null_count ?? 0), 0) ?? 0;
  const cells = Math.max(rows * cols, 1);
  const completeness = Math.round(Math.max(0, Math.min(100, (1 - nullTotal / cells) * 100)));
  const lines: string[] = [
    `${filename} has ${rows.toLocaleString()} rows and ${cols} columns in the active dataset.`,
    `Roughly ${completeness}% of cells are filled; ${nullTotal.toLocaleString()} values are missing across the grid.`,
  ];
  sparkTrends.slice(0, 2).forEach((t) => {
    lines.push(
      `${t.metric} moves ${t.change === 'up' ? 'up' : 'down'} in the chart aggregate (${t.value}).`
    );
  });
  const sparse = [...(info?.column_info ?? [])]
    .filter((c) => (c.null_count ?? 0) > 0)
    .sort((a, b) => b.null_count - a.null_count)
    .slice(0, 2);
  sparse.forEach((c) => {
    lines.push(`Column "${c.name}" shows ${c.null_count.toLocaleString()} nulls — review before modeling.`);
  });
  return lines.slice(0, 8);
}

function buildFallbackRecommendations(
  completeness: number,
  sparkTrends: SparkTrend[],
  worstCol: ColumnInfo | null
): string[] {
  const r: string[] = [];
  if (completeness < 90) {
    r.push('Impute, drop, or flag high-null columns so trend lines are not skewed by sparse fields.');
  } else {
    r.push('Completeness is healthy for dashboard-style aggregates; drill into Analytics for full charts.');
  }
  if (worstCol && worstCol.null_count > 0) {
    r.push(`Audit "${worstCol.name}" (${worstCol.null_count.toLocaleString()} nulls) for data entry or pipeline issues.`);
  }
  r.push('Validate any sharp moves in the sparklines against filters and time windows in Analytics.');
  if (sparkTrends.some((t) => t.change === 'down')) {
    r.push('Investigate downward series with segment breakdowns or cohort filters in your source tool.');
  } else {
    r.push('Use bar and category charts to explain drivers behind upward aggregate movement.');
  }
  return r.slice(0, 8);
}

function mergeUniqueLines(primary: string[], secondary: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of [...primary, ...secondary]) {
    const k = line.slice(0, 120);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

function splitInsightLines(text: string, max: number): string[] {
  return text
    .split(/\n|•/)
    .map((s) => s.replace(/^[-*\d.)]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, max);
}

export default function TrendsPage() {
  const { activeDataset, hydrated } = useDataset();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [charts, setCharts] = useState<ChartPayload | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);

  const loadData = useCallback(async () => {
    const id = activeDataset?.datasetId;
    if (!id) return;
    setIsLoading(true);
    try {
      const [infoRes, chartRes, analysisRes] = await Promise.all([
        fetch(`${API_BASE_URL}/dataset-info/${id}`),
        fetch(`${API_BASE_URL}/dataset-charts/${id}`),
        fetch(`${API_BASE_URL}/analyze-dataset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset_id: id, analysis_type: 'comprehensive' }),
        }),
      ]);

      if (infoRes.ok) {
        setDatasetInfo((await infoRes.json()) as DatasetInfo);
      } else {
        setDatasetInfo(null);
      }

      if (chartRes.ok) {
        setCharts((await chartRes.json()) as ChartPayload);
      } else {
        setCharts(null);
      }

      if (analysisRes.ok) {
        const body = (await analysisRes.json()) as { analysis?: Record<string, unknown> };
        setAnalysis(body.analysis ?? null);
      } else {
        setAnalysis(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [activeDataset?.datasetId]);

  useEffect(() => {
    if (hydrated && activeDataset?.datasetId) {
      void loadData();
    } else if (hydrated && !activeDataset) {
      setDatasetInfo(null);
      setCharts(null);
      setAnalysis(null);
    }
  }, [hydrated, activeDataset?.datasetId, loadData]);

  const trends = useMemo(() => {
    if (!activeDataset) return [];
    const fromCharts = buildTrendsFromCharts(charts);
    const rows = datasetInfo?.rows ?? activeDataset.rows;
    const cols = datasetInfo?.columns ?? activeDataset.columns;
    return padTrendsFromDataset(fromCharts, datasetInfo, rows, cols);
  }, [charts, datasetInfo, activeDataset]);

  const predictedTrends = useMemo((): PredictionCard[] => {
    const ai = buildPredictionsFromAnalysis(analysis);
    if (ai.length > 0) return ai;
    if (!activeDataset) return [];
    const rows = datasetInfo?.rows ?? activeDataset.rows;
    const cols = datasetInfo?.columns ?? activeDataset.columns;
    return buildDataDrivenPredictions(trends, datasetInfo, activeDataset.filename, rows, cols);
  }, [analysis, trends, datasetInfo, activeDataset]);

  const observations = useMemo(() => {
    const fromInsights =
      typeof analysis?.insights === 'string' && analysis.insights.trim()
        ? splitInsightLines(analysis.insights, 8)
        : [];
    const rawAn = analysis?.anomalies;
    const fromAnomalies = Array.isArray(rawAn)
      ? rawAn
          .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
          .slice(0, 4)
      : [];
    if (!activeDataset) return mergeUniqueLines(fromInsights, fromAnomalies, 8);
    const rows = datasetInfo?.rows ?? activeDataset.rows;
    const cols = datasetInfo?.columns ?? activeDataset.columns;
    const fallback = buildFallbackObservations(trends, datasetInfo, rows, cols, activeDataset.filename);
    return mergeUniqueLines([...fromInsights, ...fromAnomalies], fallback, 8);
  }, [analysis, trends, datasetInfo, activeDataset]);

  const recommendations = useMemo(() => {
    const rec = analysis?.recommendations;
    const fromAi = Array.isArray(rec)
      ? rec.filter((r): r is string => typeof r === 'string' && r.trim().length > 0)
      : [];
    if (!activeDataset) return fromAi.slice(0, 8);
    const nullTotal = datasetInfo?.column_info?.reduce((s, c) => s + (c.null_count ?? 0), 0) ?? 0;
    const cols = datasetInfo?.columns ?? activeDataset.columns;
    const rows = datasetInfo?.rows ?? activeDataset.rows;
    const cells = Math.max(rows * cols, 1);
    const completeness = Math.round(Math.max(0, Math.min(100, (1 - nullTotal / cells) * 100)));
    const worstCol =
      [...(datasetInfo?.column_info ?? [])].sort((a, b) => b.null_count - a.null_count)[0] ?? null;
    const fallback = buildFallbackRecommendations(completeness, trends, worstCol);
    return mergeUniqueLines(fromAi, fallback, 8);
  }, [analysis, trends, datasetInfo, activeDataset]);

  if (!hydrated) {
    return null;
  }

  if (!activeDataset) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Trend Analysis</h1>
        <p className="text-muted-foreground">
          Upload a dataset on the dashboard first. Trends here are derived from your active file and AI analysis.
        </p>
        <Button asChild className="rounded-full">
          <Link href="/">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Go to dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Trend Analysis</h1>
              <p className="text-muted-foreground mt-2">
                Patterns from <span className="font-medium text-foreground">{activeDataset.filename}</span>
                {datasetInfo ? (
                  <>
                    {' '}
                    · {datasetInfo.rows.toLocaleString()} rows · {datasetInfo.columns} columns
                  </>
                ) : null}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void loadData()}
              size="sm"
              className="rounded-full"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          <div className="flex gap-2">
            {[
              { label: '7 days', value: '7d' },
              { label: '30 days', value: '30d' },
              { label: '90 days', value: '90d' },
              { label: 'Year', value: 'year' },
            ].map((option) => (
              <Button
                key={option.value}
                type="button"
                onClick={() => setTimeRange(option.value)}
                variant={timeRange === option.value ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Current Trends</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trends.map((trend) => (
              <Card key={trend.metric} className="p-6 border border-border space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{trend.metric}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{trend.value}</span>
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${
                        trend.change === 'up' ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {trend.change === 'up' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {trend.change === 'up' ? 'Increasing' : 'Decreasing'}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{trend.description}</p>
                </div>

                <div className="h-12 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trend.data.map((y, i) => ({ i, y }))}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">AI Predictions</h2>
          <div className="grid gap-4">
            {predictedTrends.map((prediction) => (
                <Card
                  key={prediction.key}
                  className="p-6 border border-border hover:border-primary/30 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{prediction.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{prediction.rationale}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 ${
                        prediction.confidence === 'High'
                          ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                      }`}
                    >
                      {prediction.confidence} Confidence
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Prediction</p>
                      <p className="text-2xl font-bold text-primary">{prediction.prediction}</p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-full ml-auto" type="button">
                      Learn More
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Trend Insights</h2>
          <Card className="p-6 border border-border space-y-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Key Observations</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  {observations.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Recommendations</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  {recommendations.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
