import { docs, meta } from '@/.source';
import { loader } from 'fumadocs-core/source';

// Create proper file structure for loader
const files = [
  ...docs.map((doc) => {
    // Handle MDX data - check if default export exists
    const MDXContent = doc.data?.default;
    const frontmatter = { ...doc.data };
    delete frontmatter.default;

    return {
      type: 'page' as const,
      path: doc.info.path.replace(/\.mdx?$/, ''),
      data: {
        ...frontmatter,
        body: MDXContent || (() => null),
        title: frontmatter.title || doc.info.path,
        description: frontmatter.description || '',
      },
    };
  }),
  ...meta.map((m) => ({
    type: 'meta' as const,
    path: m.info.path.replace(/meta\.json$/, ''),
    data: m.data,
  })),
];

export const source = loader({
  baseUrl: '/docs',
  source: { files },
});
