import { ImageResponse } from 'next/og';
import { Children, Fragment, isValidElement, type ReactNode } from 'react';

import { GLYPHS, type GlyphKind } from '@/components/ui/Glyph';
import { SITE_ICONS } from '@/components/ui/SiteIcon';

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

/** Satori's SVG writer can't serialise fragments, so unwrap the icon's <>…</> into plain children. */
function svgChildren(node: ReactNode): ReactNode[] {
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment) return Children.toArray(node.props.children);
  return [node];
}

/** A certificate share card: who finished which course, on a sheet with the steps-and-flag icon. */
export function renderCertificateOgCard({ name, courseTitle, date, code }: { name: string; courseTitle: string; date: string; code: string }) {
  const icon = SITE_ICONS.learning;
  const titleSize = courseTitle.length > 80 ? 40 : courseTitle.length > 50 ? 46 : 54;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: PAPER, color: INK, padding: 40 }}>
        <div style={{ flex: 1, display: 'flex', gap: 48, backgroundColor: SHEET, border: `2px solid ${INK}`, borderRadius: 18, padding: '44px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <svg width="40" height="40" viewBox="0 0 64 64">
                <rect width="64" height="64" rx="14" fill={INK} />
                <path d="M21 22v15a11 11 0 0 0 22 0V22" fill="none" stroke={PAPER} strokeWidth="7" strokeLinecap="round" />
                <path d="M43 37v12" stroke={PAPER} strokeWidth="7" strokeLinecap="round" />
                <circle cx="43" cy="56" r="3.5" fill="#E04A2F" />
              </svg>
              <div style={{ display: 'flex', fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
                unicodes&nbsp;<span style={{ color: RED, fontStyle: 'italic' }}>n</span>&nbsp;writes
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 18, letterSpacing: 2, color: RED }}>CERTIFICATE OF COMPLETION</div>
              <div style={{ display: 'flex', fontSize: 56, lineHeight: 1.05, letterSpacing: -1.5, fontWeight: 700 }}>
                {name.length > 48 ? `${name.slice(0, 45)}…` : name}
              </div>
              <div style={{ display: 'flex', fontSize: 22, color: GRAPHITE }}>finished the course</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: titleSize, lineHeight: 1.1, letterSpacing: -1, fontWeight: 700 }}>
                {courseTitle.length > 110 ? `${courseTitle.slice(0, 107)}…` : courseTitle}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${RULE}`, paddingTop: 16, fontSize: 18, color: GRAPHITE }}>
              <div>{`${date} · Verified by unicodesnwrites`}</div>
              <div style={{ color: INK }}>{`ID ${code}`}</div>
            </div>
          </div>
          <div style={{ width: 230, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="210" height="210" viewBox="0 0 48 48" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: RED }}>
              {svgChildren(icon.ink)}
              <g stroke={RED} fill={RED}>{svgChildren(icon.accent)}</g>
            </svg>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    },
  );
}
