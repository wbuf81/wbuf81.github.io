'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { UsesItem as UsesItemType, Category, CATEGORY_LABELS } from '@/types/uses';

interface UsesClientProps {
  items: UsesItemType[];
  allTags: string[];
}

const CATEGORY_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  'tech-gear': { primary: '#8b5cf6', secondary: '#a78bfa', glow: 'rgba(139, 92, 246, 0.4)' },
  'desk-office': { primary: '#10b981', secondary: '#34d399', glow: 'rgba(16, 185, 129, 0.4)' },
  'fitness-supplements': { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.4)' },
};

const CATEGORY_EMOJIS: Record<string, string[]> = {
  'tech-gear': ['💻', '🎧', '📱', '⌨️', '🖥️', '🎮'],
  'desk-office': ['🪴', '☕', '📚', '💡', '🖊️', '📎'],
  'fitness-supplements': ['💪', '🏃', '🥤', '🔥', '⚡', '🏋️'],
};

function EmojiRating({ rating, emoji }: { rating: number; emoji: string }) {
  const filled = Math.min(Math.max(rating, 0), 10);
  const empty = 10 - filled;

  return (
    <div className="emoji-rating">
      <span className="filled">{Array(filled).fill(emoji).join('')}</span>
      <span className="empty">{Array(empty).fill('⚫').join('')}</span>
      <style jsx>{`
        .emoji-rating {
          display: inline-flex;
          align-items: center;
          font-size: 0.7rem;
          letter-spacing: 1px;
        }
        .filled { opacity: 1; }
        .empty { opacity: 0.25; }
      `}</style>
    </div>
  );
}

