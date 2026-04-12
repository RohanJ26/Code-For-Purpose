'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataset } from '@/contexts/dataset-context';

export function MainShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeDataset, clearDataset } = useDataset();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeNav =
    pathname === '/'
      ? 'dashboard'
      : pathname.startsWith('/analytics')
        ? 'analysis'
        : pathname.startsWith('/trends')
          ? 'trends'
          : pathname.startsWith('/settings')
            ? 'settings'
            : 'dashboard';

  const headerTitle =
    pathname === '/'
      ? 'Business Analytics'
      : pathname.startsWith('/analytics')
        ? 'Analytics'
        : pathname.startsWith('/trends')
          ? 'Trends'
          : pathname.startsWith('/settings')
            ? 'Settings'
            : 'Business Analytics';

  const headerSubtitle = activeDataset
    ? 'Dataset loaded — insights use your active upload'
    : 'Upload your data to begin';

  return (
    <div className="flex h-screen bg-background">
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } border-r border-border bg-sidebar transition-all duration-300 overflow-hidden flex flex-col shrink-0`}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">DataMind</h1>
              <p className="text-xs text-muted-foreground">AI Business Analyst</p>
            </div>
          </div>

          <nav className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground px-3 py-2">MAIN</div>
            {[
              { icon: '📊', label: 'Dashboard', id: 'dashboard', path: '/' },
              { icon: '🔍', label: 'Analysis', id: 'analysis', path: '/analytics' },
              { icon: '📈', label: 'Trends', id: 'trends', path: '/trends' },
              { icon: '⚙️', label: 'Settings', id: 'settings', path: '/settings' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(item.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeNav === item.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {activeDataset && (
            <div className="border-t border-sidebar-border pt-6">
              <div className="text-xs font-semibold text-muted-foreground px-3 py-2">ACTIVE DATASET</div>
              <div className="bg-sidebar-accent/50 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-sidebar-foreground truncate" title={activeDataset.filename}>
                  {activeDataset.filename}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  ID {activeDataset.datasetId.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeDataset.rows.toLocaleString()} rows · {activeDataset.columns} columns
                </p>
                <Button
                  type="button"
                  onClick={() => clearDataset()}
                  variant="outline"
                  size="sm"
                  className="w-full rounded-full text-xs"
                >
                  Clear Dataset
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border mt-auto p-6 space-y-3">
          <p className="text-xs text-muted-foreground">Powered by Gemini AI and Vercel Deployment</p>
          <Button variant="outline" size="sm" className="w-full rounded-full text-xs">
            Get Help
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="border-b border-border px-6 py-4 bg-background flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <Button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="ghost"
              size="icon"
              className="rounded-lg shrink-0"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{headerTitle}</h2>
              <p className="text-xs text-muted-foreground truncate">{headerSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">{children}</div>
      </div>
    </div>
  );
}
