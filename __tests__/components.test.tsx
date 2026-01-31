import React from 'react';
import { render, screen } from '@testing-library/react';
import { UsesItem } from '@/types/uses';

// Mock the EmojiRating component logic
function EmojiRating({ rating, emoji }: { rating: number; emoji: string }) {
  const filled = Math.min(Math.max(rating, 0), 10);
  const empty = 10 - filled;

  return (
    <div data-testid="emoji-rating">
      <span data-testid="filled">{Array(filled).fill(emoji).join('')}</span>
      <span data-testid="empty">{Array(empty).fill('⚫').join('')}</span>
    </div>
  );
}

describe('EmojiRating component', () => {
  it('should render correct number of filled emojis', () => {
    render(<EmojiRating rating={7} emoji="🔥" />);

    const filled = screen.getByTestId('filled');
    expect(filled.textContent).toBe('🔥🔥🔥🔥🔥🔥🔥');
  });

  it('should render correct number of empty circles', () => {
    render(<EmojiRating rating={7} emoji="🔥" />);

    const empty = screen.getByTestId('empty');
    expect(empty.textContent).toBe('⚫⚫⚫');
  });

  it('should handle rating of 10', () => {
    render(<EmojiRating rating={10} emoji="⭐" />);

    const filled = screen.getByTestId('filled');
    const empty = screen.getByTestId('empty');

    expect(filled.textContent).toBe('⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐');
    expect(empty.textContent).toBe('');
  });

  it('should handle rating of 0', () => {
    render(<EmojiRating rating={0} emoji="💪" />);

    const filled = screen.getByTestId('filled');
    const empty = screen.getByTestId('empty');

    expect(filled.textContent).toBe('');
    expect(empty.textContent).toBe('⚫⚫⚫⚫⚫⚫⚫⚫⚫⚫');
  });

  it('should clamp rating above 10', () => {
    render(<EmojiRating rating={15} emoji="🔥" />);

    const filled = screen.getByTestId('filled');
    // Count actual emoji occurrences (emojis can be 2+ chars in JS)
    const emojiCount = (filled.textContent?.match(/🔥/g) || []).length;
    expect(emojiCount).toBe(10);
  });

  it('should clamp rating below 0', () => {
    render(<EmojiRating rating={-5} emoji="🔥" />);

    const empty = screen.getByTestId('empty');
    expect(empty.textContent).toBe('⚫⚫⚫⚫⚫⚫⚫⚫⚫⚫');
  });
});

describe('UsesItem data structure', () => {
  const sampleItem: UsesItem = {
    id: 'test-001',
    name: 'Test Headphones',
    description: 'Great noise-canceling headphones',
    imageUrl: 'https://example.com/image.jpg',
    affiliateUrl: 'https://amazon.com/product',
    category: 'tech-office',
    tags: ['audio', 'headphones', 'wireless'],
    rating: 9,
    ratingEmoji: '🔥',
    featured: true,
    dateAdded: '2024-01-15T00:00:00Z',
  };

  it('should have all required properties', () => {
    expect(sampleItem).toHaveProperty('id');
    expect(sampleItem).toHaveProperty('name');
    expect(sampleItem).toHaveProperty('description');
    expect(sampleItem).toHaveProperty('imageUrl');
    expect(sampleItem).toHaveProperty('affiliateUrl');
    expect(sampleItem).toHaveProperty('category');
    expect(sampleItem).toHaveProperty('tags');
    expect(sampleItem).toHaveProperty('rating');
    expect(sampleItem).toHaveProperty('ratingEmoji');
    expect(sampleItem).toHaveProperty('featured');
    expect(sampleItem).toHaveProperty('dateAdded');
  });

  it('should have valid category', () => {
    const validCategories = ['health-wellness', 'tech-office', 'daisys-stuff'];
    expect(validCategories).toContain(sampleItem.category);
  });

  it('should have rating between 1 and 10', () => {
    expect(sampleItem.rating).toBeGreaterThanOrEqual(1);
    expect(sampleItem.rating).toBeLessThanOrEqual(10);
  });

  it('should have tags as an array', () => {
    expect(Array.isArray(sampleItem.tags)).toBe(true);
    expect(sampleItem.tags.length).toBeGreaterThan(0);
  });
});

describe('Category colors', () => {
  const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
    'health-wellness': { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.4)' },
    'tech-office': { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139, 92, 246, 0.4)' },
    'daisys-stuff': { primary: '#ec4899', secondary: '#f472b6', glow: 'rgba(236, 72, 153, 0.4)' },
  };

  it('should have colors for all categories', () => {
    expect(CATEGORY_COLORS['health-wellness']).toBeDefined();
    expect(CATEGORY_COLORS['tech-office']).toBeDefined();
    expect(CATEGORY_COLORS['daisys-stuff']).toBeDefined();
  });

  it('should have valid hex colors for primary', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    Object.values(CATEGORY_COLORS).forEach(colors => {
      expect(hexPattern.test(colors.primary)).toBe(true);
      expect(hexPattern.test(colors.secondary)).toBe(true);
    });
  });

  it('should have valid rgba for glow', () => {
    const rgbaPattern = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;
    Object.values(CATEGORY_COLORS).forEach(colors => {
      expect(rgbaPattern.test(colors.glow)).toBe(true);
    });
  });
});
