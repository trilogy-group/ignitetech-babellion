import { useState } from 'react';
import { HelpCircle, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getWelcomeContent, type FeatureId } from '@/lib/help-content';

interface WelcomeModalProps {
  featureId: FeatureId;
  open: boolean;
  onClose: () => void;
  onDismissPermanently: () => void;
  onShowHelp?: () => void;
}

/**
 * Illustration component with fallback for missing images
 */
function WelcomeIllustration({ 
  src, 
  alt 
}: { 
  src: string; 
  alt: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full aspect-square max-w-[240px] mx-auto bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl flex items-center justify-center">
        <div className="text-center p-6">
          <Sparkles className="h-16 w-16 mx-auto text-purple-400 dark:text-purple-500 mb-3" />
          <p className="text-sm text-muted-foreground">Ready to explore!</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full aspect-square max-w-[240px] mx-auto rounded-2xl object-cover"
      onError={() => setHasError(true)}
    />
  );
}

/**
 * Welcome Modal - Shown on first visit to a feature
 */
export function WelcomeModal({
  featureId,
  open,
  onClose,
  onDismissPermanently,
  onShowHelp,
}: WelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const content = getWelcomeContent(featureId);

  const handleClose = () => {
    if (dontShowAgain) {
      onDismissPermanently();
    } else {
      onClose();
    }
  };

  const handleShowHelp = () => {
    handleClose();
    if (onShowHelp) {
      // Small delay to allow modal to close before opening help panel
      setTimeout(() => {
        onShowHelp();
      }, 150);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <WelcomeIllustration
              src={content.heroIllustration}
              alt={content.title}
            />
          </div>
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {content.tagline}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-center text-muted-foreground">
            {content.description}
          </p>

          {/* Highlights */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            {content.highlights.map((highlight, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleShowHelp}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Learn More
            </Button>
            <Button 
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={handleClose}
            >
              Got it!
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-2 pt-2 border-t w-full">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <Label 
              htmlFor="dont-show-again" 
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Don't show this again
            </Label>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

