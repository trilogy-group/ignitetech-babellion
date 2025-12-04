import { useState } from "react";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CollapsibleControlsProps {
  title?: string;
  badge?: string;
  modelName?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * An expandable/collapsible section for secondary controls on mobile.
 * Used to hide Model, Rules, Languages selection behind a toggle to save screen space.
 */
export function CollapsibleControls({
  title = "Options",
  badge,
  modelName,
  children,
  defaultExpanded = false,
  className,
}: CollapsibleControlsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn("border-b bg-muted/30", className)}>
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between h-12 px-4 rounded-none hover:bg-muted/50"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Settings2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium flex-shrink-0">{title}</span>
          {badge && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs flex-shrink-0">
              {badge}
            </Badge>
          )}
          {modelName && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs max-w-[120px] truncate" title={modelName}>
              {modelName}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="px-4 py-3 space-y-3 bg-background/50">
          {children}
        </div>
      )}
    </div>
  );
}

