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
        <SheetContent side="bottom" className="h-[85vh] flex flex-col max-h-[85vh]">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Translation History</SheetTitle>
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

          <ScrollArea className="flex-1 min-h-0 -mx-6 px-6">
            <div className="pb-4">
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
                <div className="space-y-2">
                <TooltipProvider>
                  {translations.map((translation) => (
                    <Card
                      key={translation.id}
                      className={`group cursor-pointer p-4 hover-elevate overflow-hidden ${
                        selectedTranslationId === translation.id
                          ? "bg-sidebar-accent"
                          : ""
                      }`}
                      onClick={() => handleSelectAndClose(translation)}
                    >
                      <div className="flex items-start gap-1.5 sm:gap-2 min-w-0 w-full">
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
                              <h3 className="font-medium truncate flex-1 min-w-0 text-sm sm:text-base">
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

