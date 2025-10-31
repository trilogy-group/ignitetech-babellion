import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Sparkles, Zap, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">TranslatePro</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container px-4 sm:px-6 lg:px-8">
        <section className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 flex items-center gap-2 rounded-full bg-accent px-4 py-2">
            <Sparkles className="h-4 w-4 text-accent-foreground" />
            <span className="text-sm font-medium text-accent-foreground">AI-Powered Translation Platform</span>
          </div>
          
          <h1 className="mb-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Translate Your Content with
            <span className="text-primary"> Advanced AI</span>
          </h1>
          
          <p className="mb-8 max-w-2xl text-lg text-muted-foreground">
            Professional translation platform supporting multiple AI models and languages. 
            Perfect for marketing content, documentation, and more.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
            >
              Get Started
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="hover-elevate">
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Multiple AI Models</h3>
                <p className="text-sm text-muted-foreground">
                  Choose from GPT-5, Claude 4.5 Sonnet, and more. Get the best translations from leading AI providers.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">70+ Languages</h3>
                <p className="text-sm text-muted-foreground">
                  Translate to major world languages with native speaker quality. Customizable language library.
                </p>
              </CardContent>
            </Card>

            <Card className="hover-elevate">
              <CardContent className="flex flex-col items-start gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Secure & Private</h3>
                <p className="text-sm text-muted-foreground">
                  Your API keys and translations are encrypted and stored securely. Complete data privacy.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground">Simple and powerful translation workflow</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold">Enter Your Text</h3>
              <p className="text-sm text-muted-foreground">
                Paste your marketing content, documentation, or any text you want to translate.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold">Select Languages & Model</h3>
              <p className="text-sm text-muted-foreground">
                Choose target languages and your preferred AI model for optimal results.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold">Get Translations</h3>
              <p className="text-sm text-muted-foreground">
                Receive high-quality translations instantly. Edit and refine as needed.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <Card className="overflow-hidden border-none bg-gradient-to-r from-primary/10 via-primary/5 to-background">
            <CardContent className="flex flex-col items-center gap-6 p-12 text-center">
              <h2 className="text-3xl font-bold">Ready to get started?</h2>
              <p className="max-w-xl text-muted-foreground">
                Join thousands of businesses using TranslatePro for their translation needs.
              </p>
              <Button
                size="lg"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-cta-login"
              >
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container px-4 text-center text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>&copy; 2025 TranslatePro. Professional AI Translation Platform.</p>
        </div>
      </footer>
    </div>
  );
}
