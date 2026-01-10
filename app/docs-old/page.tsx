import { DocsLayout } from "@/components/docs-layout";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Activity } from "lucide-react";

export default function DocsHomePage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-sentient mb-4">
            BluesMinds <i className="font-light">Documentation</i>
          </h1>
          <p className="font-mono text-lg text-foreground/80 leading-relaxed">
            Welcome to the BluesMinds documentation. Learn how to integrate and use
            our AI gateway to connect with multiple model providers through a single
            API.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
          <Link
            href="/docs/quickstart"
            className="group p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:border-primary/50 transition-all"
          >
            <Zap className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-mono text-lg mb-2 group-hover:text-primary transition-colors">
              Quick Start
            </h3>
            <p className="font-mono text-sm text-foreground/60 mb-4">
              Get up and running in minutes with our step-by-step guide
            </p>
            <span className="font-mono text-sm text-primary flex items-center gap-2">
              Get started <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            href="/docs/authentication"
            className="group p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:border-primary/50 transition-all"
          >
            <Shield className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-mono text-lg mb-2 group-hover:text-primary transition-colors">
              Authentication
            </h3>
            <p className="font-mono text-sm text-foreground/60 mb-4">
              Learn how to authenticate your requests securely
            </p>
            <span className="font-mono text-sm text-primary flex items-center gap-2">
              Learn more <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            href="/docs/api/chat"
            className="group p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:border-primary/50 transition-all"
          >
            <Activity className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-mono text-lg mb-2 group-hover:text-primary transition-colors">
              API Reference
            </h3>
            <p className="font-mono text-sm text-foreground/60 mb-4">
              Explore the complete API documentation and examples
            </p>
            <span className="font-mono text-sm text-primary flex items-center gap-2">
              View API docs <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        {/* Introduction */}
        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">What is BluesMinds?</h2>
          <p className="font-mono text-sm text-foreground/80 leading-relaxed">
            BluesMinds is an AI gateway that provides a unified API layer for
            accessing multiple AI model providers. Instead of managing separate
            integrations for OpenAI, Anthropic, Google, and others, BluesMinds
            offers:
          </p>
          <ul className="space-y-2 font-mono text-sm text-foreground/80">
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>Unified API</strong> - One consistent interface for all
                providers
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>Smart Routing</strong> - Automatic request routing based on
                your rules
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>Observability</strong> - Detailed logs and analytics across
                all providers
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary mt-1">•</span>
              <span>
                <strong>Reliability</strong> - Built-in retries, fallbacks, and error
                handling
              </span>
            </li>
          </ul>
        </div>

        {/* Getting Started */}
        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Getting Started</h2>
          <div className="space-y-4">
            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono text-lg mb-3">1. Create an Account</h3>
              <p className="font-mono text-sm text-foreground/60 mb-4">
                Sign up for a free account to get started with BluesMinds.
              </p>
              <Link
                href="/signup"
                className="inline-block px-4 py-2 rounded-lg bg-primary text-background font-mono text-sm hover:bg-primary/90 transition-colors"
              >
                [Sign Up Free]
              </Link>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono text-lg mb-3">2. Generate API Key</h3>
              <p className="font-mono text-sm text-foreground/60">
                Once logged in, create your first API key from the dashboard.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono text-lg mb-3">3. Make Your First Request</h3>
              <p className="font-mono text-sm text-foreground/60 mb-4">
                Use your API key to start making requests to any supported provider.
              </p>
              <Link
                href="/docs/quickstart"
                className="font-mono text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
              >
                View Quick Start Guide <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
}
