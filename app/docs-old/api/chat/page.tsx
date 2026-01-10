import { DocsLayout } from "@/components/docs-layout";

export default function ChatAPIPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-sentient mb-4">
            Chat <i className="font-light">Completions</i>
          </h1>
          <p className="font-mono text-lg text-foreground/80">
            Generate chat completions using any supported AI model
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Endpoint</h2>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6">
            <code className="font-mono text-sm text-primary">
              POST https://api.bluesminds.com/v1/chat/completions
            </code>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Request Body</h2>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-sm">
              <thead>
                <tr className="border-b border-foreground/10">
                  <th className="text-left py-3 pr-4">Parameter</th>
                  <th className="text-left py-3 pr-4">Type</th>
                  <th className="text-left py-3 pr-4">Required</th>
                  <th className="text-left py-3">Description</th>
                </tr>
              </thead>
              <tbody className="text-foreground/80">
                <tr className="border-b border-foreground/10">
                  <td className="py-3 pr-4 text-primary">model</td>
                  <td className="py-3 pr-4">string</td>
                  <td className="py-3 pr-4">Yes</td>
                  <td className="py-3">Model identifier (e.g., "gpt-4")</td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="py-3 pr-4 text-primary">messages</td>
                  <td className="py-3 pr-4">array</td>
                  <td className="py-3 pr-4">Yes</td>
                  <td className="py-3">Array of message objects</td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="py-3 pr-4 text-primary">temperature</td>
                  <td className="py-3 pr-4">number</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">Sampling temperature (0-2)</td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="py-3 pr-4 text-primary">max_tokens</td>
                  <td className="py-3 pr-4">number</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">Maximum tokens to generate</td>
                </tr>
                <tr className="border-b border-foreground/10">
                  <td className="py-3 pr-4 text-primary">stream</td>
                  <td className="py-3 pr-4">boolean</td>
                  <td className="py-3 pr-4">No</td>
                  <td className="py-3">Enable streaming responses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Example Request</h2>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`const response = await fetch('https://api.bluesminds.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer bm_live_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'What is the capital of France?'
      }
    ],
    temperature: 0.7,
    max_tokens: 500
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Example Response</h2>
          <div className="bg-black/50 rounded-lg border border-foreground/10 p-6 overflow-x-auto">
            <pre className="font-mono text-sm text-foreground/80">
              <code>{`{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The capital of France is Paris."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 8,
    "total_tokens": 28
  }
}`}</code>
            </pre>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-sentient">Supported Models</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono font-semibold mb-2">OpenAI</h3>
              <ul className="font-mono text-sm text-foreground/60 space-y-1">
                <li>• gpt-4</li>
                <li>• gpt-4-turbo</li>
                <li>• gpt-3.5-turbo</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono font-semibold mb-2">Anthropic</h3>
              <ul className="font-mono text-sm text-foreground/60 space-y-1">
                <li>• claude-3-opus</li>
                <li>• claude-3-sonnet</li>
                <li>• claude-3-haiku</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono font-semibold mb-2">Google</h3>
              <ul className="font-mono text-sm text-foreground/60 space-y-1">
                <li>• gemini-pro</li>
                <li>• gemini-pro-vision</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <h3 className="font-mono font-semibold mb-2">Cohere</h3>
              <ul className="font-mono text-sm text-foreground/60 space-y-1">
                <li>• command</li>
                <li>• command-light</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-lg border border-primary/20 bg-primary/5">
          <p className="font-mono text-sm text-foreground/80">
            <strong>Note:</strong> Model availability and features may vary by provider. Check the{" "}
            <a href="/docs/api/models" className="text-primary hover:underline">
              models endpoint
            </a>
            {" "}for the latest supported models.
          </p>
        </div>
      </div>
    </DocsLayout>
  );
}
