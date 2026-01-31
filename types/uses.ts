export interface UsesItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  affiliateUrl: string;
  category: 'health-wellness' | 'tech-office' | 'daisys-stuff';
  tags: string[];
  rating: number; // 1-10
  ratingEmoji: string;
  featured: boolean;
  dateAdded: string;
}

export interface UsesData {
  items: UsesItem[];
  lastUpdated: string;
}

export type Category = 'all' | 'health-wellness' | 'tech-office' | 'daisys-stuff';

export const CATEGORY_LABELS: Record<Category, string> = {
  'all': 'All',
  'health-wellness': 'Health & Wellness',
  'tech-office': 'Tech Gear & Office',
  'daisys-stuff': "Daisy's Stuff",
};
