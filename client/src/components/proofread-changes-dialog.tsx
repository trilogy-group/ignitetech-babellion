import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProofreadChange {
  phrase?: string;
  "phrase to change"?: string;
  "phrase to change to"?: string;
  reason?: string;
}

interface ProofreadChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposedChanges: string | Record<string, unknown> | null | undefined;
  languageName: string;
}

export function ProofreadChangesDialog({
  open,
  onOpenChange,
  proposedChanges,
  languageName,
}: ProofreadChangesDialogProps) {
  const { toast } = useToast();

  // Parse the proposed changes into structured format
  const parseChanges = (data: string | Record<string, unknown> | null | undefined): ProofreadChange[] => {
    if (!data) return [];
    
    // Handle if it's already a parsed object (from JSONB)
    if (typeof data === 'object' && !Array.isArray(data)) {
      // Single object, wrap in array
      const obj = data as Record<string, unknown>;
      return [{
        "phrase to change": String(obj.original || ''),
        "phrase to change to": String(obj.changes || ''),
        reason: String(obj.reason || 'Improvement'),
      }];
    }
    
    if (Array.isArray(data)) {
      // Already an array
      return data.map((item: unknown) => {
        const obj = item as Record<string, unknown>;
        return {
          "phrase to change": String(obj.original || ''),
          "phrase to change to": String(obj.changes || ''),
          reason: String(obj.reason || 'Improvement'),
        };
      });
    }
    
    // Handle string input
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    if (!text) return [];
    
    // Try to parse as JSON string
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item: unknown) => {
          const obj = item as Record<string, unknown>;
          return {
            "phrase to change": String(obj.original || ''),
            "phrase to change to": String(obj.changes || ''),
            reason: String(obj.reason || 'Improvement'),
          };
        });
      }
    } catch {
      // If JSON parsing fails, fall back to bullet point format for backward compatibility
    }
    
    // Fallback: Try to parse bullet point format (for backward compatibility)
    const changes: ProofreadChange[] = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      // Try to parse bullet point format: "- phrase to change: phrase to change to, reason"
      const match = line.match(/^[-•]\s*(.+?):\s*(.+?)(?:,\s*(.+))?$/);
      if (match) {
        changes.push({
          "phrase to change": match[1].trim(),
          "phrase to change to": match[2].trim(),
          reason: match[3]?.trim() || "Improvement",
        });
      } else if (line.trim().startsWith('-')) {
        // Fallback: just add the line as-is
        const content = line.replace(/^[-•]\s*/, '').trim();
        if (content) {
          changes.push({
            phrase: content,
          });
        }
      }
    }
    
    return changes;
  };

  const changes = parseChanges(proposedChanges);

  // Convert proposedChanges to string for display fallback
  const changesText: string | null = proposedChanges 
    ? (typeof proposedChanges === 'string' 
        ? proposedChanges 
        : JSON.stringify(proposedChanges, null, 2))
    : null;

  // Format changes as array of dictionaries for copying
  const formatChangesForCopy = (): string => {
    const formattedChanges = changes.map((change) => {
      if (change["phrase to change"] && change["phrase to change to"]) {
        return {
          original: change["phrase to change"],
          changes: change["phrase to change to"],
          rationale: change.reason || "",
        };
      }
      return {
        original: change.phrase || "",
        changes: "",
        rationale: "",
      };
    });
    return JSON.stringify(formattedChanges, null, 2);
  };

  const handleCopy = async () => {
    const formattedText = formatChangesForCopy();
    try {
      await navigator.clipboard.writeText(formattedText);
      toast({
        title: "Copied to clipboard",
        description: "Changes copied in dictionary format",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle>Proofreading Changes for {languageName}</DialogTitle>
          {changes.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
              title="Copy changes as dictionary"
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {changes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No changes proposed</p>
              {changesText && (
                <div className="mt-4 text-left">
                  <p className="text-xs font-mono whitespace-pre-wrap bg-muted p-4 rounded">
                    {changesText}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {changes.map((change, index) => (
                <Card key={index} className="p-2.5">
                  {change["phrase to change"] && change["phrase to change to"] ? (
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-2 text-xs">
                        <Badge variant="outline" className="text-xs shrink-0 h-5 px-1.5">
                          {index + 1}
                        </Badge>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex gap-2">
                            <span className="font-medium text-muted-foreground shrink-0 w-16">Original:</span>
                            <span className="flex-1 bg-muted/50 px-2 py-0.5 rounded break-words">{change["phrase to change"]}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="font-medium text-muted-foreground shrink-0 w-16">Changes:</span>
                            <span className="flex-1 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded break-words">{change["phrase to change to"]}</span>
                          </div>
                          {change.reason && (
                            <div className="flex gap-2">
                              <span className="font-medium text-muted-foreground shrink-0 w-16">Rationale:</span>
                              <span className="flex-1 text-muted-foreground break-words">{change.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm">{change.phrase || JSON.stringify(change)}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

