import { useState } from 'react';
import { HelpCircle, Lightbulb, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getHelpContent, type FeatureId, type FeatureHelp } from '@/lib/help-content';

interface HelpPanelProps {
  featureId: FeatureId;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Illustration component with fallback for missing images
 */
function HelpIllustration({ 
  src, 
  alt, 
  className = '' 
}: { 
  src: string; 
  alt: string; 
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div 
        className={`bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl flex items-center justify-center ${className}`}
      >
        <div className="text-center p-4">
          <HelpCircle className="h-12 w-12 mx-auto text-purple-400 dark:text-purple-500 mb-2" />
          <p className="text-xs text-muted-foreground">Illustration coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-xl object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

/**
 * Help Panel - Slide-out panel with contextual help content
 * Supports both uncontrolled (internal state) and controlled (external state) modes
 */
export function HelpPanel({ featureId, trigger, open, onOpenChange }: HelpPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const content = getHelpContent(featureId);
  
  // Use controlled mode if open prop is provided
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            {content.title} Help
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Hero Section */}
            <div className="space-y-4">
              <HelpIllustration
                src={content.heroIllustration}
                alt={`${content.title} illustration`}
                className="w-full aspect-square max-w-[280px] mx-auto"
              />
              <div className="text-center">
                <Badge variant="secondary" className="mb-2">
                  {content.tagline}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {content.overview}
                </p>
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs text-purple-600 dark:text-purple-400">✓</span>
                What you can do
              </h3>
              <ul className="space-y-2">
                {content.capabilities.map((capability, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-purple-500 flex-shrink-0" />
                    {capability}
                  </li>
                ))}
              </ul>
            </div>

            {/* Workflow Steps */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">How it works</h3>
              <Accordion type="single" collapsible className="w-full">
                {content.workflow.map((step, index) => (
                  <AccordionItem key={index} value={`step-${index}`}>
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-medium text-purple-700 dark:text-purple-300 flex-shrink-0">
                          {index + 1}
                        </span>
                        {step.title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="pl-9">
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Tips */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Pro Tips
              </h3>
              <div className="space-y-2">
                {content.tips.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30"
                  >
                    <span className="text-amber-600 dark:text-amber-400 text-sm">💡</span>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      {tip.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Features */}
            {content.relatedFeatures.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Related Features</h3>
                <div className="space-y-2">
                  {content.relatedFeatures.map((related) => (
                    <Link key={related.id} href={`/${related.id}`}>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">{related.title}</p>
                          <p className="text-xs text-muted-foreground">{related.description}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Global Help Button for the header
 * Determines the current feature from the URL and shows relevant help
 */
interface GlobalHelpButtonProps {
  currentPath: string;
}

export function GlobalHelpButton({ currentPath }: GlobalHelpButtonProps) {
  const featureId = getFeatureIdFromPath(currentPath);
  
  if (!featureId) {
    return null;
  }

  return (
    <HelpPanel
      featureId={featureId}
      trigger={
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Help">
          <HelpCircle className="h-4 w-4" />
        </Button>
      }
    />
  );
}

/**
 * Helper to get feature ID from path
 */
function getFeatureIdFromPath(path: string): FeatureId | null {
  if (path.startsWith('/proofread')) return 'proofread';
  if (path.startsWith('/translate') && !path.startsWith('/image-translate')) return 'translate';
  if (path.startsWith('/image-translate')) return 'image-translate';
  if (path.startsWith('/image-edit')) return 'image-edit';
  if (path.startsWith('/settings')) return 'settings';
  return null;
}

