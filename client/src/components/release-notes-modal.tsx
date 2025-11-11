import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, CheckCircle, Shield, Zap, Database } from "lucide-react";

interface ReleaseNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReleaseNotesModal({ open, onOpenChange }: ReleaseNotesModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Release Notes
            <Badge variant="secondary">v1.3</Badge>
          </DialogTitle>
          <DialogDescription>
            What's new in this release
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Version 1.3 */}
            <div className="space-y-4">
              <div className="border-l-4 border-purple-600 pl-4">
                <h3 className="font-semibold text-lg">Version 1.3</h3>
                <p className="text-sm text-muted-foreground">November 11, 2025 • Latest Release</p>
              </div>
              
              <div className="space-y-4 ml-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Database className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Server-Side Search & Pagination</h4>
                    <p className="text-sm text-muted-foreground">
                      Search through your workflows and proofreading history with lightning-fast 
                      database queries. The expandable search bar lets you quickly find past work 
                      by searching titles and content. Results load 20 at a time for optimal 
                      performance, with seamless "Load More" functionality.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Infinite Scroll Loading</h4>
                    <p className="text-sm text-muted-foreground">
                      Your workflow history now loads progressively, showing 20 items at a time. 
                      This dramatically improves performance and reduces memory usage, especially 
                      for users with extensive translation histories. Click "Load More" to see 
                      additional entries.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Deletion Confirmation</h4>
                    <p className="text-sm text-muted-foreground">
                      Added confirmation dialogs when deleting workflows or proofreading entries. 
                      This safety feature helps prevent accidental deletions of your important work, 
                      showing you exactly what you're about to delete.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Enhanced Data Protection</h4>
                    <p className="text-sm text-muted-foreground">
                      Implemented comprehensive database protection with intelligent retry logic. 
                      The system now automatically recovers from connectivity issues with exponential 
                      backoff (5s, 10s, 10s), ensuring your translations and proofreading work is 
                      never lost due to temporary connection problems.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Separator for future releases */}
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

