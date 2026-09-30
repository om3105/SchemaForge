import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'dark',
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
    if (chart && containerRef.current) {
      const id = `mermaid-chart-${Math.random().toString(36).substring(2, 9)}`;
      setError(null);
      
      const renderChart = async () => {
        try {
          // Clean the chart code just in case LLM added markdown formatting
          const cleanChart = chart.replace(/```mermaid/g, '').replace(/```/g, '').trim();
          const { svg } = await mermaid.render(id, cleanChart);
          if (containerRef.current) {
             containerRef.current.innerHTML = svg;
          }
        } catch (err: any) {
          console.error("Mermaid parsing error:", err);
          setError(err.message || 'Failed to render diagram. The AI might have generated invalid Mermaid syntax.');
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
        }
      };
      
      renderChart();
    }
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
    <div className={cn("w-full h-full overflow-auto flex items-center justify-center p-4", className)}>
      {error ? (
        <div className="text-red-400 border border-red-900/50 bg-red-950/20 p-4 rounded-md max-w-2xl font-mono text-sm flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5" />
            Diagram Generation Error
          </div>
          <p>{error}</p>
        </div>
      ) : (
        <div ref={containerRef} className="mermaid-container w-full flex justify-center" />
      )}
    </div>
  );
}
