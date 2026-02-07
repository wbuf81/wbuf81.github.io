import { Metadata } from 'next';
import { getAllLeeItems, getAllLeeTags } from '@/lib/lee';
import LeeClient from './LeeClient';

export const metadata: Metadata = {
  title: "Lee's Picks",
  description: "Products Lee uses and recommends.",
  openGraph: {
    title: "Lee's Picks",
    description: "Products Lee uses and recommends.",
    type: 'website',
  },
};

export default function LeePage() {
  const items = getAllLeeItems();
  const allTags = getAllLeeTags();

  return <LeeClient items={items} allTags={allTags} />;
}
