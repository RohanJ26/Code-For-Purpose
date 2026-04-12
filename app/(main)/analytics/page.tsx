'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KPIDashboard } from '@/components/kpi-dashboard';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import { Download, RefreshCw, Filter, LayoutDashboard } from 'lucide-react';
import { useDataset } from '@/contexts/dataset-context';
import { DatasetReportDialog } from '@/components/dataset-report-dialog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

type ChartPoint = { x?: number; y?: number; name?: string; value?: number };

type ChartPayload = {
  line?: { title: string; data: ChartPoint[] };
  bar?: { title: string; data: ChartPoint[] };
  scatter?: { title: string; data: ChartPoint[] };
  grouped_bar?: { title: string; data: ChartPoint[] };
  area?: { title: string; data: ChartPoint[] };
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

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-5 border border-border bg-card/50 backdrop-blur-sm shadow-sm">
      <h3 className="font-semibold text-foreground mb-4 text-sm tracking-tight">{title}</h3>
      <div className="h-[260px] w-full">{children}</div>
    </Card>
  );
}

function buildInsightsFromAnalysis(analysis: Record<string, unknown> | null) {
  if (!analysis) return [];
  const out: {
    category: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[] = [];

  const insightsText = analysis.insights;
  if (typeof insightsText === 'string' && insightsText.trim()) {
    out.push({
      category: 'Overview',
      title: 'Dataset insights',
      description: insightsText.slice(0, 600) + (insightsText.length > 600 ? '…' : ''),
      priority: 'high',
    });
  }

  const trends = analysis.trends;
  if (Array.isArray(trends)) {
    trends.slice(0, 3).forEach((t, i) => {
      if (typeof t === 'string' && t.trim()) {
        out.push({
          category: 'Trends',
          title: `Signal ${i + 1}`,
          description: t,
          priority: i === 0 ? 'medium' : 'low',
        });
      }
    });
  }

  const recs = analysis.recommendations;
  if (Array.isArray(recs)) {
    recs.slice(0, 2).forEach((r, i) => {
      if (typeof r === 'string' && r.trim()) {
        out.push({
          category: 'Recommendations',
          title: `Recommendation ${i + 1}`,
          description: r,
          priority: 'medium',
        });
      }
    });
  }

  const anomalies = analysis.anomalies;
  if (Array.isArray(anomalies)) {
    anomalies.slice(0, 2).forEach((a, i) => {
      if (typeof a === 'string' && a.trim()) {
        out.push({
          category: 'Quality',
          title: `Observation ${i + 1}`,
          description: a,
          priority: 'low',
        });
      }
    });
  }

  return out.slice(0, 8);
}

export default function AnalyticsPage() {
  const { activeDataset, hydrated } = useDataset();
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [charts, setCharts] = useState<ChartPayload | null>(null);
  const [analysisInsights, setAnalysisInsights] = useState<
    { category: string; title: string; description: string; priority: 'high' | 'medium' | 'low' }[]
  >([]);
  const [reportOpen, setReportOpen] = useState(false);

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
        const info = (await infoRes.json()) as DatasetInfo;
        setDatasetInfo(info);
      }

      if (chartRes.ok) {
        setCharts((await chartRes.json()) as ChartPayload);
      } else {
        setCharts(null);
      }

      if (analysisRes.ok) {
        const body = (await analysisRes.json()) as { analysis?: Record<string, unknown> };
        setAnalysisInsights(buildInsightsFromAnalysis(body.analysis ?? null));
      } else {
        setAnalysisInsights([]);
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
      setAnalysisInsights([]);
    }
  }, [hydrated, activeDataset?.datasetId, loadData]);

  const nullTotal =
    datasetInfo?.column_info?.reduce((s, c) => s + (c.null_count ?? 0), 0) ?? 0;
  const cells = (datasetInfo?.rows ?? 0) * (datasetInfo?.columns ?? 0);
  const completenessPct =
    cells > 0 ? Math.round(Math.max(0, Math.min(100, (1 - nullTotal / cells) * 100))) : 0;

  const kpis = activeDataset
    ? [
        {
          name: 'Total Records',
          value: String(datasetInfo?.rows ?? activeDataset.rows),
          trend: 'up' as const,
          trendPercent: 12,
          description: 'Rows in uploaded dataset',
        },
        {
          name: 'Columns',
          value: String(datasetInfo?.columns ?? activeDataset.columns),
          trend: 'stable' as const,
          description: 'Features available for analysis',
        },
        {
          name: 'Completeness',
          value: `${completenessPct}%`,
          trend: completenessPct >= 85 ? ('up' as const) : ('stable' as const),
          description: 'Non-null cells vs total cells',
        },
        {
          name: 'Dataset ID',
          value: activeDataset.datasetId.toUpperCase(),
          trend: 'stable' as const,
          description: activeDataset.filename,
        },
      ]
    : [];

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    fontSize: '12px',
  };

  if (!hydrated) {
    return null;
  }

  if (!activeDataset) {
    return (
      <div className="p-8 max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground">
          Upload a dataset on the dashboard first. All charts and metrics here are driven by your active file.
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
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                Visual exploration and AI commentary for your current upload. Switch files from the dashboard to
                refresh this view.
              </p>
              <Card className="mt-4 p-4 border border-primary/20 bg-primary/5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active dataset</p>
                <p className="text-lg font-semibold text-foreground mt-1 truncate" title={activeDataset.filename}>
                  {activeDataset.filename}
                </p>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">
                  {activeDataset.datasetId.toUpperCase()} · {activeDataset.rows.toLocaleString()} rows ·{' '}
                  {activeDataset.columns} columns
                </p>
                <Button variant="link" className="px-0 h-auto mt-2 text-primary" asChild>
                  <Link href="/">Change dataset on dashboard</Link>
                </Button>
              </Card>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Button variant="outline" size="sm" className="rounded-full">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setReportOpen(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => void loadData()} size="sm" className="rounded-full" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { label: '7 days', value: '7d' },
              { label: '30 days', value: '30d' },
              { label: '90 days', value: '90d' },
              { label: 'Year', value: 'year' },
            ].map((option) => (
              <Button
                key={option.value}
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
          <h2 className="text-2xl font-semibold text-foreground">Key metrics</h2>
          <KPIDashboard kpis={kpis} isLoading={isLoading && !datasetInfo} />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Data visualizations</h2>
          {!charts && !isLoading ? (
            <p className="text-sm text-muted-foreground">No chart data available for this dataset.</p>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {charts?.line && charts.line.data?.length ? (
                <ChartCard title={charts.line.title}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={charts.line.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="y"
                        stroke={CHART_COLORS[0]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : null}

              {charts?.area && charts.area.data?.length ? (
                <ChartCard title={charts.area.title}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={charts.area.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis dataKey="x" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="y" stroke={CHART_COLORS[1]} fill="url(#areaFill)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : null}

              {charts?.bar && charts.bar.data?.length ? (
                <ChartCard title={charts.bar.title}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.bar.data} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        angle={-25}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {charts.bar.data.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : null}

              {charts?.grouped_bar && charts.grouped_bar.data?.length ? (
                <ChartCard title={charts.grouped_bar.title}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.grouped_bar.data} margin={{ top: 8, right: 8, left: 0, bottom: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                        angle={-25}
                        textAnchor="end"
                        height={48}
                      />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : null}

              {charts?.scatter && charts.scatter.data?.length ? (
                <ChartCard title={charts.scatter.title}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis
                        type="number"
                        dataKey="x"
                        name="x"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis
                        type="number"
                        dataKey="y"
                        name="y"
                        tick={{ fontSize: 11 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Observations" data={charts.scatter.data} fill={CHART_COLORS[3]} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </ChartCard>
              ) : null}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">AI-powered insights</h2>
          {analysisInsights.length === 0 && !isLoading ? (
            <p className="text-sm text-muted-foreground">
              Run refresh to generate insights, or ensure the AI service is configured.
            </p>
          ) : (
            <div className="grid gap-4">
              {analysisInsights.map((insight, idx) => (
                <Card
                  key={`${insight.category}-${insight.title}-${idx}`}
                  className="p-6 border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          insight.priority === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                            : insight.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                        }`}
                      >
                        {insight.priority.charAt(0).toUpperCase() + insight.priority.slice(1)}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">{insight.category}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">{insight.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{insight.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Data quality</h2>
          <Card className="p-6 border border-border space-y-4">
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { label: 'Completeness', value: `${completenessPct}%` },
                { label: 'Total nulls', value: nullTotal.toLocaleString() },
                { label: 'Columns', value: String(datasetInfo?.columns ?? activeDataset.columns) },
                { label: 'Rows', value: (datasetInfo?.rows ?? activeDataset.rows).toLocaleString() },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <span className="inline-flex px-3 py-1 rounded-lg text-sm font-semibold bg-muted text-foreground">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Metrics are computed from <span className="font-medium text-foreground">{activeDataset.filename}</span>.
            </p>
          </Card>
        </div>
      </div>
      <DatasetReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        datasetId={activeDataset.datasetId}
        filename={activeDataset.filename}
        apiBaseUrl={API_BASE_URL}
      />
    </div>
  );
}
