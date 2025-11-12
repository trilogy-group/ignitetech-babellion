import { useState } from "react";
import { Loader2, Lock, Globe, Pencil, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Translation } from "@shared/schema";

interface MobileHistorySheetProps {
  translations: Translation[];
  isLoading: boolean;
  selectedTranslationId: string | null;
  onSelectTranslation: (translation: Translation) => void;
  onNewTranslation: () => void;
  isCreating: boolean;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  canEdit: (translation: Translation | null) => boolean;
  getOwnershipTooltip: (translation: Translation) => string;
  trigger?: React.ReactNode;
}

/**
 * Render a mobile-accessible "History" sheet for viewing and managing translations.
 *
 * The sheet lists translations, shows loading and empty states, and exposes controls to
 * select, create, rename, and delete translations according to the provided callbacks
 * and permissions.
 *
 * @param translations - Array of translation entries to display
 * @param isLoading - Whether the translation list is currently loading
 * @param selectedTranslationId - Id of the currently selected translation, if any
 * @param onSelectTranslation - Called with a translation when the user selects it
 * @param onNewTranslation - Called when the user requests creating a new translation
 * @param isCreating - Whether a new translation is currently being created
 * @param onRename - Called with (id, newTitle) to commit a rename
 * @param onDelete - Called with an id to delete the corresponding translation
 * @param canEdit - Function that returns whether the current user may edit a translation
 * @param getOwnershipTooltip - Function that returns tooltip text describing ownership for a translation
 * @param trigger - Optional custom trigger element to open the sheet; defaults to a mobile-only button
 *
 * @returns The History sheet React element
 */
export function MobileHistorySheet({
  translations,
  isLoading,
  selectedTranslationId,
  onSelectTranslation,
  onNewTranslation,
  isCreating,
  onRename,
  onDelete,
  canEdit,
  getOwnershipTooltip,
  trigger,
}: MobileHistorySheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isEscapePressed, setIsEscapePressed] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSelectAndClose = (translation: Translation) => {
    onSelectTranslation(translation);
    setIsOpen(false);
  };

  const handleRenameInList = (id: string, newTitle: string) => {
    if (!isEscapePressed && newTitle.trim()) {
      const trimmedTitle = newTitle.trim();
      onRename(id, trimmedTitle);
    }
    setIsRenamingId(null);
    setIsEscapePressed(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="md:hidden">
              📋 History
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] flex flex-col max-h-[85vh] w-full max-w-full">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>History</SheetTitle>
          </SheetHeader>
          
          <div className="flex items-center justify-between gap-4 border-b pb-4 mb-4 flex-shrink-0">
            <Button
              size="sm"
              onClick={() => {
                onNewTranslation();
                setIsOpen(false);
              }}
              disabled={isCreating}
              variant="outline"
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "+"
              )}
              New Translation
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="pb-4 w-full flex flex-col items-center">
              <div className="w-full" style={{ maxWidth: '20rem' }}>
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : translations.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="mb-2 text-sm font-medium">No translations yet</p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Create your first translation to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5 w-full">
                <TooltipProvider>
                  {translations.map((translation) => (
                    <Card
                      key={translation.id}
                      className={`group cursor-pointer p-2 hover-elevate overflow-hidden w-full ${
                        selectedTranslationId === translation.id
                          ? "bg-sidebar-accent"
                          : ""
                      }`}
                      onClick={() => handleSelectAndClose(translation)}
                    >
                      <div className="flex items-start gap-1 min-w-0 w-full max-w-full">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="flex-shrink-0 pt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {translation.isPrivate ? (
                                <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/60" />
                              ) : (
                                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground/60" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{getOwnershipTooltip(translation)}</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          {isRenamingId === translation.id ? (
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() =>
                                handleRenameInList(translation.id, renameValue)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setIsEscapePressed(false);
                                  handleRenameInList(
                                    translation.id,
                                    renameValue
                                  );
                                } else if (e.key === "Escape") {
                                  setIsEscapePressed(true);
                                  setIsRenamingId(null);
                                }
                              }}
                              autoFocus
                              className="h-auto p-0 border-none focus-visible:ring-0 w-full"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="text-sm font-medium truncate flex-1 min-w-0">
                                {translation.title}
                              </h3>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {new Date(translation.updatedAt!).toLocaleDateString()}
                          </p>
                        </div>
                        {canEdit(translation) && (
                          <div
                            className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsRenamingId(translation.id);
                                setRenameValue(translation.title);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(translation.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </TooltipProvider>
                </div>
              )}
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Translation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this translation? This action
              cannot be undone and will remove all associated translation
              outputs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirmId && onDelete(deleteConfirmId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
