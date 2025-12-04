import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Search, Loader2, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface GoogleDoc {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  mimeType?: string;
  thumbnailLink?: string;
  webViewLink?: string;
}

interface GoogleDocsPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentSelect: (documentId: string, title: string) => void;
}

export function GoogleDocsPicker({ open, onOpenChange, onDocumentSelect }: GoogleDocsPickerProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Google Docs with server-side search (only when activeSearch changes)
  const { data: docs = [], isLoading: docsLoading, error } = useQuery<GoogleDoc[]>({
    queryKey: ["/api/google/docs", activeSearch ? { search: activeSearch } : undefined],
    queryFn: async () => {
      const url = activeSearch 
        ? `/api/google/docs?search=${encodeURIComponent(activeSearch)}`
        : '/api/google/docs';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch docs');
      }
      return res.json();
    },
    enabled: open,
    retry: false,
  });

  // Handle Enter key press to trigger search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setActiveSearch(searchInput);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchInput("");
    setActiveSearch("");
  };

  const handleSelect = async (doc: GoogleDoc) => {
    // Immediate feedback: show spinner on card
    setSelectedDocId(doc.id);
    setIsLoading(true);

    // Close modal immediately
    onOpenChange(false);

    // Show loading toast
    toast({
      title: "Loading document",
      description: `Loading "${doc.name}"...`,
    });

    try {
      // Load the document
      await onDocumentSelect(doc.id, doc.name);
      
      // Success toast is shown by the parent component (translate.tsx)
      // Reset state
      setSearchInput("");
      setActiveSearch("");
      setSelectedDocId(null);
      setIsLoading(false);
    } catch (err: unknown) {
      const message = (err as Error)?.message || "Failed to load document";
      toast({
        title: "Error loading document",
        description: message,
        variant: "destructive",
      });
      setIsLoading(false);
      setSelectedDocId(null);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] md:h-[80vh] flex flex-col p-4 md:p-6 gap-3 md:gap-4">
        <DialogHeader className="flex-shrink-0">
          <div>
            <DialogTitle className="text-base md:text-lg">Select a Google Doc</DialogTitle>
            {!error && !docsLoading && docs.length > 0 && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                {docs.length} document{docs.length !== 1 ? 's' : ''} 
                {activeSearch ? ` matching "${activeSearch}"` : ' found'}
                {docs.length >= 500 && ' (showing first 500)'}
              </p>
            )}
          </div>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center justify-center py-8 md:py-12 px-4 text-center flex-1">
            <FileText className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
            <h3 className="text-base md:text-lg font-semibold mb-2">Unable to Access Google Docs</h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-4 max-w-md">
              {(error as Error)?.message?.includes('No Google access token') 
                ? "Please log out and log back in to grant access to your Google Docs."
                : "We couldn't connect to your Google Drive. Please try again or contact support."}
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 min-h-touch">
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isMobile ? "Search... (Enter)" : "Search documents... (Press Enter to search)"}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-9 pr-8 h-11 min-h-touch"
              />
              {searchInput && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground h-8 w-8 flex items-center justify-center"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Loading State */}
            {docsLoading && (
              <div className="flex items-center justify-center py-8 md:py-12 flex-1">
                <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs md:text-sm text-muted-foreground">
                  {activeSearch ? 'Searching...' : 'Loading...'}
                </span>
              </div>
            )}

            {/* Documents List */}
            {!docsLoading && (
              <ScrollArea className="flex-1 -mx-4 md:-mx-6 px-4 md:px-6 min-h-0">
                {docs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-4" />
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {activeSearch ? `No documents found matching "${activeSearch}"` : "No Google Docs found"}
                    </p>
                    {activeSearch && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Try a different search term or clear the search
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {docs.map((doc) => (
                      <Card
                        key={doc.id}
                        className={`p-3 md:p-4 cursor-pointer hover:bg-accent active:bg-accent transition-colors ${
                          selectedDocId === doc.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => !isLoading && handleSelect(doc)}
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-2 md:truncate">{doc.name}</h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                              {doc.modifiedTime && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span>{formatDate(doc.modifiedTime)}</span>
                                </div>
                              )}
                              {doc.webViewLink && (
                                <a
                                  href={doc.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  <span className="hidden sm:inline">Open in Google Docs</span>
                                  <span className="sm:hidden">Open</span>
                                </a>
                              )}
                            </div>
                          </div>
                          {selectedDocId === doc.id && isLoading && (
                            <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </>
        )}

        <DialogFooter className="flex-shrink-0 pt-2 border-t md:border-t-0 md:pt-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isLoading}
            className="w-full md:w-auto h-11 min-h-touch"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

