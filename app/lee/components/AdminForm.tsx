'use client';

import { useState } from 'react';
import { LeeItem, LeeData } from '@/types/lee';
import { getFileContent, commitFile } from '@/lib/github';
import { fetchURLMetadata } from '@/lib/metadata-fetcher';

interface AdminFormProps {
  token: string;
  owner: string;
  repo: string;
  editItem?: LeeItem | null;
  onSaved: () => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = ['🔥', '⭐', '💪', '🎯', '✨', '💯', '🏆', '👍', '💊', '🛁', '🍽️', '🏋️', '💇', '🧴', '🥗', '🏃'];
const CATEGORY_OPTIONS = [
  { value: 'supplements', label: 'Supplements', icon: '💊' },
  { value: 'hair-bath', label: 'Hair & Bath', icon: '🛁' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'fitness', label: 'Fitness', icon: '🏋️' },
] as const;

export default function AdminForm({
  token,
  owner,
  repo,
  editItem,
  onSaved,
  onCancel,
}: AdminFormProps) {
  const [url, setUrl] = useState(editItem?.affiliateUrl || '');
  const [name, setName] = useState(editItem?.name || '');
  const [description, setDescription] = useState(editItem?.description || '');
  const [imageUrl, setImageUrl] = useState(editItem?.imageUrl || '');
  const [category, setCategory] = useState<'supplements' | 'hair-bath' | 'food' | 'fitness'>(
    editItem?.category || 'supplements'
  );
  const [tags, setTags] = useState(editItem?.tags.join(', ') || '');
  const [rating, setRating] = useState(editItem?.rating || 8);
  const [ratingEmoji, setRatingEmoji] = useState(editItem?.ratingEmoji || '🔥');
  const [featured, setFeatured] = useState(editItem?.featured || false);

  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fetchError, setFetchError] = useState('');

