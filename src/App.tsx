import { useRef, useState, type KeyboardEvent } from 'react';
import { Database, KeyRound, Copy, Check, Terminal, LayoutPanelLeft, Play, EyeOff, Eye, Code2, Download } from 'lucide-react';
import MermaidDiagram from './components/MermaidDiagram';
import { cn } from './lib/utils';
import { DIALECTS, MAX_PROMPT_LENGTH, sqlFileName, type Dialect, type ForgeResult } from './lib/forge';

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'sql'>('visual');
  const [dialect, setDialect] = useState<Dialect>('PostgreSQL');
  const [result, setResult] = useState<(ForgeResult & { dialect: Dialect }) | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [error, setError] = useState('');
  const resultsRef = useRef<HTMLElement>(null);

  const handleForge = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setError('');
    // On stacked (mobile) layouts the results panel is below the fold
    if (window.matchMedia('(max-width: 1023px)').matches) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    try {
      const response = await fetch('/api/forge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, apiKey, dialect }),
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate schema');
      }
      
      setResult({
        mermaid: data.mermaid || '',
        sql: data.sql || '',
        dialect,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred while forging the schema.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleForge();
    }
  };

  const copyToClipboard = async () => {
    if (!result?.sql) return;
    try {
      await navigator.clipboard.writeText(result.sql);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const downloadSql = () => {
    if (!result?.sql) return;
    const url = URL.createObjectURL(new Blob([result.sql], { type: 'application/sql' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = sqlFileName(result.dialect);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-dvh lg:h-dvh bg-zinc-950 text-zinc-50 flex flex-col font-sans selection:bg-zinc-800">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm shrink-0 gap-4">
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
            className="pl-10 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all w-full sm:w-64 placeholder:text-zinc-600 text-zinc-300"
          />
          <button 
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row lg:min-h-0 lg:overflow-hidden">
        {/* Left Console Input */}
        <section className="w-full lg:w-[400px] xl:w-[450px] shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-800/50 flex flex-col bg-zinc-950/50 lg:overflow-y-auto">
          <div className="p-4 sm:p-6 flex flex-col h-full gap-4">
            <div className="flex items-center gap-2 sm:mb-2">
              <LayoutPanelLeft className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-wider">Concept Console</h2>
            </div>
            
            <p className="text-sm text-zinc-500 leading-relaxed">
              Describe your application's data requirements in natural language. The AI will normalize and architect the perfect relational schema.
            </p>
            
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              maxLength={MAX_PROMPT_LENGTH}
              placeholder="e.g. A food delivery app with customers, delivery drivers, restaurants, menu items, and order tracking..."
              className="lg:flex-1 min-h-[160px] sm:min-h-[200px] w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-700 transition-all resize-y lg:resize-none font-mono text-base sm:text-sm leading-relaxed"
            />
            
            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
              <label className="flex items-center gap-2">
                SQL dialect
                <select
                  value={dialect}
                  onChange={(e) => setDialect(e.target.value as Dialect)}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1.5 text-base sm:text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                >
                  {DIALECTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <span>{prompt.length}/{MAX_PROMPT_LENGTH}</span>
            </div>
            
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-red-400 text-sm break-words">
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
                  <kbd className="hidden lg:inline ml-1 text-[10px] font-mono text-zinc-500">⌘/Ctrl+Enter</kbd>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Visualization Panel */}
        <section ref={resultsRef} className="flex-1 flex flex-col min-h-[70dvh] lg:min-h-0 overflow-hidden bg-zinc-950 scroll-mt-2">
          {/* Tabs */}
          <div className="flex items-center px-2 sm:px-4 pt-2 sm:pt-4 border-b border-zinc-800/50 gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('visual')}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap",
                activeTab === 'visual' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="sm:hidden">Diagram</span>
                <span className="hidden sm:inline">Visual ER Diagram</span>
              </div>
              {activeTab === 'visual' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-100" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={cn(
                "px-3 sm:px-4 py-2.5 text-sm font-medium transition-all relative whitespace-nowrap",
                activeTab === 'sql' ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span className="sm:hidden">SQL</span>
                <span className="hidden sm:inline">SQL Export</span>
              </div>
              {activeTab === 'sql' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-zinc-100" />
              )}
            </button>
            
            {activeTab === 'sql' && result?.sql && (
              <div className="ml-auto pb-2 flex items-center gap-1 sm:gap-2">
                <button
                  onClick={downloadSql}
                  aria-label="Download SQL file"
                  className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download .sql</span>
                </button>
                <button
                  onClick={copyToClipboard}
                  aria-label="Copy SQL"
                  className="flex items-center gap-2 p-2 sm:px-3 sm:py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-md transition-all"
                >
                  {copyState === 'copied' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className={cn(copyState === 'idle' && 'hidden sm:inline')}>
                    {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy Code'}
                  </span>
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
                  <MermaidDiagram chart={result.mermaid} className="animate-fade-in" />
                )}
                {activeTab === 'sql' && (
                  <div className="p-4 sm:p-6 h-full w-full overflow-auto animate-fade-in">
                    <pre className="font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed">
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

