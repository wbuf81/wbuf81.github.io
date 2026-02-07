export interface LeeItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  affiliateUrl: string;
  category: 'supplements' | 'hair-bath' | 'food' | 'fitness';
  tags: string[];
  rating: number; // 1-10
  ratingEmoji: string;
  featured: boolean;
  dateAdded: string;
}

export interface LeeData {
  items: LeeItem[];
  lastUpdated: string;
}

export type LeeCategory = 'all' | 'supplements' | 'hair-bath' | 'food' | 'fitness';

export const LEE_CATEGORY_LABELS: Record<LeeCategory, string> = {
  'all': 'All',
  'supplements': 'Supplements',
  'hair-bath': 'Hair & Bath',
  'food': 'Food',
  'fitness': 'Fitness',
};
