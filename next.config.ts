import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'production' ? '' : "'unsafe-eval'"} https://checkout.razorpay.com https://*.razorpay.com https://vercel.live;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      media-src 'self' blob: https://*.public.blob.vercel-storage.com;
      connect-src 'self' https://*.razorpay.com https://*.sentry.io https://vitals.vercel-insights.com https://vercel.com/api/blob/;
      frame-src https://*.razorpay.com https://www.youtube.com https://www.youtube-nocookie.com;
      worker-src 'self';
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

// "Run this code" on Python blocks (components/public/RunPythonButton.tsx)
// runs Pyodide inside public/workers/pyodide-worker.js. A same-origin worker
// is governed by the CSP sent with the worker script's own response, not the
// page's, so the worker gets its own policy below and the page policy above
// only gains `worker-src 'self'` (which is what script-src already allowed
// for workers by fallback; it just stops workers loading from anywhere else).
// Keep the version in sync with PYODIDE_VERSION in the worker.
const PYODIDE_CDN = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const pyodideWorkerCsp = [
  // Nothing is allowed unless listed below.
  "default-src 'none'",
  // importScripts() of pyodide.js and pyodide.asm.js from the pinned folder.
  // 'wasm-unsafe-eval' lets the worker compile WebAssembly (Python itself and
  // packages like numpy) without allowing JavaScript eval().
  `script-src ${PYODIDE_CDN} 'wasm-unsafe-eval'`,
  // fetch() of pyodide.asm.wasm, python_stdlib.zip, pyodide-lock.json and
  // package wheels, all from the same pinned folder. This also means Python
  // run here cannot send data anywhere else.
  `connect-src ${PYODIDE_CDN}`,
].join('; ');

const nextConfig: NextConfig = {
  // Enable React strict mode for development
  reactStrictMode: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'public-files.gumroad.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  
  // Compression
  compress: true,
  
  // Production source maps (disable for smaller bundles, but loses debugging)
  productionBrowserSourceMaps: false,
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Experimental features
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  
  // Headers (security)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Must come after '/:path*': for the same header key, the later entry wins.
        source: '/workers/pyodide-worker.js',
        headers: [{ key: 'Content-Security-Policy', value: pyodideWorkerCsp }],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      { source: '/portfolio', destination: '/about', permanent: true },
      { source: '/portfolio/:slug', destination: '/projects/:slug', permanent: true },
    ];
  },
};

export default nextConfig;
