import { Button } from "@/components/ui/button";
import { Languages, Sparkles, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Hero Section with Background Image - Extends to top */}
      <div className="relative w-full">
        {/* Hero Image Background */}
        <div className="w-full h-[36rem] overflow-hidden">
          <img 
            src="/hero.png" 
            alt="Babellion - AI Translation" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Header - Overlaps hero image */}
        <header className="absolute top-4 left-0 right-0 z-10">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="flex items-center gap-3">
              <img src="/favicon.png" alt="Babellion" className="h-16 w-16 drop-shadow-lg" />
              <span className="text-xl font-semibold text-white drop-shadow-lg">Babellion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="[&_button]:text-white [&_button:hover]:bg-white/20 [&_button]:drop-shadow-lg">
                <ThemeToggle />
              </div>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
                variant="outline"
                className="bg-transparent hover:bg-white/20 border-white/50 text-white drop-shadow-lg"
              >
                Sign In
              </Button>
            </div>
          </div>
        </header>
        
        {/* Overlaid Content */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="text-center px-8">
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white drop-shadow-2xl">
              AI-Powered Translation
            </h1>
            
            <p className="mb-8 text-lg font-medium text-white drop-shadow-xl">
              Translate your content into 70+ languages using GPT-5, Claude, and leading AI models
            </p>
            
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
              className="text-base shadow-lg bg-white text-black hover:bg-gray-100"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Features */}
      <main className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-5xl">
          {/* Features - Minimal */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Languages className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Multiple Languages</h3>
              <p className="text-sm text-muted-foreground">
                Support for 70+ languages with native speaker quality
              </p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Leading AI Models</h3>
              <p className="text-sm text-muted-foreground">
                Choose from GPT-5, Claude 4.5 Sonnet, and more
              </p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Rich Text Support</h3>
              <p className="text-sm text-muted-foreground">
                Import from Google Docs with full formatting preserved
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="px-8 text-center text-sm text-muted-foreground">
          <p className="mb-2">&copy; 2025 Babellion. Professional AI Translation Platform.</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <span>·</span>
            <a href="/terms-and-conditions" className="hover:text-foreground transition-colors">
              Terms and Conditions
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
