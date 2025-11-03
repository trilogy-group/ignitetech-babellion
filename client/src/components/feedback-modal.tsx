import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translationId: string;
  translationOutputId: string;
  languageName: string;
  selectedText: string;
  onSubmit: (feedback: {
    selectedText: string;
    feedbackText: string;
    sentiment: "positive" | "negative";
  }) => void;
  isSubmitting?: boolean;
}

export function FeedbackModal({
  open,
  onOpenChange,
  translationId,
  translationOutputId,
  languageName,
  selectedText,
  onSubmit,
  isSubmitting = false,
}: FeedbackModalProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "negative" | null>(null);

  const handleSubmit = () => {
    if (!sentiment || !feedbackText.trim()) return;
    
    onSubmit({
      selectedText,
      feedbackText: feedbackText.trim(),
      sentiment,
    });
    
    // Reset form
    setFeedbackText("");
    setSentiment(null);
  };

  const handleCancel = () => {
    setFeedbackText("");
    setSentiment(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Provide Feedback on Translation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Translation Info */}
          <div className="space-y-2 text-sm">
            <div className="flex gap-2">
              <span className="text-muted-foreground">Translation ID:</span>
              <span className="font-mono text-xs">{translationId}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Output ID:</span>
              <span className="font-mono text-xs">{translationOutputId}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground">Language:</span>
              <span className="font-medium">{languageName}</span>
            </div>
          </div>

          {/* Selected Text */}
          <div className="space-y-2">
            <Label>Selected Text</Label>
            <div className="rounded-md border bg-muted/50 p-3 text-sm max-h-32 overflow-y-auto">
              {selectedText}
            </div>
          </div>

          {/* Sentiment Selection */}
          <div className="space-y-2">
            <Label>How would you rate this translation?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={sentiment === "positive" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  sentiment === "positive" && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setSentiment("positive")}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Good
              </Button>
              <Button
                type="button"
                variant={sentiment === "negative" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  sentiment === "negative" && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => setSentiment("negative")}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Needs Improvement
              </Button>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label htmlFor="feedback-text">
              Your Feedback {sentiment === "negative" && "(e.g., recommended word to use, corrections)"}
            </Label>
            <Textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Share your thoughts on this translation, suggest improvements, or recommend alternative words..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {feedbackText.length} characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!sentiment || !feedbackText.trim() || isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

