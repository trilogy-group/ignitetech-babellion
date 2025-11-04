import { Button } from "@/components/ui/button";
import { Languages, Sparkles, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Hero Section with Background Image - Extends to top */}
      <div className="relative w-full">
        {/* Hero Image Background */}
        <div className="w-full h-[24rem] sm:h-[36rem] overflow-hidden">
          <img 
            src="/hero.png" 
            alt="Babellion - AI Translation" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Header - Overlaps hero image */}
        <header className="absolute top-2 sm:top-4 left-0 right-0 z-10">
          <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/favicon.png" alt="Babellion" className="h-10 w-10 sm:h-16 sm:w-16 drop-shadow-lg" />
              <span className="text-lg sm:text-xl font-semibold text-white drop-shadow-lg">Babellion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="[&_button]:text-white [&_button:hover]:bg-white/20 [&_button]:drop-shadow-lg">
                <ThemeToggle />
              </div>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-login"
                variant="outline"
                size="sm"
                className="bg-transparent hover:bg-white/20 border-white/50 text-white drop-shadow-lg h-9 sm:h-10 px-3 sm:px-4 text-sm"
              >
                Sign In
              </Button>
            </div>
          </div>
        </header>
        
        {/* Overlaid Content */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="text-center px-4 sm:px-8 max-w-2xl">
            <h1 className="mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-2xl">
              AI-Powered Translation
            </h1>
            
            <p className="mb-6 sm:mb-8 text-base sm:text-lg font-medium text-white drop-shadow-xl">
              Translate your content into 70+ languages using GPT-5, Claude, and leading AI models
            </p>
            
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
              className="text-sm sm:text-base shadow-lg bg-white text-black hover:bg-gray-100 h-11 sm:h-12 px-6 sm:px-8 min-h-[44px]"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Features */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 py-8 sm:py-16">
        <div className="w-full max-w-5xl">
          {/* Features - Minimal */}
          <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Languages className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 text-base sm:text-lg font-semibold">Multiple Languages</h3>
              <p className="text-xs sm:text-sm text-muted-foreground px-2">
                Support for 70+ languages with native speaker quality
              </p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 text-base sm:text-lg font-semibold">Leading AI Models</h3>
              <p className="text-xs sm:text-sm text-muted-foreground px-2">
                Choose from GPT-5, Claude 4.5 Sonnet, and more
              </p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
              <h3 className="mb-2 text-base sm:text-lg font-semibold">Rich Text Support</h3>
              <p className="text-xs sm:text-sm text-muted-foreground px-2">
                Import from Google Docs with full formatting preserved
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 sm:py-6">
        <div className="px-4 sm:px-8 text-center text-xs sm:text-sm text-muted-foreground">
          <p className="mb-2">&copy; 2025 Babellion. Professional AI Translation Platform.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <a href="/privacy" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">
              Privacy Policy
            </a>
            <span className="hidden sm:inline">·</span>
            <a href="/terms-and-conditions" className="hover:text-foreground transition-colors min-h-[44px] flex items-center">
              Terms and Conditions
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
