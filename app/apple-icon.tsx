import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Full mark for home-screen icons; iOS rounds the corners itself.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#111214' }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M21 22v15a11 11 0 0 0 22 0V22" fill="none" stroke="#F6F3EC" strokeWidth="6" strokeLinecap="round" />
          <path d="M43 37v12" stroke="#F6F3EC" strokeWidth="6" strokeLinecap="round" />
          <circle cx="43" cy="56" r="3" fill="#E04A2F" />
        </svg>
      </div>
    ),
    size,
  );
}
