'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

interface SandboxedHtmlProps {
  html: string;
  title: string;
}

export default function SandboxedHtml({ html, title }: SandboxedHtmlProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(420);

  const source = useMemo(() => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline'; font-src https: data:; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'" />
    <base target="_blank" />
    <style>
      :root { color-scheme: light; font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif; color: #211d26; background: transparent; }
      body { margin: 0; font-size: 17px; line-height: 1.75; overflow-wrap: anywhere; }
      img, video { display: block; max-width: 100%; height: auto; border-radius: 14px; }
      a { color: #6d28d9; text-underline-offset: 3px; }
      h1, h2, h3 { line-height: 1.2; letter-spacing: -0.025em; margin: 1.8em 0 .65em; }
      p, ul, ol, blockquote { margin: 0 0 1.15em; }
      blockquote { border-left: 3px solid #8b5cf6; margin-left: 0; padding-left: 1em; color: #625b68; }
      pre { overflow-x: auto; border-radius: 14px; background: #17131a; color: #f7f3f8; padding: 1rem; }
    </style>
  </head>
  <body>${html}</body>
</html>`, [html]);

  const resize = () => {
    const documentElement = frameRef.current?.contentDocument?.documentElement;
    if (!documentElement) return;
    setHeight(Math.max(420, Math.min(documentElement.scrollHeight + 8, 20_000)));
  };

  const handleLoad = () => {
    observerRef.current?.disconnect();
    resize();
    const documentElement = frameRef.current?.contentDocument?.documentElement;
    if (!documentElement || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(resize);
    observer.observe(documentElement);
    observerRef.current = observer;
  };

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={source}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      onLoad={handleLoad}
      className="w-full border-0 bg-transparent"
      style={{ height }}
    />
  );
}
