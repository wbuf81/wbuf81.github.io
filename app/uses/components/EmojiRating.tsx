'use client';

interface EmojiRatingProps {
  rating: number; // 1-10
  emoji: string;
}

export default function EmojiRating({ rating, emoji }: EmojiRatingProps) {
  const filled = Math.round(rating / 2); // Convert 1-10 to 1-5
  const empty = 5 - filled;

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
          font-size: 0.9rem;
          letter-spacing: 2px;
        }

        .filled {
          opacity: 1;
        }

        .empty {
          opacity: 0.3;
          font-size: 0.7rem;
        }
      `}</style>
    </div>
  );
}
