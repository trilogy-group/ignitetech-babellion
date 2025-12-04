import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type PanelType = 'source' | 'output';

interface MobilePanelToggleProps {
  activePanel: PanelType;
  onPanelChange: (panel: PanelType) => void;
  sourceLabel?: string;
  outputLabel?: string;
  sourceIcon?: ReactNode;
  outputIcon?: ReactNode;
  className?: string;
}

/**
 * A toggle component for switching between source and output panels on mobile.
 * Displays as a segmented control with icons and labels.
 */
export function MobilePanelToggle({
  activePanel,
  onPanelChange,
  sourceLabel = "Source",
  outputLabel = "Output",
  sourceIcon,
  outputIcon,
  className,
}: MobilePanelToggleProps) {
  return (
    <div
      className={cn(
        "flex rounded-lg bg-muted p-1 gap-1",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onPanelChange('source')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          activePanel === 'source'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {sourceIcon}
        <span>{sourceLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => onPanelChange('output')}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          activePanel === 'output'
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {outputIcon}
        <span>{outputLabel}</span>
      </button>
    </div>
  );
}

