import Link from 'next/link';
import { getAllArticles } from '@/lib/articles';

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <>
      <nav>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/articles">Articles</Link></li>
        </ul>
      </nav>
      <main>
        <h1>Articles</h1>
        {articles.length === 0 ? (
          <p>No articles yet. Add your first article in <code>content/articles/</code></p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {articles.map((article) => (
              <li key={article.slug} style={{ marginBottom: '2rem' }}>
                <article>
                  <h2 style={{ marginBottom: '0.25rem' }}>
                    <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                  </h2>
                  <time style={{ color: '#666', fontSize: '0.9rem' }}>
                    {new Date(article.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <p style={{ marginTop: '0.5rem' }}>{article.description}</p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
