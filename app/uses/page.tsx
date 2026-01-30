import { Metadata } from 'next';
import { getAllUsesItems, getAllTags } from '@/lib/uses';
import UsesClient from './UsesClient';

export const metadata: Metadata = {
  title: 'Recommendations - Wesley Bard',
  description: 'Products and gear I use and recommend.',
  openGraph: {
    title: 'Recommendations - Wesley Bard',
    description: 'Products and gear I use and recommend.',
    type: 'website',
  },
};

export default function UsesPage() {
  const items = getAllUsesItems();
  const allTags = getAllTags();

  return <UsesClient items={items} allTags={allTags} />;
}
