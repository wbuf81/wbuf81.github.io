'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { UsesItem, UsesData, CATEGORY_LABELS } from '@/types/uses';
import { validateToken, getFileContent } from '@/lib/github';
import TokenPrompt from '../components/TokenPrompt';
import AdminForm from '../components/AdminForm';
import EmojiRating from '../components/EmojiRating';

// Default repo info - can be overridden with env vars
const DEFAULT_OWNER = 'wbuf81';
const DEFAULT_REPO = 'wbuf81.github.io';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [items, setItems] = useState<UsesItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<UsesItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER || DEFAULT_OWNER;
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO || DEFAULT_REPO;

  const loadItems = useCallback(async (authToken: string) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getFileContent(authToken, owner, repo, 'data/uses.json');
      if (result) {
        const data: UsesData = JSON.parse(result.content);
        setItems(data.items || []);
      } else {
        setItems([]);
      }
    } catch (err) {
      setError('Failed to load items. Please check your token permissions.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo]);

  // Check for existing token on mount
  useEffect(() => {
    const checkToken = async () => {
      const storedToken = localStorage.getItem('github_token');
      if (storedToken) {
        const result = await validateToken(storedToken);
        if (result.valid) {
          setToken(storedToken);
          loadItems(storedToken);
        } else {
          localStorage.removeItem('github_token');
          setShowTokenPrompt(true);
        }
      } else {
        setShowTokenPrompt(true);
      }
      setIsCheckingToken(false);
    };

    checkToken();
  }, [loadItems]);

  const handleTokenValidated = (validatedToken: string) => {
    setToken(validatedToken);
    setShowTokenPrompt(false);
    loadItems(validatedToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    setToken(null);
    setItems([]);
    setShowTokenPrompt(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEdit = (item: UsesItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditingItem(null);
    if (token) {
      loadItems(token);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  if (isCheckingToken) {
    return (
      <div className="admin-container">
        <div className="loading">Checking authentication...</div>
        <style jsx>{`
          .admin-container {
            min-height: 100vh;
            background: #fafafa;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading {
            font-family: system-ui, -apple-system, sans-serif;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Grain texture overlay */}
      <div className="grain-overlay" />

      {showTokenPrompt && (
        <TokenPrompt
          onTokenValidated={handleTokenValidated}
          onCancel={token ? () => setShowTokenPrompt(false) : undefined}
        />
      )}

      <nav className="admin-nav">
        <Link href="/uses" className="back-link">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Uses
        </Link>
        {token && (
          <button className="logout-btn" onClick={handleLogout}>
            Disconnect GitHub
          </button>
        )}
      </nav>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 className="admin-title">Uses Admin</h1>
            <p className="admin-subtitle">
              Manage your recommended products and gear.
            </p>
          </div>
          {token && !showForm && (
            <button className="add-btn" onClick={handleAddNew}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Add Item
            </button>
          )}
        </header>

        {error && <div className="error-message">{error}</div>}

        {showForm && token ? (
          <AdminForm
            token={token}
            owner={owner}
            repo={repo}
            editItem={editingItem}
            onSaved={handleFormSaved}
            onCancel={handleFormCancel}
          />
        ) : (
          <div className="items-section">
            {isLoading ? (
              <div className="loading-state">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="empty-state">
                <p>No items yet. Add your first recommendation!</p>
              </div>
            ) : (
              <div className="items-list">
                {items.map((item) => (
                  <div key={item.id} className="item-card">
                    <div className="item-image">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} />
                      ) : (
                        <div className="placeholder-image">📦</div>
                      )}
                    </div>
                    <div className="item-content">
                      <h3 className="item-name">{item.name}</h3>
                      <p className="item-description">{item.description}</p>
                      <div className="item-meta">
                        <span className="item-category">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                        <EmojiRating rating={item.rating} emoji={item.ratingEmoji} />
                        {item.featured && <span className="featured-badge">Featured</span>}
                      </div>
                    </div>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <style jsx>{`
        .admin-container {
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
        }

        .admin-nav {
          position: relative;
          z-index: 1;
          padding: 24px 40px;
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
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

        .logout-btn {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .logout-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .admin-main {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 0 40px 80px;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 20px;
        }

        .admin-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px;
        }

        .admin-subtitle {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          border-radius: 10px;
          background: #1f2937;
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 0.95rem;
          font-weight: 500;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s ease;
          white-space: nowrap;
        }

        .add-btn:hover {
          background: #374151;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 16px 20px;
          border-radius: 12px;
          font-size: 0.95rem;
          margin-bottom: 24px;
        }

        .loading-state,
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1rem;
        }

        .items-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .item-card {
          display: flex;
          gap: 16px;
          background: #fff;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04);
          align-items: center;
        }

        .item-image {
          flex-shrink: 0;
          width: 70px;
          height: 70px;
          border-radius: 10px;
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
          font-size: 1.5rem;
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-name {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px;
        }

        .item-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #6b7280;
          margin: 0 0 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .item-category {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.75rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 10px;
        }

        .featured-badge {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.75rem;
          color: #059669;
          background: #d1fae5;
          padding: 4px 10px;
          border-radius: 10px;
        }

        .edit-btn {
          padding: 8px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease;
        }

        .edit-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        @media (max-width: 768px) {
          .admin-nav {
            padding: 20px 24px;
          }

          .admin-main {
            padding: 0 24px 60px;
          }

          .admin-header {
            flex-direction: column;
            align-items: stretch;
          }

          .add-btn {
            justify-content: center;
          }

          .admin-title {
            font-size: 2rem;
          }

          .item-card {
            flex-direction: column;
            align-items: stretch;
          }

          .item-image {
            width: 100%;
            height: 120px;
          }

          .item-description {
            white-space: normal;
          }

          .edit-btn {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .admin-nav {
            padding: 16px;
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .admin-main {
            padding: 0 16px 40px;
          }

          .admin-title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
}
