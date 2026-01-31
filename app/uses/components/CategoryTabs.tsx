'use client';

import { Category, CATEGORY_LABELS } from '@/types/uses';

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

const CATEGORIES: Category[] = ['all', 'health-wellness', 'tech-office', 'daisys-stuff'];

export default function CategoryTabs({ activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="category-tabs">
      {CATEGORIES.map(category => (
        <button
          key={category}
          className={`tab ${activeCategory === category ? 'active' : ''}`}
          onClick={() => onCategoryChange(category)}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}

      <style jsx>{`
        .category-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .tab {
          padding: 10px 20px;
          border: none;
          border-radius: 24px;
          background: #f3f4f6;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .tab:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .tab.active {
          background: #1f2937;
          color: #fff;
        }

        @media (max-width: 480px) {
          .tab {
            padding: 8px 16px;
            font-size: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}
