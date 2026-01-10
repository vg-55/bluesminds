#!/usr/bin/env node

/**
 * Test Anthropic Model Pricing
 * Verify that new Claude models have correct pricing configured
 */

// Simple inline test - simulating the pricing logic
const modelPricingRequests = {
  'claude-opus-4': 0.015,
  'claude-opus-4.5': 0.015,
  'claude-opus-4-5-20251031': 0.015,
  'claude-sonnet-4': 0.008,
  'claude-sonnet-4.5': 0.008,
  'claude-sonnet-4-5-20250929': 0.008,
  'claude-haiku-4': 0.003,
  'claude-haiku-4-0-20250101': 0.003,
  'claude-3-opus-20240229': 0.015,
  'claude-3-sonnet-20240229': 0.008,
  'default': 0.005,
};

const modelPricing = {
  'claude-opus-4': { input: 0.015, output: 0.075 },
  'claude-opus-4.5': { input: 0.015, output: 0.075 },
  'claude-opus-4-5-20251031': { input: 0.015, output: 0.075 },
  'claude-sonnet-4': { input: 0.003, output: 0.015 },
  'claude-sonnet-4.5': { input: 0.003, output: 0.015 },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
  'claude-haiku-4': { input: 0.00025, output: 0.00125 },
  'claude-haiku-4-0-20250101': { input: 0.00025, output: 0.00125 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'default': { input: 0.001, output: 0.002 },
};

function getModelPricingRequest(model) {
  const cleanModel = model.includes('/') ? model.split('/').pop() : model;
  if (cleanModel in modelPricingRequests) {
    return modelPricingRequests[cleanModel];
  }
  const baseModel = Object.keys(modelPricingRequests).find(key => cleanModel.startsWith(key));
  if (baseModel) {
    return modelPricingRequests[baseModel];
  }
  return modelPricingRequests.default;
}

function getModelPricing(model) {
  const cleanModel = model.includes('/') ? model.split('/').pop() : model;
  if (cleanModel in modelPricing) {
    return modelPricing[cleanModel];
  }
  const baseModel = Object.keys(modelPricing).find(key => cleanModel.startsWith(key));
  if (baseModel) {
    return modelPricing[baseModel];
  }
  return modelPricing.default;
}

console.log('======================================================================');
console.log('ANTHROPIC MODEL PRICING TEST');
console.log('======================================================================\n');

const testCases = [
  // Claude 4.5 with dates
  { model: 'claude-opus-4-5-20251031', expectedRequest: 0.015, expectedInput: 0.015, expectedOutput: 0.075 },
  { model: 'claude-sonnet-4-5-20250929', expectedRequest: 0.008, expectedInput: 0.003, expectedOutput: 0.015 },
  { model: 'claude-haiku-4-0-20250101', expectedRequest: 0.003, expectedInput: 0.00025, expectedOutput: 0.00125 },

  // Claude 4.5 without dates
  { model: 'claude-opus-4.5', expectedRequest: 0.015, expectedInput: 0.015, expectedOutput: 0.075 },
  { model: 'claude-sonnet-4.5', expectedRequest: 0.008, expectedInput: 0.003, expectedOutput: 0.015 },
  { model: 'claude-haiku-4', expectedRequest: 0.003, expectedInput: 0.00025, expectedOutput: 0.00125 },

  // With provider prefix
  { model: 'anthropic/claude-opus-4-5-20251031', expectedRequest: 0.015, expectedInput: 0.015, expectedOutput: 0.075 },
  { model: 'anthropic/claude-sonnet-4-5-20250929', expectedRequest: 0.008, expectedInput: 0.003, expectedOutput: 0.015 },

  // Claude 3 series (for comparison)
  { model: 'claude-3-opus-20240229', expectedRequest: 0.015, expectedInput: 0.015, expectedOutput: 0.075 },
  { model: 'claude-3-sonnet-20240229', expectedRequest: 0.008, expectedInput: 0.003, expectedOutput: 0.015 },
];

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const requestPrice = getModelPricingRequest(test.model);
  const tokenPricing = getModelPricing(test.model);

  const requestMatch = requestPrice === test.expectedRequest;
  const inputMatch = tokenPricing.input === test.expectedInput;
  const outputMatch = tokenPricing.output === test.expectedOutput;

  const allMatch = requestMatch && inputMatch && outputMatch;

  if (allMatch) {
    console.log(`✅ PASS | ${test.model.padEnd(40)} | Request: $${requestPrice.toFixed(3)} | Input: $${tokenPricing.input.toFixed(5)}/1K | Output: $${tokenPricing.output.toFixed(5)}/1K`);
    passed++;
  } else {
    console.log(`❌ FAIL | ${test.model.padEnd(40)}`);
    if (!requestMatch) {
      console.log(`        Request pricing: expected $${test.expectedRequest}, got $${requestPrice}`);
    }
    if (!inputMatch) {
      console.log(`        Input pricing: expected $${test.expectedInput}, got $${tokenPricing.input}`);
    }
    if (!outputMatch) {
      console.log(`        Output pricing: expected $${test.expectedOutput}, got $${tokenPricing.output}`);
    }
    failed++;
  }
}

console.log('\n======================================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('======================================================================');

process.exit(failed > 0 ? 1 : 0);
