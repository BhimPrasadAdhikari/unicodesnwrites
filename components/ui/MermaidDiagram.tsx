'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
}

export default function MermaidDiagram({ code }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    mermaid.initialize({ 
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      suppressErrorRendering: true,
    });

    const renderDiagram = async () => {
      try {
        const cleanCode = code.trim();
        if (!cleanCode) return;

        // Use a unique ID for the rendering process
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, cleanCode);
        setSvg(svg);
        setError(false);
      } catch (err) {
        console.error('Mermaid rendering failed:', err);
        setError(true);
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded bg-destructive/10 text-destructive text-sm font-mono overflow-auto">
        Failed to render diagram.
        <pre className="mt-2 text-xs">{code}</pre>
      </div>
    );
  }

  return (
    <div 
        ref={ref}
        className="mermaid-diagram my-4 flex justify-center bg-white/5 p-4 rounded-lg overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
