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

/** The Print Studio mark: a sheet leaving a slot. */
export function Mark({ size = 26 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="9" className="mark__tile" />
      <path d="M9 19.5h14" className="mark__slot" />
      <path d="M11.5 19.5V9.5a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v10" className="mark__sheet" />
      <path d="M11.5 23.5h9" className="mark__slot mark__slot--soft" />
    </svg>
  );
}
