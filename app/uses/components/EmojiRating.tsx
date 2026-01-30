'use client';

interface EmojiRatingProps {
  rating: number; // 1-10
  emoji: string;
}

export default function EmojiRating({ rating, emoji }: EmojiRatingProps) {
  const filled = Math.min(Math.max(rating, 0), 10); // Clamp to 0-10
  const empty = 10 - filled;

  return (
    <div className="emoji-rating">
      <span className="filled">
        {Array(filled).fill(emoji).join('')}
      </span>
      <span className="empty">
        {Array(empty).fill('⚫').join('')}
      </span>

      <style jsx>{`
        .emoji-rating {
          display: inline-flex;
          align-items: center;
          font-size: 0.75rem;
          letter-spacing: 1px;
        }

        .filled {
          opacity: 1;
        }

        .empty {
          opacity: 0.3;
        }
      `}</style>
    </div>
  );
}
