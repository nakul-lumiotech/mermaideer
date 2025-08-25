import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-background via-background to-muted/20">
      <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Mermaid Diagram Maker
      </h1>
      <p className="text-lg text-muted-foreground max-w-2xl mb-8">
        Create beautiful diagrams in seconds with our intuitive editor and AI assistance.
      </p>
      <Button asChild size="lg">
        <Link to="/editor">Get Started</Link>
      </Button>
    </div>
  );
};

export default Index;
