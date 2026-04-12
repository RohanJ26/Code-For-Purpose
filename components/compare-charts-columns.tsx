'use client';

import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import type { ChartPayload } from '@/lib/formal-report-html';
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

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-4 border border-border bg-card/50 shadow-sm">
      <h4 className="font-semibold text-foreground mb-3 text-xs tracking-tight">{title}</h4>
      <div className="h-[220px] w-full">{children}</div>
    </Card>
  );
}

function hasChartData(charts: ChartPayload | null): boolean {
  if (!charts) return false;
  return Boolean(
    (charts.line?.data?.length ?? 0) > 0 ||
      (charts.area?.data?.length ?? 0) > 0 ||
      (charts.bar?.data?.length ?? 0) > 0 ||
      (charts.grouped_bar?.data?.length ?? 0) > 0 ||
      (charts.scatter?.data?.length ?? 0) > 0
  );
}

export function CompareChartsColumn({
  charts,
  heading,
  areaGradientId,
}: {
  charts: ChartPayload | null;
  heading: string;
  areaGradientId: string;
}) {
  const empty = !hasChartData(charts);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">{heading}</h3>
      {empty ? (
        <p className="text-xs text-muted-foreground py-4">No chart aggregates available for this file.</p>
      ) : (
        <div className="space-y-4">
          {charts?.line && charts.line.data?.length ? (
            <ChartCard title={charts.line.title ?? 'Line'}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.line.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
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
            <ChartCard title={charts.area.title ?? 'Area'}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.area.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS[1]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="y"
                    stroke={CHART_COLORS[1]}
                    fill={`url(#${areaGradientId})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : null}

          {charts?.bar && charts.bar.data?.length ? (
            <ChartCard title={charts.bar.title ?? 'Bar'}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.bar.data} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    stroke="hsl(var(--muted-foreground))"
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {charts.bar.data.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : null}

          {charts?.grouped_bar && charts.grouped_bar.data?.length ? (
            <ChartCard title={charts.grouped_bar.title ?? 'Grouped bar'}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.grouped_bar.data} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9 }}
                    stroke="hsl(var(--muted-foreground))"
                    angle={-20}
                    textAnchor="end"
                    height={40}
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : null}

          {charts?.scatter && charts.scatter.data?.length ? (
            <ChartCard title={charts.scatter.title ?? 'Scatter'}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Observations" data={charts.scatter.data} fill={CHART_COLORS[3]} />
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          ) : null}
        </div>
      )}
    </div>
  );
}
