import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Plus, Trash2, Loader2, Copy, Check, Lock, Globe, Pencil, FileText, Save, X, RotateCw, ChevronLeft, ChevronRight, Square, Search, Share, Link2, Upload, Zap, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";
import { GoogleDocsPicker } from "@/components/google-docs-picker";
import { FeedbackModal } from "@/components/feedback-modal";
import { ProofreadChangesDialog } from "@/components/proofread-changes-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Translation, TranslationMetadata, TranslationOutput, AiModel, Language, TranslationFeedback } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHistorySheet } from "@/components/mobile-history-sheet";
import { History } from "lucide-react";

/**
 * Render the Translate page UI for creating, editing, translating, and managing translation projects.
 *
 * Provides the full translation workflow including history, source editor, language and model selection,
 * translation outputs with per-language tabs, Google Docs import/export, copy/share actions, feedback submission,
 * proofreading creation, and related server interactions (create, update, delete, translate, and fetch).
 *
 * @returns A JSX element that renders the translation management interface.
 */
export default function Translate() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [selectedTranslationId, setSelectedTranslationId] = useState<string | null>(params.id || null);
  const [sourceText, setSourceText] = useState("");
  const [title, setTitle] = useState("Untitled Translation");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [tempSelectedLanguages, setTempSelectedLanguages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [isEscapePressed, setIsEscapePressed] = useState(false);
  const [copiedOutputId, setCopiedOutputId] = useState<string | null>(null);
  const [sharedOutputId, setSharedOutputId] = useState<string | null>(null);
  const [creatingGoogleDocOutputId, setCreatingGoogleDocOutputId] = useState<string | null>(null);
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCreatingGoogleDoc, setIsCreatingGoogleDoc] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("");
  const [editedOutputs, setEditedOutputs] = useState<Record<string, string>>({});
  const [isPrivate, setIsPrivate] = useState(false);
  // Track progress per translation ID to persist across card switches
  const [translatingLanguages, setTranslatingLanguages] = useState<Record<string, Set<string>>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [translationRuntimes, setTranslationRuntimes] = useState<Record<string, Record<string, number>>>({});
  const [proofreadRuntimes, setProofreadRuntimes] = useState<Record<string, Record<string, number>>>({});
  const [isGoogleDocsPickerOpen, setIsGoogleDocsPickerOpen] = useState(false);
  const [isLoadingGoogleDoc, setIsLoadingGoogleDoc] = useState(false);
  const [isImportingPdf, setIsImportingPdf] = useState(false);
  const [pdfImportType, setPdfImportType] = useState<'quick' | 'deep' | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSelectedText, setFeedbackSelectedText] = useState("");
  const [feedbackOutputId, setFeedbackOutputId] = useState<string | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('translate-left-panel-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [proofreadChangesDialogOpen, setProofreadChangesDialogOpen] = useState(false);
  const [proofreadChangesOutputId, setProofreadChangesOutputId] = useState<string | null>(null);
  const [stoppedPollingOutputs, setStoppedPollingOutputs] = useState<Set<string>>(new Set());
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Actual search term used for API
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [unsavedChangesAction, setUnsavedChangesAction] = useState<{ type: 'switch' | 'new'; data?: TranslationMetadata | Translation } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState<string>("");
  // Store the currently selected translation object to avoid race conditions with list refresh
  const [selectedTranslationData, setSelectedTranslationData] = useState<Translation | null>(null);

  // Auto-focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Save left panel collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('translate-left-panel-collapsed', JSON.stringify(isLeftPanelCollapsed));
  }, [isLeftPanelCollapsed]);

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

  // Fetch translations with infinite scroll and server-side search
  const {
    data: translationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: translationsLoading,
  } = useInfiniteQuery({
    queryKey: ["/api/translations", searchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "20",
        ...(searchTerm && searchTerm.length >= 2 ? { search: searchTerm } : {}),
      });
      const response = await apiRequest("GET", `/api/translations?${params}`);
      return await response.json() as {
        data: TranslationMetadata[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasMore: boolean;
        };
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  // Flatten paginated translations (metadata only)
  const translations = translationsData?.pages.flatMap(page => page.data) ?? [];

  // Fetch full translation data when a translation is selected
  const { data: selectedTranslationFull, isLoading: isLoadingSelectedTranslation } = useQuery<Translation>({
    queryKey: ["/api/translations", selectedTranslationId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/translations/${selectedTranslationId}`);
      return await response.json() as Translation;
    },
    enabled: !!selectedTranslationId,
  });

  // Fetch models
  const { data: models = [] } = useQuery<AiModel[]>({
    queryKey: ["/api/models"],
  });

  // Fetch languages
  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
  });

  // Fetch translation outputs for selected translation
  const { data: outputs = [], isLoading: outputsLoading } = useQuery<TranslationOutput[]>({
    queryKey: ["/api/translations", selectedTranslationId, "outputs"],
    enabled: !!selectedTranslationId,
    refetchInterval: (query) => {
      // Check if any outputs are in progress
      const data = query.state.data || [];
      const hasInProgress = data.some((output: TranslationOutput) => {
        // Skip if polling was manually stopped for this output
        if (stoppedPollingOutputs.has(output.id)) {
          return false;
        }
        
        const isTranslating = output.translationStatus === 'translating';
        const isProofreading = output.proofreadStatus === 'proof_reading' || output.proofreadStatus === 'applying_proofread';
        
        if (isTranslating || isProofreading) {
          // Check if the output has been stuck for too long (30 minutes)
          if (output.updatedAt) {
            const lastUpdate = new Date(output.updatedAt);
            const now = new Date();
            const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
            
            // If stuck for more than 30 minutes, stop polling
            if (minutesSinceUpdate > 30) {
              console.warn(`[Polling] Output ${output.id} has been stuck for ${minutesSinceUpdate.toFixed(1)} minutes, stopping polling`);
              setStoppedPollingOutputs(prev => new Set(prev).add(output.id));
              return false;
            }
          }
          return true;
        }
        return false;
      });
      // Poll every 2 seconds if there are in-progress outputs, otherwise don't poll
      return hasInProgress ? 2000 : false;
    },
  });

  // Get default model
  const defaultModel = models.find(m => m.isDefault);

  // Set default model on load
  if (!selectedModel && defaultModel) {
    setSelectedModel(defaultModel.id);
  }

  // Track if we've initialized to avoid loops
  const hasInitialized = useRef(false);

  // Handle search
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= 2) {
        setSearchTerm(searchQuery); // Trigger actual search
      } else {
        setSearchTerm(""); // Clear search if less than 2 chars
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchTerm("");
    setIsSearchExpanded(false);
  };

  const handleToggleSearch = () => {
    if (isSearchExpanded) {
      handleClearSearch();
    } else {
      setIsSearchExpanded(true);
    }
  };

  // Sync selectedTranslationId with URL params
  useEffect(() => {
    if (params.id && params.id !== selectedTranslationId) {
      setSelectedTranslationId(params.id);
    }
  }, [params.id, selectedTranslationId]);

  // Handle initial load - auto-select first translation if no ID in URL
  useEffect(() => {
    if (!translationsLoading && translations.length > 0 && !hasInitialized.current && !params.id) {
      hasInitialized.current = true;
      const firstTranslation = translations[0];
      if (firstTranslation) {
        // Navigate to the first translation
        setLocation(`/translate/${firstTranslation.id}`, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationsLoading, translations.length, params.id]);

  // Populate state when full translation data is loaded
  useEffect(() => {
    if (selectedTranslationFull && selectedTranslationId) {
      // IMPORTANT: Set lastSavedContent BEFORE sourceText to prevent false unsaved changes detection
      setLastSavedContent(selectedTranslationFull.sourceText);
      setHasUnsavedChanges(false);
      
      setSelectedTranslationData(selectedTranslationFull);
      setSourceText(selectedTranslationFull.sourceText);
      setTitle(selectedTranslationFull.title);
      setSelectedLanguages(selectedTranslationFull.selectedLanguages || []);
      setIsPrivate(selectedTranslationFull.isPrivate ?? false);
      if (selectedTranslationFull.lastUsedModelId) {
        setSelectedModel(selectedTranslationFull.lastUsedModelId);
      }
      // Auto-select first language tab if languages exist
      if (selectedTranslationFull.selectedLanguages && selectedTranslationFull.selectedLanguages.length > 0) {
        setActiveLanguageTab(selectedTranslationFull.selectedLanguages[0]);
      } else {
        setActiveLanguageTab("");
      }
    }
  }, [selectedTranslationFull, selectedTranslationId]);

  // Create new translation mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/translations", {
        title: "Untitled Translation",
        sourceText: "",
        isPrivate: false,
      });
      return await response.json() as Translation;
    },
    onSuccess: (data: Translation) => {
      // Optimistically update the cache to include the new translation
      queryClient.setQueryData<Translation[]>(["/api/translations"], (old = []) => [data, ...old]);
      
      // Properly initialize the translation selection
      handleSelectTranslation(data);
      
      setIsEditingTitle(false);
      
      // Invalidate to sync with server (but optimistic update ensures immediate UI works)
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      
      toast({
        title: "Translation created",
        description: "Your new translation project has been created.",
      });
    },
  });

  // Update translation mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Translation> }) => {
      return await apiRequest("PATCH", `/api/translations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      toast({
        title: "Translation updated",
        description: "Your translation has been saved.",
      });
    },
  });

  // Delete translation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/translations/${id}`, {});
    },
    onSuccess: (_, deletedId) => {
      // Find the index of deleted translation to navigate to next/previous
      const deletedIndex = translations.findIndex(t => t.id === deletedId);
      
      // Determine next translation to select
      let nextTranslation: TranslationMetadata | null = null;
      if (deletedIndex !== -1) {
        // Try next translation first
        if (deletedIndex < translations.length - 1) {
          nextTranslation = translations[deletedIndex + 1];
        }
        // If no next, try previous
        else if (deletedIndex > 0) {
          nextTranslation = translations[deletedIndex - 1];
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      
      if (selectedTranslationId === deletedId) {
        if (nextTranslation) {
          // Navigate to next/previous translation
          setLocation(`/translate/${nextTranslation.id}`);
        } else {
          // No translations left, go to base translate page
          setSelectedTranslationId(null);
          setSelectedTranslationData(null);
          setSourceText("");
          setTitle("Untitled Translation");
          setLocation('/translate');
        }
      }
      setDeleteConfirmId(null);
      toast({
        title: "Translation deleted",
        description: "The translation has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message || "You don't have permission to delete this translation.",
        variant: "destructive",
      });
    },
  });

  // Individual language translation mutation
  const translateSingleMutation = useMutation({
    mutationFn: async ({ languageCode }: { languageCode: string }) => {
      if (!selectedTranslationId || !selectedModel) {
        throw new Error("Missing required fields");
      }
      const response = await apiRequest("POST", "/api/translate-single", {
        translationId: selectedTranslationId,
        languageCode,
        modelId: selectedModel,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations", selectedTranslationId, "outputs"] });
    },
  });

  // Update translation output mutation
  const updateOutputMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      return await apiRequest("PATCH", `/api/translation-outputs/${id}`, { translatedText: text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations", selectedTranslationId, "outputs"] });
      toast({
        title: "Translation updated",
        description: "Your edits have been saved.",
      });
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: {
      translationId: string;
      translationOutputId: string;
      selectedText: string;
      feedbackText: string;
      sentiment: "positive" | "negative";
      modelUsed: string | null;
    }) => {
      const response = await apiRequest("POST", "/api/translation-feedback", data);
      return await response.json();
    },
    onSuccess: () => {
      setIsFeedbackModalOpen(false);
      setFeedbackSelectedText("");
      setFeedbackOutputId(null);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create Google Doc from translation mutation
  const createGoogleDocFromTranslationMutation = useMutation({
    mutationFn: async ({ outputId, title }: { outputId: string; title?: string }) => {
      const response = await apiRequest("POST", "/api/google/docs/create-from-translation", {
        translationOutputId: outputId,
        title,
      });
      return await response.json() as { documentId: string; webViewLink: string };
    },
    onSuccess: (data, variables) => {
      setCreatingGoogleDocOutputId(null);
      // Open document in new tab
      window.open(data.webViewLink, '_blank');
      toast({
        title: "Google Doc created",
        description: "Your document has been created and opened in a new tab.",
      });
    },
    onError: (error: Error) => {
      setCreatingGoogleDocOutputId(null);
      const errorMessage = error.message || "";
      const isScopeError = errorMessage.toLowerCase().includes("insufficient") || 
                          errorMessage.includes("log out and log back in") ||
                          errorMessage.includes("403");
      
      if (isScopeError) {
        toast({
          title: "Permission required",
          description: errorMessage.includes("log out") 
            ? errorMessage 
            : "Please log out and log back in to grant the necessary permissions for creating Google Docs.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to create Google Doc",
          description: errorMessage || "Could not create Google Doc. Please check your Google credentials.",
          variant: "destructive",
        });
      }
    },
  });

  const handleCreateGoogleDoc = async (outputId: string, languageName: string) => {
    if (!selectedTranslation) return;
    
    setCreatingGoogleDocOutputId(outputId);
    const docTitle = `[${languageName.toUpperCase()}] ${selectedTranslation.title}`;
    createGoogleDocFromTranslationMutation.mutate({ outputId, title: docTitle });
  };

  // Create Google Doc from translation source mutation
  const createGoogleDocFromTranslationSourceMutation = useMutation({
    mutationFn: async ({ translationId, title, htmlContent }: { translationId: string; title?: string; htmlContent?: string }) => {
      const response = await apiRequest("POST", "/api/google/docs/create-from-translation-source", {
        translationId,
        title,
        htmlContent,
      });
      return await response.json() as { documentId: string; webViewLink: string };
    },
    onSuccess: (data) => {
      setIsCreatingGoogleDoc(false);
      // Open document in new tab
      window.open(data.webViewLink, '_blank');
      toast({
        title: "Google Doc created",
        description: "Your document has been created and opened in a new tab.",
      });
    },
    onError: (error: Error) => {
      setIsCreatingGoogleDoc(false);
      const errorMessage = error.message || "";
      const isScopeError = errorMessage.toLowerCase().includes("insufficient") || 
                          errorMessage.includes("log out and log back in") ||
                          errorMessage.includes("403");
      
      if (isScopeError) {
        toast({
          title: "Permission required",
          description: errorMessage.includes("log out") 
            ? errorMessage 
            : "Please log out and log back in to grant the necessary permissions for creating Google Docs.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to create Google Doc",
          description: errorMessage || "Could not create Google Doc. Please check your Google credentials.",
          variant: "destructive",
        });
      }
    },
  });

  const handleCopySource = async () => {
    try {
      // Create a blob with both HTML and plain text
      const plainText = new DOMParser().parseFromString(sourceText, 'text/html').body.textContent || '';
      
      // Use the modern Clipboard API to copy rich HTML
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([sourceText], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });
      
      await navigator.clipboard.write([clipboardItem]);
      
      setCopiedSource(true);
      setTimeout(() => setCopiedSource(false), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Rich formatted text has been copied with style preserved.",
      });
    } catch (error: unknown) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShareLink = async () => {
    if (!selectedTranslationId) return;
    
    try {
      const shareUrl = `${window.location.origin}/translate/${selectedTranslationId}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast({
        title: "Link copied",
        description: "Shareable link has been copied to clipboard.",
      });
    } catch (error: unknown) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleCreateGoogleDocFromSource = () => {
    if (!selectedTranslationId) return;
    
    setIsCreatingGoogleDoc(true);
    // Get the current HTML content from the editor (edited or original)
    const htmlContent = sourceText;
    
    // Use the current title
    const currentTitle = title || "Untitled Translation";
    
    createGoogleDocFromTranslationSourceMutation.mutate({
      translationId: selectedTranslationId,
      title: currentTitle,
      htmlContent,
    });
  };

  const handleSelectTranslation = (translation: TranslationMetadata | Translation) => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      setUnsavedChangesAction({ type: 'switch', data: translation as Translation });
      return;
    }
    
    // Navigate to the translation URL - state will be populated by the effect watching selectedTranslationFull
    setEditedOutputs({});
    setLocation(`/translate/${translation.id}`);
  };

  const handleNewTranslation = () => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      setUnsavedChangesAction({ type: 'new' });
      return;
    }
    createMutation.mutate();
  };

  const handleRenameInList = (id: string, newTitle: string) => {
    if (!isEscapePressed && newTitle.trim()) {
      const trimmedTitle = newTitle.trim();
      updateMutation.mutate(
        { id, data: { title: trimmedTitle } },
        {
          onSuccess: () => {
            // If renaming the currently selected translation, update the middle panel title
            if (id === selectedTranslationId) {
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
    if (trimmedTitle && trimmedTitle !== title && selectedTranslationId) {
      updateMutation.mutate(
        {
          id: selectedTranslationId,
          data: { title: trimmedTitle },
        },
        {
          onSuccess: () => {
            // Update the title in the middle panel after successful save
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

  const handleConfirmDiscardAndContinue = () => {
    if (!unsavedChangesAction) return;
    
    // Clear unsaved changes flag first
    setHasUnsavedChanges(false);
    
    if (unsavedChangesAction.type === 'switch' && unsavedChangesAction.data) {
      // Navigate to the translation - state will be populated by the effect watching selectedTranslationFull
      setEditedOutputs({});
      setLocation(`/translate/${unsavedChangesAction.data.id}`);
    } else if (unsavedChangesAction.type === 'new') {
      // Continue with creating new translation
      createMutation.mutate();
    }
    
    setUnsavedChangesAction(null);
  };

  const handleSaveSource = () => {
    if (selectedTranslationId) {
      updateMutation.mutate({
        id: selectedTranslationId,
        data: { sourceText, title, selectedLanguages, isPrivate },
      });
      
      // Update last saved content and clear unsaved changes flag
      setLastSavedContent(sourceText);
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

      // Update the source text with the document content
      setSourceText(data.html);
      
      // Optionally update the translation title
      if (!title || title === "Untitled Translation") {
        setTitle(docTitle);
        setEditedTitle(docTitle);
      }

      // Save the changes if a translation is selected
      if (selectedTranslationId) {
        updateMutation.mutate({
          id: selectedTranslationId,
          data: { 
            sourceText: data.html, 
            title: !title || title === "Untitled Translation" ? docTitle : title 
          },
        });
      }

      // Calculate character count
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

  // PDF Import handlers
  const handlePdfImportClick = (type: 'quick' | 'deep') => {
    setPdfImportType(type);
    pdfInputRef.current?.click();
  };

  const handlePdfFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pdfImportType) {
      // Reset the input
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
      return;
    }

    setIsImportingPdf(true);
    const importType = pdfImportType;

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const endpoint = importType === 'quick' ? '/api/pdf/quick-import' : '/api/pdf/deep-import';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import PDF');
      }

      const data = await response.json() as { html: string; text: string; pageCount: number };

      // Update the source text with the imported content
      setSourceText(data.html);
      
      // Optionally update the translation title with the filename
      const fileName = file.name.replace(/\.pdf$/i, '');
      if (!title || title === "Untitled Translation") {
        setTitle(fileName);
        setEditedTitle(fileName);
      }

      // Save the changes if a translation is selected
      if (selectedTranslationId) {
        updateMutation.mutate({
          id: selectedTranslationId,
          data: { 
            sourceText: data.html, 
            title: !title || title === "Untitled Translation" ? fileName : title 
          },
        });
      }

      // Calculate character count
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.html;
      const charCount = tempDiv.textContent?.length || 0;

      toast({
        title: `✓ PDF imported successfully (${importType === 'quick' ? 'Quick' : 'Deep'})`,
        description: `"${fileName}" (${data.pageCount} page${data.pageCount !== 1 ? 's' : ''}, ${charCount.toLocaleString()} characters)`,
      });
    } catch (error: unknown) {
      const message = (error as Error)?.message || "Failed to import PDF";
      toast({
        title: "Error importing PDF",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsImportingPdf(false);
      setPdfImportType(null);
      // Reset the input so the same file can be selected again
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  const handleTogglePrivacy = (checked: boolean) => {
    if (selectedTranslationId && canEditSelected) {
      setIsPrivate(checked);
      updateMutation.mutate({
        id: selectedTranslationId,
        data: { isPrivate: checked },
      });
    }
  };

  const handleOpenLanguageDialog = () => {
    setTempSelectedLanguages([...selectedLanguages]);
    setIsLanguageDialogOpen(true);
  };

  const handleSaveLanguages = () => {
    setSelectedLanguages(tempSelectedLanguages);
    setIsLanguageDialogOpen(false);
    // Set active tab to first language if not set
    if (tempSelectedLanguages.length > 0 && !activeLanguageTab) {
      setActiveLanguageTab(tempSelectedLanguages[0]);
    }
    // Save to backend if translation exists
    if (selectedTranslationId) {
      updateMutation.mutate({
        id: selectedTranslationId,
        data: { selectedLanguages: tempSelectedLanguages },
      });
    }
  };

  const handleCancelLanguages = () => {
    setTempSelectedLanguages([...selectedLanguages]);
    setIsLanguageDialogOpen(false);
  };

  const handleRerunLanguage = async (langCode: string) => {
    if (!selectedTranslationId) {
      toast({
        title: "No translation selected",
        description: "Please select a translation first.",
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

    const currentTranslationId = selectedTranslationId;
    const language = languages.find(l => l.code === langCode);
    const languageName = language?.name || langCode;

    // Clear stopped polling state for this language's output (if any)
    // This ensures the new translation can poll properly
    const output = outputs.find(o => o.languageCode === langCode);
    if (output) {
      setStoppedPollingOutputs(prev => {
        const next = new Set(prev);
        next.delete(output.id);
        return next;
      });
    }

    // Mark this language as translating (optimistic UI update)
    setTranslatingLanguages(prev => {
      const newSet = new Set(prev[currentTranslationId] || []);
      newSet.add(langCode);
      return {
        ...prev,
        [currentTranslationId]: newSet
      };
    });

    // Clear previous runtimes for this language
    setTranslationRuntimes(prev => {
      const newRuntimes = { ...prev };
      if (newRuntimes[currentTranslationId]) {
        const langRuntimes = { ...newRuntimes[currentTranslationId] };
        delete langRuntimes[langCode];
        newRuntimes[currentTranslationId] = langRuntimes;
      }
      return newRuntimes;
    });
    setProofreadRuntimes(prev => {
      const newRuntimes = { ...prev };
      if (newRuntimes[currentTranslationId]) {
        const langRuntimes = { ...newRuntimes[currentTranslationId] };
        delete langRuntimes[langCode];
        newRuntimes[currentTranslationId] = langRuntimes;
      }
      return newRuntimes;
    });

    try {
      // Trigger translation - backend will automatically handle proofreading
      await translateSingleMutation.mutateAsync({ languageCode: langCode });
      
      // Remove from translating set - polling will update the real status
      setTranslatingLanguages(prev => {
        const newSet = new Set(prev[currentTranslationId] || []);
        newSet.delete(langCode);
        return {
          ...prev,
          [currentTranslationId]: newSet
        };
      });

      toast({
        title: "Translation started",
        description: `Translation and proofreading for ${languageName} has started.`,
      });
    } catch (error) {
      console.error(`Failed to rerun translation for ${langCode}:`, error);
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : `Failed to retranslate ${languageName}`,
        variant: "destructive",
      });
      
      // Remove from translating set on error
      setTranslatingLanguages(prev => {
        const newSet = new Set(prev[currentTranslationId] || []);
        newSet.delete(langCode);
        return {
          ...prev,
          [currentTranslationId]: newSet
        };
      });
    }
  };

  const handleTranslate = async () => {
    if (!selectedTranslationId) {
      toast({
        title: "No translation selected",
        description: "Please create or select a translation first.",
        variant: "destructive",
      });
      return;
    }
    if (selectedLanguages.length === 0) {
      toast({
        title: "No languages selected",
        description: "Please select at least one target language.",
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

    // Autosave if there are unsaved changes before translating
    if (hasUnsavedChanges) {
      await updateMutation.mutateAsync({
        id: selectedTranslationId,
        data: { sourceText, title, selectedLanguages, isPrivate, lastUsedModelId: selectedModel },
      });
      setLastSavedContent(sourceText);
      setHasUnsavedChanges(false);
    } else {
      // Just save the model used for this translation
      updateMutation.mutate({
        id: selectedTranslationId,
        data: { lastUsedModelId: selectedModel },
      });
    }

    const currentTranslationId = selectedTranslationId;
    if (!currentTranslationId) return;

    // Mark all languages as translating for this translation ID
    setTranslatingLanguages(prev => ({
      ...prev,
      [currentTranslationId]: new Set(selectedLanguages)
    }));
    
    // Set active tab to first language
    if (selectedLanguages.length > 0) {
      setActiveLanguageTab(selectedLanguages[0]);
    }

    // Clear previous runtimes for this translation
    setTranslationRuntimes(prev => ({
      ...prev,
      [currentTranslationId]: {}
    }));
    setProofreadRuntimes(prev => ({
      ...prev,
      [currentTranslationId]: {}
    }));

    // Translate all languages in parallel
    const promises = selectedLanguages.map(async (langCode) => {
      try {
        // Trigger translation - backend will automatically handle proofreading
        await translateSingleMutation.mutateAsync({ languageCode: langCode });
        
        // Remove from translating set - polling will update the real status
        setTranslatingLanguages(prev => {
          const newSet = new Set(prev[currentTranslationId] || []);
          newSet.delete(langCode);
          return {
            ...prev,
            [currentTranslationId]: newSet
          };
        });
      } catch (error) {
        console.error(`Failed to translate to ${langCode}:`, error);
        setTranslatingLanguages(prev => {
          const newSet = new Set(prev[currentTranslationId] || []);
          newSet.delete(langCode);
          return {
            ...prev,
            [currentTranslationId]: newSet
          };
        });
        throw error;
      }
    });

    try {
      await Promise.all(promises);
      const translation = translations.find(t => t.id === currentTranslationId);
      toast({
        title: "Translation started",
        description: `Translation and proofreading started for ${selectedLanguages.length} language${selectedLanguages.length > 1 ? 's' : ''}.`,
        action: (
          <ToastAction
            altText="View translation"
            onClick={() => {
              setLocation(`/translate/${currentTranslationId}`);
            }}
          >
            View
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "Failed to translate. Please check your API keys in settings.",
        variant: "destructive",
      });
    }
  };

  const handleCopyOutput = async (html: string, outputId: string) => {
    try {
      // Create a blob with both HTML and plain text
      const plainText = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
      
      // Use the modern Clipboard API to copy rich HTML
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });
      
      await navigator.clipboard.write([clipboardItem]);
      
      setCopiedOutputId(outputId);
      setTimeout(() => setCopiedOutputId(null), 2000);
      toast({
        title: "Copied to clipboard",
        description: "Rich formatted text has been copied. You can paste it into Google Docs!",
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleShareOutput = async (outputId: string) => {
    if (!selectedTranslationId) return;
    
    try {
      const shareUrl = `${window.location.origin}/translate/${selectedTranslationId}`;
      await navigator.clipboard.writeText(shareUrl);
      
      setSharedOutputId(outputId);
      setTimeout(() => setSharedOutputId(null), 2000);
      toast({
        title: "Link copied",
        description: "Shareable link has been copied to clipboard.",
      });
    } catch (error: unknown) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy failed",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleLanguageToggle = (languageCode: string) => {
    setTempSelectedLanguages(prev =>
      prev.includes(languageCode)
        ? prev.filter(l => l !== languageCode)
        : [...prev, languageCode]
    );
  };

  const handleSaveOutput = (outputId: string) => {
    const editedText = editedOutputs[outputId];
    if (editedText !== undefined) {
      updateOutputMutation.mutate({ id: outputId, text: editedText });
      // Note: We don't clear editedOutputs here anymore.
      // The Save/Discard buttons will automatically disappear once the refetch
      // completes and output.translatedText matches editedOutputs[outputId].
      // This prevents the "revert to old value" issue during the save process.
    }
  };

  const handleDiscardOutput = (outputId: string) => {
    setEditedOutputs(prev => {
      const newOutputs = { ...prev };
      delete newOutputs[outputId];
      return newOutputs;
    });
  };

  const handleFeedbackClick = (selectedText: string, outputId: string) => {
    setFeedbackSelectedText(selectedText);
    setFeedbackOutputId(outputId);
    setIsFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = (feedback: {
    selectedText: string;
    feedbackText: string;
    sentiment: "positive" | "negative";
  }) => {
    if (!selectedTranslationId || !feedbackOutputId) return;

    const output = outputs.find(o => o.id === feedbackOutputId);
    const model = output?.modelId ? models.find(m => m.id === output.modelId) : null;

    submitFeedbackMutation.mutate({
      translationId: selectedTranslationId,
      translationOutputId: feedbackOutputId,
      selectedText: feedback.selectedText,
      feedbackText: feedback.feedbackText,
      sentiment: feedback.sentiment,
      modelUsed: model?.modelIdentifier || null,
    });
  };

  const activeLanguages = languages.filter(l => l.isActive);
  const outputsByLanguage = outputs.reduce((acc, output) => {
    acc[output.languageCode] = output;
    return acc;
  }, {} as Record<string, TranslationOutput>);

  // Set active tab to first language if not set
  if (outputs.length > 0 && !activeLanguageTab) {
    setActiveLanguageTab(outputs[0].languageCode);
  }

  // Permission helper - check if user can edit a translation
  const canEdit = (translation: TranslationMetadata | Translation | null) => {
    if (!user || !translation) return false;
    
    // User can edit their own translations (public or private)
    if (translation.userId === user.id) return true;
    
    // Admins can edit PUBLIC translations from other users
    if (user.isAdmin && !translation.isPrivate) return true;
    
    return false;
  };

  // Helper to get ownership tooltip text
  const getOwnershipTooltip = (translation: TranslationMetadata | Translation) => {
    if (!user) return "";
    if (translation.userId === user.id) {
      return "Owned by me";
    }
    
    // Use owner information if available
    if (translation.owner) {
      const name = translation.owner.firstName || translation.owner.email || translation.userId;
      const email = translation.owner.email ? ` (${translation.owner.email})` : "";
      return `Owned by ${name}${email}`;
    }
    
    return `Owned by ${translation.userId}`;
  };

  // Get currently selected translation - use fetched full data first, fall back to stored data for newly created items
  const selectedTranslation = selectedTranslationFull || selectedTranslationData;
  const canEditSelected = canEdit(selectedTranslation);
  const isMobile = useIsMobile();

  // Create proofreading from translation output
  const createProofreadingMutation = useMutation({
    mutationFn: async ({ title, sourceText }: { title: string; sourceText: string }) => {
      const response = await apiRequest("POST", "/api/proofreadings", {
        title,
        sourceText,
        isPrivate: false,
        selectedCategories: [],
      });
      return await response.json();
    },
    onSuccess: (data: { id: string }) => {
      // Navigate to proofread page with the new proofreading ID
      setLocation(`/proofread#${data.id}`);
      toast({
        title: "Proofreading created",
        description: "Your proofreading project has been created.",
      });
    },
  });

  const handleFinalProofread = async (translatedText: string, languageName: string) => {
    if (!selectedTranslation) return;
    
    const proofreadTitle = `[${languageName.toUpperCase()}] ${selectedTranslation.title}`;
    createProofreadingMutation.mutate({
      title: proofreadTitle,
      sourceText: translatedText,
    });
  };

  return (
    <div className="flex h-full overflow-y-auto md:overflow-hidden flex-col md:flex-row">
      {/* Left Sidebar - Translation History (Desktop only) */}
      <div className={`hidden md:flex ${isLeftPanelCollapsed ? 'w-12' : 'w-80'} flex-col border-r bg-sidebar flex-none transition-all duration-200`}>
        <div className={`flex items-center ${isLeftPanelCollapsed ? 'flex-col justify-start gap-2' : 'justify-between'} border-b p-4`}>
          {!isLeftPanelCollapsed && !isSearchExpanded && <h2 className="text-lg font-semibold">History</h2>}
          {!isLeftPanelCollapsed && isSearchExpanded ? (
            <div className="flex-1 flex items-center gap-2 w-full">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search (min 2 chars)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                className="h-8 flex-1"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearSearch}
                className="h-8 w-8 p-0 flex-shrink-0"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleSearch}
                className="h-8 w-8 p-0 flex-shrink-0"
                title="Search translations"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className={`flex items-center ${isLeftPanelCollapsed ? 'flex-col' : 'gap-2'} ${isLeftPanelCollapsed ? '' : 'ml-auto'}`}>
              {!isLeftPanelCollapsed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleToggleSearch}
                  className="h-8 w-8 p-0"
                  title="Search translations"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={handleNewTranslation} 
                disabled={createMutation.isPending} 
                data-testid="button-new-translation"
                variant="outline"
                className={isLeftPanelCollapsed ? "h-8 w-8 p-0" : ""}
                title="New Translation"
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                className="h-8 w-8 p-0"
                title={isLeftPanelCollapsed ? "Expand panel" : "Collapse panel"}
              >
                {isLeftPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        {!isLeftPanelCollapsed && (
          <ScrollArea className="flex-1" viewportClassName="max-w-full">
          {translationsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !translationsData || translationsData.pages[0]?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="mb-2 text-sm font-medium">{searchTerm ? "No results found" : "No translations yet"}</p>
              <p className="mb-4 text-xs text-muted-foreground">
                {searchTerm ? "Try a different search term" : "Create your first translation to get started"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-2" style={{ width: '100%', maxWidth: '20rem' }}>
              <TooltipProvider>
                {translations.map((translation) => (
                  <Card
                    key={translation.id}
                    className={`group cursor-pointer p-2 hover-elevate overflow-hidden ${
                      selectedTranslationId === translation.id ? "bg-sidebar-accent" : ""
                    }`}
                    onClick={() => handleSelectTranslation(translation)}
                    data-testid={`card-translation-${translation.id}`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-shrink-0 pt-0.5" onClick={(e) => e.stopPropagation()}>
                            {translation.isPrivate ? (
                              <Lock className="h-4 w-4 text-muted-foreground/60" data-testid={`icon-ownership-private-${translation.id}`} />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground/60" data-testid={`icon-ownership-public-${translation.id}`} />
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{getOwnershipTooltip(translation)}</p>
                        </TooltipContent>
                      </Tooltip>
                      <div className="flex-1 min-w-0">
                        {isRenamingId === translation.id ? (
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameInList(translation.id, renameValue)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setIsEscapePressed(false);
                                handleRenameInList(translation.id, renameValue);
                              } else if (e.key === "Escape") {
                                setIsEscapePressed(true);
                                setIsRenamingId(null);
                              }
                            }}
                            autoFocus
                            className="h-auto p-0 border-none focus-visible:ring-0"
                            onClick={(e) => e.stopPropagation()}
                            data-testid="input-rename-translation"
                          />
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="text-sm font-medium truncate flex-1 min-w-0">{translation.title}</h3>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {formatDate(translation.updatedAt)}
                        </p>
                      </div>
                      {canEdit(translation) && (
                        <div className="flex items-center gap-1 invisible group-hover:visible flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsRenamingId(translation.id);
                              setRenameValue(translation.title);
                            }}
                            data-testid={`button-edit-${translation.id}`}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(translation.id);
                            }}
                            data-testid={`button-delete-${translation.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                  ))}
              </TooltipProvider>
              
              {/* Load More / Loading indicator */}
              {hasNextPage && (
                <div className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="w-full"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
          </ScrollArea>
        )}
      </div>

      {/* Mobile History Sheet Button */}
      {isMobile && (
        <div className="flex items-center justify-between gap-2 border-b p-3 bg-background md:hidden">
          <MobileHistorySheet
            translations={translations}
            isLoading={translationsLoading}
            selectedTranslationId={selectedTranslationId}
            onSelectTranslation={handleSelectTranslation}
            onNewTranslation={handleNewTranslation}
            isCreating={createMutation.isPending}
            onRename={handleRenameInList}
            onDelete={(id) => {
              setDeleteConfirmId(id);
              deleteMutation.mutate(id);
            }}
            canEdit={canEdit}
            getOwnershipTooltip={getOwnershipTooltip}
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                History
                {selectedTranslation && (
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {selectedTranslation.title}
                  </span>
                )}
              </Button>
            }
          />
          <Button
            size="sm"
            onClick={handleNewTranslation}
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
            {/* Language Multi-Select */}
            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            <Label className="text-sm font-medium whitespace-nowrap">Languages:</Label>
            <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-32" 
                  onClick={handleOpenLanguageDialog}
                  disabled={!canEditSelected}
                  data-testid="button-select-languages"
                >
                  {selectedLanguages.length === 0
                    ? "Select..."
                    : `${selectedLanguages.length} selected`}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Target Languages</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-96">
                  <div className="space-y-2 p-4">
                    {activeLanguages.map((lang) => (
                      <div key={lang.code} className="flex items-center gap-2">
                        <Checkbox
                          id={`lang-${lang.code}`}
                          checked={tempSelectedLanguages.includes(lang.code)}
                          onCheckedChange={() => handleLanguageToggle(lang.code)}
                          data-testid={`checkbox-lang-${lang.code}`}
                        />
                        <Label htmlFor={`lang-${lang.code}`} className="cursor-pointer">
                          {lang.name} ({lang.nativeName})
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCancelLanguages} data-testid="button-cancel-languages">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLanguages} data-testid="button-save-languages">
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Model Selection */}
          <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
            <Label className="text-sm font-medium whitespace-nowrap">Model:</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!canEditSelected}>
              <SelectTrigger className="w-full max-w-xs flex-1" data-testid="select-model">
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

          {/* Translate Button */}
          {(() => {
            const currentTranslating = selectedTranslationId ? translatingLanguages[selectedTranslationId] : undefined;
            const isTranslating = (currentTranslating?.size ?? 0) > 0;
            
            if (selectedLanguages.length === 0 && selectedTranslationId) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        onClick={handleTranslate}
                        disabled={!selectedTranslationId || !canEditSelected || isTranslating || selectedLanguages.length === 0}
                        className="flex-shrink-0"
                        data-testid="button-translate"
                        variant="outline"
                      >
                        {isTranslating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Translate
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Please select at least one language to translate</p>
                  </TooltipContent>
                </Tooltip>
              );
            } else {
              return (
                <Button
                  onClick={handleTranslate}
                  disabled={!selectedTranslationId || !canEditSelected || isTranslating || selectedLanguages.length === 0}
                  className="flex-shrink-0"
                  data-testid="button-translate"
                  variant="outline"
                >
                  {isTranslating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Translate
                </Button>
              );
            }
          })()}
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
                      placeholder="Enter translation title..."
                      disabled={!selectedTranslationId || !canEditSelected}
                      data-testid="input-translation-title"
                    />
                  ) : (
                    <div
                      className={`rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background min-h-9 ${canEditSelected ? 'cursor-text hover:border-accent-foreground/20' : 'cursor-default'}`}
                      onClick={selectedTranslationId && canEditSelected ? handleStartEditingTitle : undefined}
                      data-testid="text-translation-title"
                    >
                      {title || "Enter translation title..."}
                    </div>
                  )}
                </div>
                {selectedTranslationId && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Mobile: Show only icon, Desktop: Show full labels */}
                    <div className="hidden sm:flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Public</span>
                    </div>
                    {/* Mobile icon - changes based on state */}
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
                      data-testid="switch-toggle-privacy"
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
                  {!isMobile && (
                    <Label className="text-sm font-medium">
                      Source Text
                    </Label>
                  )}
                  {/* Unified Import Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!selectedTranslationId || !canEditSelected || isLoadingGoogleDoc || isImportingPdf}
                        className="h-7"
                      >
                        {(isLoadingGoogleDoc || isImportingPdf) ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            {isMobile ? "..." : "Importing..."}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-1 h-3 w-3" />
                            {isMobile ? "Import" : "Import"}
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => setIsGoogleDocsPickerOpen(true)}
                        disabled={isLoadingGoogleDoc || isImportingPdf}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>Google Doc</span>
                          <span className="text-xs text-muted-foreground">Import from Google Drive</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePdfImportClick('quick')}
                        disabled={isLoadingGoogleDoc || isImportingPdf}
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>Quick PDF Import</span>
                          <span className="text-xs text-muted-foreground">Basic text extraction</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handlePdfImportClick('deep')}
                        disabled={isLoadingGoogleDoc || isImportingPdf}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>Advanced PDF Import</span>
                          <span className="text-xs text-muted-foreground">AI-enhanced formatting</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {sourceText ? new DOMParser().parseFromString(sourceText, 'text/html').body.textContent?.length || 0 : 0} characters
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!selectedTranslationId || !sourceText}
                        className="h-7 w-7 p-0"
                      >
                        <Share className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleCopySource}
                        disabled={!selectedTranslationId || !sourceText}
                      >
                        {copiedSource ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy Text
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={handleCreateGoogleDocFromSource}
                        disabled={isCreatingGoogleDoc || !sourceText || createGoogleDocFromTranslationSourceMutation.isPending}
                      >
                        {isCreatingGoogleDoc || createGoogleDocFromTranslationSourceMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="mr-2 h-4 w-4" />
                        )}
                        Create Google Doc
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={handleShareLink}
                        disabled={!selectedTranslationId}
                      >
                        {copiedLink ? (
                          <Check className="mr-2 h-4 w-4" />
                        ) : (
                          <Link2 className="mr-2 h-4 w-4" />
                        )}
                        Share Link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <RichTextEditor
                content={sourceText}
                onChange={(value) => {
                  setSourceText(value);
                  // Check if content has changed from last saved
                  setHasUnsavedChanges(value !== lastSavedContent);
                }}
                placeholder="Enter text to translate..."
                editable={!!selectedTranslationId && canEditSelected}
                className="flex-1 overflow-auto"
                editorKey={`source-${selectedTranslationId || 'none'}`}
              />
              <div className="mt-2 flex justify-end gap-2 flex-shrink-0">
                {hasUnsavedChanges && (
                  <Button
                    onClick={handleDiscardChanges}
                    variant="outline"
                    disabled={!selectedTranslationId || !canEditSelected}
                    size="sm"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Discard
                  </Button>
                )}
                <Button
                  onClick={handleSaveSource}
                  disabled={!selectedTranslationId || !canEditSelected || !hasUnsavedChanges || updateMutation.isPending}
                  size="sm"
                  data-testid="button-save-source"
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Right Panel - Output */}
        <div className="flex flex-1 flex-col min-w-0 border-t md:border-t-0 md:border-l md:overflow-hidden">
          <div className="border-b px-4 py-5 flex-shrink-0">
            <h2 className="text-lg font-semibold">Translations</h2>
          </div>

          <div className="flex-1 overflow-y-auto md:overflow-hidden">
          {!selectedTranslationId ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <p className="mb-2 text-sm font-medium">No translation selected</p>
                <p className="text-xs text-muted-foreground">
                  Select or create a translation to view results
                </p>
              </div>
            </div>
          ) : selectedLanguages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <p className="mb-2 text-sm font-medium">No languages selected</p>
                <p className="text-xs text-muted-foreground">
                  Select languages and click Translate to generate translations
                </p>
              </div>
            </div>
          ) : (
            <Tabs value={activeLanguageTab} onValueChange={setActiveLanguageTab} className="flex h-full flex-col">
              <TabsList className="mx-2 md:mx-4 mt-2 md:mt-4 w-auto justify-start overflow-x-auto overflow-y-hidden flex-shrink-0 scrollbar-hide">
                {selectedLanguages.map((langCode) => {
                  const language = activeLanguages.find(l => l.code === langCode);
                  const output = outputs.find(o => o.languageCode === langCode);
                  // Use server-side status as source of truth
                  const isTranslating = output?.translationStatus === 'translating';
                  const isProofreading = output?.proofreadStatus === 'proof_reading' || output?.proofreadStatus === 'applying_proofread';
                  const isCompleted = output?.translationStatus === 'completed' && output?.proofreadStatus === 'completed';
                  const isFailed = output?.translationStatus === 'failed' || output?.proofreadStatus === 'failed';
                  const isPollingStopped = output && stoppedPollingOutputs.has(output.id);
                  
                  return (
                    <TabsTrigger key={langCode} value={langCode} data-testid={`tab-${langCode}`} className="gap-2 h-16 md:h-20 whitespace-nowrap">
                      {language?.name || langCode}
                      {isTranslating && !isPollingStopped && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isProofreading && !isPollingStopped && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      {isCompleted && <Check className="h-3 w-3 text-green-600" />}
                      {isFailed && <X className="h-3 w-3 text-red-600" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {selectedLanguages.map((langCode) => {
                const output = outputs.find(o => o.languageCode === langCode);
                const language = activeLanguages.find(l => l.code === langCode);
                // Use server-side status as source of truth
                const isTranslating = output?.translationStatus === 'translating';
                const isProofreading = output?.proofreadStatus === 'proof_reading' || output?.proofreadStatus === 'applying_proofread';
                
                return <TabsContent
                  key={langCode}
                  value={langCode}
                  className="flex-1 overflow-hidden"
                >
                  {isTranslating && output && stoppedPollingOutputs.has(output.id) ? (
                    <div className="flex h-full items-center justify-center p-8">
                      <div className="text-center space-y-4">
                        <p className="text-sm font-medium">Translation stopped</p>
                        <Button
                          onClick={() => handleRerunLanguage(langCode)}
                          variant="outline"
                          size="sm"
                          className="mt-4"
                        >
                          <RotateCw className="h-4 w-4 mr-2" />
                          Restart
                        </Button>
                      </div>
                    </div>
                  ) : isTranslating ? (
                    <div className="flex h-full items-center justify-center p-8">
                      <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-sm font-medium">Translating to {language?.name || langCode}...</p>
                        <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                        {output && (
                          <Button
                            onClick={() => {
                              setStoppedPollingOutputs(prev => new Set(prev).add(output.id));
                              toast({
                                title: "Polling stopped",
                                description: "You can restart the translation if needed.",
                              });
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                          >
                            <Square className="h-4 w-4 mr-2 fill-current" />
                            Stop
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : isProofreading && output ? (
                    <div className="flex flex-col h-full px-6 pt-4 pb-6 gap-4">
                      {/* Header with language, status, and View Changes */}
                      <div className="flex items-center justify-between flex-shrink-0 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">
                            {output.languageName}
                          </Label>
                          {output.translationStatus === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Translated</span>
                            </span>
                          )}
                          {output.proofreadStatus === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Proof read</span>
                            </span>
                          )}
                          {output.proofreadProposedChanges != null && (
                            <Badge 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-secondary/80"
                              onClick={() => {
                                setProofreadChangesOutputId(output.id);
                                setProofreadChangesDialogOpen(true);
                              }}
                            >
                              View Changes
                            </Badge>
                          )}
                          {stoppedPollingOutputs.has(output.id) ? (
                            <Badge variant="outline" className="text-xs text-orange-600">
                              Polling stopped
                            </Badge>
                          ) : (
                            <>
                              <Badge variant="outline" className="text-xs">
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                {output.proofreadStatus === 'applying_proofread' ? 'Applying changes...' : 'Generating changes...'}
                              </Badge>
                              {output.translationStatus === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setStoppedPollingOutputs(prev => new Set(prev).add(output.id));
                                    toast({
                                      title: "Polling stopped",
                                      description: "You can restart the translation if needed.",
                                    });
                                  }}
                                  className="h-6 px-2 text-xs"
                                  title="Stop polling"
                                >
                                  <Square className="h-3 w-3 mr-1 fill-current" />
                                  Stop
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                        {/* Icons - desktop only */}
                        {!isMobile && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRerunLanguage(langCode)}
                              disabled={isTranslating}
                              data-testid={`button-rerun-${output.id}`}
                              title="Rerun translation"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!output.translatedText}
                                  data-testid={`button-share-${output.id}`}
                                >
                                  <Share className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleCopyOutput(editedOutputs[output.id] ?? output.translatedText ?? '', output.id)}
                                  data-testid={`button-copy-${output.id}`}
                                >
                                  {copiedOutputId === output.id ? (
                                    <Check className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Copy className="mr-2 h-4 w-4" />
                                  )}
                                  Copy Text
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => handleCreateGoogleDoc(output.id, output.languageName)}
                                  disabled={!output.translatedText || creatingGoogleDocOutputId === output.id || isTranslating || isProofreading}
                                  data-testid={`button-create-google-doc-proofreading-${output.id}`}
                                >
                                  {creatingGoogleDocOutputId === output.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="mr-2 h-4 w-4" />
                                  )}
                                  Create Google Doc
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => handleShareOutput(output.id)}
                                  data-testid={`button-share-link-${output.id}`}
                                >
                                  {sharedOutputId === output.id ? (
                                    <Check className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Link2 className="mr-2 h-4 w-4" />
                                  )}
                                  Share Link
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      
                      {/* Icons row - mobile only */}
                      {isMobile && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRerunLanguage(langCode)}
                            disabled={isTranslating}
                            data-testid={`button-rerun-${output.id}`}
                            title="Rerun translation"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyOutput(editedOutputs[output.id] ?? output.translatedText ?? '', output.id)}
                            data-testid={`button-copy-${output.id}`}
                          >
                            {copiedOutputId === output.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateGoogleDoc(output.id, output.languageName)}
                            disabled={!output.translatedText || creatingGoogleDocOutputId === output.id || isTranslating || isProofreading}
                            data-testid={`button-create-google-doc-proofreading-${output.id}`}
                            title="Create Google Doc"
                          >
                            {creatingGoogleDocOutputId === output.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShareOutput(output.id)}
                            data-testid={`button-share-${output.id}`}
                          >
                            {sharedOutputId === output.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Share className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Show restart button if polling is stopped */}
                      {stoppedPollingOutputs.has(output.id) && (
                        <div className="flex items-center justify-center py-4 border-y">
                          <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">Polling stopped</p>
                            <Button
                              onClick={() => handleRerunLanguage(langCode)}
                              variant="outline"
                              size="sm"
                            >
                              <RotateCw className="h-4 w-4 mr-2" />
                              Restart
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Editor with internal scrolling - show current translation during proof-reading */}
                      <RichTextEditor
                        content={editedOutputs[output.id] ?? output.translatedText ?? ''}
                        onChange={(html) => setEditedOutputs(prev => ({ ...prev, [output.id]: html }))}
                        placeholder="Translation will appear here..."
                        editable={canEditSelected}
                        className="flex-1 overflow-auto"
                        editorKey={`output-${output.id}`}
                        showFeedbackButton={true}
                        onFeedbackClick={(selectedText) => handleFeedbackClick(selectedText, output.id)}
                      />

                      {/* Footer pinned to bottom */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 pt-2">
                        <div className="space-y-0.5">
                          <div>
                            Model: {models.find(m => m.id === output.modelId)?.name || "Unknown"}
                            {selectedTranslationId && translationRuntimes[selectedTranslationId]?.[langCode] && (
                              <span className="ml-1">
                                (Translation: {translationRuntimes[selectedTranslationId][langCode].toFixed(1)}s)
                              </span>
                            )}
                          </div>
                          <div>
                            Last Updated: {formatDate(output.updatedAt)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFinalProofread(editedOutputs[output.id] ?? output.translatedText ?? '', output.languageName)}
                          disabled={createProofreadingMutation.isPending || !(editedOutputs[output.id] ?? output.translatedText)}
                          className="ml-auto"
                        >
                          {createProofreadingMutation.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Final ProofRead"
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : output ? (
                    <div className="flex flex-col h-full px-4 md:px-6 pt-3 md:pt-4 pb-4 md:pb-6 gap-3 md:gap-4">
                      {/* Header with language, status, and View Changes */}
                      <div className="flex items-center justify-between flex-shrink-0 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Label className="text-sm font-medium">
                            {output.languageName}
                          </Label>
                          {output.translationStatus === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Translated</span>
                            </span>
                          )}
                          {output.proofreadStatus === 'completed' && (
                            <span className="inline-flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Proof read</span>
                            </span>
                          )}
                          {output.proofreadProposedChanges != null && (
                            <Badge 
                              variant="secondary" 
                              className="cursor-pointer hover:bg-secondary/80"
                              onClick={() => {
                                setProofreadChangesOutputId(output.id);
                                setProofreadChangesDialogOpen(true);
                              }}
                            >
                              View Changes
                            </Badge>
                          )}
                        </div>
                        {/* Icons - desktop only */}
                        {!isMobile && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRerunLanguage(langCode)}
                              disabled={isTranslating}
                              data-testid={`button-rerun-${output.id}`}
                              title="Rerun translation"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!output.translatedText}
                                  data-testid={`button-share-${output.id}`}
                                >
                                  <Share className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleCopyOutput(editedOutputs[output.id] ?? output.translatedText ?? '', output.id)}
                                  data-testid={`button-copy-${output.id}`}
                                >
                                  {copiedOutputId === output.id ? (
                                    <Check className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Copy className="mr-2 h-4 w-4" />
                                  )}
                                  Copy Text
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => handleCreateGoogleDoc(output.id, output.languageName)}
                                  disabled={!output.translatedText || creatingGoogleDocOutputId === output.id || isTranslating || isProofreading}
                                  data-testid={`button-create-google-doc-proofreading-${output.id}`}
                                >
                                  {creatingGoogleDocOutputId === output.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <FileText className="mr-2 h-4 w-4" />
                                  )}
                                  Create Google Doc
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem
                                  onClick={() => handleShareOutput(output.id)}
                                  data-testid={`button-share-link-${output.id}`}
                                >
                                  {sharedOutputId === output.id ? (
                                    <Check className="mr-2 h-4 w-4" />
                                  ) : (
                                    <Link2 className="mr-2 h-4 w-4" />
                                  )}
                                  Share Link
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                      
                      {/* Icons row - mobile only */}
                      {isMobile && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRerunLanguage(langCode)}
                            disabled={isTranslating}
                            data-testid={`button-rerun-${output.id}`}
                            title="Rerun translation"
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyOutput(editedOutputs[output.id] ?? output.translatedText ?? '', output.id)}
                            data-testid={`button-copy-${output.id}`}
                          >
                            {copiedOutputId === output.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateGoogleDoc(output.id, output.languageName)}
                            disabled={!output.translatedText || creatingGoogleDocOutputId === output.id || isTranslating || isProofreading}
                            data-testid={`button-create-google-doc-proofreading-${output.id}`}
                            title="Create Google Doc"
                          >
                            {creatingGoogleDocOutputId === output.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleShareOutput(output.id)}
                            data-testid={`button-share-${output.id}`}
                          >
                            {sharedOutputId === output.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Share className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Editor with internal scrolling */}
                      <RichTextEditor
                        content={editedOutputs[output.id] ?? output.translatedText ?? ''}
                        onChange={(html) => setEditedOutputs(prev => ({ ...prev, [output.id]: html }))}
                        placeholder="Translation will appear here..."
                        editable={canEditSelected}
                        className="flex-1 overflow-auto"
                        editorKey={`output-${output.id}`}
                        showFeedbackButton={true}
                        onFeedbackClick={(selectedText) => handleFeedbackClick(selectedText, output.id)}
                      />

                      {/* Footer pinned to bottom */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground flex-shrink-0 pt-2">
                        <div className="space-y-0.5">
                          <div>
                            Model: {models.find(m => m.id === output.modelId)?.name || "Unknown"}
                            {selectedTranslationId && (translationRuntimes[selectedTranslationId]?.[langCode] || proofreadRuntimes[selectedTranslationId]?.[langCode]) && (
                              <span className="ml-1">
                                (
                                {translationRuntimes[selectedTranslationId]?.[langCode] && `Translation: ${translationRuntimes[selectedTranslationId][langCode].toFixed(1)}s`}
                                {translationRuntimes[selectedTranslationId]?.[langCode] && proofreadRuntimes[selectedTranslationId]?.[langCode] && '; '}
                                {proofreadRuntimes[selectedTranslationId]?.[langCode] && `Proof Read: ${proofreadRuntimes[selectedTranslationId][langCode].toFixed(1)}s`}
                                )
                              </span>
                            )}
                          </div>
                          <div>
                            Last Updated: {formatDate(output.updatedAt)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFinalProofread(editedOutputs[output.id] ?? output.translatedText ?? '', output.languageName)}
                          disabled={createProofreadingMutation.isPending || !(editedOutputs[output.id] ?? output.translatedText)}
                          className="ml-auto"
                        >
                          {createProofreadingMutation.isPending ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Final ProofRead"
                          )}
                        </Button>
                      </div>

                      {/* Show Save/Discard buttons when there are unsaved changes */}
                      {editedOutputs[output.id] !== undefined && 
                       editedOutputs[output.id] !== (output.translatedText ?? '') && (
                        <div className="flex items-center gap-2 flex-shrink-0 pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiscardOutput(output.id)}
                            disabled={updateOutputMutation.isPending}
                            className="h-7 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Discard
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveOutput(output.id)}
                            disabled={updateOutputMutation.isPending}
                            className="h-7 text-xs"
                          >
                            {updateOutputMutation.isPending ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8">
                      <div className="text-center">
                        <p className="mb-4 text-sm font-medium text-muted-foreground">
                          No translation for {language?.name || langCode}
                        </p>
                        <Button
                          onClick={() => handleRerunLanguage(langCode)}
                          disabled={isTranslating || !selectedModel || !selectedTranslationId}
                          data-testid={`button-translate-${langCode}`}
                        >
                          {isTranslating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Translating...
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-2" />
                              Translate
                            </>
                          )}
                        </Button>
                        {(!selectedModel || !selectedTranslationId) && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {!selectedModel ? "Please select a model first" : "Please select a translation first"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>;
              })}
            </Tabs>
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

      {/* Hidden PDF File Input */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        onChange={handlePdfFileSelected}
        className="hidden"
      />

      {/* Feedback Modal */}
      {feedbackOutputId && (
        <FeedbackModal
          open={isFeedbackModalOpen}
          onOpenChange={setIsFeedbackModalOpen}
          translationId={selectedTranslationId || ""}
          translationOutputId={feedbackOutputId}
          languageName={
            outputs.find(o => o.id === feedbackOutputId)?.languageName || ""
          }
          selectedText={feedbackSelectedText}
          onSubmit={handleSubmitFeedback}
          isSubmitting={submitFeedbackMutation.isPending}
        />
      )}

      {/* Proofread Changes Dialog */}
      {proofreadChangesOutputId && (
        <ProofreadChangesDialog
          open={proofreadChangesDialogOpen}
          onOpenChange={setProofreadChangesDialogOpen}
          proposedChanges={
            (outputs.find(o => o.id === proofreadChangesOutputId)?.proofreadProposedChanges as string | Record<string, unknown> | null | undefined)
          }
          languageName={
            outputs.find(o => o.id === proofreadChangesOutputId)?.languageName || ""
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Translation</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const translation = translations.find(t => t.id === deleteConfirmId);
                if (!translation) return "Are you sure you want to delete this translation?";
                
                const isOwner = user && translation.userId === user.id;
                const ownerText = isOwner ? "you" : 
                  (translation.owner?.firstName || translation.owner?.email || translation.userId);
                
                return (
                  <>
                    You are deleting <span className="font-semibold">"{translation.title}"</span> by {ownerText}.
                    <br /><br />
                    This action cannot be undone and will remove all associated translation outputs.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
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