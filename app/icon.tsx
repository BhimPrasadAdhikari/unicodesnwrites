import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

// The mark at favicon size: the codepoint label and ink dot drop out, the stroke thickens.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: '#111214' }}>
        <svg width="32" height="32" viewBox="0 0 64 64">
          <path d="M20 20v16a12 12 0 0 0 24 0V20" fill="none" stroke="#F6F3EC" strokeWidth="8.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
