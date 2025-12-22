import { Button } from "@/components/ui/button";
import { Languages, FileCheck, ImageIcon, Pencil, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Hero Section with Background Image */}
      <div className="relative flex-[0_0_45%] min-h-0">
        {/* Hero Image Background */}
        <div className="w-full h-full overflow-hidden">
          <img 
            src="/hero.png" 
            alt="Babellion - AI-Powered Content Tools" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Header - Overlaps hero image */}
        <header className="absolute top-2 sm:top-4 left-0 right-0 z-10">
          <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <img src="/favicon.png" alt="Babellion" className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-lg rounded-full" />
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
          <div className="text-center px-4 sm:px-8 max-w-3xl">
            <h1 className="mb-2 sm:mb-3 text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-2xl">
              AI-Powered Content Suite
            </h1>
            
            <p className="mb-4 sm:mb-6 text-sm sm:text-lg font-medium text-white drop-shadow-xl max-w-2xl mx-auto">
              Translate, proofread, and edit content with leading AI models. Transform text and images in 70+ languages.
            </p>
            
            <Button
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
              className="text-sm sm:text-base shadow-lg bg-white text-black hover:bg-gray-100 h-10 sm:h-12 px-5 sm:px-8 min-h-[44px] group"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Features */}
      <main className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-8 py-6 sm:py-8">
        <div className="w-full max-w-5xl mx-auto">
          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {/* Translate */}
            <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-zinc-800">
              <div className="mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-md">
                <Languages className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mb-1.5 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Translate</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                70+ languages with GPT, Claude, and Gemini. Import from Google Docs and PDF.
              </p>
            </div>

            {/* Proofread */}
            <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-zinc-800">
              <div className="mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md">
                <FileCheck className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mb-1.5 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Proofread</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                AI-powered suggestions. Review individually or accept all with one click.
              </p>
            </div>

            {/* Image Translation */}
            <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-zinc-800">
              <div className="mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md">
                <ImageIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mb-1.5 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Image Translation</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Translate text in images. Layout detection preserves your design.
              </p>
            </div>

            {/* Image Edit */}
            <div className="group bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-zinc-800">
              <div className="mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 text-white shadow-md">
                <Pencil className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mb-1.5 text-sm sm:text-base font-semibold text-gray-900 dark:text-white">Image Edit</h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Draw annotations and let AI transform your images as you describe.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-2 sm:py-3 flex-shrink-0">
        <div className="px-4 sm:px-8 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span>&copy; 2025 Babellion</span>
            <span className="hidden sm:inline">·</span>
            <a href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <span>·</span>
            <a href="/terms-and-conditions" className="hover:text-foreground transition-colors">
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
