export interface UsesItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  affiliateUrl: string;
  category: 'tech-gear' | 'desk-office' | 'fitness-supplements';
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

export type Category = 'all' | 'tech-gear' | 'desk-office' | 'fitness-supplements';

export const CATEGORY_LABELS: Record<Category, string> = {
  'all': 'All',
  'tech-gear': 'Tech & Gear',
  'desk-office': 'Desk & Office',
  'fitness-supplements': 'Fitness',
};
