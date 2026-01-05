"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X, BookOpen, Code2, Zap, Shield, ChevronRight } from "lucide-react";

const navigation = [
  {
    title: "Getting Started",
    links: [
      { name: "Introduction", href: "/docs" },
      { name: "Quick Start", href: "/docs/quickstart" },
      { name: "Authentication", href: "/docs/authentication" },
    ],
  },
  {
    title: "API Reference",
    links: [
      { name: "Chat Completions", href: "/docs/api/chat" },
      { name: "Embeddings", href: "/docs/api/embeddings" },
      { name: "Models", href: "/docs/api/models" },
    ],
  },
  {
    title: "Guides",
    links: [
      { name: "Routing Strategies", href: "/docs/guides/routing" },
      { name: "Rate Limiting", href: "/docs/guides/rate-limiting" },
      { name: "Error Handling", href: "/docs/guides/errors" },
    ],
  },
];

export function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span className="font-mono font-semibold">BluesMinds Docs</span>
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link
                  href="/docs"
                  className="font-mono text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
                <Link
                  href="/docs/api/chat"
                  className="font-mono text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                  API Reference
                </Link>
                <Link
                  href="/dashboard"
                  className="font-mono text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
              </nav>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-foreground/10 overflow-y-auto pt-24 pb-8 px-4",
              "md:sticky md:top-24 md:h-[calc(100vh-6rem)] md:block",
              mobileMenuOpen ? "block" : "hidden"
            )}
          >
            <nav className="space-y-8">
              {navigation.map((section) => (
                <div key={section.title}>
                  <h3 className="font-mono text-xs uppercase tracking-wide text-foreground/60 mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.links.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "block font-mono text-sm py-2 px-3 rounded-lg transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                            )}
                          >
                            {link.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 max-w-4xl">
            <div className="prose prose-invert max-w-none">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
