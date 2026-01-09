// ============================================================================
// STREAMING RESPONSE PARSER
// ============================================================================
// Parses Server-Sent Events (SSE) from LiteLLM streaming responses
// to extract actual token usage data.
//
// LiteLLM sends token usage in the final SSE event before [DONE]:
// data: {"id":"...","object":"chat.completion.chunk","created":...,"usage":{"prompt_tokens":123,"completion_tokens":456,"total_tokens":579}}
//
// This allows us to get ACTUAL token counts instead of estimates.
// ============================================================================

import { logger } from './logger'

export interface StreamUsageData {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  source: 'actual'
  method: 'stream-parsed'
}

export interface StreamParserResult {
  stream: ReadableStream
  usagePromise: Promise<StreamUsageData | null>
}

/**
 * Parse an SSE stream and extract token usage from the final event
 *
 * @param originalStream The raw ReadableStream from fetch
 * @returns Object with new passthrough stream and usage promise
 */
export function parseStreamForUsage(
  originalStream: ReadableStream
): StreamParserResult {
  let usageResolver: ((value: StreamUsageData | null) => void) | null = null
  const usagePromise = new Promise<StreamUsageData | null>((resolve) => {
    usageResolver = resolve
  })

  const { readable, writable } = new TransformStream()

  // Start processing the stream
  processStream(originalStream, writable, usageResolver).catch((error) => {
    logger.error('Stream processing error', error)
    if (usageResolver) {
      usageResolver(null)
    }
  })

  return {
    stream: readable,
    usagePromise,
  }
}

/**
 * Process the stream, pass through all chunks, and extract usage
 */
async function processStream(
  originalStream: ReadableStream,
  writable: WritableStream,
  usageResolver: ((value: StreamUsageData | null) => void) | null
): Promise<void> {
  const reader = originalStream.getReader()
  const writer = writable.getWriter()
  const decoder = new TextDecoder()
  let buffer = ''
  let usageData: StreamUsageData | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Stream finished
        if (usageResolver) {
          usageResolver(usageData)
        }
        await writer.close()
        break
      }

      // Pass through the chunk immediately (don't block the response)
      await writer.write(value)

      // Also parse it for usage data
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()

          // Skip [DONE] marker
          if (data === '[DONE]') {
            continue
          }

          // Try to parse JSON
          try {
            const json = JSON.parse(data)

            // Look for usage data
            // LiteLLM format: {..., "usage": {"prompt_tokens": 123, ...}}
            if (json.usage) {
              const usage = json.usage
              if (
                typeof usage.prompt_tokens === 'number' &&
                typeof usage.completion_tokens === 'number'
              ) {
                // Found it!
                usageData = {
                  promptTokens: usage.prompt_tokens,
                  completionTokens: usage.completion_tokens,
                  totalTokens:
                    usage.total_tokens ||
                    usage.prompt_tokens + usage.completion_tokens,
                  source: 'actual',
                  method: 'stream-parsed',
                }

                logger.gateway('Extracted usage from stream', usageData)
              }
            }
          } catch (parseError) {
            // Not JSON or malformed, skip it
            continue
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error processing stream', error)
    if (usageResolver) {
      usageResolver(null)
    }
    throw error
  }
}

/**
 * Simple helper to parse SSE stream and wait for usage
 * Use this when you just need the usage data
 *
 * @param stream Readable stream from fetch
 * @returns Usage data or null if not found
 */
export async function extractUsageFromStream(
  stream: ReadableStream
): Promise<StreamUsageData | null> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()

          if (data === '[DONE]') {
            continue
          }

          try {
            const json = JSON.parse(data)

            if (json.usage) {
              const usage = json.usage
              if (
                typeof usage.prompt_tokens === 'number' &&
                typeof usage.completion_tokens === 'number'
              ) {
                return {
                  promptTokens: usage.prompt_tokens,
                  completionTokens: usage.completion_tokens,
                  totalTokens:
                    usage.total_tokens ||
                    usage.prompt_tokens + usage.completion_tokens,
                  source: 'actual',
                  method: 'stream-parsed',
                }
              }
            }
          } catch {
            continue
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error extracting usage from stream', error)
  }

  return null
}

/**
 * Create a transform stream that extracts usage while passing through data
 * More efficient than reading the entire stream twice
 */
export class UsageExtractionTransform extends TransformStream<
  Uint8Array,
  Uint8Array
> {
  private usageData: StreamUsageData | null = null
  private buffer = ''
  private decoder = new TextDecoder()

  constructor() {
    super({
      transform: (chunk, controller) => {
        // Pass through immediately
        controller.enqueue(chunk)

        // Also parse for usage
        const text = this.decoder.decode(chunk, { stream: true })
        this.buffer += text

        const lines = this.buffer.split('\n')
        this.buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const json = JSON.parse(data)
              if (json.usage) {
                const usage = json.usage
                if (
                  typeof usage.prompt_tokens === 'number' &&
                  typeof usage.completion_tokens === 'number'
                ) {
                  this.usageData = {
                    promptTokens: usage.prompt_tokens,
                    completionTokens: usage.completion_tokens,
                    totalTokens:
                      usage.total_tokens ||
                      usage.prompt_tokens + usage.completion_tokens,
                    source: 'actual',
                    method: 'stream-parsed',
                  }
                }
              }
            } catch {
              // Not JSON, skip
            }
          }
        }
      },
    })
  }

  getUsage(): StreamUsageData | null {
    return this.usageData
  }
}
