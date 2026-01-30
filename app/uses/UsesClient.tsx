'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { UsesItem as UsesItemType, Category } from '@/types/uses';
import CategoryTabs from './components/CategoryTabs';
import TagFilter from './components/TagFilter';
import FeaturedSection from './components/FeaturedSection';
import UsesItem from './components/UsesItem';

interface UsesClientProps {
  items: UsesItemType[];
  allTags: string[];
}

export default function UsesClient({ items, allTags }: UsesClientProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);

  const featuredItems = useMemo(() => {
    return items.filter(item => item.featured);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filter by category
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Filter by tags (if any active tags, item must have at least one)
      if (activeTags.length > 0) {
        const hasMatchingTag = activeTags.some(tag => item.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeCategory, activeTags]);

  const handleTagToggle = (tag: string) => {
    setActiveTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTagClick = (tag: string) => {
    if (!activeTags.includes(tag)) {
      setActiveTags(prev => [...prev, tag]);
    }
  };

  return (
    <div className="uses-container">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      <nav className="uses-nav">
        <Link href="/" className="back-link">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back to Home
        </Link>
      </nav>

      <main className="uses-main">
        <header className="uses-header">
          <h1 className="uses-title">Recommendations</h1>
          <p className="uses-subtitle">Products and gear I use and recommend.</p>
        </header>

        {/* Featured Section - only show when no filters active */}
        {activeCategory === 'all' && activeTags.length === 0 && (
          <FeaturedSection items={featuredItems} onTagClick={handleTagClick} />
        )}

        {/* Filters */}
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        <TagFilter
          tags={allTags}
          activeTags={activeTags}
          onTagToggle={handleTagToggle}
        />

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No items found. Check back soon!</p>
          </div>
        ) : (
          <div className="uses-list">
            {filteredItems.map(item => (
              <UsesItem
                key={item.id}
                item={item}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .uses-container {
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

        .uses-nav {
          position: relative;
          z-index: 1;
          padding: 24px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #1f2937;
          text-decoration: none;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 8px;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .back-link:hover {
          background: rgba(0, 0, 0, 0.05);
          transform: translateX(-4px);
        }

        .uses-main {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 80px;
        }

        .uses-header {
          margin-bottom: 48px;
        }

        .uses-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 3.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 12px;
        }

        .uses-subtitle {
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

        .uses-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .uses-nav {
            padding: 20px 24px;
          }

          .uses-main {
            padding: 0 24px 60px;
          }

          .uses-title {
            font-size: 2.5rem;
          }

          .uses-subtitle {
            font-size: 1rem;
          }
        }

        @media (max-width: 480px) {
          .uses-nav {
            padding: 16px;
          }

          .uses-main {
            padding: 0 16px 40px;
          }

          .uses-title {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
