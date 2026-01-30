'use client';

import { useState } from 'react';
import { validateToken } from '@/lib/github';

interface TokenPromptProps {
  onTokenValidated: (token: string) => void;
  onCancel?: () => void;
}

export default function TokenPrompt({ onTokenValidated, onCancel }: TokenPromptProps) {
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);
    setError('');

    try {
      const result = await validateToken(token);
      if (result.valid) {
        // Store token in localStorage
        localStorage.setItem('github_token', token);
        onTokenValidated(token);
      } else {
        setError('Invalid token. Please check and try again.');
      }
    } catch {
      setError('Failed to validate token. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="token-prompt-overlay">
      <div className="token-prompt">
        <h2 className="prompt-title">GitHub Token Required</h2>
        <p className="prompt-description">
          To add or edit items, you need a GitHub Personal Access Token with{' '}
          <code>public_repo</code> scope.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="token">Personal Access Token</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            {onCancel && (
              <button type="button" className="cancel-btn" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="submit-btn"
              disabled={!token.trim() || isValidating}
            >
              {isValidating ? 'Validating...' : 'Connect'}
            </button>
          </div>
        </form>

        <p className="help-text">
          <a
            href="https://github.com/settings/tokens/new?scopes=public_repo&description=Uses%20Page%20Admin"
            target="_blank"
            rel="noopener noreferrer"
          >
            Create a new token on GitHub
          </a>
        </p>
      </div>

      <style jsx>{`
        .token-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }

        .token-prompt {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .prompt-title {
          font-family: var(--font-outfit), system-ui, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 12px;
        }

        .prompt-description {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 24px;
        }

        .prompt-description code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.85rem;
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

        .input-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-family: monospace;
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .input-group input:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background: #374151;
        }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .help-text {
          margin: 20px 0 0;
          text-align: center;
          font-size: 0.85rem;
          color: #6b7280;
        }

        .help-text a {
          color: #2563eb;
          text-decoration: none;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .token-prompt {
            padding: 24px;
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
    </div>
  );
}
