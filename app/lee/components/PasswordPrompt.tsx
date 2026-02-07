'use client';

import { useState } from 'react';

interface PasswordPromptProps {
  onAuthenticated: () => void;
}

export default function PasswordPrompt({ onAuthenticated }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const correctPassword = process.env.NEXT_PUBLIC_LEE_PASSWORD || 'leepicks2026';

    if (password === correctPassword) {
      localStorage.setItem('lee_authenticated', 'true');
      onAuthenticated();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="password-prompt-overlay">
      <div className="password-prompt">
        <h2 className="prompt-title">Lee&apos;s Admin</h2>
        <p className="prompt-description">
          Enter the password to manage Lee&apos;s Picks.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              autoFocus
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button
              type="submit"
              className="submit-btn"
              disabled={!password.trim()}
            >
              Unlock
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .password-prompt-overlay {
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

        .password-prompt {
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
          font-family: system-ui, -apple-system, sans-serif;
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
          width: 100%;
        }

        .submit-btn:hover:not(:disabled) {
          background: #374151;
        }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .password-prompt {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
}
