'use client';

import { useState } from 'react';
import { UsesItem, UsesData } from '@/types/uses';
import { getFileContent, commitFile } from '@/lib/github';
import { fetchURLMetadata } from '@/lib/metadata-fetcher';

interface AdminFormProps {
  token: string;
  owner: string;
  repo: string;
  editItem?: UsesItem | null;
  onSaved: () => void;
  onCancel: () => void;
}

const EMOJI_OPTIONS = ['🔥', '⭐', '💪', '🎯', '✨', '💯', '🏆', '👍'];
const CATEGORY_OPTIONS = [
  { value: 'tech-gear', label: 'Tech & Gear' },
  { value: 'desk-office', label: 'Desk & Office' },
  { value: 'fitness-supplements', label: 'Fitness & Supplements' },
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
  const [category, setCategory] = useState<'tech-gear' | 'desk-office' | 'fitness-supplements'>(
    editItem?.category || 'tech-gear'
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
      // Get current file content
      const fileResult = await getFileContent(token, owner, repo, 'data/uses.json');

      let data: UsesData;
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
        // Update existing item
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
        // Add new item
        const newItem: UsesItem = {
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

      // Commit to GitHub
      const commitMessage = editItem
        ? `Update uses item: ${name}`
        : `Add uses item: ${name}`;

      await commitFile(
        token,
        owner,
        repo,
        'data/uses.json',
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

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{editItem ? 'Edit Item' : 'Add New Item'}</h2>

      {/* URL Input with Fetch */}
      <div className="input-row">
        <div className="input-group flex-1">
          <label htmlFor="url">Product URL</label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://amazon.com/..."
            required
          />
        </div>
        <button
          type="button"
          className="fetch-btn"
          onClick={handleFetchMetadata}
          disabled={!url.trim() || isFetching}
        >
          {isFetching ? 'Fetching...' : 'Auto-fill'}
        </button>
      </div>

      {fetchError && <div className="info-message">{fetchError}</div>}

      {/* Name */}
      <div className="input-group">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sony WH-1000XM5"
          required
        />
      </div>

      {/* Description */}
      <div className="input-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Best noise-canceling headphones for work and travel."
          rows={3}
          required
        />
      </div>

      {/* Image URL */}
      <div className="input-group">
        <label htmlFor="imageUrl">Image URL</label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
        {imageUrl && (
          <div className="image-preview">
            <img src={imageUrl} alt="Preview" />
          </div>
        )}
      </div>

      {/* Category */}
      <div className="input-group">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as 'tech-gear' | 'desk-office' | 'fitness-supplements')
          }
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Tags */}
      <div className="input-group">
        <label htmlFor="tags">Tags (comma-separated)</label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="headphones, audio, wireless"
        />
      </div>

      {/* Rating */}
      <div className="input-row">
        <div className="input-group flex-1">
          <label htmlFor="rating">Rating (1-10)</label>
          <input
            id="rating"
            type="range"
            min="1"
            max="10"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <div className="rating-value">{rating}/10</div>
        </div>

        <div className="input-group">
          <label>Rating Emoji</label>
          <div className="emoji-picker">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`emoji-option ${ratingEmoji === emoji ? 'active' : ''}`}
                onClick={() => setRatingEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured */}
      <div className="checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={featured}
            onChange={(e) => setFeatured(e.target.checked)}
          />
          <span>Featured item (shows at top of page)</span>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Actions */}
      <div className="button-group">
        <button type="button" className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="submit-btn" disabled={isSaving}>
          {isSaving ? 'Saving...' : editItem ? 'Update Item' : 'Add Item'}
        </button>
      </div>

      <style jsx>{`
        .admin-form {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .form-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 24px;
        }

        .input-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .flex-1 {
          flex: 1;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .input-group input[type='text'],
        .input-group input[type='url'],
        .input-group textarea,
        .input-group select {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input-group input:focus,
        .input-group textarea:focus,
        .input-group select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .input-group textarea {
          resize: vertical;
        }

        .input-group input[type='range'] {
          width: 100%;
          cursor: pointer;
        }

        .rating-value {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          color: #6b7280;
          text-align: center;
          margin-top: 4px;
        }

        .fetch-btn {
          padding: 12px 20px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #f9fafb;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s ease, border-color 0.2s ease;
          margin-bottom: 20px;
        }

        .fetch-btn:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .fetch-btn:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .image-preview {
          margin-top: 12px;
          width: 100px;
          height: 100px;
          border-radius: 10px;
          overflow: hidden;
          background: #f5f5f5;
        }

        .image-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .emoji-picker {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .emoji-option {
          width: 40px;
          height: 40px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .emoji-option:hover {
          border-color: #d1d5db;
          transform: scale(1.05);
        }

        .emoji-option.active {
          border-color: #2563eb;
          background: #eff6ff;
        }

        .checkbox-group {
          margin-bottom: 24px;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          color: #374151;
          cursor: pointer;
        }

        .checkbox-group input[type='checkbox'] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .info-message {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          color: #92400e;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }

        .button-group {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cancel-btn {
          padding: 12px 24px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          background: #fff;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .cancel-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .submit-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 10px;
          background: #1f2937;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #374151;
        }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        @media (max-width: 600px) {
          .admin-form {
            padding: 24px;
          }

          .input-row {
            flex-direction: column;
            align-items: stretch;
          }

          .fetch-btn {
            margin-bottom: 0;
          }

          .button-group {
            flex-direction: column;
          }

          .cancel-btn,
          .submit-btn {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
}
