// Test the provider extraction logic

function extractProviderFromModel(model) {
  // Handle provider prefixes in model names (e.g., "anthropic/claude-opus-4-5", "azure_ai/claude-sonnet-4-5")
  if (model.includes('/')) {
    const [providerPrefix] = model.split('/');
    // Normalize common provider prefixes
    const normalizedProvider = providerPrefix.toLowerCase()
      .replace('_', '-')
      .replace('azure-ai', 'azure')
      .replace('azure-openai', 'azure');
    return normalizedProvider;
  }

  // Fallback to model name pattern matching
  const providers = {
    openai: ['gpt-', 'text-', 'davinci', 'curie', 'babbage', 'ada', 'o1-', 'o3-'],
    anthropic: ['claude-'],
    google: ['gemini-', 'palm-', 'bard-'],
    cohere: ['command-', 'embed-'],
    meta: ['llama-'],
    deepseek: ['deepseek-'],
    mistral: ['mistral-', 'mixtral-'],
  };

  for (const [provider, prefixes] of Object.entries(providers)) {
    if (prefixes.some((prefix) => model.toLowerCase().startsWith(prefix))) {
      return provider;
    }
  }

  return undefined;
}

console.log('='.repeat(70));
console.log('PROVIDER EXTRACTION TEST');
console.log('='.repeat(70));
console.log('');

const testCases = [
  // Models with provider prefixes (previously returned undefined, now should work)
  { model: 'anthropic/claude-opus-4-5', expected: 'anthropic' },
  { model: 'anthropic/claude-sonnet-4-5', expected: 'anthropic' },
  { model: 'azure_ai/claude-sonnet-4-5', expected: 'azure' },
  { model: 'openai/deepseek-v3-1-250821', expected: 'openai' },
  { model: 'openai/gpt-4', expected: 'openai' },

  // Models without prefixes (should work as before)
  { model: 'gpt-4', expected: 'openai' },
  { model: 'gpt-5.1', expected: 'openai' },
  { model: 'claude-opus-4.5', expected: 'anthropic' },
  { model: 'claude-sonnet-4.5', expected: 'anthropic' },
  { model: 'gemini-pro', expected: 'google' },
  { model: 'deepseek-chat', expected: 'deepseek' },
  { model: 'mistral-7b', expected: 'mistral' },

  // Edge cases
  { model: 'unknown-model', expected: undefined },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ model, expected }) => {
  const result = extractProviderFromModel(model);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';

  if (result === expected) {
    passed++;
  } else {
    failed++;
  }

  console.log(`${status} | Model: ${model.padEnd(35)} | Expected: ${String(expected).padEnd(12)} | Got: ${result || 'undefined'}`);
});

console.log('');
console.log('='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

// Exit with error if any tests failed
if (failed > 0) {
  process.exit(1);
}
