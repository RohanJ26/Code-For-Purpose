'use client';

import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPI {
  name: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercent?: number;
  description?: string;
}

interface KPIDashboardProps {
  kpis: KPI[];
  isLoading?: boolean;
}

export function KPIDashboard({ kpis, isLoading = false }: KPIDashboardProps) {
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-8 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.name} className="p-4 border border-border hover:border-primary/30 transition-colors">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-muted-foreground">{kpi.name}</h3>
              {kpi.trend && getTrendIcon(kpi.trend)}
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-bold text-foreground">
                {kpi.value}
                {kpi.unit && <span className="text-sm ml-1 text-muted-foreground">{kpi.unit}</span>}
              </div>
              {kpi.trendPercent && (
                <p
                  className={`text-xs font-semibold ${
                    kpi.trend === 'up'
                      ? 'text-green-600'
                      : kpi.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {kpi.trend === 'up' ? '+' : ''}
                  {kpi.trendPercent}% from last period
                </p>
              )}
            </div>

            {kpi.description && (
              <p className="text-xs text-muted-foreground">{kpi.description}</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
