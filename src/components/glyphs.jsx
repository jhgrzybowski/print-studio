import { useId } from "react";

// Print-specific glyphs drawn on lucide's 24px grid and stroke, so they sit beside lucide icons unnoticed.

function glyph(name, draw) {
  function Glyph({ size = 18, strokeWidth = 1.5, className, ...rest }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden
        {...rest}
      >
        {draw()}
      </svg>
    );
  }
  Glyph.displayName = name;
  return Glyph;
}

export const ColorGlyph = glyph("ColorGlyph", () => (
  <>
    <circle cx="12" cy="8.6" r="4.6" />
    <circle cx="8.6" cy="14.6" r="4.6" />
    <circle cx="15.4" cy="14.6" r="4.6" />
  </>
));

export const MonoGlyph = glyph("MonoGlyph", () => (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none" />
  </>
));

export const AutoGlyph = glyph("AutoGlyph", () => (
  <>
    <circle cx="11" cy="13" r="7" />
    <path d="M11 6a7 7 0 0 0 0 14z" fill="currentColor" fillOpacity="0.35" stroke="none" />
    <path d="M18.5 2.5v4M16.5 4.5h4" />
  </>
));

export const OneSidedGlyph = glyph("OneSidedGlyph", () => (
  <>
    <rect x="6" y="3" width="12" height="18" rx="2" />
    <path d="M9.5 8h5M9.5 11.5h5M9.5 15h3" />
  </>
));

// Long edge: pages open like a book.
export const LongEdgeGlyph = glyph("LongEdgeGlyph", () => (
  <>
    <path d="M12 5.5v14" />
    <path d="M12 5.5C10.2 4.4 7.3 4 4 4.3v14c3.3-.3 6.2.1 8 1.2 1.8-1.1 4.7-1.5 8-1.2v-14c-3.3-.3-6.2.1-8 1.2z" />
  </>
));

// Short edge: pages flip over the top like a notepad.
export const ShortEdgeGlyph = glyph("ShortEdgeGlyph", () => (
  <>
    <rect x="5" y="6" width="14" height="15" rx="2" />
    <path d="M8 3.5v4M12 3.5v4M16 3.5v4" />
  </>
));

function bars(level) {
  return () => (
    <>
      {[
        [6, 15],
        [12, 11],
        [18, 7],
      ].map(([x, top], i) => (
        <path key={x} d={`M${x} 19V${top}`} strokeOpacity={i < level ? 1 : 0.28} strokeWidth={2.2} />
      ))}
    </>
  );
}
export const DraftGlyph = glyph("DraftGlyph", bars(1));
export const StandardGlyph = glyph("StandardGlyph", bars(2));
export const HighGlyph = glyph("HighGlyph", bars(3));

/**
 * The Print Studio mark: a drop of liquid chrome. A slow turbulence field makes its edge
 * wobble; reduced motion keeps it still.
 */
export function Mark({ size = 26, liquid = true }) {
  const id = useId().replace(/:/g, "");
  const still = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--c0)" />
          <stop offset=".3" stopColor="var(--c2)" />
          <stop offset=".5" stopColor="var(--c4)" />
          <stop offset=".54" stopColor="var(--c2)" />
          <stop offset=".85" stopColor="var(--c1)" />
          <stop offset="1" stopColor="var(--c3)" />
        </linearGradient>
        {liquid && !still && (
          <filter id={`f${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n">
              <animate attributeName="baseFrequency" dur="9s" values="0.03;0.05;0.03" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" />
          </filter>
        )}
      </defs>
      <g filter={liquid && !still ? `url(#f${id})` : undefined}>
        <path className="mark__drop" d="M16 3.5c5.6 6.3 9.5 11.2 9.5 16a9.5 9.5 0 0 1-19 0c0-4.8 3.9-9.7 9.5-16z" fill={`url(#g${id})`} />
        <path d="M11.3 20.2c.3 2.4 2 4.3 4.4 4.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
      </g>
    </svg>
  );
}
