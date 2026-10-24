import { ImageResponse } from 'next/og';

import { GLYPHS, type GlyphKind } from '@/components/ui/Glyph';

export const OG_SIZE = { width: 1200, height: 630 };

const PAPER = '#F6F3EC';
const SHEET = '#FFFEFB';
const RULE = '#DDD8CC';
const INK = '#111214';
const GRAPHITE = '#4A4B52';
const RED = '#C8321A';

/** A Codepoint share card: eyebrow, title, footer line, and the content type's glyph on a sheet. */
export function renderOgCard({ eyebrow, title, footer, kind }: { eyebrow: string; title: string; footer: string; kind: GlyphKind }) {
  const glyph = GLYPHS[kind];
  const titleSize = title.length > 90 ? 44 : title.length > 55 ? 52 : 60;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: PAPER, color: INK, padding: '64px 72px', gap: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="44" height="44" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="14" fill={INK} />
              <path d="M21 22v15a11 11 0 0 0 22 0V22" fill="none" stroke={PAPER} strokeWidth="7" strokeLinecap="round" />
              <path d="M43 37v12" stroke={PAPER} strokeWidth="7" strokeLinecap="round" />
              <circle cx="43" cy="56" r="3.5" fill="#E04A2F" />
            </svg>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>
              unicodes&nbsp;<span style={{ color: RED, fontStyle: 'italic' }}>n</span>&nbsp;writes
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ fontSize: 18, letterSpacing: 2, color: RED }}>{eyebrow.toUpperCase()}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: titleSize, lineHeight: 1.06, letterSpacing: -1.5, fontWeight: 700 }}>
              {title.length > 140 ? `${title.slice(0, 137)}…` : title}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${RULE}`, paddingTop: 18, fontSize: 18, color: GRAPHITE }}>
            <div>{footer}</div>
            <div style={{ color: INK }}>unicodesnwrites.tech</div>
          </div>
        </div>
        <div style={{ width: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: SHEET, border: `1px solid ${RULE}`, borderRadius: 22 }}>
          <div style={{ position: 'absolute', left: 18, top: 14, fontSize: 15, color: GRAPHITE }}>{glyph.code}</div>
          <svg width="200" height="200" viewBox="0 0 48 48">
            {glyph.circle ? <circle cx="24" cy="24" r="13" fill="none" stroke={INK} strokeWidth="2.4" /> : null}
            <path d={glyph.d} fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ position: 'absolute', right: 22, bottom: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: '#E04A2F' }} />
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    },
  );
}
