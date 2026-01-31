import fs from 'fs';
import path from 'path';
import { UsesData, UsesItem } from '@/types/uses';

describe('Data file validation', () => {
  const dataPath = path.join(process.cwd(), 'data/uses.json');

  it('should have a valid uses.json file', () => {
    expect(fs.existsSync(dataPath)).toBe(true);
  });

  it('should parse uses.json without errors', () => {
    const content = fs.readFileSync(dataPath, 'utf8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  describe('uses.json structure', () => {
    let data: UsesData;

    beforeAll(() => {
      const content = fs.readFileSync(dataPath, 'utf8');
      data = JSON.parse(content);
    });

    it('should have items array', () => {
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should have lastUpdated string', () => {
      expect(typeof data.lastUpdated).toBe('string');
    });

    it('should have valid items', () => {
      data.items.forEach((item: UsesItem) => {
        // Required fields
        expect(item.id).toBeDefined();
        expect(typeof item.id).toBe('string');

        expect(item.name).toBeDefined();
        expect(typeof item.name).toBe('string');

        expect(item.description).toBeDefined();
        expect(typeof item.description).toBe('string');

        expect(item.affiliateUrl).toBeDefined();
        expect(typeof item.affiliateUrl).toBe('string');

        expect(item.category).toBeDefined();
        expect(['tech-gear', 'desk-office', 'fitness-supplements']).toContain(item.category);

        expect(Array.isArray(item.tags)).toBe(true);

        expect(item.rating).toBeDefined();
        expect(typeof item.rating).toBe('number');
        expect(item.rating).toBeGreaterThanOrEqual(1);
        expect(item.rating).toBeLessThanOrEqual(10);

        expect(item.ratingEmoji).toBeDefined();
        expect(typeof item.ratingEmoji).toBe('string');

        expect(typeof item.featured).toBe('boolean');

        expect(item.dateAdded).toBeDefined();
        expect(() => new Date(item.dateAdded)).not.toThrow();
      });
    });

    it('should have unique item IDs', () => {
      const ids = data.items.map((item: UsesItem) => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid URLs for affiliate links', () => {
      data.items.forEach((item: UsesItem) => {
        expect(() => new URL(item.affiliateUrl)).not.toThrow();
      });
    });

    it('should have valid image URLs or empty strings', () => {
      data.items.forEach((item: UsesItem) => {
        if (item.imageUrl && item.imageUrl.length > 0) {
          expect(() => new URL(item.imageUrl)).not.toThrow();
        }
      });
    });
  });
});

describe('Articles data validation', () => {
  const articlesDir = path.join(process.cwd(), 'content/articles');

  it('should have articles directory', () => {
    expect(fs.existsSync(articlesDir)).toBe(true);
  });

  it('should have valid MDX files', () => {
    if (fs.existsSync(articlesDir)) {
      const files = fs.readdirSync(articlesDir);
      const mdxFiles = files.filter(f => f.endsWith('.mdx'));

      mdxFiles.forEach(file => {
        const content = fs.readFileSync(path.join(articlesDir, file), 'utf8');
        // Check for frontmatter
        expect(content.startsWith('---')).toBe(true);
        expect(content.indexOf('---', 3)).toBeGreaterThan(3);
      });
    }
  });
});
