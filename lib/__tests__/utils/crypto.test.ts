import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey, verifyApiKey } from '@/lib/utils/crypto'

describe('Crypto Utilities', () => {
  describe('generateApiKey', () => {
    it('should generate a key with correct prefix', () => {
      const { key } = generateApiKey()
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(10)
    })

    it('should generate unique keys', () => {
      const key1 = generateApiKey().key
      const key2 = generateApiKey().key
      expect(key1).not.toBe(key2)
    })

    it('should generate keys of correct length', () => {
      const { key } = generateApiKey()
      expect(typeof key).toBe('string')
      expect(key.length).toBeGreaterThan(10)
    })
  })

  describe('hashApiKey', () => {
    it('should hash an API key', () => {
      const key = 'bm_test123456789012345678901234'
      const hash = hashApiKey(key)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(key)
      expect(typeof hash).toBe('string')
    })

    it('should produce different hashes for different keys', () => {
      const key1 = 'bm_test123456789012345678901234'
      const key2 = 'bm_diff123456789012345678901234'

      const hash1 = hashApiKey(key1)
      const hash2 = hashApiKey(key2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyApiKey', () => {
    it('should return true for matching key and hash', () => {
      const key = 'bm_test123456789012345678901234'
      const hash = hashApiKey(key)

      const isMatch = verifyApiKey(key, hash)
      expect(isMatch).toBe(true)
    })

    it('should return false for non-matching key and hash', () => {
      const key1 = 'bm_test123456789012345678901234'
      const key2 = 'bm_diff123456789012345678901234'
      const hash = hashApiKey(key1)

      const isMatch = verifyApiKey(key2, hash)
      expect(isMatch).toBe(false)
    })
  })
})
