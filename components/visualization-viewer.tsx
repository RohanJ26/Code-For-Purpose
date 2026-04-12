'use client';

import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VisualizationViewerProps {
  imageData: string;
  title?: string;
  subtitle?: string;
}

export function VisualizationViewer({
  imageData,
  title,
  subtitle,
}: VisualizationViewerProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `${title || 'chart'}.png`;
    link.click();
  };

  return (
    <Card className="p-6 border border-border">
      <div className="space-y-4">
        {(title || subtitle) && (
          <div className="space-y-1">
            {title && <h3 className="font-semibold text-foreground">{title}</h3>}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}

        <div className="relative w-full bg-muted rounded-lg overflow-hidden">
          <img
            src={`data:image/png;base64,${imageData}`}
            alt={title || 'Visualization'}
            className="w-full h-auto"
          />
        </div>

        {title && (
          <Button
            onClick={handleDownload}
            variant="outline"
            size="sm"
            className="w-full rounded-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Chart
          </Button>
        )}
      </div>
    </Card>
  );
}
