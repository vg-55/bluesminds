import { DocsLayout } from "@/components/docs-layout";

export default function QuickStartPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-sentient mb-4">
            Quick <i className="font-light">Start</i>
          </h1>
          <p className="font-mono text-lg text-foreground/80">
            Get started with BluesMinds in under 5 minutes
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Installation</h2>
          <p className="font-mono text-sm text-foreground/80">
            Install the BluesMinds SDK using your preferred package manager:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`npm install @bluesminds/sdk
# or
yarn add @bluesminds/sdk
# or
pnpm add @bluesminds/sdk`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Initialize the Client</h2>
          <p className="font-mono text-sm text-foreground/80">
            Create a new client instance with your API key:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`import { BluesMinds } from '@bluesminds/sdk';

const client = new BluesMinds({
  apiKey: process.env.BLUESMINDS_API_KEY
});`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Make Your First Request</h2>
          <p className="font-mono text-sm text-foreground/80">
            Send a chat completion request to any supported model:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`const response = await client.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello! How are you?' }
  ]
});

console.log(response.choices[0].message.content);`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Use Different Providers</h2>
          <p className="font-mono text-sm text-foreground/80">
            Switch between providers seamlessly by changing the model name:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`// OpenAI
await client.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Anthropic
await client.chat.completions.create({
  model: 'claude-3-opus',
  messages: [{ role: 'user', content: 'Hello!' }]
});

// Google
await client.chat.completions.create({
  model: 'gemini-pro',
  messages: [{ role: 'user', content: 'Hello!' }]
});`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Error Handling</h2>
          <p className="font-mono text-sm text-foreground/80">
            Handle errors gracefully with try-catch blocks:
          </p>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`try {
  const response = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  });
  console.log(response);
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    console.error('Rate limit exceeded');
  } else if (error.code === 'authentication_error') {
    console.error('Invalid API key');
  } else {
    console.error('An error occurred:', error.message);
  }
}`}</code>
            </pre>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-primary/20 bg-primary/5">
          <p className="font-mono text-sm text-foreground/80">
            <strong>Next Steps:</strong> Learn about{" "}
            <a href="/docs/authentication" className="text-primary hover:underline">
              authentication
            </a>
            , explore the{" "}
            <a href="/docs/api/chat" className="text-primary hover:underline">
              API reference
            </a>
            , or check out our{" "}
            <a href="/docs/guides/routing" className="text-primary hover:underline">
              routing strategies guide
            </a>
            .
          </p>
        </div>
      </div>
    </DocsLayout>
  );
}
