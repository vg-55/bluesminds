import { DocsLayout } from "@/components/docs-layout";
import { Shield, Key, AlertTriangle } from "lucide-react";

export default function AuthenticationPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-sentient mb-4">
            Authentication
          </h1>
          <p className="font-mono text-lg text-foreground/80">
            Learn how to authenticate your requests to the BluesMinds API
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">API Keys</h2>
          <p className="font-mono text-sm text-foreground/80">
            BluesMinds uses API keys to authenticate requests. You can create and manage your API keys from the{" "}
            <a href="/dashboard/keys" className="text-primary hover:underline">
              dashboard
            </a>
            .
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Key Types</h2>
          <div className="space-y-4">
            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-mono text-lg">Test Keys</h3>
              </div>
              <p className="font-mono text-sm text-foreground/60 mb-2">
                Prefix: <code className="text-primary">bm_test_</code>
              </p>
              <p className="font-mono text-sm text-foreground/80">
                Test keys have limited quotas and are meant for development and testing purposes only.
              </p>
            </div>

            <div className="p-6 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <Key className="w-5 h-5 text-primary" />
                <h3 className="font-mono text-lg">Live Keys</h3>
              </div>
              <p className="font-mono text-sm text-foreground/60 mb-2">
                Prefix: <code className="text-primary">bm_live_</code>
              </p>
              <p className="font-mono text-sm text-foreground/80">
                Live keys are for production use and have full access to your account's quota and features.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Making Authenticated Requests</h2>
          <p className="font-mono text-sm text-foreground/80">
            Include your API key in the Authorization header:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`Authorization: Bearer bm_live_abc123def456ghi789jkl`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Using the SDK</h2>
          <p className="font-mono text-sm text-foreground/80">
            The SDK automatically handles authentication when you provide your API key:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`import { BluesMinds } from '@bluesminds/sdk';

const client = new BluesMinds({
  apiKey: process.env.BLUESMINDS_API_KEY
});

// All requests are automatically authenticated
const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});`}</code>
            </pre>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-red-500/20 bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-mono text-lg text-red-500 mb-2">Security Best Practices</h3>
              <ul className="space-y-2 font-mono text-sm text-foreground/80">
                <li>• Never commit API keys to version control</li>
                <li>• Store keys in environment variables</li>
                <li>• Rotate keys regularly</li>
                <li>• Use test keys for development</li>
                <li>• Delete unused keys immediately</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
}
