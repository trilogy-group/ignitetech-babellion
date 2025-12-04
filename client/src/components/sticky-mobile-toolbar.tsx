import { cn } from "@/lib/utils";

interface StickyMobileToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A fixed bottom toolbar for mobile that contains primary action buttons.
 * Includes safe-area padding for devices with notches/home indicators.
 */
export function StickyMobileToolbar({ children, className }: StickyMobileToolbarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "flex items-center gap-3",
        "md:hidden", // Only show on mobile
        className
      )}
    >
      {children}
    </div>
  );
}

