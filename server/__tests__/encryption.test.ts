import { describe, it, expect, beforeAll } from 'vitest';

// Set environment variable before importing the encryption module
beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!!';
});

// Dynamic import to ensure env var is set first
let encrypt: (text: string) => string;
let decrypt: (text: string) => string;

beforeAll(async () => {
  const module = await import('../encryption');
  encrypt = module.encrypt;
  decrypt = module.decrypt;
});

describe('Encryption', () => {
  describe('encrypt and decrypt roundtrip', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'Hello, World!';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle empty strings', () => {
      const originalText = '';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle special characters', () => {
      const originalText = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle unicode characters', () => {
      const originalText = '你好世界 🌍 مرحبا العالم';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle long text', () => {
      const originalText = 'A'.repeat(10000);
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });

    it('should handle API key-like strings', () => {
      const originalText = 'sk-proj-abc123XYZ_789-secret-key';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(originalText);
    });
  });

  describe('encrypt', () => {
    it('should produce different ciphertext for same input (due to random IV)', () => {
      const text = 'Same text';
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      
      // The encrypted values should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(text);
      expect(decrypt(encrypted2)).toBe(text);
    });

    it('should produce output in expected format (IV:ciphertext)', () => {
      const encrypted = encrypt('test');
      
      // Should contain a colon separator
      expect(encrypted).toContain(':');
      
      // Should have two parts
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(2);
      
      // IV should be 32 hex characters (16 bytes)
      expect(parts[0]).toHaveLength(32);
      expect(parts[0]).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('decrypt', () => {
    it('should throw on invalid format', () => {
      expect(() => decrypt('invalid-no-colon')).toThrow();
    });

    it('should throw on invalid IV', () => {
      expect(() => decrypt('invalidiv:someciphertext')).toThrow();
    });
  });
});

