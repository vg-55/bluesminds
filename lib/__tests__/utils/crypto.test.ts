import { describe, it, expect } from 'vitest'
import { hashApiKey, compareApiKey, generateApiKey } from '@/lib/utils/crypto'

describe('Crypto Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a key with correct prefix', () => {
      const key = generateApiKey()
      expect(key).toMatch(/^bm_[a-zA-Z0-9]{32}$/)
    })

    it('should generate unique keys', () => {
      const key1 = generateApiKey()
      const key2 = generateApiKey()
      expect(key1).not.toBe(key2)
    })

    it('should generate keys of correct length', () => {
      const key = generateApiKey()
      expect(key.length).toBe(35) // 'bm_' (3) + 32 characters
    })
  })

  describe('hashApiKey', () => {
    it('should hash an API key', async () => {
      const key = 'bm_test123456789012345678901234'
      const hash = await hashApiKey(key)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(key)
      expect(typeof hash).toBe('string')
    })

    it('should produce different hashes for different keys', async () => {
      const key1 = 'bm_test123456789012345678901234'
      const key2 = 'bm_diff123456789012345678901234'

      const hash1 = await hashApiKey(key1)
      const hash2 = await hashApiKey(key2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('compareApiKey', () => {
    it('should return true for matching key and hash', async () => {
      const key = 'bm_test123456789012345678901234'
      const hash = await hashApiKey(key)

      const isMatch = await compareApiKey(key, hash)
      expect(isMatch).toBe(true)
    })

    it('should return false for non-matching key and hash', async () => {
      const key1 = 'bm_test123456789012345678901234'
      const key2 = 'bm_diff123456789012345678901234'
      const hash = await hashApiKey(key1)

      const isMatch = await compareApiKey(key2, hash)
      expect(isMatch).toBe(false)
    })
  })
})
