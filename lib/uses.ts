import fs from 'fs';
import path from 'path';
import { UsesData, UsesItem } from '@/types/uses';

const usesFilePath = path.join(process.cwd(), 'data/uses.json');

export function getUsesData(): UsesData {
  if (!fs.existsSync(usesFilePath)) {
    return { items: [], lastUpdated: '' };
  }

  const fileContents = fs.readFileSync(usesFilePath, 'utf8');
  return JSON.parse(fileContents) as UsesData;
}

export function getAllUsesItems(): UsesItem[] {
  const data = getUsesData();
  return data.items.sort((a, b) =>
    new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime()
  );
}

export function getFeaturedItems(): UsesItem[] {
  return getAllUsesItems().filter(item => item.featured);
}

export function getItemsByCategory(category: string): UsesItem[] {
  if (category === 'all') {
    return getAllUsesItems();
  }
  return getAllUsesItems().filter(item => item.category === category);
}

export function getAllTags(): string[] {
  const items = getAllUsesItems();
  const tagSet = new Set<string>();
  items.forEach(item => {
    item.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}
