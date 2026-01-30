'use client';

import { UsesItem as UsesItemType } from '@/types/uses';
import EmojiRating from './EmojiRating';

interface UsesItemProps {
  item: UsesItemType;
  onTagClick?: (tag: string) => void;
}

export default function UsesItem({ item, onTagClick }: UsesItemProps) {
  return (
    <a
      href={item.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="uses-item"
    >
      <div className="item-image">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} />
        ) : (
          <div className="placeholder-image">
            <span>📦</span>
          </div>
        )}
      </div>
      <div className="item-content">
        <h3 className="item-name">{item.name}</h3>
        <p className="item-description">{item.description}</p>
        <div className="item-meta">
          <EmojiRating rating={item.rating} emoji={item.ratingEmoji} />
          <div className="item-tags">
            {item.tags.map(tag => (
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

      <style jsx>{`
        .uses-item {
          display: flex;
          gap: 20px;
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .uses-item:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04);
        }

        .item-image {
          flex-shrink: 0;
          width: 100px;
          height: 100px;
          border-radius: 12px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .placeholder-image {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          background: #f0f0f0;
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .item-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          color: #6b7280;
          line-height: 1.5;
          margin: 0 0 12px;
        }

        .item-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .item-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tag {
          background: #f3f4f6;
          border: none;
          border-radius: 12px;
          padding: 4px 10px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.75rem;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .tag:hover {
          background: #e5e7eb;
          color: #374151;
        }

        @media (max-width: 768px) {
          .uses-item {
            flex-direction: column;
            padding: 16px;
          }

          .item-image {
            width: 100%;
            height: 160px;
          }
        }
      `}</style>
    </a>
  );
}
