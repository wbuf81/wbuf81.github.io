import { UsesItem, UsesData, Category, CATEGORY_LABELS } from '@/types/uses';

describe('Uses Types', () => {
  describe('CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      expect(CATEGORY_LABELS['all']).toBe('All');
      expect(CATEGORY_LABELS['health-wellness']).toBe('Health & Wellness');
      expect(CATEGORY_LABELS['tech-office']).toBe('Tech Gear & Office');
      expect(CATEGORY_LABELS['daisys-stuff']).toBe("Daisy's Stuff");
    });
  });

  describe('UsesItem interface', () => {
    it('should validate a correct item structure', () => {
      const validItem: UsesItem = {
        id: 'test-001',
        name: 'Test Product',
        description: 'A test product description',
        imageUrl: 'https://example.com/image.jpg',
        affiliateUrl: 'https://example.com/product',
        category: 'health-wellness',
        tags: ['test', 'example'],
        rating: 8,
        ratingEmoji: '🔥',
        featured: true,
        dateAdded: '2024-01-15T00:00:00Z',
      };

      expect(validItem.id).toBeDefined();
      expect(validItem.name).toBeDefined();
      expect(validItem.category).toBe('health-wellness');
      expect(validItem.rating).toBeGreaterThanOrEqual(1);
      expect(validItem.rating).toBeLessThanOrEqual(10);
      expect(Array.isArray(validItem.tags)).toBe(true);
    });
  });

  describe('UsesData interface', () => {
    it('should validate a correct data structure', () => {
      const validData: UsesData = {
        items: [],
        lastUpdated: '2024-01-15T00:00:00Z',
      };

      expect(Array.isArray(validData.items)).toBe(true);
      expect(validData.lastUpdated).toBeDefined();
    });
  });
});

describe('Category validation', () => {
  const validCategories: Category[] = ['all', 'health-wellness', 'tech-office', 'daisys-stuff'];

  it('should recognize valid categories', () => {
    validCategories.forEach(cat => {
      expect(CATEGORY_LABELS[cat]).toBeDefined();
    });
  });
});
