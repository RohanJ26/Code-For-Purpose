'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw } from 'lucide-react';

export default function TrendsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);

  const trends = [
    {
      metric: 'Revenue Growth',
      value: '+18.5%',
      change: 'up',
      description: 'Month over month increase',
      data: [45, 52, 48, 61, 65, 72, 68],
    },
    {
      metric: 'Customer Acquisition',
      value: '+12.3%',
      change: 'up',
      description: 'New customers this period',
      data: [20, 25, 28, 32, 35, 38, 42],
    },
    {
      metric: 'Churn Rate',
      value: '-3.2%',
      change: 'down',
      description: 'Improvement in retention',
      data: [8.5, 8.2, 7.9, 7.5, 7.2, 6.9, 6.5],
    },
    {
      metric: 'Avg Order Value',
      value: '$127.50',
      change: 'up',
      description: 'Higher average transaction',
      data: [95, 102, 110, 118, 120, 125, 127.5],
    },
  ];

  const predictedTrends = [
    {
      title: 'Q4 Revenue Peak Expected',
      prediction: '+28% likely',
      confidence: 'High',
      rationale: 'Seasonal patterns indicate strong Q4 performance',
    },
    {
      title: 'Customer Retention Improving',
      prediction: '+15% improvement',
      confidence: 'Medium',
      rationale: 'Recent product updates showing positive impact',
    },
    {
      title: 'Market Expansion Ready',
      prediction: 'Recommended',
      confidence: 'High',
      rationale: 'Growth metrics indicate capacity for expansion',
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Trend Analysis</h1>
              <p className="text-muted-foreground mt-2">
                Identify patterns and predict future business metrics
              </p>
            </div>
            <Button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 1000);
              }}
              size="sm"
              className="rounded-full"
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

                <div className="h-12 bg-muted rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary/40" />
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
                key={prediction.title}
                className="p-6 border border-border hover:border-primary/30 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground text-lg">{prediction.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{prediction.rationale}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      prediction.confidence === 'High'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
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
                  <Button size="sm" variant="outline" className="rounded-full ml-auto">
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
                  <li>Consistent upward trajectory in revenue metrics over the past month</li>
                  <li>Customer acquisition cost has stabilized while retention improves</li>
                  <li>Seasonal patterns suggest increased activity in Q4</li>
                  <li>Product launches correlate with positive trend shifts</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">Recommendations</h3>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                  <li>Capitalize on Q4 growth by increasing marketing budget</li>
                  <li>Analyze successful product features for market expansion</li>
                  <li>Monitor churn metrics to maintain retention improvements</li>
                  <li>Plan inventory for predicted demand surge</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
