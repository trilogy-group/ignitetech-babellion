import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelLeftClose, Search, CheckCircle, Shield, Zap, Database, Share, FileText, Navigation } from "lucide-react";

interface ReleaseNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Render a release notes modal dialog that displays recent changelog entries and feature highlights.
 *
 * @param open - Controls whether the modal is visible.
 * @param onOpenChange - Called with the updated open state when the dialog is opened or closed.
 * @returns The release notes modal element.
 */
export function ReleaseNotesModal({ open, onOpenChange }: ReleaseNotesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            Release Notes
            <Badge variant="secondary" className="text-xs">v1.4</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            What's new in this release
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Version 1.4 */}
            <div className="space-y-3">
              <div className="border-l-4 border-purple-600 pl-4">
                <h3 className="font-semibold text-base">Version 1.4</h3>
                <p className="text-xs text-muted-foreground">November 12, 2025 • Latest Release</p>
              </div>
              
              <div className="space-y-2 ml-4">
                <div className="flex gap-2 items-start">
                  <FileText className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Export to Google Docs:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Create new Google Docs directly from your translation and proofreading results with HTML formatting preserved. Documents open automatically in a new tab with proper paragraph spacing.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <PanelLeftClose className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Collapsible Side Panel:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Collapse the history sidebar on Translate and Proofread pages for more workspace. Your sidebar collapse preference is now remembered across sessions
                    </span>
                  </div>
                </div>



                <div className="flex gap-2 items-start">
                  <Share className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Copy & Share Buttons:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Quickly copy formatted text and share links for translations and proofreading
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Improved Duplication Detection:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Fixed highlighting and replacement of duplicated content to preserve HTML formatting and accurately detect full duplicated sections
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Navigation className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Auto-Scroll to Highlights:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      When clicking a proofreading suggestion, the editor automatically scrolls to and centers the highlighted text for easier review
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Version 1.3 */}
            <div className="space-y-3 pt-4 border-t">
              <div className="border-l-4 border-gray-400 pl-4">
                <h3 className="font-semibold text-base">Version 1.3</h3>
                <p className="text-xs text-muted-foreground">November 11, 2025</p>
              </div>
              
              <div className="space-y-2 ml-4">
                <div className="flex gap-2 items-start">
                  <Search className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Server-Side Search:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Fast database-powered search through translations and proofreading history
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Zap className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Infinite Scroll Loading:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Progressive loading with 20 items at a time for better performance
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Deletion Confirmation:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Safety dialogs prevent accidental deletion of your important work
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Shield className="h-3 w-3 text-primary mt-[0.125rem] flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Enhanced Data Protection:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Automatic recovery from connectivity issues with intelligent retry logic
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground text-center">
                Thank you for using Babellion! More exciting features coming soon.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
