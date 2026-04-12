import type { ReactNode } from 'react';
import { DatasetProvider } from '@/contexts/dataset-context';
import { MainShell } from '@/components/main-shell';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <DatasetProvider>
      <MainShell>{children}</MainShell>
    </DatasetProvider>
  );
}
