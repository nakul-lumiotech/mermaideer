import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Bot, Moon, Sun, Key, RefreshCw, AlertCircle, X } from 'lucide-react';
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
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);
  const [error, setError] = useState<ErrorState>({ hasError: false, message: '' });
  const diagramRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

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
          primaryTextColor: theme === 'dark' ? '#f9fafb' : '#1f2937',
          primaryBorderColor: theme === 'dark' ? '#374151' : '#d1d5db',
          lineColor: theme === 'dark' ? '#6b7280' : '#4b5563',
        }
      });
    } catch (err) {
      console.error('Mermaid initialization error:', err);
      setError({ hasError: true, message: 'Failed to initialize Mermaid' });
    }
  }, [theme]);

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

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
        localStorage.setItem('openai_api_key', apiKey.trim());
        setShowApiKeyInput(false);
        toast({
          title: "API Key Saved",
          description: "Your OpenAI API key has been saved locally.",
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

  const generateDiagramWithAI = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use AI features.",
        variant: "destructive"
      });
      return;
    }

    if (!aiPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please describe the diagram you want to create.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setError({ hasError: false, message: '' });

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that generates Mermaid.js diagram code. Follow these rules:
              1. Always respond with valid Mermaid syntax only, no explanations or markdown formatting
              2. Use intelligent auto layout with proper spacing and styling
              3. Add classDef styling for better visual appeal
              4. Use meaningful node names and clear connections
              5. Focus on creating clear, well-structured diagrams with good visual hierarchy`
            },
            {
              role: 'user',
              content: aiPrompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const generatedCode = data.choices[0]?.message?.content?.trim() || '';
      
      if (!generatedCode) {
        throw new Error('No diagram code generated');
      }

      // Update the Mermaid code in the editor
      setMermaidCode(generatedCode);
      setShowAiInput(false);
      setAiPrompt('');
      
      toast({
        title: "Diagram Generated",
        description: "AI has generated a new Mermaid diagram for you!",
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError({ hasError: true, message: `AI Generation Failed: ${errorMessage}` });
      
      toast({
        title: "Generation Failed",
        description: errorMessage.includes('API Error') 
          ? "Please check your API key and try again."
          : errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
    if (!diagramRef.current) {
      toast({
        title: "Download Failed",
        description: "No diagram available to download.",
        variant: "destructive"
      });
      return;
    }

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
        const canvas = await html2canvas(diagramRef.current, {
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 2
        });
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mermaid-diagram.png';
        a.click();
      } else if (format === 'pdf') {
        const canvas = await html2canvas(diagramRef.current, {
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          scale: 2
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mermaid Diagram Maker
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
              <h3 className="text-lg font-semibold">OpenAI API Key</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowApiKeyInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
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

      {/* AI Input Modal */}
      {showAiInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6 bg-card border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Generate with AI</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAiInput(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ai-prompt">Describe your diagram</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Create a flowchart for user authentication process..."
                  className="mt-1 min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={generateDiagramWithAI} 
                  className="flex-1" 
                  disabled={isGenerating || !aiPrompt.trim()}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowAiInput(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Code Editor */}
          <div className="space-y-4">
            <Card className="p-4 bg-card border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Mermaid Code</h3>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAiInput(true)}
                    disabled={isGenerating}
                    className="gap-2"
                  >
                    <Bot className="h-4 w-4" />
                    AI Generate
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {error.hasError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error.message}</span>
                  </div>
                </div>
              )}
              
              <div className="border rounded-lg overflow-hidden bg-background">
                <Editor
                  height="500px"
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
              <div className="border rounded-lg p-4 bg-background min-h-[500px] flex items-center justify-center overflow-auto">
                <div ref={diagramRef} className="w-full text-center" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};