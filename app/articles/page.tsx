import { getAllArticles } from '@/lib/articles';
import ArticlesClient from './ArticlesClient';

export default function ArticlesPage() {
  const articles = getAllArticles();

  return <ArticlesClient articles={articles} />;
}
