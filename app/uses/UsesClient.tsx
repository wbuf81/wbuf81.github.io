'use client';

import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { UsesItem as UsesItemType, Category, CATEGORY_LABELS } from '@/types/uses';

interface UsesClientProps {
  items: UsesItemType[];
  allTags: string[];
}

type SortOption = 'rating' | 'newest' | 'name';

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  'health-wellness': { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.3)' },
  'tech-office': { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139, 92, 246, 0.3)' },
  'daisys-stuff': { primary: '#ec4899', secondary: '#f472b6', glow: 'rgba(236, 72, 153, 0.3)' },
};

function EmojiRating({ rating, emoji, animate = false }: { rating: number; emoji: string; animate?: boolean }) {
  const filled = Math.min(Math.max(rating, 0), 10);
  const empty = 10 - filled;

  return (
    <div className={`emoji-rating ${animate ? 'animate' : ''}`}>
      {Array(filled).fill(null).map((_, i) => (
        <span
          key={`filled-${i}`}
          className="emoji filled"
          style={{ animationDelay: animate ? `${i * 0.08}s` : '0s' }}
        >
          {emoji}
        </span>
      ))}
      {Array(empty).fill(null).map((_, i) => (
        <span
          key={`empty-${i}`}
          className="emoji empty"
          style={{ animationDelay: animate ? `${(filled + i) * 0.08}s` : '0s' }}
        >
          ⚫
        </span>
      ))}
      <style jsx>{`
        .emoji-rating {
          display: inline-flex;
          align-items: center;
          font-size: 0.75rem;
          letter-spacing: 1px;
          gap: 1px;
        }
        .emoji {
          display: inline-block;
          transition: transform 0.2s ease;
        }
        .emoji-rating:hover .emoji.filled {
          animation: bounce 0.4s ease infinite;
        }
        .emoji-rating:hover .emoji.filled:nth-child(odd) {
          animation-delay: 0.05s;
        }
        .filled {
          opacity: 1;
          filter: drop-shadow(0 0 2px rgba(255, 200, 0, 0.5));
        }
        .empty {
          opacity: 0.15;
          font-size: 0.6rem;
        }
        .emoji-rating.animate .emoji {
          opacity: 0;
          transform: scale(0) rotate(-180deg);
          animation: popIn 0.4s ease forwards;
        }
        .emoji-rating.animate .emoji.empty {
          animation: fadeIn 0.3s ease forwards;
        }
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0) rotate(-180deg);
          }
          60% {
            transform: scale(1.3) rotate(10deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          100% {
            opacity: 0.15;
            transform: scale(1);
          }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}

function FeaturedCard({ item, onTagClick }: { item: UsesItemType; onTagClick: (tag: string) => void }) {
  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['health-wellness'];
  const isTopRated = item.rating >= 9;

  return (
    <a
      href={item.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`featured-card ${isTopRated ? 'top-rated' : ''}`}
      style={{ '--glow-color': colors.glow, '--primary': colors.primary } as React.CSSProperties}
    >
      <div className="card-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <div className="placeholder">📦</div>
        )}
        <div className="card-overlay" />
      </div>
      <div className="card-content">
        <div className="card-meta">
          <span className="category-label">{CATEGORY_LABELS[item.category]}</span>
          <div className="rating-row">
            <EmojiRating rating={item.rating} emoji={item.ratingEmoji} animate={true} />
            {isTopRated && <span className="top-pick-badge">🏆 TOP PICK</span>}
          </div>
        </div>
        <h3 className="card-name">{item.name}</h3>
        <p className="card-description">{item.description}</p>
        <div className="card-footer">
          <div className="card-tags">
            {item.tags.slice(0, 2).map(tag => (
              <button
                key={tag}
                className="tag"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
              >
                #{tag}
              </button>
            ))}
          </div>
          <span className="shop-btn">
            Shop Now →
          </span>
        </div>
      </div>
      <style jsx>{`
        .featured-card {
          position: relative;
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          text-decoration: none;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .featured-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px var(--glow-color);
        }
        .card-image {
          position: relative;
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: #f8f9fa;
        }
        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .featured-card:hover .card-image img {
          transform: scale(1.08);
        }
        .card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%);
          opacity: 0.6;
        }
        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        .card-meta {
          margin-bottom: 8px;
        }
        .rating-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 6px;
        }
        .top-pick-badge {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #1f2937;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        .card-content {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .category-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }
        .card-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .card-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 16px;
          flex: 1;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .card-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          flex: 1;
        }
        .tag {
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.7rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tag:hover {
          background: var(--primary);
          color: white;
        }
        .shop-btn {
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
          background: var(--primary);
          padding: 8px 16px;
          border-radius: 8px;
          white-space: nowrap;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px var(--glow-color);
        }
        .featured-card:hover .shop-btn {
          transform: translateX(4px);
          box-shadow: 0 4px 16px var(--glow-color);
        }
      `}</style>
    </a>
  );
}

function ItemCard({ item, onTagClick }: { item: UsesItemType; onTagClick: (tag: string) => void }) {
  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['health-wellness'];
  const isHighRated = item.rating >= 9;

  return (
    <a
      href={item.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`item-card ${isHighRated ? 'high-rated' : ''}`}
      style={{ '--glow-color': colors.glow, '--primary': colors.primary } as React.CSSProperties}
    >
      <div className="item-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <div className="placeholder">📦</div>
        )}
      </div>
      <div className="item-content">
        <div className="item-header">
          <span className="category-badge">{CATEGORY_LABELS[item.category]}</span>
          <div className="rating-row">
            <div className="rating-small"><EmojiRating rating={item.rating} emoji={item.ratingEmoji} animate={true} /></div>
            {isHighRated && <span className="must-have">⭐ MUST HAVE</span>}
          </div>
        </div>
        <h3 className="item-name">{item.name}</h3>
        <p className="item-description">{item.description}</p>
        <div className="item-footer">
          <div className="item-tags">
            {item.tags.slice(0, 3).map(tag => (
              <button
                key={tag}
                className="tag"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
              >
                #{tag}
              </button>
            ))}
          </div>
          <span className="item-shop-btn">Shop →</span>
        </div>
      </div>
      <style jsx>{`
        .item-card {
          display: flex;
          gap: 20px;
          background: #fff;
          border-radius: 16px;
          padding: 16px;
          text-decoration: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          align-items: center;
          border: 1px solid #f0f0f0;
        }
        .item-card:hover {
          transform: translateX(4px);
          box-shadow: 0 8px 24px var(--glow-color);
          border-color: var(--primary);
        }
        .item-image {
          position: relative;
          flex-shrink: 0;
          width: 80px;
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          background: #f8f9fa;
        }
        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .item-card:hover .item-image img {
          transform: scale(1.05);
        }
        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .item-content {
          flex: 1;
          min-width: 0;
        }
        .item-header {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .category-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rating-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .rating-small {
          font-size: 0.75rem;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 3px 6px;
          border-radius: 6px;
        }
        .item-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .item-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
          line-height: 1.4;
          margin: 0 0 8px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .item-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .item-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          flex: 1;
        }
        .tag {
          background: #f3f4f6;
          border: none;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 0.65rem;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tag:hover {
          background: var(--primary);
          color: white;
        }
        .item-shop-btn {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
          background: transparent;
          border: 1.5px solid var(--primary);
          padding: 6px 12px;
          border-radius: 6px;
          white-space: nowrap;
          transition: all 0.3s ease;
        }
        .item-card:hover .item-shop-btn {
          background: var(--primary);
          color: #fff;
          transform: translateX(2px);
        }
        .item-card.high-rated {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border-color: #fcd34d;
        }
        .must-have {
          font-size: 0.55rem;
          font-weight: 700;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #1f2937;
          padding: 3px 6px;
          border-radius: 4px;
          letter-spacing: 0.03em;
          white-space: nowrap;
        }
        @media (max-width: 640px) {
          .item-card {
            flex-direction: column;
            align-items: stretch;
            padding: 12px;
          }
          .item-image {
            width: 100%;
            height: 140px;
          }
          .item-shop-btn {
            display: none;
          }
        }
      `}</style>
    </a>
  );
}

export default function UsesClient({ items, allTags }: UsesClientProps) {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const itemsRef = useRef<HTMLDivElement>(null);

  const featuredItems = useMemo(() => items.filter(item => item.featured), [items]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (activeTags.length > 0 && !activeTags.some(tag => item.tags.includes(tag))) return false;
      return true;
    });

    // Sort
    switch (sortBy) {
      case 'rating':
        filtered = [...filtered].sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        filtered = [...filtered].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
        break;
      case 'name':
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return filtered;
  }, [items, activeCategory, activeTags, sortBy]);

  const handleTagToggle = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const scrollToItems = () => {
    itemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showFeatured = activeCategory === 'all' && activeTags.length === 0 && featuredItems.length > 0;
  const displayItems = filteredAndSortedItems;

  return (
    <div className="uses-container">
      <div className="grain-overlay" />

      {/* Header */}
      <header className="page-header">
        <nav className="uses-nav">
          <Link href="/" className="back-link">
            ← Home
          </Link>
        </nav>

        <div className="hero">
          <h1 className="page-title">Gear I Love</h1>
          <p className="page-subtitle">
            Products I actually use and genuinely recommend.
            <span className="affiliate-note">Some links may be affiliate links.</span>
          </p>
          <div className="stats">
            <span className="stat">{items.length} items</span>
            <span className="stat-divider">•</span>
            <span className="stat">{featuredItems.length} top picks</span>
            <span className="stat-divider">•</span>
            <span className="stat">3 categories</span>
          </div>
        </div>
      </header>

      {/* Sticky Filter Bar */}
      <div className="filter-bar">
        <div className="filter-bar-inner">
          <div className="category-tabs">
            {(['all', 'health-wellness', 'tech-office', 'daisys-stuff'] as Category[]).map(cat => (
              <button
                key={cat}
                className={`tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={cat !== 'all' && CATEGORY_COLORS[cat] ? { '--cat-color': CATEGORY_COLORS[cat].primary } as React.CSSProperties : {}}
              >
                {cat === 'all' && '✨ '}
                {cat === 'health-wellness' && '💪 '}
                {cat === 'tech-office' && '💻 '}
                {cat === 'daisys-stuff' && '🐕 '}
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <div className="filter-actions">
            <button
              className={`filter-toggle ${showFilters ? 'active' : ''} ${activeTags.length > 0 ? 'has-filters' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <span>Filters</span>
              {activeTags.length > 0 && <span className="filter-count">{activeTags.length}</span>}
            </button>

            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
              <option value="name">A-Z</option>
            </select>
          </div>
        </div>

        {/* Expandable Tag Filter */}
        <div className={`tag-filter ${showFilters ? 'expanded' : ''}`}>
          <div className="tag-filter-inner">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`filter-tag ${activeTags.includes(tag) ? 'active' : ''}`}
                onClick={() => handleTagToggle(tag)}
              >
                #{tag}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button className="clear-btn" onClick={() => setActiveTags([])}>
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="results-bar">
          <span className="results-count">
            Showing {filteredAndSortedItems.length} {filteredAndSortedItems.length === 1 ? 'item' : 'items'}
            {activeCategory !== 'all' && ` in ${CATEGORY_LABELS[activeCategory]}`}
          </span>
          {showFeatured && (
            <button className="skip-link" onClick={scrollToItems}>
              Skip to all items ↓
            </button>
          )}
        </div>
      </div>

      <main className="uses-main">
        {/* Featured Section */}
        {showFeatured && (
          <section className="featured-section">
            <div className="section-header">
              <h2 className="section-title">⭐ Top Picks</h2>
              <p className="section-subtitle">My absolute favorites that I use every day</p>
            </div>
            <div className="featured-grid">
              {featuredItems.map(item => (
                <FeaturedCard key={item.id} item={item} onTagClick={handleTagToggle} />
              ))}
            </div>
          </section>
        )}

        {/* All Items */}
        <section className="items-section" ref={itemsRef}>
          {showFeatured && <h2 className="section-title-small">All Recommendations</h2>}

          {displayItems.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <h3>No items found</h3>
              <p>Try adjusting your filters or browse all categories.</p>
              <button className="reset-btn" onClick={() => { setActiveCategory('all'); setActiveTags([]); }}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="items-list">
              {displayItems.map((item, index) => (
                <div
                  key={item.id}
                  className="item-wrapper"
                  style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
                >
                  <ItemCard item={item} onTagClick={handleTagToggle} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="page-footer">
        <p>Last updated: {new Date(items[0]?.dateAdded || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </footer>

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
          opacity: 0.08;
        }

        /* Header */
        .page-header {
          position: relative;
          z-index: 1;
          background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
          border-bottom: 1px solid #f0f0f0;
        }

        .uses-nav {
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 32px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          color: #6b7280;
          text-decoration: none;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          transition: color 0.2s ease;
        }

        .back-link:hover {
          color: #1f2937;
        }

        .hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 32px 40px;
          text-align: center;
        }

        .page-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 3rem;
          font-weight: 800;
          color: #1f2937;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }

        .page-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.1rem;
          color: #6b7280;
          margin: 0 0 20px;
          line-height: 1.6;
        }

        .affiliate-note {
          display: block;
          font-size: 0.85rem;
          color: #9ca3af;
          margin-top: 4px;
        }

        .stats {
          display: flex;
          justify-content: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #9ca3af;
        }

        .stat-divider {
          color: #e5e7eb;
        }

        /* Filter Bar */
        .filter-bar {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #f0f0f0;
        }

        .filter-bar-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .category-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tab {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab:hover {
          border-color: var(--cat-color, #d1d5db);
          color: var(--cat-color, #374151);
        }

        .tab.active {
          background: #1f2937;
          color: #fff;
          border-color: #1f2937;
        }

        .filter-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .filter-toggle {
          padding: 8px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 0.85rem;
          color: #6b7280;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .filter-toggle:hover,
        .filter-toggle.active {
          border-color: #1f2937;
          color: #1f2937;
        }

        .filter-toggle.has-filters {
          background: #1f2937;
          color: #fff;
          border-color: #1f2937;
        }

        .filter-count {
          background: #fff;
          color: #1f2937;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .sort-select {
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
        }

        .tag-filter {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease, padding 0.3s ease;
        }

        .tag-filter.expanded {
          max-height: 200px;
          border-top: 1px solid #f0f0f0;
        }

        .tag-filter-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-tag {
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #fff;
          font-size: 0.8rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-tag:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .filter-tag.active {
          background: #8b5cf6;
          color: #fff;
          border-color: #8b5cf6;
        }

        .clear-btn {
          padding: 6px 12px;
          border: none;
          background: none;
          font-size: 0.8rem;
          color: #ef4444;
          cursor: pointer;
          text-decoration: underline;
        }

        .results-bar {
          max-width: 1100px;
          margin: 0 auto;
          padding: 12px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid #f0f0f0;
        }

        .results-count {
          font-size: 0.85rem;
          color: #9ca3af;
        }

        .skip-link {
          font-size: 0.8rem;
          color: #6b7280;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
        }

        .skip-link:hover {
          color: #1f2937;
        }

        /* Main Content */
        .uses-main {
          position: relative;
          z-index: 1;
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 32px 80px;
        }

        /* Featured Section */
        .featured-section {
          margin-bottom: 60px;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .section-subtitle {
          font-size: 0.95rem;
          color: #9ca3af;
          margin: 0;
        }

        .section-title-small {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.25rem;
          font-weight: 600;
          color: #6b7280;
          margin: 0 0 20px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        @media (max-width: 768px) {
          .featured-grid {
            grid-template-columns: 1fr;
          }
        }

        /* Items Section */
        .items-section {
          scroll-margin-top: 120px;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .item-wrapper {
          animation: fadeSlideIn 0.4s ease forwards;
          animation-delay: var(--delay);
          opacity: 0;
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state h3 {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.25rem;
          color: #374151;
          margin: 0 0 8px;
        }

        .empty-state p {
          color: #9ca3af;
          margin: 0 0 20px;
        }

        .reset-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          background: #1f2937;
          color: #fff;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .reset-btn:hover {
          background: #374151;
        }

        /* Footer */
        .page-footer {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 32px;
          text-align: center;
          color: #9ca3af;
          font-size: 0.85rem;
          border-top: 1px solid #f0f0f0;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero {
            padding: 0 20px 32px;
          }

          .page-title {
            font-size: 2.25rem;
          }

          .page-subtitle {
            font-size: 1rem;
          }

          .filter-bar-inner {
            padding: 12px 20px;
          }

          .category-tabs {
            width: 100%;
            overflow-x: auto;
            flex-wrap: nowrap;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
          }

          .category-tabs::-webkit-scrollbar {
            display: none;
          }

          .tab {
            flex-shrink: 0;
            padding: 8px 14px;
            font-size: 0.8rem;
          }

          .tag-filter-inner,
          .results-bar {
            padding: 12px 20px;
          }

          .uses-main {
            padding: 24px 20px 60px;
          }

          .featured-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .uses-nav {
            padding: 16px 16px;
          }

          .hero {
            padding: 0 16px 24px;
          }

          .page-title {
            font-size: 1.75rem;
          }

          .filter-bar-inner {
            padding: 12px 16px;
          }

          .filter-actions {
            width: 100%;
            justify-content: space-between;
          }

          .tag-filter-inner,
          .results-bar {
            padding: 12px 16px;
          }

          .uses-main {
            padding: 20px 16px 40px;
          }

          .stats {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
