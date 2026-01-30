'use client';

import { UsesItem } from '@/types/uses';
import EmojiRating from './EmojiRating';

interface FeaturedSectionProps {
  items: UsesItem[];
  onTagClick?: (tag: string) => void;
}

export default function FeaturedSection({ items, onTagClick }: FeaturedSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="featured-section">
      <h2 className="section-title">Featured Picks</h2>
      <div className="featured-grid">
        {items.map(item => (
          <a
            key={item.id}
            href={item.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="featured-card"
          >
            <div className="card-image">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} />
              ) : (
                <div className="placeholder-image">
                  <span>📦</span>
                </div>
              )}
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
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onTagClick?.(tag);
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <style jsx>{`
        .featured-section {
          margin-bottom: 48px;
        }

        .section-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 24px;
        }

        .featured-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
        }

        .featured-card {
          display: flex;
          flex-direction: column;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          text-decoration: none;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .featured-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.04);
        }

        .card-image {
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .featured-card:hover .card-image img {
          transform: scale(1.05);
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          background: #f0f0f0;
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
          font-weight: 600;
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
          background: #f3f4f6;
          border: none;
          border-radius: 10px;
          padding: 4px 10px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.7rem;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .tag:hover {
          background: #e5e7eb;
          color: #374151;
        }

        @media (max-width: 768px) {
          .featured-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
