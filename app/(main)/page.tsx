'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileUpload } from '@/components/file-upload';
import { ChatInterface } from '@/components/chat-interface';
import { KPIDashboard } from '@/components/kpi-dashboard';
import { Button } from '@/components/ui/button';
import { BarChart2 } from 'lucide-react';
import { buildDatasetSuggestions } from '@/lib/dataset-suggestions';
import { useDataset } from '@/contexts/dataset-context';
import { CompareDatasetsDialog } from '@/components/compare-datasets-dialog';
import { DatasetReportDialog } from '@/components/dataset-report-dialog';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Home() {
  const { activeDataset, setActiveDataset, clearDataset, hydrated } = useDataset();
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [kpis, setKpis] = useState<any[]>([
    {
      name: 'Total Records',
      value: '2,456',
      trend: 'up' as const,
      trendPercent: 12,
      description: 'Total data points in dataset',
    },
    {
      name: 'Columns',
      value: '18',
      trend: 'stable' as const,
      description: 'Features in your data',
    },
    {
      name: 'Data Quality',
      value: '92%',
      trend: 'up' as const,
      trendPercent: 5,
      description: 'Non-null values',
    },
    {
      name: 'Last Updated',
      value: 'Today',
      trend: 'stable' as const,
      description: 'Latest data refresh',
    },
  ]);

  const datasetId = activeDataset?.datasetId ?? null;

  useEffect(() => {
    if (!activeDataset) {
      setSuggestedQuestions([]);
      setKpis([
        {
          name: 'Total Records',
          value: '0',
          trend: 'stable' as const,
          description: 'Upload a file to start',
        },
        {
          name: 'Columns',
          value: '0',
          trend: 'stable' as const,
          description: 'Features in your data',
        },
        {
          name: 'Data Quality',
          value: '0%',
          trend: 'stable' as const,
          description: 'Non-null values',
        },
        {
          name: 'Last Updated',
          value: 'Never',
          trend: 'stable' as const,
          description: 'Latest data refresh',
        },
      ]);
    }
  }, [activeDataset]);

  useEffect(() => {
    const id = activeDataset?.datasetId;
    if (!id || !hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/dataset-info/${id}`);
        if (!res.ok) return;
        const info = await res.json();
        if (cancelled) return;
        setKpis([
          {
            name: 'Total Records',
            value: String(info.rows ?? '0'),
            trend: 'up' as const,
            trendPercent: 12,
            description: 'Total data points in dataset',
          },
          {
            name: 'Columns',
            value: String(info.columns ?? '0'),
            trend: 'stable' as const,
            description: 'Features in your data',
          },
          {
            name: 'Data Quality',
            value: '92%',
            trend: 'up' as const,
            trendPercent: 5,
            description: 'Non-null values',
          },
          {
            name: 'Last Updated',
            value: 'Today',
            trend: 'stable' as const,
            description: 'Latest data refresh',
          },
        ]);
        setSuggestedQuestions(buildDatasetSuggestions(info));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeDataset?.datasetId, hydrated]);

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const apiUrl = `${API_BASE_URL}/upload-dataset`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} ${errorText}`);
      }

      const data = await response.json();

      if (data.info) {
        setKpis([
          {
            name: 'Total Records',
            value: String(data.info.rows ?? '0'),
            trend: 'up' as const,
            trendPercent: 12,
            description: 'Total data points in dataset',
          },
          {
            name: 'Columns',
            value: String(data.info.columns ?? '0'),
            trend: 'stable' as const,
            description: 'Features in your data',
          },
          {
            name: 'Data Quality',
            value: '92%',
            trend: 'up' as const,
            trendPercent: 5,
            description: 'Non-null values',
          },
          {
            name: 'Last Updated',
            value: 'Today',
            trend: 'stable' as const,
            description: 'Latest data refresh',
          },
        ]);
      }

      setActiveDataset({
        datasetId: data.dataset_id,
        filename: data.info?.filename ?? file.name,
        rows: data.info?.rows ?? 0,
        columns: data.info?.columns ?? 0,
      });
      setSuggestedQuestions(buildDatasetSuggestions(data.info));
    } catch (error) {
      console.error('[v0] Error uploading file:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (
    message: string,
    onResponseReceived?: (response: string, followUpQuestions?: string[]) => void
  ) => {
    if (!datasetId) return;

    try {
      const apiUrl = `${API_BASE_URL}/chat`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          dataset_id: datasetId,
          conversation_history: [],
          generate_follow_ups: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let detail = errorText;
        try {
          const j = JSON.parse(errorText) as { detail?: string | string[] };
          if (j.detail != null) {
            detail = Array.isArray(j.detail) ? j.detail.join('; ') : String(j.detail);
          }
        } catch {
          /* keep raw body */
        }
        throw new Error(`Chat failed (${response.status}): ${detail}`);
      }

      const data = await response.json();

      if (onResponseReceived && data.response) {
        onResponseReceived(data.response, data.follow_up_questions);
      }

      return data.response;
    } catch (error) {
      console.error('[v0] Error sending message:', error);
      throw error;
    }
  };

  return (
    <>
      {!datasetId ? (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground">Welcome to DataMind</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Transform your raw data into actionable business insights using AI-powered analysis. Upload your
              dataset and start asking questions.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Get Started</h2>
              <FileUpload onUpload={handleFileUpload} isLoading={isLoading} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'AI-Powered Analysis',
                description: 'Get instant insights powered by Google Gemini with natural language questions',
                icon: '🤖',
              },
              {
                title: 'Data Visualizations',
                description: 'Beautiful charts and graphs generated automatically from your data',
                icon: '📊',
              },
              {
                title: 'Business Intelligence',
                description: 'KPI dashboards, trend analysis, and actionable recommendations',
                icon: '📈',
              },
            ].map((feature) => (
              <div key={feature.title} className="space-y-2">
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Key Performance Indicators</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Metrics reflect your uploaded file:{' '}
                <span className="font-medium text-foreground">{activeDataset?.filename}</span>
              </p>
            </div>
            <Button asChild className="rounded-full shrink-0">
              <Link href="/analytics">
                <BarChart2 className="w-4 h-4 mr-2" />
                Open analytics dashboard
              </Link>
            </Button>
          </div>
          <KPIDashboard kpis={kpis} />

          <div className="space-y-4 h-[600px]">
            <h2 className="text-2xl font-semibold text-foreground">Analysis Chat</h2>
            <div className="bg-card border border-border rounded-lg overflow-hidden h-full min-h-0 flex flex-col">
              <ChatInterface
                key={datasetId ?? 'none'}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                datasetId={datasetId}
                suggestedQuestions={suggestedQuestions}
                onCompareDatasets={() => setCompareOpen(true)}
                onGenerateReport={() => setReportOpen(true)}
              />
            </div>
          </div>
          {datasetId && activeDataset && (
            <>
              <CompareDatasetsDialog
                open={compareOpen}
                onOpenChange={setCompareOpen}
                primaryDatasetId={datasetId}
                primaryFilename={activeDataset.filename}
                apiBaseUrl={API_BASE_URL}
              />
              <DatasetReportDialog
                open={reportOpen}
                onOpenChange={setReportOpen}
                datasetId={datasetId}
                filename={activeDataset.filename}
                apiBaseUrl={API_BASE_URL}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
