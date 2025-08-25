import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ui/theme-provider';
import { Moon, Sun } from 'lucide-react';

const Index = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Mermaideer
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          An open-source Mermaid diagram editor by <a href="https://lumiotech.in" className="underline">Lumiotech</a>.
        </p>
        <Button asChild size="lg" className="animate-in fade-in slide-in-from-bottom-2">
          <Link to="/editor">Get Started</Link>
        </Button>
      </div>
      <div className="mt-16 text-sm text-muted-foreground space-y-2">
        <p>
          © {new Date().getFullYear()} <a href="https://lumiotech.in" className="underline">Lumiotech</a>. Open-source under the MIT
          License.
        </p>
        <p className="space-x-4">
          <a href="https://lumiotech.in/privacy" className="underline">Privacy Policy</a>
          <a href="https://lumiotech.in/terms" className="underline">Terms of Service</a>
          <a href="https://lumiotech.in/license" className="underline">License</a>
        </p>
      </div>

    </div>
  );
};

export default Index;
