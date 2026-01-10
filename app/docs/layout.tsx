import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/layout.config';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree || { root: { children: [] } }}
      nav={{
        title: 'BluesMinds',
        url: '/',
        enabled: true,
        transparentMode: 'none',
      }}
      links={[
        { text: 'Home', url: '/' },
        { text: 'Dashboard', url: '/dashboard' },
      ]}
      sidebar={{
        enabled: true,
        defaultOpenLevel: 0,
      }}
    >
      {children}
    </DocsLayout>
  );
}
