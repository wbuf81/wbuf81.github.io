'use client';

import { useCallback, useRef, useState } from 'react';

interface LogoUploadProps {
  onUpload: (file: File) => void;
}

export default function LogoUpload({ onUpload }: LogoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`upload-zone ${isDragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      <div className="upload-icon">+</div>
      <div className="upload-text">
        {isDragging ? 'Drop image here' : 'Upload custom logo'}
      </div>
      <div className="upload-hint">PNG or SVG recommended</div>

      <style jsx>{`
        .upload-zone {
          border: 2px dashed #374151;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          margin-top: 12px;
        }
        .upload-zone:hover,
        .upload-zone.dragging {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }
        .upload-icon {
          font-size: 28px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .upload-text {
          font-size: 0.85rem;
          color: #d1d5db;
          font-family: var(--font-outfit), sans-serif;
        }
        .upload-hint {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 4px;
          font-family: var(--font-outfit), sans-serif;
        }
      `}</style>
    </div>
  );
}