function FeaturedCard({ item, onTagClick }: { item: UsesItemType; onTagClick: (tag: string) => void }) {
  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['tech-gear'];

  return (
    <a
      href={item.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="featured-card"
      style={{ '--glow-color': colors.glow, '--primary': colors.primary } as React.CSSProperties}
    >
      <div className="card-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} />
        ) : (
          <div className="placeholder">📦</div>
        )}
        <div className="card-overlay" />
        <div className="featured-badge">★ FEATURED</div>
      </div>
      <div className="card-content">
        <h3 className="card-name">{item.name}</h3>
        <p className="card-description">{item.description}</p>
        <div className="card-footer">
          <EmojiRating rating={item.rating} emoji={item.ratingEmoji} />
          <div className="card-tags">
            {item.tags.slice(0, 2).map(tag => (
              <button
                key={tag}
                className="tag"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .featured-card {
          position: relative;
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 24px;
          overflow: hidden;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .featured-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px var(--glow-color), 0 0 0 2px var(--primary);
        }
        .card-image {
          position: relative;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }
        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }
        .featured-card:hover .card-image img {
          transform: scale(1.1);
        }
        .card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.6) 100%);
        }
        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 4rem;
          background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
        }
        .featured-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: var(--primary);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 20px;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px var(--glow-color);
        }
        .card-content {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .card-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px;
        }
        .card-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 16px;
          flex: 1;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .card-tags {
          display: flex;
          gap: 6px;
        }
        .tag {
          background: linear-gradient(135deg, var(--primary), var(--glow-color));
          border: none;
          border-radius: 12px;
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .tag:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px var(--glow-color);
        }
      `}</style>
    </a>
  );
}

function ItemCard({ item, onTagClick }: { item: UsesItemType; onTagClick: (tag: string) => void }) {
  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['tech-gear'];

  return (
    <a
      href={item.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="item-card"
      style={{ '--glow-color': colors.glow, '--primary': colors.primary, '--secondary': colors.secondary } as React.CSSProperties}
    >
      <div className="item-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} />
        ) : (
          <div className="placeholder">📦</div>
        )}
      </div>
      <div className="item-content">
        <div className="item-header">
          <h3 className="item-name">{item.name}</h3>
          <span className="category-badge">{CATEGORY_LABELS[item.category]}</span>
        </div>
        <p className="item-description">{item.description}</p>
        <div className="item-footer">
          <EmojiRating rating={item.rating} emoji={item.ratingEmoji} />
          <div className="item-tags">
            {item.tags.map(tag => (
              <button
                key={tag}
                className="tag"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTagClick(tag); }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="arrow-indicator">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
        </svg>
      </div>
      <style jsx>{`
        .item-card {
          display: flex;
          gap: 20px;
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          text-decoration: none;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          align-items: center;
        }
        .item-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, var(--primary), var(--secondary));
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .item-card:hover {
          transform: translateX(8px);
          box-shadow: 0 8px 30px var(--glow-color), 0 0 0 1px var(--primary);
        }
        .item-card:hover::before {
          opacity: 1;
        }
        .item-image {
          flex-shrink: 0;
          width: 100px;
          height: 100px;
          border-radius: 16px;
          overflow: hidden;
          background: #f5f5f5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .item-card:hover .item-image img {
          transform: scale(1.1);
        }
        .placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
        }
        .item-content {
          flex: 1;
          min-width: 0;
        }
        .item-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .item-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }
        .category-badge {
          font-size: 0.65rem;
          font-weight: 600;
          color: var(--primary);
          background: var(--glow-color);
          padding: 3px 8px;
          border-radius: 8px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .item-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 12px;
        }
        .item-footer {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .item-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .tag {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 4px 10px;
          font-size: 0.75rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tag:hover {
          background: var(--primary);
          border-color: var(--primary);
          color: white;
          transform: scale(1.05);
        }
        .arrow-indicator {
          color: #d1d5db;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }
        .item-card:hover .arrow-indicator {
          color: var(--primary);
          transform: translateX(4px);
        }
        @media (max-width: 768px) {
          .item-card {
            flex-direction: column;
            align-items: stretch;
          }
          .item-image {
            width: 100%;
            height: 160px;
          }
          .arrow-indicator {
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

  const featuredItems = useMemo(() => items.filter(item => item.featured), [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (activeTags.length > 0 && !activeTags.some(tag => item.tags.includes(tag))) return false;
      return true;
    });
  }, [items, activeCategory, activeTags]);

  const handleTagToggle = (tag: string) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  // Get emojis for floating background based on active category
  const backgroundEmojis = activeCategory === 'all'
    ? [...CATEGORY_EMOJIS['tech-gear'], ...CATEGORY_EMOJIS['desk-office'], ...CATEGORY_EMOJIS['fitness-supplements']]
    : CATEGORY_EMOJIS[activeCategory] || [];

  return (
    <div className="uses-container">
      <div className="grain-overlay" />

      {/* Floating emojis background */}
      <div className="floating-emojis">
        {backgroundEmojis.map((emoji, i) => (
          <span
            key={i}
            className="floating-emoji"
            style={{
              left: `${(i * 17) % 100}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${15 + (i % 5) * 3}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

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
          <h1 className="uses-title">
            <span className="title-gradient">Recommendations</span>
          </h1>
          <p className="uses-subtitle">Products and gear I use daily and genuinely recommend.</p>
        </header>

        {/* Featured Section */}
        {activeCategory === 'all' && activeTags.length === 0 && featuredItems.length > 0 && (
          <section className="featured-section">
            <h2 className="section-title">
              <span className="section-icon">⭐</span> Top Picks
            </h2>
            <div className="featured-grid">
              {featuredItems.map(item => (
                <FeaturedCard key={item.id} item={item} onTagClick={handleTagToggle} />
              ))}
            </div>
          </section>
        )}

        {/* Category Tabs */}
        <div className="category-tabs">
          {(['all', 'tech-gear', 'desk-office', 'fitness-supplements'] as Category[]).map(cat => (
            <button
              key={cat}
              className={`tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              style={cat !== 'all' ? { '--cat-color': CATEGORY_COLORS[cat]?.primary } as React.CSSProperties : {}}
            >
              {cat === 'tech-gear' && '💻 '}
              {cat === 'desk-office' && '🪴 '}
              {cat === 'fitness-supplements' && '💪 '}
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Tag Filter */}
        {allTags.length > 0 && (
          <div className="tag-filter">
            <span className="filter-label">Filter by tag:</span>
            <div className="tags">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`filter-tag ${activeTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
              {activeTags.length > 0 && (
                <button className="clear-btn" onClick={() => setActiveTags([])}>
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-emoji">🔍</span>
            <p>No items found. Try adjusting your filters!</p>
          </div>
        ) : (
          <div className="items-list">
            {filteredItems.filter(item => activeCategory !== 'all' || activeTags.length > 0 || !item.featured).map(item => (
              <ItemCard key={item.id} item={item} onTagClick={handleTagToggle} />
            ))}
          </div>
        )}
      </main>

      <style jsx>{`
        .uses-container {
          min-height: 100vh;
          background: linear-gradient(180deg, #fafafa 0%, #f0f4f8 100%);
          position: relative;
          overflow-x: hidden;
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
          opacity: 0.12;
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

        .floating-emojis {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }

        .floating-emoji {
          position: absolute;
          font-size: 2rem;
          opacity: 0.08;
          animation: float-up linear infinite;
        }

        @keyframes float-up {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.08;
          }
          90% {
            opacity: 0.08;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }

        .uses-nav {
          position: relative;
          z-index: 10;
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
          padding: 10px 18px;
          border-radius: 12px;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          transition: all 0.2s ease;
        }

        .back-link:hover {
          background: #fff;
          transform: translateX(-4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }

        .uses-main {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 100px;
        }

        .uses-header {
          margin-bottom: 48px;
          text-align: center;
        }

        .uses-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 4rem;
          font-weight: 800;
          margin: 0 0 16px;
        }

        .title-gradient {
          background: linear-gradient(135deg, #1f2937 0%, #8b5cf6 50%, #f59e0b 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .uses-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.2rem;
          color: #6b7280;
          margin: 0;
        }

        .featured-section {
          margin-bottom: 60px;
        }

        .section-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .section-icon {
          font-size: 1.3rem;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }

        .category-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 24px;
          justify-content: center;
        }

        .tab {
          padding: 12px 24px;
          border: 2px solid transparent;
          border-radius: 50px;
          background: rgba(255,255,255,0.8);
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .tab:hover {
          background: #fff;
          border-color: var(--cat-color, #e5e7eb);
          color: var(--cat-color, #374151);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }

        .tab.active {
          background: #1f2937;
          color: #fff;
          border-color: #1f2937;
          box-shadow: 0 4px 20px rgba(31, 41, 55, 0.3);
        }

        .tag-filter {
          margin-bottom: 32px;
          text-align: center;
        }

        .filter-label {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #9ca3af;
          margin-bottom: 12px;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }

        .filter-tag {
          padding: 8px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          background: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-tag:hover {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }

        .filter-tag.active {
          border-color: #8b5cf6;
          background: #8b5cf6;
          color: #fff;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .clear-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 20px;
          background: transparent;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #9ca3af;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .clear-btn:hover {
          color: #ef4444;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: #6b7280;
        }

        .empty-emoji {
          font-size: 4rem;
          display: block;
          margin-bottom: 16px;
        }

        .empty-state p {
          font-size: 1.1rem;
          margin: 0;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (max-width: 768px) {
          .uses-nav {
            padding: 20px 20px;
          }

          .uses-main {
            padding: 0 20px 60px;
          }

          .uses-title {
            font-size: 2.5rem;
          }

          .uses-subtitle {
            font-size: 1rem;
          }

          .featured-grid {
            grid-template-columns: 1fr;
          }

          .tab {
            padding: 10px 18px;
            font-size: 0.85rem;
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

          .floating-emoji {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
