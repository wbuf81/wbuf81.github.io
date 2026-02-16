'use client';

import Link from 'next/link';
import { Nav } from '../components/Nav';

interface Article {
  slug: string;
  title: string;
  date: string;
  description: string;
}

export default function ArticlesClient({ articles }: { articles: Article[] }) {
  return (
    <div className="articles-container">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      <Nav />

      <main className="articles-main">
        <header className="articles-header">
          <h1 className="articles-title">Articles</h1>
          <p className="articles-subtitle">Thoughts on compliance, AI, engineering, and more.</p>
        </header>

        {articles.length === 0 ? (
          <div className="empty-state">
            <p>No articles yet. Check back soon!</p>
          </div>
        ) : (
          <ul className="articles-list">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link href={`/articles/${article.slug}`} className="article-card">
                  <article>
                    <time className="article-date">
                      {new Date(article.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                    <h2 className="article-title">{article.title}</h2>
                    <p className="article-description">{article.description}</p>
                    <span className="read-more">
                      Read article
                      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                      </svg>
                    </span>
                  </article>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <style jsx>{`
        .articles-container {
          min-height: 100vh;
          background: #fafafa;
          position: relative;
        }

        .grain-overlay {
          position: fixed;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          pointer-events: none;
          z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          opacity: 0.18;
          animation: grain 3s steps(1) infinite;
        }

        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-2%, -2%); }
          20% { transform: translate(2%, 2%); }
          30% { transform: translate(-1%, 1%); }
          40% { transform: translate(1%, -1%); }
          50% { transform: translate(-2%, 2%); }
          60% { transform: translate(2%, -2%); }
          70% { transform: translate(-1%, -1%); }
          80% { transform: translate(1%, 1%); }
          90% { transform: translate(-2%, -1%); }
        }

        .articles-main {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 0 40px 80px;
        }

        .articles-header {
          margin-bottom: 48px;
        }

        .articles-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 3.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 12px;
        }

        .articles-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.1rem;
          color: #6b7280;
          margin: 0;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: #6b7280;
          font-size: 1.1rem;
        }

        .articles-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .article-card {
          display: block;
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .article-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
        }

        .article-date {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #9ca3af;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .article-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 8px 0 12px;
        }

        .article-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 16px;
        }

        .read-more {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #2563eb;
        }

        .article-card:hover .read-more {
          gap: 10px;
        }

        .read-more svg {
          transition: transform 0.2s ease;
        }

        .article-card:hover .read-more svg {
          transform: translateX(4px);
        }

        @media (max-width: 768px) {
          .articles-nav {
            padding: 20px 24px;
          }

          .articles-main {
            padding: 0 24px 60px;
          }

          .articles-title {
            font-size: 2.5rem;
          }

          .articles-subtitle {
            font-size: 1rem;
          }

          .article-card {
            padding: 24px;
          }

          .article-title {
            font-size: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .articles-nav {
            padding: 16px;
          }

          .articles-main {
            padding: 0 16px 40px;
          }

          .articles-title {
            font-size: 2rem;
          }

          .article-card {
            padding: 20px;
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
}
