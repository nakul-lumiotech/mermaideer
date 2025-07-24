import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download, Send, Code, Bot, Moon, Sun, Key } from 'lucide-react';
import { useTheme } from 'next-themes';
import Editor from '@monaco-editor/react';
import mermaid from 'mermaid';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Default Mermaid diagram
const defaultDiagram = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const MermaidDiagramMaker: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'code' | 'ai'>('code');
  const [mermaidCode, setMermaidCode] = useState(defaultDiagram);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    });
  }, [theme]);

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('openai_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Render Mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (diagramRef.current && mermaidCode.trim()) {
        try {
          const element = diagramRef.current;
          element.innerHTML = '';
          element.removeAttribute('data-processed');
          
          const { svg } = await mermaid.render('mermaid-diagram', mermaidCode);
          element.innerHTML = svg;
        } catch (error) {
          console.error('Mermaid rendering error:', error);
          if (diagramRef.current) {
            diagramRef.current.innerHTML = `<div class="text-destructive p-4 text-center">Invalid Mermaid syntax</div>`;
          }
        }
      }
    };

    const timeoutId = setTimeout(renderDiagram, 500);
    return () => clearTimeout(timeoutId);
  }, [mermaidCode, theme]);

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setShowApiKeyInput(false);
      toast({
        title: "API Key Saved",
        description: "Your OpenAI API key has been saved locally.",
      });
    }
  };

  const generateDiagram = async () => {
    if (!apiKey.trim()) {
      setShowApiKeyInput(true);
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to use AI features.",
        variant: "destructive"
      });
      return;
    }

    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsGenerating(true);

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
              content: 'You are a helpful assistant that generates Mermaid.js diagram code based on user descriptions. Always respond with valid Mermaid syntax only, no explanations or markdown formatting. Focus on creating clear, well-structured diagrams.'
            },
            ...chatMessages,
            userMessage
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const generatedCode = data.choices[0]?.message?.content?.trim() || '';
      
      const assistantMessage: ChatMessage = { role: 'assistant', content: generatedCode };
      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Update the Mermaid code
      setMermaidCode(generatedCode);
      
      toast({
        title: "Diagram Generated",
        description: "AI has generated a new Mermaid diagram for you!",
      });
    } catch (error) {
      console.error('Error generating diagram:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate diagram. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode);
    toast({
      title: "Copied!",
      description: "Mermaid code copied to clipboard.",
    });
  };

  const downloadDiagram = async (format: 'png' | 'svg' | 'pdf') => {
    if (!diagramRef.current) return;

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
        const canvas = await html2canvas(diagramRef.current);
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mermaid-diagram.png';
        a.click();
      } else if (format === 'pdf') {
        const canvas = await html2canvas(diagramRef.current);
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
    <div className="min-h-screen bg-gradient-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Mermaid Diagram Maker
            </h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {activeMode === 'ai' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowApiKeyInput(true)}
                  className={!apiKey ? "text-destructive" : ""}
                >
                  <Key className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* API Key Input Modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">OpenAI API Key</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
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
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as 'code' | 'ai')}>
          <div className="flex justify-center mb-6">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="code" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Code Mode
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                AI Mode
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Editor or Chat */}
            <div className="space-y-4">
              <TabsContent value="code" className="mt-0">
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Mermaid Code</h3>
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <Editor
                      height="400px"
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
                      }}
                    />
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">AI Diagram Generator</h3>
                  
                  {/* Chat Messages */}
                  <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-chat-user text-chat-user-foreground ml-8'
                            : 'bg-chat-assistant text-chat-assistant-foreground mr-8'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Describe the diagram you want to create..."
                      className="flex-1 resize-none"
                      rows={2}
                    />
                    <Button
                      onClick={generateDiagram}
                      disabled={isGenerating || !chatInput.trim()}
                      size="icon"
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </div>

            {/* Right Panel - Preview and Export */}
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Preview</h3>
                  <div className="flex items-center gap-2">
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
                <div className="border rounded-lg p-4 bg-card min-h-[400px] flex items-center justify-center">
                  <div ref={diagramRef} className="w-full" />
                </div>
              </Card>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
};