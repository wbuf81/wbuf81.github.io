import Link from 'next/link';
import { getArticleBySlug, getArticleSlugs } from '@/lib/articles';
import { MDXRemote } from 'next-mdx-remote/rsc';

export function generateStaticParams() {
  const slugs = getArticleSlugs();
  return slugs.map((slug) => ({
    slug: slug.replace(/\.mdx$/, ''),
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { meta } = getArticleBySlug(slug);
  return {
    title: meta.title,
    description: meta.description,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { meta, content } = getArticleBySlug(slug);

  return (
    <>
      <nav>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/articles">Articles</Link></li>
        </ul>
      </nav>
      <main>
        <article>
          <header style={{ marginBottom: '2rem' }}>
            <h1>{meta.title}</h1>
            <time style={{ color: '#666' }}>
              {new Date(meta.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
            {meta.tags && meta.tags.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      background: '#eee',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      marginRight: '0.5rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>
          <MDXRemote source={content} />
        </article>
      </main>
    </>
  );
}
