import { ImageResponse } from 'next/og';

// Keep this metadata route out of the Edge bundle. `next/og` alone is large
// enough to exceed the 1 MB Edge Function limit on the current Vercel plan.
export const runtime = 'nodejs';
export const alt = 'unicodesnwrites — AI papers taken apart, agents built, everything written down';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PAPER = '#F6F3EC';
const SHEET = '#FFFEFB';
const RULE = '#DDD8CC';
const INK = '#111214';
const GRAPHITE = '#4A4B52';
const RED = '#C8321A';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', backgroundColor: PAPER, color: INK, padding: '64px 72px', gap: 56 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <svg width="48" height="48" viewBox="0 0 64 64">
              <rect width="64" height="64" rx="14" fill={INK} />
              <path d="M21 22v15a11 11 0 0 0 22 0V22" fill="none" stroke={PAPER} strokeWidth="7" strokeLinecap="round" />
              <path d="M43 37v12" stroke={PAPER} strokeWidth="7" strokeLinecap="round" />
              <circle cx="43" cy="56" r="3.5" fill="#E04A2F" />
            </svg>
            <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
              unicodes&nbsp;<span style={{ color: RED, fontStyle: 'italic' }}>n</span>&nbsp;writes
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ fontSize: 18, letterSpacing: 2, color: RED }}>A RESEARCH NOTEBOOK</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', fontSize: 62, lineHeight: 1.04, letterSpacing: -2, fontWeight: 700 }}>
              I take AI papers apart, build the agents, and write down everything.
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${RULE}`, paddingTop: 18, fontSize: 18, color: GRAPHITE }}>
            <div>Papers · Agents · Build logs · Courses · Tools</div>
            <div style={{ color: INK }}>unicodesnwrites.tech</div>
          </div>
        </div>
        <div style={{ width: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', backgroundColor: SHEET, border: `1px solid ${RULE}`, borderRadius: 22 }}>
          <div style={{ position: 'absolute', left: 18, top: 14, fontSize: 15, color: GRAPHITE }}>U+03BB</div>
          <svg width="220" height="220" viewBox="0 0 48 48">
            <path d="M13 10c5 0 7.5 2.5 9.5 7.5L35 38M23.5 20 13 38" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ position: 'absolute', right: 22, bottom: 22, width: 12, height: 12, borderRadius: 6, backgroundColor: '#E04A2F' }} />
        </div>
      </div>
    ),
    size,
  );
}
