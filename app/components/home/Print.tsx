import type { ReactNode } from 'react';
import type { Project, Tape } from '@/lib/projects';

interface PrintProps {
  image?: string;
  alt?: string;
  fit?: Project['fit'];
  /** The two halves of the mono caption on the print's bottom lip. */
  caption: ReactNode;
  tilt: number;
  tapes: Tape[];
  /** Makes the whole print a link. */
  href?: string;
  label?: string;
  className?: string;
  /** In place of the photo (the arcade print holds the Tetris screen). */
  children?: ReactNode;
  eager?: boolean;
}

// A taped print (design system › prints): a photo on a paper border with a wide bottom lip, tilted, with tape.
export default function Print({ image, alt = '', fit = 'photo', caption, tilt, tapes, href, label, className, children, eager }: PrintProps) {
  const cls = className ? `print ${className}` : 'print';
  const style = { transform: `rotate(${tilt}deg)` };
  const inner = (
    <>
      {tapes.map((t, i) => (
        <span
          key={i}
          className="tape"
          aria-hidden="true"
          style={{ left: t.left, top: t.top, width: t.width, transform: `rotate(${t.angle})` }}
        />
      ))}
      {children ?? (
        // eslint-disable-next-line @next/next/no-img-element -- static export, images are served as they are
        <img
          className={fit === 'shot' ? 'ph shot' : fit === 'board' ? 'ph board' : 'ph'}
          src={image}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
        />
      )}
      <span className="cap">{caption}</span>
    </>
  );
  return href ? (
    <a className={cls} href={href} aria-label={label} style={style} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <div className={cls} style={style}>
      {inner}
    </div>
  );
}
