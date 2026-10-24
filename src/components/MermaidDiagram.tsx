import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { stripCodeFences } from '../lib/forge';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  // Render at natural size and let the container scroll; scaling to fit makes text unreadable on phones
  er: { useMaxWidth: false },
  themeVariables: {
    primaryColor: '#18181b', // zinc-900
    primaryTextColor: '#fafafa', // zinc-50
    primaryBorderColor: '#3f3f46', // zinc-700
    lineColor: '#71717a', // zinc-500
    secondaryColor: '#27272a', // zinc-800
    tertiaryColor: '#09090b', // zinc-950
  }
});

export default function MermaidDiagram({ chart, className }: { chart: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart) return;

    // Ignore results from a render that was superseded by a newer chart
    let cancelled = false;
    const id = `mermaid-chart-${Math.random().toString(36).substring(2, 9)}`;
    setError(null);

    const renderChart = async () => {
      try {
        const { svg } = await mermaid.render(id, stripCodeFences(chart));
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        console.error("Mermaid parsing error:", err);
        // mermaid leaves an error element in the body when rendering fails
        document.getElementById(`d${id}`)?.remove();
        if (cancelled) return;
        setError(err.message || 'Failed to render diagram. The AI might have generated invalid Mermaid syntax.');
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
        }
      }
    };

    renderChart();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (!chart) {
    return (
      <div className={cn("w-full h-full flex flex-col items-center justify-center text-zinc-500", className)}>
        <p>No diagram to display yet.</p>
        <p className="text-sm mt-2">Describe your idea on the left and click Forge.</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full overflow-auto flex p-4", className)}>
      {error && (
        <div className="text-red-400 border border-red-900/50 bg-red-950/20 p-4 rounded-md max-w-2xl m-auto font-mono text-sm flex flex-col items-start gap-3 break-words min-w-0">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5" />
            Diagram Generation Error
          </div>
          <p>{error}</p>
          <p className="text-zinc-400">The SQL Export tab may still contain usable DDL. Try forging again for a new diagram.</p>
        </div>
      )}
      {/* Always mounted so a later chart can render after an error */}
      <div ref={containerRef} className={cn("mermaid-container m-auto shrink-0", error && "hidden")} />
    </div>
  );
}
