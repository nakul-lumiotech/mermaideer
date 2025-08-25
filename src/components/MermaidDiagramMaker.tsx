import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

import { Copy, Sparkles, Moon, Sun, Key, RefreshCw, AlertCircle, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTheme } from '@/components/ui/theme-provider';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Default Mermaid diagram with intelligent auto layout
const defaultDiagram = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
    
    classDef startNode fill:#e1f5fe,stroke:#0277bd,stroke-width:2px
    classDef processNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    classDef decisionNode fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef endNode fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px
    
    class A startNode
    class B decisionNode
    class C,D processNode
    class E endNode`;

interface ErrorState {
  hasError: boolean;
  message: string;
}

export const MermaidDiagramMaker: React.FC = () => {
  const [mermaidCode, setMermaidCode] = useState(defaultDiagram);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'gemini' | 'openrouter'>('openai');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });
  const [gridPattern, setGridPattern] = useState<'dots' | 'lines' | 'none'>('dots');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [showTips, setShowTips] = useState(() => !localStorage.getItem('seen_tips'));
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!showTips) {
      localStorage.setItem('seen_tips', '1');
    }
  }, [showTips]);

  // Clear error when code changes
  useEffect(() => {
    if (error.hasError) {
      setError({ hasError: false, message: '' });
    }
  }, [mermaidCode]);

  // Initialize Mermaid with intelligent auto layout
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: true,
        theme: theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          rankSpacing: 60,
          nodeSpacing: 50,
        },
        themeVariables: {
          primaryColor: theme === 'dark' ? '#1f2937' : '#f9fafb',
          primaryTextColor: '#1f2937',
          primaryBorderColor: theme === 'dark' ? '#374151' : '#d1d5db',
          lineColor: theme === 'dark' ? '#6b7280' : '#4b5563',
        }
      });
    } catch (err) {
      console.error('Mermaid initialization error:', err);
      setError({ hasError: true, message: 'Failed to initialize Mermaid' });
    }
  }, [theme]);

  // Load provider and API key from localStorage
  useEffect(() => {
    const storedProvider = (localStorage.getItem('api_provider') as 'openai' | 'anthropic' | 'gemini' | 'openrouter') || 'openai';
    setProvider(storedProvider);
    const storedKey = localStorage.getItem(`api_key_${storedProvider}`);
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  useEffect(() => {
    const storedKey = localStorage.getItem(`api_key_${provider}`);
    setApiKey(storedKey || '');
  }, [provider]);

  // Render Mermaid diagram with error handling
  useEffect(() => {
    const renderDiagram = async () => {
      if (diagramRef.current && mermaidCode.trim()) {
        try {
          setError({ hasError: false, message: '' });
          const element = diagramRef.current;
          element.innerHTML = '';
          element.removeAttribute('data-processed');
          
          // Generate unique ID for each render
          const diagramId = `mermaid-diagram-${Date.now()}`;
          const { svg } = await mermaid.render(diagramId, mermaidCode);
          element.innerHTML = svg;
          if (theme === 'dark') {
            element.querySelectorAll('text').forEach((t) => t.setAttribute('fill', '#1f2937'));
          }
          centerDiagram();
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Invalid Mermaid syntax';
          setError({ hasError: true, message: errorMessage });
          
          if (diagramRef.current) {
            diagramRef.current.innerHTML = `
              <div class="flex items-center justify-center h-full text-destructive">
                <div class="text-center">
                  <AlertCircle class="mx-auto mb-2 h-8 w-8" />
                  <p class="font-medium">Diagram Error</p>
                  <p class="text-sm text-muted-foreground mt-1">${errorMessage}</p>
                </div>
              </div>
            `;
          }
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeoutId);
  }, [mermaidCode, theme]);

  const saveApiKey = () => {
    try {
      if (apiKey.trim()) {
        localStorage.setItem(`api_key_${provider}`, apiKey.trim());
        localStorage.setItem('api_provider', provider);
        setShowApiKeyInput(false);
        toast({
          title: 'API Key Saved',
          description: `Your ${provider} API key has been saved locally.`,
        });
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save API key.",
        variant: "destructive"
      });
    }
  };

  const generateDiagramWithAI = async (promptOverride?: string) => {
    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      toast({
        title: 'API Key Required',
        description: `Please enter your ${provider} API key to use AI features.`,
        variant: 'destructive'
      });
      return;
    }
    const prompt = promptOverride ?? aiPrompt;
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe the diagram you want to create.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setError({ hasError: false, message: '' });

    const systemPrompt = `You are a helpful assistant that generates Mermaid.js diagram code. Follow these rules:
              1. Always respond with valid Mermaid syntax only, no explanations or markdown formatting
              2. Use intelligent auto layout with proper spacing and styling
              3. Add classDef styling for better visual appeal
              4. Use meaningful node names and clear connections
              5. Focus on creating clear, well-structured diagrams with good visual hierarchy`;

    try {
      let url = '';
      let headers: Record<string, string> = {};
      let body: any = {};
      let parseResponse = (data: any) => '';
      let useStream = false;

      switch (provider) {
        case 'anthropic':
          url = 'https://api.anthropic.com/v1/messages';
          headers = {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          };
          body = {
            model: 'claude-3-opus-20240229',
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
          };
          parseResponse = (data) => data.content?.[0]?.text?.trim() || '';
          break;
        case 'gemini':
          url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
          headers = { 'Content-Type': 'application/json' };
          body = { contents: [{ parts: [{ text: `\n` }] }] };
          parseResponse = (data) => data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          break;
        case 'openrouter':
          url = 'https://openrouter.ai/api/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          };
          body = {
            model: 'openrouter/auto',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1500,
            temperature: 0.7,
          };
          parseResponse = (data) => data.choices?.[0]?.message?.content?.trim() || '';
          break;
        default:
          url = 'https://api.openai.com/v1/chat/completions';
          headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          };
          body = {
            model: 'gpt-4',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
            max_tokens: 1500,
            temperature: 0.7,
            stream: true,
          };
          useStream = true;
          parseResponse = (data) => data.choices?.[0]?.message?.content?.trim() || '';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      if (useStream && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') break;
              try {
                const json = JSON.parse(dataStr);
                const text = json.choices?.[0]?.delta?.content || '';
                result += text;
                setMermaidCode(result);
              } catch {
                // ignore parse errors
              }
            }
          }
        }
      } else {
        const data = await response.json();
        const generatedCode = parseResponse(data);
        if (!generatedCode) {
          throw new Error('No diagram code generated');
        }
        setMermaidCode(generatedCode);
      }

      setAiPrompt('');
      setTimeout(centerDiagram, 300);

      toast({
        title: 'Diagram Generated',
        description: 'AI has generated a new Mermaid diagram for you!',
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError({ hasError: true, message: `AI Generation Failed: ${errorMessage}` });

      toast({
        title: 'Generation Failed',
        description: errorMessage.includes('API Error')
          ? 'Please check your API key and try again.'
          : errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const fixDiagramWithAI = () => {
    const fixPrompt = `Fix the following Mermaid diagram code and return only valid Mermaid syntax.\nError: ${error.message}\n\n${mermaidCode}`;
    generateDiagramWithAI(fixPrompt);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      toast({
        title: "Copied!",
        description: "Mermaid code copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const refreshDiagram = () => {
    if (diagramRef.current) {
      diagramRef.current.innerHTML = '';
      // Trigger re-render
      setMermaidCode(mermaidCode + ' ');
      setTimeout(() => setMermaidCode(mermaidCode), 100);
    }
  };

  const downloadDiagram = async (format: 'png' | 'svg' | 'pdf') => {
    if (!diagramRef.current || !diagramContainerRef.current) {
      toast({
        title: "Download Failed",
        description: "No diagram available to download.",
        variant: "destructive"
      });
      return;
    }

    const target = diagramContainerRef.current;
    const prevTransform = diagramRef.current.style.transform;
    diagramRef.current.style.transform = 'translate(0px, 0px)';

    try {
      if (format === 'svg') {
        const svgElement = diagramRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'mermaid-diagram.svg';
          a.click();
          URL.revokeObjectURL(url);
        }
      } else if (format === 'png') {
        const canvas = await html2canvas(target, {
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 4
        });
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mermaid-diagram.png';
        a.click();
      } else if (format === 'pdf') {
        const canvas = await html2canvas(target, {
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 4
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF();
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save('mermaid-diagram.pdf');
      }

      toast({
        title: "Downloaded!",
        description: `Diagram saved as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the diagram.",
        variant: "destructive"
      });
    } finally {
      diagramRef.current.style.transform = prevTransform;
    }
  };

  const getGridStyle = (): React.CSSProperties => {
    const color = theme === 'dark' ? '#374151' : '#e5e7eb';
    if (gridPattern === 'lines') {
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '20px 20px'
      };
    }
    if (gridPattern === 'dots') {
      return {
        backgroundImage: `radial-gradient(${color} 1px, transparent 1px)`,
        backgroundSize: '20px 20px'
      };
    }
    return {};
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startPos.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    if (diagramContainerRef.current) {
      diagramContainerRef.current.style.cursor = 'grabbing';
    }
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!startPos.current) return;
    setOffset({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
  };

  const handleMouseUp = () => {
    startPos.current = null;
    if (diagramContainerRef.current) {
      diagramContainerRef.current.style.cursor = 'grab';
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const centerDiagram = () => {
    const container = diagramContainerRef.current;
    const svg = diagramRef.current?.querySelector('svg');
    if (container && svg) {
      const rect = svg.getBoundingClientRect();
      const contRect = container.getBoundingClientRect();
      setOffset({
        x: (contRect.width - rect.width * scale) / 2,
        y: (contRect.height - rect.height * scale) / 2,
      });
    }
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.1, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.1, 0.2));
  const resetView = () => {
    setScale(1);
    setTimeout(centerDiagram, 0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => {
        const next = Math.min(Math.max(s + delta, 0.2), 3);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="w-full px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mermaideer
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hover:bg-muted"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowApiKeyInput(true)}
                className={`hover:bg-muted ${!apiKey ? "text-destructive" : ""}`}
              >
                <Key className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* API Key Input Modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6 bg-card border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">API Configuration</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowApiKeyInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider">Provider</Label>
                <Select value={provider} onValueChange={(val) => setProvider(val as any)}>
                  <SelectTrigger id="provider" className="mt-1">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Your API key is stored locally and never sent to our servers.
              </p>
              <div className="flex gap-2">
                <Button onClick={saveApiKey} className="flex-1">Save</Button>
                <Button variant="outline" onClick={() => setShowApiKeyInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Code Editor */}
          <div className="space-y-4">
            <Card className="p-4 bg-card border shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-lg font-semibold">Mermaid Code</h3>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <Input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe diagram..."
                    className="max-w-xs"
                  />
                  <Tooltip open={showTips} onOpenChange={(o) => !o && setShowTips(false)}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateDiagramWithAI}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        {isGenerating ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (

                          <Sparkles className="h-4 w-4" />
                        )}
                        AI
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Generate diagram with AI</TooltipContent>
                  </Tooltip>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden bg-background">
                <Editor
                  height="70vh"
                  defaultLanguage="mermaid"
                  value={mermaidCode}
                  onChange={(value) => setMermaidCode(value || '')}
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    automaticLayout: true,
                    scrollBeyondLastLine: false,
                    folding: true,
                    bracketMatching: 'always',
                    renderWhitespace: 'boundary',
                  }}
                />
              </div>
            </Card>
          </div>

          {/* Right Panel - Preview and Export */}
          <div className="space-y-4">
            <Card className="p-4 bg-card border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                <div className="flex items-center gap-2">
                  <Select value={gridPattern} onValueChange={(v) => setGridPattern(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Grid" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dots">Dots</SelectItem>
                      <SelectItem value="lines">Lines</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={zoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={zoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetView}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={refreshDiagram}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Select onValueChange={(value) => downloadDiagram(value as 'png' | 'svg' | 'pdf')}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Export" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="svg">SVG</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div
                ref={diagramContainerRef}
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}

                className="border rounded-lg p-4 bg-background min-h-[70vh] overflow-hidden cursor-grab"
                style={getGridStyle()}
              >
                <div
                  ref={diagramRef}
                  className="inline-block select-none"
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
                />
              </div>
              {error.hasError && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error.message}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={fixDiagramWithAI} className="gap-1">
                      <Sparkles className="h-4 w-4" />
                      Fix
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};