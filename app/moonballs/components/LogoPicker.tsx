'use client';

import { useCallback, useRef } from 'react';
import type { GolfBallAction } from '../GolfBallClient';

interface LogoPickerProps {
  selectedLogo: string | null;
  dispatch: React.Dispatch<GolfBallAction>;
  onLogoUpload?: (file: File) => void;
}

const PRESET_LOGOS = [
  { id: 'dog', src: '/moonballs/logos/dog.png', label: 'Dog' },
  { id: 'moon', src: '/moonballs/logos/moon.png', label: 'Moon' },
  { id: 'bard', src: '/moonballs/logos/bard.png', label: 'Bard' },
  { id: 'gators01', src: '/moonballs/logos/gators01.png', label: 'Gators 1' },
  { id: 'gators02', src: '/moonballs/logos/gators02.png', label: 'Gators 2' },
  { id: 'flag', src: '/moonballs/logos/flag.png', label: 'Flag' },
];

export default function LogoPicker({ selectedLogo, dispatch, onLogoUpload }: LogoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/') && onLogoUpload) {
        onLogoUpload(file);
      }
      // Reset so the same file can be re-uploaded
      e.target.value = '';
    },
    [onLogoUpload]
  );

  return (
    <div className="logo-grid">
      {PRESET_LOGOS.map((logo) => (
        <button
          key={logo.id}
          className={`logo-item ${selectedLogo === logo.src ? 'selected' : ''}`}
          onClick={() => {
            if (selectedLogo === logo.src) {
              dispatch({ type: 'SET_LOGO', url: null });
            } else {
              dispatch({ type: 'SET_LOGO', url: logo.src });
            }
          }}
          title={logo.label}
        >
          <img src={logo.src} alt={logo.label} />
          {selectedLogo === logo.src && <div className="check-badge">&#10003;</div>}
        </button>
      ))}

      {onLogoUpload && (
        <button
          className="logo-item upload-btn"
          onClick={() => inputRef.current?.click()}
          title="Upload custom logo"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
          </svg>
          <span className="upload-label">Upload</span>
        </button>
      )}

      <div className="future-item">
        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <path d="M21 11.18V9.72c0-.47-.16-.92-.46-1.28L16.6 3.72c-.38-.46-.94-.72-1.54-.72H8.94c-.6 0-1.16.26-1.54.72L3.46 8.44c-.3.36-.46.81-.46 1.28v1.45c0 .8.49 1.49 1.18 1.78-.02.12-.18.55-.18.55 0 2.76 2.24 5 5 5h6c2.76 0 5-2.24 5-5 0 0-.16-.43-.18-.55.7-.29 1.18-.98 1.18-1.78zM15.29 4.58L18.7 9H15V4h.06l.23.58zM9 4h.06l-.29.58L5.3 9H9V4zm3 14c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
        </svg>
        <span>AI Generate</span>
        <span className="badge">Soon</span>
      </div>

      <style jsx>{`
        .logo-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .logo-item {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border: 2px solid rgba(0, 0, 0, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          transition: all 0.2s ease;
        }
        .logo-item:hover {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(255, 255, 255, 0.7);
        }
        .logo-item.selected {
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.75);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25);
        }
        .logo-item img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 6px;
        }
        .check-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #6366f1;
          color: white;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-btn {
          flex-direction: column;
          gap: 4px;
          color: rgba(0, 0, 0, 0.35);
          border-style: dashed;
          padding: 8px;
        }
        .upload-btn:hover {
          color: #6366f1;
          border-color: rgba(99, 102, 241, 0.4);
        }
        .upload-label {
          font-family: var(--font-outfit), sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
        }
        .future-item {
          grid-column: span 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          aspect-ratio: 1;
          border: 1px dashed rgba(0, 0, 0, 0.12);
          border-radius: 12px;
          color: rgba(0, 0, 0, 0.25);
          cursor: not-allowed;
          font-family: var(--font-outfit), sans-serif;
        }
        .future-item span {
          font-size: 0.6rem;
          font-weight: 500;
        }
        .badge {
          font-size: 0.5rem !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(99, 102, 241, 0.6);
        }
        @media (max-width: 768px) {
          .logo-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 6px;
          }
          .logo-item {
            padding: 6px;
            border-radius: 10px;
          }
        }
      `}</style>
    </div>
  );
}
