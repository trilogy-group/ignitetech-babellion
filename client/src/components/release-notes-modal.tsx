import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PanelLeftClose, Search, CheckCircle, Shield, Zap, Share, FileText, Image, Navigation, Upload, Calendar, BarChart3, Smartphone, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ReleaseNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VersionHeaderProps {
  version: string;
  date: string;
  isLatest?: boolean;
  isOpen: boolean;
}

function VersionHeader({ version, date, isLatest, isOpen }: VersionHeaderProps) {
  return (
    <CollapsibleTrigger className="w-full">
      <div className={cn(
        "border-l-4 pl-3 pr-2 flex items-center justify-between group cursor-pointer hover:bg-muted/50 py-1 rounded-r transition-colors",
        isLatest ? "border-purple-600" : "border-gray-400"
      )}>
        <div className="text-left">
          <h3 className="font-semibold text-base">{version}</h3>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200 flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </div>
    </CollapsibleTrigger>
  );
}

/**
 * Render a release notes modal dialog that displays recent changelog entries and feature highlights.
 *
 * @param open - Controls whether the modal is visible.
 * @param onOpenChange - Called with the updated open state when the dialog is opened or closed.
 * @returns The release notes modal element.
 */
export function ReleaseNotesModal({ open, onOpenChange }: ReleaseNotesModalProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "v1.5": true,
    "v1.4.3": false,
    "v1.4.2": false,
    "v1.4.1": false,
    "v1.4": false,
    "v1.3": false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh]">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            Release Notes
            <Badge variant="secondary" className="text-xs">v1.5</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            What's new in this release
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {/* Version 1.5 */}
            <Collapsible open={openSections["v1.5"]} onOpenChange={() => toggleSection("v1.5")}>
              <VersionHeader version="Version 1.5" date="Latest Release" isLatest isOpen={openSections["v1.5"]} />
              <CollapsibleContent className="space-y-3 pt-3">
                {/* IMAGE TRANSLATION update with icon and bold header */}
                <div className="flex gap-2 items-start ml-4">
                  <Image className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-xs">Image Translation:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Using <span className="font-semibold">Nano Banana Pro</span>, you can now translate text in images directly in Babellion! Supports dozens of languages, automatic layout detection, and high quality exports.
                    </span>
                  </div>
                </div>

                {/* Mobile Friendly View */}
                <div className="flex gap-2 items-start ml-4">
                  <Smartphone className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-xs">Mobile-Friendly View:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Babellion now works beautifully on mobile devices! Enjoy optimized layouts, touch-friendly controls, and a seamless experience across phones and tablets.
                    </span>
                  </div>
                </div>

                {/* UI/UX Standardization */}
                <div className="flex gap-2 items-start ml-4">
                  <Sparkles className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-xs">Refined UI/UX:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Massive standardization of the interface with consistent spacing, improved visual hierarchy, unified card designs, and streamlined controls throughout the app.
                    </span>
                  </div>
                </div>

                <div className="space-y-2 ml-4">
                  <div className="flex gap-2 items-start">
                    <BarChart3 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-xs">Admin Analytics Dashboard:</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        New analytics tab in Settings with usage charts, top languages, model usage, feedback sentiment, and active user rankings.
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <Calendar className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-xs">Improved Date Display:</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        All dates now show both the full date and relative time (e.g., "Dec 04, 2025 (2 days ago)") for better context.
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <Zap className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-xs">Faster Page Loading:</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        Translate and Proofread pages now load significantly faster with on-demand content fetching.
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 items-start">
                    <Navigation className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-xs">Smart Delete Navigation:</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        Deleting an item now automatically selects the next (or previous) item instead of clearing the view.
                      </span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Version 1.4.3 */}
            <Collapsible open={openSections["v1.4.3"]} onOpenChange={() => toggleSection("v1.4.3")}>
              <div className="pt-4 border-t">
                <VersionHeader version="Version 1.4.3" date="December 2025" isOpen={openSections["v1.4.3"]} />
              </div>
              <CollapsibleContent className="space-y-2 ml-4 pt-3">
                <div className="flex gap-2 items-start">
                  <Upload className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">PDF Import:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Import PDF documents directly into the editor with Quick (basic text) or Advanced (AI-enhanced formatting with real-time streaming) options.
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Version 1.4.2 */}
            <Collapsible open={openSections["v1.4.2"]} onOpenChange={() => toggleSection("v1.4.2")}>
              <div className="pt-4 border-t">
                <VersionHeader version="Version 1.4.2" date="November 2025" isOpen={openSections["v1.4.2"]} />
              </div>
              <CollapsibleContent className="space-y-2 ml-4 pt-3">
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Unsaved Changes Protection:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Added warning dialog and discard/save buttons to the Translation editor.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Autosave on Translate:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Unsaved changes are automatically saved when you click the Translate button.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Fixed Accept Changes:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Proofreading suggestions are now only marked as "Accepted" when the change is actually applied, with clear feedback when a change cannot be applied.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Fixed New Document Editor:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      The text editor is now immediately editable after creating a new Translation or Proofreading, without needing to switch away and back.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Fixed Suggestion Highlight:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Clicking a proofreading suggestion to highlight text no longer triggers the "Discard Changes" option, as view-only highlights are now correctly recognized as non-edits.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Fixed Google Docs Session Expiry:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Google Docs access no longer expires after an hour. Your credentials are now automatically refreshed, so you can load from and export to Google Docs without needing to log out and log back in.
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Version 1.4.1 */}
            <Collapsible open={openSections["v1.4.1"]} onOpenChange={() => toggleSection("v1.4.1")}>
              <div className="pt-4 border-t">
                <VersionHeader version="Version 1.4.1" date="November 2025" isOpen={openSections["v1.4.1"]} />
              </div>
              <CollapsibleContent className="space-y-2 ml-4 pt-3">
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Color-Coded Highlights:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Click any suggestion card to find and highlight the text in your document - green for accepted changes, yellow for pending suggestions.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Rich Formatting in Cards:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Proofreading suggestion cards now display original and suggested text with full HTML formatting (bold, italic, lists) for better readability.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Collapsed Share Menu:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Share actions (Copy, Create Google Doc, Share Link) are now organized in a single dropdown menu for a cleaner interface on both Translate and Proofread pages.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Accept All Progress:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Real-time progress states (Running, Pending, Accepted) when accepting all suggestions, with visual feedback as each change is applied.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Fixed Accept All Race Condition:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Resolved data consistency issue by processing suggestions sequentially instead of in parallel.
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Version 1.4 */}
            <Collapsible open={openSections["v1.4"]} onOpenChange={() => toggleSection("v1.4")}>
              <div className="pt-4 border-t">
                <VersionHeader version="Version 1.4" date="November 12, 2025" isOpen={openSections["v1.4"]} />
              </div>
              <CollapsibleContent className="space-y-2 ml-4 pt-3">
                <div className="flex gap-2 items-start">
                  <FileText className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Export to Google Docs:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Create new Google Docs directly from your translation and proofreading results with HTML formatting preserved. Documents open automatically in a new tab with proper paragraph spacing.
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <PanelLeftClose className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Collapsible Side Panel:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Collapse the history sidebar on Translate and Proofread pages for more workspace. Your sidebar collapse preference is now remembered across sessions
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Share className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Copy & Share Buttons:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Quickly copy formatted text and share links for translations and proofreading
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Improved Duplication Detection:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Fixed highlighting and replacement of duplicated content to preserve HTML formatting and accurately detect full duplicated sections
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Navigation className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Auto-Scroll to Highlights:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      When clicking a proofreading suggestion, the editor automatically scrolls to and centers the highlighted text for easier review
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Version 1.3 */}
            <Collapsible open={openSections["v1.3"]} onOpenChange={() => toggleSection("v1.3")}>
              <div className="pt-4 border-t">
                <VersionHeader version="Version 1.3" date="November 11, 2025" isOpen={openSections["v1.3"]} />
              </div>
              <CollapsibleContent className="space-y-2 ml-4 pt-3">
                <div className="flex gap-2 items-start">
                  <Search className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Server-Side Search:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Fast database-powered search through translations and proofreading history
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Zap className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Infinite Scroll Loading:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Progressive loading with 20 items at a time for better performance
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Deletion Confirmation:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Safety dialogs prevent accidental deletion of your important work
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  <Shield className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-xs">Enhanced Data Protection:</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Automatic recovery from connectivity issues with intelligent retry logic
                    </span>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

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
