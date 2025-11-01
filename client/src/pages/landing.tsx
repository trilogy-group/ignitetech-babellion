import { Button } from "@/components/ui/button";
import { Languages, Sparkles, FileText } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="Babellion" className="h-8 w-8" />
            <span className="text-xl font-semibold">Babellion</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content - Centered */}
      <main className="flex flex-1 items-center justify-center px-8">
        <div className="w-full max-w-5xl">
          <div className="mb-12 text-center">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <img src="/favicon.png" alt="Babellion" className="h-24 w-24" />
            </div>

            {/* Title */}
            <h1 className="mb-4 text-5xl font-bold tracking-tight">
              AI-Powered Translation
            </h1>
            
            <p className="mb-8 text-lg text-muted-foreground">
              Translate your content into 70+ languages using GPT-5, Claude, and leading AI models
            </p>
            
            {/* CTA */}
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
              className="text-base"
            >
              Get Started
            </Button>
          </div>

          {/* Features - Minimal */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Languages className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Multiple Languages</h3>
              <p className="text-sm text-muted-foreground">
                Support for 70+ languages with native speaker quality
              </p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold">Leading AI Models</h3>
              <p className="text-sm text-muted-foreground">
                Choose from GPT-5, Claude 4.5 Sonnet, and more
              </p>
            </div>

            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
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
