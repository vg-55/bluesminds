import type React from 'react';
import { source } from '@/lib/source';
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Callout } from '@/components/mdx/callout';
import { Card, Cards } from '@/components/mdx/cards';

export const revalidate = 3600; // safer than a 1y CDN cache; allows updates to docs without redeploy

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  // `source` is built from `lib/source.ts` and includes `body` at runtime, but the
  // generated `PageData` type may not include it. Cast narrowly to keep TS happy.
  const data = page.data as unknown as {
    title: string
    description?: string
    body: React.ComponentType<{ components?: Record<string, unknown> }>
    toc?: any
    full?: boolean
  }

  const MDX = data.body

  return (
    <DocsPage toc={data.toc} full={data.full}>
      <DocsTitle>{data.title}</DocsTitle>
      <DocsDescription>{data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={{
            ...defaultMdxComponents,
            Callout,
            Card,
            Cards,
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
