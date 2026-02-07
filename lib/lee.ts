import fs from 'fs';
import path from 'path';
import { LeeData, LeeItem } from '@/types/lee';

const leeFilePath = path.join(process.cwd(), 'data/lee.json');

export function getLeeData(): LeeData {
  if (!fs.existsSync(leeFilePath)) {
    return { items: [], lastUpdated: '' };
  }

  const fileContents = fs.readFileSync(leeFilePath, 'utf8');
  return JSON.parse(fileContents) as LeeData;
}

export function getAllLeeItems(): LeeItem[] {
  const data = getLeeData();
  return data.items.sort((a, b) =>
    new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
}

export function getFeaturedLeeItems(): LeeItem[] {
  return getAllLeeItems().filter(item => item.featured);
}

export function getLeeItemsByCategory(category: string): LeeItem[] {
  if (category === 'all') {
    return getAllLeeItems();
  }
  return getAllLeeItems().filter(item => item.category === category);
}

export function getAllLeeTags(): string[] {
  const items = getAllLeeItems();
  const tagSet = new Set<string>();
  items.forEach(item => {
    item.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}