  const handleFetchMetadata = async () => {
    if (!url.trim()) return;

    setIsFetching(true);
    setFetchError('');

    try {
      const metadata = await fetchURLMetadata(url);
      if (metadata) {
        if (metadata.title && !name) setName(metadata.title);
        if (metadata.description && !description) setDescription(metadata.description);
        if (metadata.image && !imageUrl) setImageUrl(metadata.image);
      } else {
        setFetchError('Could not auto-fetch metadata. Please enter details manually.');
      }
    } catch {
      setFetchError('Failed to fetch metadata. Please enter details manually.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const fileResult = await getFileContent(token, owner, repo, 'data/lee.json');

      let data: LeeData;
      let sha: string | undefined;

      if (fileResult) {
        data = JSON.parse(fileResult.content);
        sha = fileResult.sha;
      } else {
        data = { items: [], lastUpdated: '' };
      }

      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      if (editItem) {
        const index = data.items.findIndex((item) => item.id === editItem.id);
        if (index !== -1) {
          data.items[index] = {
            ...data.items[index],
            name,
            description,
            imageUrl,
            affiliateUrl: url,
            category,
            tags: tagList,
            rating,
            ratingEmoji,
            featured,
          };
        }
      } else {
        const newItem: LeeItem = {
          id: crypto.randomUUID(),
          name,
          description,
          imageUrl,
          affiliateUrl: url,
          category,
          tags: tagList,
          rating,
          ratingEmoji,
          featured,
          dateAdded: new Date().toISOString(),
        };
        data.items.unshift(newItem);
      }

      data.lastUpdated = new Date().toISOString();

      const commitMessage = editItem
        ? `Update lee item: ${name}`
        : `Add lee item: ${name}`;

      await commitFile(
        token,
        owner,
        repo,
        'data/lee.json',
        JSON.stringify(data, null, 2),
        commitMessage,
        sha
      );

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate rating preview
  const ratingPreview = Array(rating).fill(ratingEmoji).join('') + Array(10 - rating).fill('⚫').join('');

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      {/* Header */}
      <div className="form-header">
        <h2 className="form-title">{editItem ? 'Edit Item' : 'Add New Item'}</h2>
        <p className="form-subtitle">Fill in the details below to {editItem ? 'update this' : 'add a new'} recommendation.</p>
      </div>

      {/* Section: Product Link */}
      <section className="form-section">
        <h3 className="section-title">Product Link</h3>
        <div className="url-input-group">
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste product URL here..."
            required
          />
          <button
            type="button"
            className="fetch-btn"
            onClick={handleFetchMetadata}
            disabled={!url.trim() || isFetching}
          >
            {isFetching ? (
              <><span className="spinner" /> Fetching...</>
            ) : (
              <><span className="magic-icon">✨</span> Auto-fill</>
            )}
          </button>
        </div>
        {fetchError && <div className="info-message">{fetchError}</div>}
      </section>

      {/* Section: Basic Info */}
      <section className="form-section">
        <h3 className="section-title">Basic Info</h3>

        <div className="input-group">
          <label htmlFor="name">Product Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Creatine Monohydrate 5g"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="description">
            Your Review
            <span className="char-count">{description.length}/200</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Why do you love this product? What makes it great?"
            rows={3}
            maxLength={200}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="tags">Tags</label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., vitamins, daily, essential (comma-separated)"
          />
          {tags && (
            <div className="tags-preview">
              {tags.split(',').filter(t => t.trim()).map((tag, i) => (
                <span key={i} className="tag-pill">#{tag.trim()}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section: Image */}
      <section className="form-section">
        <h3 className="section-title">Product Image</h3>
        <div className="image-section">
          <div className="image-input-side">
            <div className="input-group">
              <label htmlFor="imageUrl">Image URL</label>
              <input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            {imageUrl && (
              <button
                type="button"
                className="clear-image-btn"
                onClick={() => setImageUrl('')}
              >
                Remove image
              </button>
            )}
          </div>
          <div className="image-preview-side">
            {imageUrl ? (
              <div className="image-preview">
                <img src={imageUrl} alt="Preview" />
              </div>
            ) : (
              <div className="image-placeholder">
                <span>📷</span>
                <span>No image</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section: Category & Rating */}
      <section className="form-section">
        <h3 className="section-title">Category & Rating</h3>

        {/* Category Pills */}
        <div className="input-group">
          <label>Category</label>
          <div className="category-pills">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`category-pill ${category === opt.value ? 'active' : ''}`}
                onClick={() => setCategory(opt.value)}
              >
                <span className="category-icon">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Section */}
        <div className="rating-section">
          <div className="rating-slider-group">
            <label>Your Rating</label>
            <div className="slider-row">
              <input
                type="range"
                min="1"
                max="10"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
              <span className="rating-number">{rating}/10</span>
            </div>
          </div>

          <div className="emoji-picker-group">
            <label>Rating Emoji</label>
            <div className="emoji-grid">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`emoji-btn ${ratingEmoji === emoji ? 'active' : ''}`}
                  onClick={() => setRatingEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rating Preview */}
        <div className="rating-preview">
          <label>Preview</label>
          <div className="preview-display">
            <span className="preview-emojis">{ratingPreview}</span>
          </div>
        </div>

        {/* Featured Toggle */}
        <div className="featured-toggle">
          <label className="toggle-label">
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </div>
            <div className="toggle-text">
              <span className="toggle-title">Featured Item</span>
              <span className="toggle-desc">Shows in &quot;Top Picks&quot; section at the top of the page</span>
            </div>
          </label>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}

      {/* Sticky Footer */}
      <div className="form-footer">
        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="submit-btn" disabled={isSaving}>
          {isSaving ? (
            <><span className="spinner" /> Saving...</>
          ) : (
            editItem ? 'Update Item' : 'Add Item'
          )}
        </button>
      </div>

      <style jsx>{`
        .admin-form {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .form-header {
          padding: 32px 32px 24px;
          border-bottom: 1px solid #f0f0f0;
          background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
        }

        .form-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .form-subtitle {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
        }

        .form-section {
          padding: 24px 32px;
          border-bottom: 1px solid #f0f0f0;
        }

        .section-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 16px;
        }

        .url-input-group {
          display: flex;
          gap: 12px;
        }

        .url-input-group input {
          flex: 1;
          padding: 14px 18px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .url-input-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .fetch-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: linear-gradient(180deg, #fff 0%, #f9fafb 100%);
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .fetch-btn:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
        }

        .fetch-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .magic-icon {
          font-size: 1.1rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group:last-child {
          margin-bottom: 0;
        }

        .input-group label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .char-count {
          font-size: 0.75rem;
          font-weight: 400;
          color: #9ca3af;
        }

        .input-group input,
        .input-group textarea {
          width: 100%;
          padding: 14px 18px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
        }

        .input-group input:focus,
        .input-group textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .input-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .tags-preview {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .tag-pill {
          background: #f3f4f6;
          color: #6b7280;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .image-section {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .image-input-side {
          flex: 1;
        }

        .clear-image-btn {
          margin-top: 12px;
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
          background: #fef2f2;
          color: #dc2626;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .clear-image-btn:hover {
          background: #fee2e2;
        }

        .image-preview-side {
          flex-shrink: 0;
        }

        .image-preview {
          width: 160px;
          height: 160px;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid #e5e7eb;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-placeholder {
          width: 160px;
          height: 160px;
          border-radius: 16px;
          border: 2px dashed #d1d5db;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #9ca3af;
          font-size: 0.85rem;
        }

        .image-placeholder span:first-child {
          font-size: 2rem;
          opacity: 0.5;
        }

        .category-pills {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .category-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .category-pill:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .category-pill.active {
          border-color: #2563eb;
          background: #eff6ff;
          color: #2563eb;
        }

        .category-icon {
          font-size: 1.2rem;
        }

        .rating-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 20px;
        }

        .rating-slider-group label,
        .emoji-picker-group label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 12px;
        }

        .slider-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .slider-row input[type="range"] {
          flex: 1;
          height: 8px;
          -webkit-appearance: none;
          background: #e5e7eb;
          border-radius: 4px;
          cursor: pointer;
        }

        .slider-row input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          background: #2563eb;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }

        .rating-number {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          min-width: 50px;
        }

        .emoji-grid {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
        }

        .emoji-btn {
          width: 44px;
          height: 44px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          font-size: 1.3rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .emoji-btn:hover {
          border-color: #d1d5db;
          transform: scale(1.1);
        }

        .emoji-btn.active {
          border-color: #2563eb;
          background: #eff6ff;
          transform: scale(1.1);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
        }

        .rating-preview {
          margin-bottom: 24px;
        }

        .rating-preview label {
          display: block;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .preview-display {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 16px 20px;
          border-radius: 12px;
        }

        .preview-emojis {
          font-size: 1.1rem;
          letter-spacing: 2px;
        }

        .featured-toggle {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px 20px;
        }

        .toggle-label {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
        }

        .toggle-switch {
          position: relative;
          width: 52px;
          height: 28px;
          flex-shrink: 0;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          inset: 0;
          background: #d1d5db;
          border-radius: 14px;
          transition: background 0.3s ease;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          width: 22px;
          height: 22px;
          left: 3px;
          top: 3px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .toggle-switch input:checked + .toggle-slider {
          background: #2563eb;
        }

        .toggle-switch input:checked + .toggle-slider::before {
          transform: translateX(24px);
        }

        .toggle-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-title {
          font-weight: 600;
          color: #1f2937;
        }

        .toggle-desc {
          font-size: 0.85rem;
          color: #6b7280;
        }

        .info-message {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-top: 12px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 0.9rem;
          margin: 0 32px 24px;
        }

        .form-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 24px 32px;
          background: #f9fafb;
          border-top: 1px solid #f0f0f0;
        }

        .cancel-btn {
          padding: 14px 28px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(31, 41, 55, 0.2);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(31, 41, 55, 0.3);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .form-header,
          .form-section {
            padding: 20px;
          }

          .url-input-group {
            flex-direction: column;
          }

          .image-section {
            flex-direction: column-reverse;
          }

          .image-preview,
          .image-placeholder {
            width: 100%;
            height: 200px;
          }

          .rating-section {
            grid-template-columns: 1fr;
          }

          .emoji-grid {
            grid-template-columns: repeat(8, 1fr);
          }

          .category-pills {
            flex-direction: column;
          }

          .category-pill {
            justify-content: center;
          }

          .form-footer {
            padding: 20px;
            flex-direction: column-reverse;
          }

          .cancel-btn,
          .submit-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </form>
  );
}
