import { useState } from 'react';
import { Database, KeyRound, Copy, Check, Terminal, LayoutPanelLeft, Play, EyeOff, Eye, Code2 } from 'lucide-react';
import MermaidDiagram from './components/MermaidDiagram';
import { cn } from './lib/utils';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'sql'>('visual');
  const [result, setResult] = useState<{mermaid: string, sql: string} | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleForge = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/forge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, apiKey }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate schema');
      }
      
      // Clean up LLM formatting just in case
      const cleanSql = data.sql?.replace(/```sql/g, '').replace(/```/g, '').trim() || '';
      
      setResult({
        mermaid: data.mermaid || '',
        sql: cleanSql,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while forging the schema.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.sql) {
      navigator.clipboard.writeText(result.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-zinc-400" />
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">SchemaForge</h1>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto relative">
          <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type={showApiKey ? 'text' : 'password'}
            placeholder="Gemini API Key (Optional)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pl-10 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all w-full sm:w-64 placeholder:text-zinc-600 text-zinc-300"
          />
          <button 
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Console Input */}
        <section className="w-full lg:w-[400px] xl:w-[450px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800/50 flex flex-col bg-zinc-950/50">
          <div className="p-6 flex flex-col h-full gap-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutPanelLeft className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Concept Console</h2>
            </div>
            
            <p className="text-sm text-zinc-500 leading-relaxed">
              Describe your application's data requirements in natural language. The AI will normalize and architect the perfect relational schema.
            </p>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A food delivery app with customers, delivery drivers, restaurants, menu items, and order tracking..."
              className="flex-1 min-h-[200px] w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all resize-none font-mono text-sm leading-relaxed"
            />
            
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <button
              onClick={handleForge}
              disabled={isLoading || !prompt.trim()}
              className="w-full bg-zinc-100 hover:bg-white text-zinc-900 disabled:bg-zinc-800 disabled:text-zinc-500 font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-900/20 border-t-zinc-900 rounded-full animate-spin" />
                  Forging Database...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Forge Database Schema
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Visualization Panel */}
        <section className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          {/* Tabs */}
          <div className="flex items-center px-4 pt-4 border-b border-zinc-800/50 gap-2">
            <button
              onClick={() => setActiveTab('visual')}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-all relative",
                activeTab === 'visual' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Visual ER Diagram
              </div>
              {activeTab === 'visual' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-100" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-all relative",
                activeTab === 'sql' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                SQL Export
              </div>
              {activeTab === 'sql' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-100" />
              )}
            </button>
            
            {activeTab === 'sql' && result?.sql && (
              <div className="ml-auto pb-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Code'}
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto relative">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 gap-4">
                <div className="w-8 h-8 border-2 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
                <p className="text-sm animate-pulse">Architecting schema design...</p>
              </div>
            ) : result ? (
              <>
                {activeTab === 'visual' && (
                  <MermaidDiagram chart={result.mermaid} className="animate-in fade-in duration-500" />
                )}
                {activeTab === 'sql' && (
                  <div className="p-6 h-full w-full overflow-auto animate-in fade-in duration-500">
                    <pre className="font-mono text-sm text-zinc-300 leading-relaxed">
                      <code>{result.sql}</code>
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-4 p-6 text-center">
                <Code2 className="w-12 h-12 text-zinc-800" />
                <p>Describe your app concept to generate an ER diagram and SQL definitions.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

