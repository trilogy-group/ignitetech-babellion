import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, Check, Lock, Globe, Pencil, FileText, Save, X, History, Code, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RichTextEditor, type RichTextEditorRef } from "@/components/rich-text-editor";
import { GoogleDocsPicker } from "@/components/google-docs-picker";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Proofreading, ProofreadingOutput, AiModel, ProofreadingRuleCategory } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHistorySheet } from "@/components/mobile-history-sheet";

interface ProofreadingResult {
  rule: string;
  original_text: string;
  suggested_change: string;
  rationale: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

export default function Proofread() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location] = useLocation();
  const [selectedProofreadingId, setSelectedProofreadingId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [title, setTitle] = useState("Untitled Proofreading");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEscapePressed, setIsEscapePressed] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isProofreading, setIsProofreading] = useState(false);
  const [proofreadingInProgress, setProofreadingInProgress] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isGoogleDocsPickerOpen, setIsGoogleDocsPickerOpen] = useState(false);
  const [isLoadingGoogleDoc, setIsLoadingGoogleDoc] = useState(false);
  const [unsavedChangesAction, setUnsavedChangesAction] = useState<{ type: 'switch' | 'new'; data?: Proofreading } | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState<string>("");
  const [isRawView, setIsRawView] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear highlights when selectedCardIndex changes to null
  useEffect(() => {
    if (selectedCardIndex === null) {
      editorRef.current?.clearHighlights();
    }
  }, [selectedCardIndex]);

  // Clear card selection and highlights when clicking outside cards or in the editor
  useEffect(() => {
    if (selectedCardIndex === null) return; // No need to listen if nothing is selected
    
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on a proofreading result card
      const isCardClick = target.closest('[data-proofreading-card]');
      
      // Check if click is on a button (don't clear on button clicks - let buttons handle their own logic)
      const isButton = target.closest('button');
      
      // Check if click is in the rich text editor
      const isEditorClick = target.closest('.rich-text-wrapper') || target.closest('.ProseMirror');
      
      // Clear highlights if clicking in editor or outside cards (but not on buttons)
      if (isEditorClick || (!isCardClick && !isButton)) {
        // Cancel any pending highlight operations
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
          highlightTimeoutRef.current = null;
        }
        
        setSelectedCardIndex(null);
        editorRef.current?.clearHighlights();
      }
    };

    // Use capture phase to catch clicks early, before they bubble
    document.addEventListener('mousedown', handleClick, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [selectedCardIndex]);

  // Fetch proofreadings
  const { data: proofreadings = [], isLoading: proofreadingsLoading } = useQuery<Proofreading[]>({
    queryKey: ["/api/proofreadings"],
  });

  // Fetch models
  const { data: models = [] } = useQuery<AiModel[]>({
    queryKey: ["/api/models"],
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<ProofreadingRuleCategory[]>({
    queryKey: ["/api/proofreading-categories"],
  });

  // Fetch proofreading output for selected proofreading
  const { data: output, isLoading: outputLoading } = useQuery<ProofreadingOutput | null>({
    queryKey: ["/api/proofreadings", selectedProofreadingId, "output"],
    queryFn: async () => {
      if (!selectedProofreadingId) return null;
      const response = await apiRequest("GET", `/api/proofreadings/${selectedProofreadingId}/output`);
      return await response.json() as ProofreadingOutput | null;
    },
    enabled: !!selectedProofreadingId,
  });

  // Get default model
  const defaultModel = models.find(m => m.isDefault);

  // Set default model on load
  useEffect(() => {
    if (!selectedModel && defaultModel) {
      setSelectedModel(defaultModel.id);
    }
  }, [defaultModel, selectedModel]);

  // Track if we've initialized to avoid loops
  const hasInitialized = useRef(false);
  const selectedProofreadingIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    selectedProofreadingIdRef.current = selectedProofreadingId;
  }, [selectedProofreadingId]);

  // Handle hash-based URL navigation on initial load only
  useEffect(() => {
    if (!proofreadingsLoading && proofreadings.length > 0 && !hasInitialized.current && !selectedProofreadingId) {
      hasInitialized.current = true;
      const hash = window.location.hash.slice(1);
      if (hash) {
        const proofreading = proofreadings.find(p => p.id === hash);
        if (proofreading) {
          handleSelectProofreading(proofreading);
          return;
        }
      }
      const firstProofreading = proofreadings[0];
      if (firstProofreading) {
        handleSelectProofreading(firstProofreading);
      }
    }
  }, [proofreadingsLoading, proofreadings, selectedProofreadingId]);

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const isUpdatingHashRef = useRef(false);

  useEffect(() => {
    const handleHashChange = () => {
      if (isUpdatingHashRef.current) {
        return;
      }
      if (!proofreadingsLoading && proofreadings.length > 0) {
        const hash = window.location.hash.slice(1);
        if (hash) {
          const proofreading = proofreadings.find(p => p.id === hash);
          if (proofreading && proofreading.id !== selectedProofreadingIdRef.current) {
            handleSelectProofreading(proofreading);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [proofreadings, proofreadingsLoading]);

  useEffect(() => {
    if (selectedProofreadingId && hasInitialized.current) {
      const currentHash = window.location.hash.slice(1);
      if (currentHash !== selectedProofreadingId) {
        isUpdatingHashRef.current = true;
        window.history.replaceState(null, '', `${window.location.pathname}#${selectedProofreadingId}`);
        setTimeout(() => {
          isUpdatingHashRef.current = false;
        }, 100);
      }
    }
  }, [selectedProofreadingId]);

  // Create new proofreading mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/proofreadings", {
        title: "Untitled Proofreading",
        sourceText: "",
        isPrivate: false,
        selectedCategories: [],
      });
      return await response.json() as Proofreading;
    },
    onSuccess: (data: Proofreading) => {
      queryClient.setQueryData<Proofreading[]>(["/api/proofreadings"], (old = []) => [data, ...old]);
      handleSelectProofreading(data);
      setIsEditingTitle(false);
      queryClient.invalidateQueries({ queryKey: ["/api/proofreadings"] });
      toast({
        title: "Proofreading created",
        description: "Your new proofreading project has been created.",
      });
    },
  });

  // Update proofreading mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Proofreading> }) => {
      return await apiRequest("PATCH", `/api/proofreadings/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proofreadings"] });
      toast({
        title: "Proofreading updated",
        description: "Your proofreading has been saved.",
      });
    },
  });

  // Delete proofreading mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/proofreadings/${id}`, {});
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/proofreadings"] });
      if (selectedProofreadingId === deletedId) {
        setSelectedProofreadingId(null);
        setSourceText("");
        setTitle("Untitled Proofreading");
      }
      setDeleteConfirmId(null);
      toast({
        title: "Proofreading deleted",
        description: "The proofreading has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message || "You don't have permission to delete this proofreading.",
        variant: "destructive",
      });
    },
  });

  // Execute proofreading mutation
  const executeProofreadingMutation = useMutation({
    mutationFn: async ({ proofreadingId, categoryIds, modelId, text }: { proofreadingId: string; categoryIds: string[]; modelId: string; text: string }) => {
      // Add this proofreading to the in-progress set
      setProofreadingInProgress(prev => new Set(prev).add(proofreadingId));
      
      const response = await apiRequest("POST", "/api/proofread-execute", {
        proofreadingId,
        categoryIds,
        modelId,
        text,
      });
      return { data: await response.json() as ProofreadingOutput, proofreadingId };
    },
    onSuccess: ({ proofreadingId }) => {
      // Remove from in-progress set
      setProofreadingInProgress(prev => {
        const next = new Set(prev);
        next.delete(proofreadingId);
        return next;
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/proofreadings", proofreadingId, "output"] });
      
      // Only show toast and clear local state if we're still on this proofreading
      if (selectedProofreadingId === proofreadingId) {
        setIsProofreading(false);
        toast({
          title: "Proofreading complete",
          description: "Your text has been proofread successfully.",
        });
      }
    },
    onError: (error: Error, { proofreadingId }) => {
      // Remove from in-progress set
      setProofreadingInProgress(prev => {
        const next = new Set(prev);
        next.delete(proofreadingId);
        return next;
      });
      
      // Only show toast and clear local state if we're still on this proofreading
      if (selectedProofreadingId === proofreadingId) {
        setIsProofreading(false);
        toast({
          title: "Proofreading failed",
          description: error.message || "Failed to proofread text. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSelectProofreading = (proofreading: Proofreading) => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      setUnsavedChangesAction({ type: 'switch', data: proofreading });
      return;
    }
    
    // Clear highlights before switching
    editorRef.current?.clearHighlights();
    
    setSelectedProofreadingId(proofreading.id);
    setSourceText(proofreading.sourceText);
    setTitle(proofreading.title);
    setSelectedCategories(proofreading.selectedCategories || []);
    setIsPrivate(proofreading.isPrivate ?? false);
    if (proofreading.lastUsedModelId) {
      setSelectedModel(proofreading.lastUsedModelId);
    }
    setSelectedCardIndex(null);
    setHasUnsavedChanges(false);
    setLastSavedContent(proofreading.sourceText);
    
    // Check if this proofreading is in progress
    // If so, show the loading state in the current view
    const isThisInProgress = proofreadingInProgress.has(proofreading.id);
    setIsProofreading(isThisInProgress);
  };

  const handleNewProofreading = () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      setUnsavedChangesAction({ type: 'new' });
      return;
    }
    createMutation.mutate();
  };

  const handleConfirmDiscardAndContinue = () => {
    if (!unsavedChangesAction) return;
    
    if (unsavedChangesAction.type === 'switch' && unsavedChangesAction.data) {
      // Continue with switching proofreading
      const proofreading = unsavedChangesAction.data;
      editorRef.current?.clearHighlights();
      setSelectedProofreadingId(proofreading.id);
      setSourceText(proofreading.sourceText);
      setTitle(proofreading.title);
      setSelectedCategories(proofreading.selectedCategories || []);
      setIsPrivate(proofreading.isPrivate ?? false);
      if (proofreading.lastUsedModelId) {
        setSelectedModel(proofreading.lastUsedModelId);
      }
      setSelectedCardIndex(null);
      setHasUnsavedChanges(false);
      setLastSavedContent(proofreading.sourceText);
      const isThisInProgress = proofreadingInProgress.has(proofreading.id);
      setIsProofreading(isThisInProgress);
    } else if (unsavedChangesAction.type === 'new') {
      // Continue with creating new proofreading
      setHasUnsavedChanges(false);
      createMutation.mutate();
    }
    
    setUnsavedChangesAction(null);
  };

  const handleRenameInList = (id: string, newTitle: string) => {
    if (!isEscapePressed && newTitle.trim()) {
      const trimmedTitle = newTitle.trim();
      updateMutation.mutate(
        { id, data: { title: trimmedTitle } },
        {
          onSuccess: () => {
            if (id === selectedProofreadingId) {
              setTitle(trimmedTitle);
            }
          }
        }
      );
    }
    setIsRenamingId(null);
    setIsEscapePressed(false);
  };

  const handleStartEditingTitle = () => {
    setEditedTitle(title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== title && selectedProofreadingId) {
      updateMutation.mutate(
        {
          id: selectedProofreadingId,
          data: { title: trimmedTitle },
        },
        {
          onSuccess: () => {
            setTitle(trimmedTitle);
          }
        }
      );
    }
    setIsEditingTitle(false);
  };

  const handleCancelEditingTitle = () => {
    setEditedTitle(title);
    setIsEditingTitle(false);
  };

  const handleSaveSource = () => {
    if (selectedProofreadingId) {
      // Clear highlights before saving to prevent them from being persisted
      editorRef.current?.clearHighlights();
      
      // Get clean HTML without highlight marks
      const cleanHTML = editorRef.current?.getHTML() || sourceText;
      
      updateMutation.mutate({
        id: selectedProofreadingId,
        data: { sourceText: cleanHTML, title, selectedCategories, isPrivate },
      });
      
      // Update last saved content and clear unsaved changes flag
      setLastSavedContent(cleanHTML);
      setHasUnsavedChanges(false);
    }
  };

  const handleDiscardChanges = () => {
    // Reset editor content to last saved state
    setSourceText(lastSavedContent);
    setHasUnsavedChanges(false);
  };

  const handleLoadGoogleDoc = async (documentId: string, docTitle: string) => {
    setIsLoadingGoogleDoc(true);
    try {
      const response = await apiRequest("GET", `/api/google/docs/${documentId}`);
      const data = await response.json() as { title: string; html: string };

      setSourceText(data.html);
      
      if (!title || title === "Untitled Proofreading") {
        setTitle(docTitle);
        setEditedTitle(docTitle);
      }

      if (selectedProofreadingId) {
        updateMutation.mutate({
          id: selectedProofreadingId,
          data: { 
            sourceText: data.html, 
            title: !title || title === "Untitled Proofreading" ? docTitle : title 
          },
        });
      }

      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.html;
      const charCount = tempDiv.textContent?.length || 0;

      toast({
        title: "✓ Document loaded successfully",
        description: `"${docTitle}" (${charCount.toLocaleString()} characters)`,
      });
    } catch (error: unknown) {
      const message = (error as Error)?.message || "Failed to load Google Doc";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoadingGoogleDoc(false);
    }
  };

  const handleTogglePrivacy = (checked: boolean) => {
    if (selectedProofreadingId && canEditSelected) {
      setIsPrivate(checked);
      updateMutation.mutate({
        id: selectedProofreadingId,
        data: { isPrivate: checked },
      });
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newCategories);
    
    if (selectedProofreadingId) {
      updateMutation.mutate({
        id: selectedProofreadingId,
        data: { selectedCategories: newCategories },
      });
    }
  };

  const handleProofread = async () => {
    if (!selectedProofreadingId) {
      toast({
        title: "No proofreading selected",
        description: "Please create or select a proofreading first.",
        variant: "destructive",
      });
      return;
    }
    if (selectedCategories.length === 0) {
      toast({
        title: "No categories selected",
        description: "Please select at least one rule category.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedModel) {
      toast({
        title: "No model selected",
        description: "Please select an AI model.",
        variant: "destructive",
      });
      return;
    }

    // Get current HTML content from editor (preserves formatting/structure)
    const currentHTML = editorRef.current?.getHTML() || sourceText;
    const currentText = editorRef.current?.getText() || sourceText;
    
    // Validate that we have content (check plain text for validation)
    if (!currentText || currentText.trim().length === 0) {
      toast({
        title: "No text to proofread",
        description: "Please add some text to proofread.",
        variant: "destructive",
      });
      return;
    }

    setIsProofreading(true);

    try {
      // Clear highlights before saving to prevent them from being persisted
      editorRef.current?.clearHighlights();
      
      // Get clean HTML without highlight marks
      const cleanHTML = editorRef.current?.getHTML() || currentHTML;
      
      // First, save the current content to the database
      await updateMutation.mutateAsync({
        id: selectedProofreadingId,
        data: {
          sourceText: cleanHTML,
          title,
          selectedCategories,
          isPrivate,
          lastUsedModelId: selectedModel,
        },
      });
      
      // Suppress the success toast since we're about to proofread
      // (The toast will still show but will be immediately followed by proofreading status)

      // Then execute proofreading with the HTML formatted text (so LLM can understand structure)
      executeProofreadingMutation.mutate({
        proofreadingId: selectedProofreadingId,
        categoryIds: selectedCategories,
        modelId: selectedModel,
        text: currentHTML, // Send HTML instead of plain text
      });
    } catch (error) {
      setIsProofreading(false);
      toast({
        title: "Failed to save",
        description: error instanceof Error ? error.message : "Failed to save proofreading before executing.",
        variant: "destructive",
      });
    }
  };

  // Helper function to extract plain text from HTML
  const extractPlainTextFromHTML = (html: string): string => {
    if (!html) return '';
    // Create a temporary DOM element to parse HTML and extract text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  };

  const handleCardClick = (index: number, result: ProofreadingResult) => {
    // Cancel any pending highlight operations
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    
    // Clear highlights immediately (synchronously)
    editorRef.current?.clearHighlights();
    
    // If clicking the same card, toggle it off
    if (selectedCardIndex === index) {
      setSelectedCardIndex(null);
      return;
    }
    
    setSelectedCardIndex(index);
    
    // Extract plain text from HTML original_text for highlighting
    const plainText = extractPlainTextFromHTML(result.original_text);
    if (plainText) {
      // Use a longer delay to ensure editor is fully ready
      highlightTimeoutRef.current = setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.highlightText(plainText);
          // scrollToText can be problematic if editor isn't fully mounted
          // The highlight itself should bring text into view
          // Only try to scroll if it's really needed
          try {
            editorRef.current.scrollToText(plainText);
          } catch (e) {
            // Ignore scroll errors - highlight is the main feature
            console.warn('Could not scroll to highlighted text');
          }
        }
      }, 150); // Increased delay
    }
  };

  const handleAccept = async (result: ProofreadingResult, index: number) => {
    if (!selectedProofreadingId) return;
    
    // Extract plain text from HTML for both original and suggested
    const originalPlainText = extractPlainTextFromHTML(result.original_text);
    const suggestedPlainText = extractPlainTextFromHTML(result.suggested_change);
    
    if (originalPlainText && suggestedPlainText) {
      // Clear all highlights first
      editorRef.current?.clearHighlights();
      // Then replace the text
      editorRef.current?.replaceText(originalPlainText, suggestedPlainText);
      
      // Get the updated content from editor
      const updatedHTML = editorRef.current?.getHTML() || "";
      
      // Update status in backend and save the document
      try {
        await apiRequest('PATCH', `/api/proofreadings/${selectedProofreadingId}/output/suggestion/${index}`, { status: 'accepted' });
        
        // Save the updated document text
        await updateMutation.mutateAsync({
          id: selectedProofreadingId,
          data: {
            sourceText: updatedHTML,
            title,
            selectedCategories,
            isPrivate,
            lastUsedModelId: selectedModel,
          },
        }, { suppressToast: true });
        
        // Update the last saved content and clear unsaved changes flag
        setLastSavedContent(updatedHTML);
        setHasUnsavedChanges(false);
        
        // Refresh the output to get updated status
        await queryClient.invalidateQueries({ queryKey: ["/api/proofreadings", selectedProofreadingId, "output"] });
        
        setSelectedCardIndex(null);
        
        toast({
          title: "Change applied and saved",
          description: "The suggested change has been applied and saved to your document.",
        });
      } catch (error) {
        toast({
          title: "Failed to update",
          description: error instanceof Error ? error.message : "Could not save changes",
          variant: "destructive",
        });
      }
    }
  };

  const handleAcceptAll = async () => {
    if (!output || !output.results || !Array.isArray(output.results) || !selectedProofreadingId) return;
    
    // Clear all highlights first
    editorRef.current?.clearHighlights();
    
    const results = output.results as unknown as ProofreadingResult[];
    const acceptedIndices: number[] = [];
    
    results.forEach((result, index) => {
      // Skip already accepted suggestions
      if (result.status === 'accepted') return;
      
      // Extract plain text from HTML for both original and suggested
      const originalPlainText = extractPlainTextFromHTML(result.original_text);
      const suggestedPlainText = extractPlainTextFromHTML(result.suggested_change);
      
      if (originalPlainText && suggestedPlainText) {
        editorRef.current?.replaceText(originalPlainText, suggestedPlainText);
        acceptedIndices.push(index);
      }
    });
    
    // Get the updated content from editor
    const updatedHTML = editorRef.current?.getHTML() || "";
    
    // Update all accepted suggestions in backend and save document
    try {
      await Promise.all(
        acceptedIndices.map(index =>
          apiRequest('PATCH', `/api/proofreadings/${selectedProofreadingId}/output/suggestion/${index}`, { status: 'accepted' })
        )
      );
      
      // Save the updated document text
      await updateMutation.mutateAsync({
        id: selectedProofreadingId,
        data: {
          sourceText: updatedHTML,
          title,
          selectedCategories,
          isPrivate,
          lastUsedModelId: selectedModel,
        },
      }, { suppressToast: true });
      
      // Update the last saved content and clear unsaved changes flag
      setLastSavedContent(updatedHTML);
      setHasUnsavedChanges(false);
      
      // Refresh the output to get updated statuses
      await queryClient.invalidateQueries({ queryKey: ["/api/proofreadings", selectedProofreadingId, "output"] });
      
      setSelectedCardIndex(null);
      
      toast({
        title: "All changes applied and saved",
        description: `${acceptedIndices.length} suggested changes have been applied and saved.`,
      });
    } catch (error) {
      toast({
        title: "Failed to update",
        description: error instanceof Error ? error.message : "Could not save changes",
        variant: "destructive",
      });
    }
  };

  const canEdit = (proofreading: Proofreading | null) => {
    if (!user || !proofreading) return false;
    if (proofreading.userId === user.id) return true;
    if (user.isAdmin && !proofreading.isPrivate) return true;
    return false;
  };

  const getOwnershipTooltip = (proofreading: Proofreading) => {
    if (!user) return "";
    if (proofreading.userId === user.id) {
      return "Owned by me";
    }
    if (proofreading.owner) {
      const name = proofreading.owner.firstName || proofreading.owner.email || proofreading.userId;
      const email = proofreading.owner.email ? ` (${proofreading.owner.email})` : "";
      return `Owned by ${name}${email}`;
    }
    return `Owned by ${proofreading.userId}`;
  };

  const selectedProofreading = proofreadings.find(p => p.id === selectedProofreadingId) || null;
  const canEditSelected = canEdit(selectedProofreading);
  const isMobile = useIsMobile();
  const activeCategories = categories.filter(c => c.isActive);
  const results = output?.results as unknown as ProofreadingResult[] | undefined;

  return (
    <div className="flex h-full overflow-y-auto md:overflow-hidden flex-col md:flex-row">
      {/* Left Sidebar - Proofreading History (Desktop only) */}
      <div className="hidden md:flex w-80 flex-col border-r bg-sidebar flex-none">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="text-lg font-semibold">Proofreading History</h2>
          <Button 
            size="sm" 
            onClick={handleNewProofreading} 
            disabled={createMutation.isPending} 
            variant="outline"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1" viewportClassName="max-w-full">
          {proofreadingsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : proofreadings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="mb-2 text-sm font-medium">No proofreadings yet</p>
              <p className="mb-4 text-xs text-muted-foreground">Create your first proofreading to get started</p>
            </div>
          ) : (
            <div className="space-y-1 p-2" style={{ width: '100%', maxWidth: '20rem' }}>
              <TooltipProvider>
                {proofreadings.map((proofreading) => {
                  const isInProgress = proofreadingInProgress.has(proofreading.id);
                  return (
                  <Card
                    key={proofreading.id}
                    className={`group cursor-pointer p-4 hover-elevate overflow-hidden ${
                      selectedProofreadingId === proofreading.id ? "bg-sidebar-accent" : ""
                    }`}
                    onClick={() => handleSelectProofreading(proofreading)}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {isInProgress ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-shrink-0 pt-0.5">
                              <Loader2 className="h-4 w-4 text-primary animate-spin" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Proofreading in progress...</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                              {proofreading.isPrivate ? (
                                <Lock className="h-4 w-4 text-muted-foreground/60" />
                              ) : (
                                <Globe className="h-4 w-4 text-muted-foreground/60" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{getOwnershipTooltip(proofreading)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <div className="flex-1 min-w-0">
                        {isRenamingId === proofreading.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameInList(proofreading.id, renameValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setIsEscapePressed(false);
                                handleRenameInList(proofreading.id, renameValue);
                              } else if (e.key === "Escape") {
                                setIsEscapePressed(true);
                                setIsRenamingId(null);
                              }
                            }}
                            autoFocus
                            className="h-auto p-0 border-none focus-visible:ring-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-medium truncate flex-1 min-w-0">{proofreading.title}</h3>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {new Date(proofreading.updatedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      {canEdit(proofreading) && (
                        <div className="flex items-center gap-1 invisible group-hover:visible flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsRenamingId(proofreading.id);
                              setRenameValue(proofreading.title);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(proofreading.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                  );
                })}
              </TooltipProvider>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Mobile History Sheet Button */}
      {isMobile && (
        <div className="flex items-center justify-between gap-2 border-b p-3 bg-background md:hidden">
          <MobileHistorySheet
            translations={proofreadings as unknown as Proofreading[]}
            isLoading={proofreadingsLoading}
            selectedTranslationId={selectedProofreadingId}
            onSelectTranslation={handleSelectProofreading as unknown as (p: Proofreading) => void}
            onNewTranslation={handleNewProofreading}
            isCreating={createMutation.isPending}
            onRename={handleRenameInList}
            onDelete={(id) => {
              setDeleteConfirmId(id);
              deleteMutation.mutate(id);
            }}
            canEdit={canEdit as unknown as (p: Proofreading | null) => boolean}
            getOwnershipTooltip={getOwnershipTooltip as unknown as (p: Proofreading) => string}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                History
                {selectedProofreading && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {selectedProofreading.title}
                  </span>
                )}
              </Button>
            }
          />
          <Button
            size="sm"
            onClick={handleNewProofreading}
            disabled={createMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            New
          </Button>
        </div>
      )}

      {/* Main Content Area - Middle + Right panels */}
      <div className="flex flex-1 flex-col md:flex-row min-w-0 md:overflow-hidden">
        {/* Middle Panel - Input */}
        <div className="flex flex-1 flex-col min-w-0 md:overflow-hidden">
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-wrap items-center gap-2 border-b p-3 md:p-4">
              {/* Categories Multi-Select */}
              <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                <Label className="text-sm font-medium whitespace-nowrap">Rules:</Label>
                <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full max-w-xs flex-1 justify-between"
                      disabled={!canEditSelected}
                    >
                      <span className="truncate">
                        {selectedCategories.length === 0
                          ? "Select categories..."
                          : `${selectedCategories.length} selected`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search categories..." />
                      <CommandEmpty>No categories found.</CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {activeCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            onSelect={() => handleCategoryToggle(category.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 w-full">
                              <Checkbox
                                checked={selectedCategories.includes(category.id)}
                                onCheckedChange={() => handleCategoryToggle(category.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span>{category.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Model Selection */}
              <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
                <Label className="text-sm font-medium whitespace-nowrap">Model:</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!canEditSelected}>
                  <SelectTrigger className="w-full max-w-xs flex-1">
                    <SelectValue placeholder="Select model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.filter(m => m.isActive).map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} {model.isDefault && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Proofread Button */}
              <Button
                onClick={handleProofread}
                disabled={!selectedProofreadingId || !canEditSelected || isProofreading || selectedCategories.length === 0 || !selectedModel}
                className="flex-shrink-0"
                variant="outline"
              >
                {isProofreading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Proofread
              </Button>
            </div>
          </TooltipProvider>

          <div className="flex-1 overflow-y-auto md:overflow-hidden p-4 md:p-6">
            <div className="flex h-full flex-col gap-3 md:gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    {isEditingTitle ? (
                      <Input
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSaveTitle();
                          } else if (e.key === "Escape") {
                            handleCancelEditingTitle();
                          }
                        }}
                        autoFocus
                        placeholder="Enter proofreading title..."
                        disabled={!selectedProofreadingId || !canEditSelected}
                      />
                    ) : (
                      <div
                        className={`rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-9 ${canEditSelected ? 'cursor-text hover:border-accent-foreground/20' : 'cursor-default'}`}
                        onClick={selectedProofreadingId && canEditSelected ? handleStartEditingTitle : undefined}
                      >
                        {title || "Enter proofreading title..."}
                      </div>
                    )}
                  </div>
                  {selectedProofreadingId && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Public</span>
                      </div>
                      <div className="sm:hidden">
                        {isPrivate ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <Switch
                        checked={isPrivate}
                        onCheckedChange={handleTogglePrivacy}
                        disabled={!canEditSelected}
                        className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-green-600"
                      />
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Private</span>
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col min-h-0">
                <div className="mb-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium">
                      Source Text
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsGoogleDocsPickerOpen(true)}
                      disabled={!selectedProofreadingId || !canEditSelected || isLoadingGoogleDoc}
                      className="h-7"
                    >
                      {isLoadingGoogleDoc ? (
                        <>
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-1 h-3 w-3" />
                          Load Google Doc
                        </>
                      )}
                    </Button>
                    <Button
                      variant={isRawView ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsRawView(!isRawView)}
                      disabled={!selectedProofreadingId}
                      className="h-7"
                    >
                      <Code className="mr-1 h-3 w-3" />
                      {isRawView ? "Rich Text" : "Raw HTML"}
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {sourceText ? new DOMParser().parseFromString(sourceText, 'text/html').body.textContent?.length || 0 : 0} characters
                  </span>
                </div>
                {isRawView ? (
                  <textarea
                    value={sourceText}
                    onChange={(e) => {
                      setSourceText(e.target.value);
                      setHasUnsavedChanges(e.target.value !== lastSavedContent);
                    }}
                    placeholder="Raw HTML content..."
                    disabled={!selectedProofreadingId || !canEditSelected}
                    className="flex-1 w-full p-4 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  />
                ) : (
                  <RichTextEditor
                    ref={editorRef}
                    content={sourceText}
                    onChange={(value) => {
                      setSourceText(value);
                      // Check if content has changed from last saved
                      setHasUnsavedChanges(value !== lastSavedContent);
                    }}
                    placeholder="Enter text to proofread..."
                    editable={!!selectedProofreadingId && canEditSelected}
                    className="flex-1 overflow-auto"
                    editorKey={`source-${selectedProofreadingId || 'none'}`}
                    onBlur={() => {
                      // Clear highlights when editor loses focus
                      if (selectedCardIndex !== null) {
                        setSelectedCardIndex(null);
                        editorRef.current?.clearHighlights();
                      }
                    }}
                  />
                )}
                <div className="mt-2 flex justify-end gap-2 flex-shrink-0">
                  {hasUnsavedChanges && (
                    <Button
                      onClick={handleDiscardChanges}
                      variant="outline"
                      disabled={!selectedProofreadingId || !canEditSelected}
                      size="sm"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Discard
                    </Button>
                  )}
                  <Button
                    onClick={handleSaveSource}
                    disabled={!selectedProofreadingId || !canEditSelected || !hasUnsavedChanges || updateMutation.isPending}
                    size="sm"
                  >
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex flex-1 flex-col min-w-0 border-t md:border-t-0 md:border-l md:overflow-hidden">
          <div className="border-b px-4 py-5 flex-shrink-0 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Proofreading Results</h2>
            {results && results.length > 0 && (
              <Button
                onClick={handleAcceptAll}
                size="sm"
                variant="default"
              >
                Accept All
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto md:overflow-hidden">
            {!selectedProofreadingId ? (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div>
                  <p className="mb-2 text-sm font-medium">No proofreading selected</p>
                  <p className="text-xs text-muted-foreground">
                    Select or create a proofreading to view results
                  </p>
                </div>
              </div>
            ) : isProofreading || outputLoading ? (
              <div className="flex h-full items-center justify-center p-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm font-medium">Proofreading in progress...</p>
                  <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                </div>
              </div>
            ) : !output || !results || results.length === 0 ? (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <div>
                  <p className="mb-2 text-sm font-medium">No results yet</p>
                  <p className="text-xs text-muted-foreground">
                    Select categories and click Proofread to generate suggestions
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-4 p-4 md:p-6">
                  {results.map((result, index) => {
                    const isAccepted = result.status === 'accepted';
                    return (
                    <Card
                      key={index}
                      data-proofreading-card
                      className={`cursor-pointer transition-all ${
                        selectedCardIndex === index ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleCardClick(index, result)}
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{result.rule}</Badge>
                          </div>
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2"
                            disabled={isAccepted}
                            variant={isAccepted ? "secondary" : "default"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(result, index);
                            }}
                          >
                            {isAccepted ? 'Accepted' : 'Accept'}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Original:</p>
                            <div className="text-xs bg-muted/50 p-2 rounded break-words flex-1">{result.original_text}</div>
                          </div>
                          <div className="flex flex-col">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Suggested:</p>
                            <div className="text-xs bg-green-50 dark:bg-green-950/20 p-2 rounded break-words flex-1">{result.suggested_change}</div>
                          </div>
                        </div>
                        {result.rationale && (
                          <div className="pt-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Rationale:</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{result.rationale}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      {/* Google Docs Picker */}
      <GoogleDocsPicker
        open={isGoogleDocsPickerOpen}
        onOpenChange={setIsGoogleDocsPickerOpen}
        onDocumentSelect={handleLoadGoogleDoc}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proofreading</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this proofreading? This action cannot be undone and will remove all associated results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={!!unsavedChangesAction} onOpenChange={(open) => !open && setUnsavedChangesAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you continue. Would you like to save your changes first?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscardAndContinue}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

