// ============================================================================
// DOCS NAVIGATION STRUCTURE
// ============================================================================

import {
  BookOpen,
  Zap,
  Shield,
  MessageSquare,
  Layers,
  Box,
  GitBranch,
  Gauge,
  AlertTriangle,
} from 'lucide-react'

export interface NavLink {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface NavSection {
  title: string
  links: NavLink[]
}

export const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    links: [
      {
        name: 'Introduction',
        href: '/docs',
        icon: BookOpen,
      },
      {
        name: 'Quick Start',
        href: '/docs/quickstart',
        icon: Zap,
      },
      {
        name: 'Authentication',
        href: '/docs/authentication',
        icon: Shield,
      },
    ],
  },
  {
    title: 'API Reference',
    links: [
      {
        name: 'Chat Completions',
        href: '/docs/api/chat',
        icon: MessageSquare,
      },
      {
        name: 'Embeddings',
        href: '/docs/api/embeddings',
        icon: Layers,
      },
      {
        name: 'Models',
        href: '/docs/api/models',
        icon: Box,
      },
    ],
  },
  {
    title: 'Guides',
    links: [
      {
        name: 'Routing Strategies',
        href: '/docs/guides/routing',
        icon: GitBranch,
      },
      {
        name: 'Rate Limiting',
        href: '/docs/guides/rate-limiting',
        icon: Gauge,
      },
      {
        name: 'Error Handling',
        href: '/docs/guides/errors',
        icon: AlertTriangle,
      },
    ],
  },
]
