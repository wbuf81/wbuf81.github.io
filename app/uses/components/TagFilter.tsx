'use client';

interface TagFilterProps {
  tags: string[];
  activeTags: string[];
  onTagToggle: (tag: string) => void;
}

export default function TagFilter({ tags, activeTags, onTagToggle }: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="tag-filter">
      <span className="filter-label">Filter by tag:</span>
      <div className="tags">
        {tags.map(tag => (
          <button
            key={tag}
            className={`tag ${activeTags.includes(tag) ? 'active' : ''}`}
            onClick={() => onTagToggle(tag)}
          >
            {tag}
          </button>
        ))}
        {activeTags.length > 0 && (
          <button
            className="clear-tags"
            onClick={() => activeTags.forEach(tag => onTagToggle(tag))}
          >
            Clear all
          </button>
        )}
      </div>

      <style jsx>{`
        .tag-filter {
          margin-bottom: 32px;
        }

        .filter-label {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-bottom: 10px;
        }

        .tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag {
          padding: 6px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.8rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tag:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .tag.active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #2563eb;
        }

        .clear-tags {
          padding: 6px 14px;
          border: none;
          border-radius: 16px;
          background: transparent;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.8rem;
          color: #9ca3af;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .clear-tags:hover {
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
