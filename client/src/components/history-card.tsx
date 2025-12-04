import { Lock, Globe, Pencil, Trash2, Loader2, EllipsisVertical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";
import { ReactNode } from "react";

export interface HistoryCardItem {
  id: string;
  title: string;
  isPrivate: boolean;
  updatedAt: Date | string;
  userId: string;
}

interface HistoryCardProps<T extends HistoryCardItem> {
  /** The item data to display */
  item: T;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether this card is currently being renamed */
  isRenaming: boolean;
  /** The current rename input value */
  renameValue: string;
  /** Whether the user can edit this item */
  canEdit: boolean;
  /** Whether the item is showing a loading state (e.g., in progress) */
  isLoading?: boolean;
  /** Custom loading tooltip text */
  loadingTooltip?: string;
  /** Text for ownership tooltip when hovering on lock/globe icon */
  ownershipTooltip?: string;
  /** Callback when card is clicked */
  onClick: () => void;
  /** Callback to start renaming */
  onStartRename: () => void;
  /** Callback when rename value changes */
  onRenameChange: (value: string) => void;
  /** Callback when rename is confirmed (blur or Enter) */
  onRenameConfirm: () => void;
  /** Callback when rename is cancelled (Escape) */
  onRenameCancel: () => void;
  /** Callback when delete is requested */
  onDelete: () => void;
  /** Optional custom icon to show instead of lock/globe */
  customIcon?: ReactNode;
  /** Optional data-testid prefix for testing */
  testIdPrefix?: string;
}

/**
 * A reusable history card component for the sidebar/history panels.
 * Displays an item with title, date, privacy indicator, and kebab menu actions.
 */
export function HistoryCard<T extends HistoryCardItem>({
  item,
  isSelected,
  isRenaming,
  renameValue,
  canEdit,
  isLoading,
  loadingTooltip = "Processing...",
  ownershipTooltip,
  onClick,
  onStartRename,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
  onDelete,
  customIcon,
  testIdPrefix,
}: HistoryCardProps<T>) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onRenameConfirm();
    } else if (e.key === "Escape") {
      onRenameCancel();
    }
  };

  const renderIcon = () => {
    if (customIcon) {
      return customIcon;
    }
    
    if (isLoading) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0 pt-0.5">
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{loadingTooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    const icon = item.isPrivate ? (
      <Lock 
        className="h-4 w-4 text-muted-foreground/60" 
        data-testid={testIdPrefix ? `icon-ownership-private-${item.id}` : undefined}
      />
    ) : (
      <Globe 
        className="h-4 w-4 text-muted-foreground/60" 
        data-testid={testIdPrefix ? `icon-ownership-public-${item.id}` : undefined}
      />
    );

    if (ownershipTooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
              {icon}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{ownershipTooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div className="flex-shrink-0 pt-0.5">
        {icon}
      </div>
    );
  };

  return (
    <Card
      className={`group p-2 cursor-pointer hover-elevate overflow-hidden ${
        isSelected ? "bg-sidebar-accent" : ""
      }`}
      onClick={onClick}
      data-testid={testIdPrefix ? `card-${testIdPrefix}-${item.id}` : undefined}
    >
      <div className="flex items-start gap-2 min-w-0">
        {renderIcon()}
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <Input
              value={renameValue}
              onChange={(e) => onRenameChange(e.target.value)}
              onBlur={onRenameConfirm}
              onKeyDown={handleKeyDown}
              autoFocus
              className="h-auto p-0 border-none focus-visible:ring-0"
              onClick={(e) => e.stopPropagation()}
              data-testid={testIdPrefix ? `input-rename-${testIdPrefix}` : undefined}
            />
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-sm font-medium truncate flex-1 min-w-0">{item.title}</h3>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {formatDate(item.updatedAt)}
          </p>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                data-testid={testIdPrefix ? `button-menu-${item.id}` : undefined}
              >
                <EllipsisVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename();
                }}
                data-testid={testIdPrefix ? `button-edit-${item.id}` : undefined}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                data-testid={testIdPrefix ? `button-delete-${item.id}` : undefined}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}

