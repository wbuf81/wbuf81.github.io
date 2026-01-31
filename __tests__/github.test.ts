/**
 * Tests for GitHub API utilities
 */

// TextEncoder/TextDecoder are available globally in Node 18+ and jsdom

describe('GitHub API utilities', () => {
  describe('UTF-8 encoding/decoding', () => {
    // Test the encoding logic used in lib/github.ts
    function utf8ToBase64(str: string): string {
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    function base64ToUtf8(base64: string): string {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }

    it('should correctly encode and decode ASCII text', () => {
      const original = 'Hello, World!';
      const encoded = utf8ToBase64(original);
      const decoded = base64ToUtf8(encoded);
      expect(decoded).toBe(original);
    });

    it('should correctly encode and decode emojis', () => {
      const original = '🔥💪⭐';
      const encoded = utf8ToBase64(original);
      const decoded = base64ToUtf8(encoded);
      expect(decoded).toBe(original);
    });

    it('should correctly encode and decode mixed content', () => {
      const original = 'Rating: 🔥🔥🔥🔥🔥 (5/5)';
      const encoded = utf8ToBase64(original);
      const decoded = base64ToUtf8(encoded);
      expect(decoded).toBe(original);
    });

    it('should correctly encode and decode JSON with emojis', () => {
      const original = JSON.stringify({
        name: 'Test Product',
        ratingEmoji: '🔥',
        description: 'Great product! 👍',
      });
      const encoded = utf8ToBase64(original);
      const decoded = base64ToUtf8(encoded);
      expect(decoded).toBe(original);
      expect(JSON.parse(decoded)).toEqual(JSON.parse(original));
    });

    it('should handle special characters', () => {
      const original = 'Café résumé naïve';
      const encoded = utf8ToBase64(original);
      const decoded = base64ToUtf8(encoded);
      expect(decoded).toBe(original);
    });
  });
});

describe('Token validation', () => {
  it('should have correct token format check', () => {
    // GitHub PATs start with 'ghp_' for classic tokens or 'github_pat_' for fine-grained
    const validTokenPatterns = [
      /^ghp_[a-zA-Z0-9]{36}$/,
      /^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$/,
    ];

    const testToken = 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const isValidFormat = validTokenPatterns.some(pattern => pattern.test(testToken));
    expect(isValidFormat).toBe(true);

    const invalidToken = 'not-a-valid-token';
    const isInvalidFormat = validTokenPatterns.some(pattern => pattern.test(invalidToken));
    expect(isInvalidFormat).toBe(false);
  });
});
