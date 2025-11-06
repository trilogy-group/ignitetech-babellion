import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, Copy, Check, Lock, Globe, Pencil, FileText, Save, X, RotateCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/rich-text-editor";
import { GoogleDocsPicker } from "@/components/google-docs-picker";
import { FeedbackModal } from "@/components/feedback-modal";
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
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Translation, TranslationOutput, AiModel, Language, TranslationFeedback } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHistorySheet } from "@/components/mobile-history-sheet";
import { History } from "lucide-react";

export default function Translate() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedTranslationId, setSelectedTranslationId] = useState<string | null>(null);
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
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("");
  const [editedOutputs, setEditedOutputs] = useState<Record<string, string>>({});
  const [isPrivate, setIsPrivate] = useState(false);
  // Track progress per translation ID to persist across card switches
  const [translatingLanguages, setTranslatingLanguages] = useState<Record<string, Set<string>>>({});
  const [proofreadingLanguages, setProofreadingLanguages] = useState<Record<string, Set<string>>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [translationRuntimes, setTranslationRuntimes] = useState<Record<string, Record<string, number>>>({});
  const [proofreadRuntimes, setProofreadRuntimes] = useState<Record<string, Record<string, number>>>({});
  const [isGoogleDocsPickerOpen, setIsGoogleDocsPickerOpen] = useState(false);
  const [isLoadingGoogleDoc, setIsLoadingGoogleDoc] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackSelectedText, setFeedbackSelectedText] = useState("");
  const [feedbackOutputId, setFeedbackOutputId] = useState<string | null>(null);

  // Fetch translations
  const { data: translations = [], isLoading: translationsLoading } = useQuery<Translation[]>({
    queryKey: ["/api/translations"],
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
  });

  // Get default model
  const defaultModel = models.find(m => m.isDefault);

  // Set default model on load
  if (!selectedModel && defaultModel) {
    setSelectedModel(defaultModel.id);
  }

  // Track if we've initialized to avoid loops
  const hasInitialized = useRef(false);
  // Ref to track current selectedTranslationId for hashchange handler
  const selectedTranslationIdRef = useRef<string | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedTranslationIdRef.current = selectedTranslationId;
  }, [selectedTranslationId]);

  // Handle hash-based URL navigation on initial load only
  useEffect(() => {
    if (!translationsLoading && translations.length > 0 && !hasInitialized.current && !selectedTranslationId) {
      hasInitialized.current = true;
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        const translation = translations.find(t => t.id === hash);
        if (translation) {
          handleSelectTranslation(translation);
          return; // Exit early to avoid auto-selecting first
        }
      }
      // Auto-select first translation if no hash
      const firstTranslation = translations[0];
      if (firstTranslation) {
        handleSelectTranslation(firstTranslation);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translationsLoading]);

  // Flag to prevent hashchange handler from running during programmatic updates
  const isUpdatingHashRef = useRef(false);

  // Listen to browser hash changes (back/forward buttons) - ignore programmatic updates
  useEffect(() => {
    const handleHashChange = () => {
      // Ignore if we're programmatically updating the hash
      if (isUpdatingHashRef.current) {
        return;
      }
      if (!translationsLoading && translations.length > 0) {
        const hash = window.location.hash.slice(1);
        if (hash) {
          const translation = translations.find(t => t.id === hash);
          // Use ref to get current selectedTranslationId value
          if (translation && translation.id !== selectedTranslationIdRef.current) {
            handleSelectTranslation(translation);
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translations, translationsLoading]); // Remove selectedTranslationId from deps to avoid recreating listener

  // Update URL hash when translation is manually selected (use replaceState to avoid hashchange event)
  useEffect(() => {
    if (selectedTranslationId && hasInitialized.current) {
      const currentHash = window.location.hash.slice(1);
      if (currentHash !== selectedTranslationId) {
        isUpdatingHashRef.current = true;
        // Use replaceState to avoid triggering hashchange event
        window.history.replaceState(null, '', `${window.location.pathname}#${selectedTranslationId}`);
        // Reset flag after a tick to allow future hashchange events
        setTimeout(() => {
          isUpdatingHashRef.current = false;
        }, 100);
      }
    }
  }, [selectedTranslationId]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      if (selectedTranslationId === deletedId) {
        setSelectedTranslationId(null);
        setSourceText("");
        setTitle("Untitled Translation");
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

  // Proof-read translation mutation
  const proofreadMutation = useMutation({
    mutationFn: async ({ outputId, translationId }: { outputId: string; translationId: string }) => {
      const response = await apiRequest("POST", "/api/proofread-translation", {
        outputId,
      });
      return { output: await response.json() as TranslationOutput, translationId, outputId };
    },
    onSuccess: (data) => {
      // Clear any manual edits for this output so the proofread text is displayed
      setEditedOutputs(prev => {
        const newOutputs = { ...prev };
        delete newOutputs[data.outputId];
        return newOutputs;
      });
      queryClient.invalidateQueries({ queryKey: ["/api/translations", data.translationId, "outputs"] });
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

  const handleSelectTranslation = (translation: Translation) => {
    setSelectedTranslationId(translation.id);
    setSourceText(translation.sourceText);
    setTitle(translation.title);
    setSelectedLanguages(translation.selectedLanguages || []);
    setIsPrivate(translation.isPrivate ?? false);
    // Pre-select the last used model if available
    if (translation.lastUsedModelId) {
      setSelectedModel(translation.lastUsedModelId);
    }
    setEditedOutputs({});
    // Don't clear progress state - preserve it per translation ID
    // Progress is tracked per translation ID, so switching cards doesn't lose progress
    
    // Auto-select first language tab if languages exist
    if (translation.selectedLanguages && translation.selectedLanguages.length > 0) {
      setActiveLanguageTab(translation.selectedLanguages[0]);
    } else {
      setActiveLanguageTab("");
    }
  };

  const handleNewTranslation = () => {
    // Create immediately
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

  const handleSaveSource = () => {
    if (selectedTranslationId) {
      updateMutation.mutate({
        id: selectedTranslationId,
        data: { sourceText, title, selectedLanguages, isPrivate },
      });
    }
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

    // Mark this language as translating
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
      const startTime = Date.now();
      const output = await translateSingleMutation.mutateAsync({ languageCode: langCode }) as TranslationOutput;
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Store the runtime
      setTranslationRuntimes(prev => ({
        ...prev,
        [currentTranslationId]: {
          ...(prev[currentTranslationId] || {}),
          [langCode]: duration
        }
      }));
      
      // Remove from translating set
      setTranslatingLanguages(prev => {
        const newSet = new Set(prev[currentTranslationId] || []);
        newSet.delete(langCode);
        return {
          ...prev,
          [currentTranslationId]: newSet
        };
      });

      // Trigger proof-reading after translation completes
      if (output) {
        toast({
          title: "Proof Reading in progress",
          description: `Proof Reading: ${languageName} in progress`,
        });

        // Add to proofreading set
        setProofreadingLanguages(prev => {
          const newSet = new Set(prev[currentTranslationId] || []);
          newSet.add(langCode);
          return {
            ...prev,
            [currentTranslationId]: newSet
          };
        });

        // Proof-read the translation
        const proofreadStartTime = Date.now();
        try {
          await proofreadMutation.mutateAsync({ outputId: output.id, translationId: currentTranslationId });
          const proofreadEndTime = Date.now();
          const proofreadDuration = (proofreadEndTime - proofreadStartTime) / 1000;
          
          // Store the proof-reading runtime
          setProofreadRuntimes(prev => ({
            ...prev,
            [currentTranslationId]: {
              ...(prev[currentTranslationId] || {}),
              [langCode]: proofreadDuration
            }
          }));
        } catch (error) {
          console.error(`Failed to proofread ${langCode}:`, error);
          toast({
            title: "Proof-reading failed",
            description: error instanceof Error ? error.message : `Failed to proofread ${languageName}`,
            variant: "destructive",
          });
        } finally {
          // Remove from proofreading set
          setProofreadingLanguages(prev => {
            const newSet = new Set(prev[currentTranslationId] || []);
            newSet.delete(langCode);
            return {
              ...prev,
              [currentTranslationId]: newSet
            };
          });
        }
      }

      toast({
        title: "Translation complete",
        description: `Successfully retranslated to ${languageName}.`,
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

    // Save the model used for this translation
    updateMutation.mutate({
      id: selectedTranslationId,
      data: { lastUsedModelId: selectedModel },
    });

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
      const startTime = Date.now();
      try {
        const output = await translateSingleMutation.mutateAsync({ languageCode: langCode }) as TranslationOutput;
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000; // Convert to seconds
        
        // Store the runtime for this translation ID
        setTranslationRuntimes(prev => ({
          ...prev,
          [currentTranslationId]: {
            ...(prev[currentTranslationId] || {}),
            [langCode]: duration
          }
        }));
        
        // Remove from translating set when done
        setTranslatingLanguages(prev => {
          const newSet = new Set(prev[currentTranslationId] || []);
          newSet.delete(langCode);
          return {
            ...prev,
            [currentTranslationId]: newSet
          };
        });

        // Trigger proof-reading after translation completes
        if (output) {
          // Get language name for toast
          const language = languages.find(l => l.code === langCode);
          const languageName = language?.name || langCode;
          
          // Show proof-reading toast
          toast({
            title: "Proof Reading in progress",
            description: `Proof Reading: ${languageName} in progress`,
          });

          // Add to proofreading set for this translation ID
          setProofreadingLanguages(prev => {
            const newSet = new Set(prev[currentTranslationId] || []);
            newSet.add(langCode);
            return {
              ...prev,
              [currentTranslationId]: newSet
            };
          });

          // Proof-read the translation
          const proofreadStartTime = Date.now();
          try {
            await proofreadMutation.mutateAsync({ outputId: output.id, translationId: currentTranslationId });
            const proofreadEndTime = Date.now();
            const proofreadDuration = (proofreadEndTime - proofreadStartTime) / 1000;
            
            // Store the proof-reading runtime for this translation ID
            setProofreadRuntimes(prev => ({
              ...prev,
              [currentTranslationId]: {
                ...(prev[currentTranslationId] || {}),
                [langCode]: proofreadDuration
              }
            }));
          } catch (error) {
            console.error(`Failed to proofread ${langCode}:`, error);
            toast({
              title: "Proof-reading failed",
              description: error instanceof Error ? error.message : `Failed to proofread ${languageName}`,
              variant: "destructive",
            });
          } finally {
            // Remove from proofreading set
            setProofreadingLanguages(prev => {
              const newSet = new Set(prev[currentTranslationId] || []);
              newSet.delete(langCode);
              return {
                ...prev,
                [currentTranslationId]: newSet
              };
            });
          }
        }
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
        title: "Translation complete",
        description: `Successfully translated to ${selectedLanguages.length} language${selectedLanguages.length > 1 ? 's' : ''}.`,
        action: (
          <ToastAction
            altText="View translation"
            onClick={() => {
              window.location.hash = currentTranslationId;
              if (translation) {
                handleSelectTranslation(translation);
              }
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
  const canEdit = (translation: Translation | null) => {
    if (!user || !translation) return false;
    
    // User can edit their own translations (public or private)
    if (translation.userId === user.id) return true;
    
    // Admins can edit PUBLIC translations from other users
    if (user.isAdmin && !translation.isPrivate) return true;
    
    return false;
  };

  // Helper to get ownership tooltip text
  const getOwnershipTooltip = (translation: Translation) => {
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

  // Get currently selected translation
  const selectedTranslation = translations.find(t => t.id === selectedTranslationId) || null;
  const canEditSelected = canEdit(selectedTranslation);
  const isMobile = useIsMobile();

  return (
    <div className="flex h-full overflow-y-auto md:overflow-hidden flex-col md:flex-row">
      {/* Left Sidebar - Translation History (Desktop only) */}
      <div className="hidden md:flex w-80 flex-col border-r bg-sidebar flex-none">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="text-lg font-semibold">Translation History</h2>
          <Button 
            size="sm" 
            onClick={handleNewTranslation} 
            disabled={createMutation.isPending} 
            data-testid="button-new-translation"
            variant="outline"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1" viewportClassName="max-w-full">
          {translationsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : translations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="mb-2 text-sm font-medium">No translations yet</p>
              <p className="mb-4 text-xs text-muted-foreground">Create your first translation to get started</p>
            </div>
          ) : (
            <div className="space-y-1 p-2" style={{ width: '100%', maxWidth: '20rem' }}>
              <TooltipProvider>
                {translations.map((translation) => (
                  <Card
                    key={translation.id}
                    className={`group cursor-pointer p-4 hover-elevate overflow-hidden ${
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
                            <h3 className="font-medium truncate flex-1 min-w-0">{translation.title}</h3>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {new Date(translation.updatedAt!).toLocaleDateString()}
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
            </div>
          )}
        </ScrollArea>
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
                  <Label className="text-sm font-medium">
                    Source Text
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsGoogleDocsPickerOpen(true)}
                    disabled={!selectedTranslationId || !canEditSelected || isLoadingGoogleDoc}
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
                </div>
                <span className="text-xs text-muted-foreground">
                  {sourceText ? new DOMParser().parseFromString(sourceText, 'text/html').body.textContent?.length || 0 : 0} characters
                </span>
              </div>
              <RichTextEditor
                content={sourceText}
                onChange={setSourceText}
                placeholder="Enter text to translate..."
                editable={!!selectedTranslationId && canEditSelected}
                className="flex-1 overflow-auto"
                editorKey={`source-${selectedTranslationId || 'none'}`}
              />
              <div className="mt-2 flex justify-end flex-shrink-0">
                <Button
                  onClick={handleSaveSource}
                  disabled={!selectedTranslationId || !canEditSelected || updateMutation.isPending}
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
                  const currentTranslating = selectedTranslationId ? translatingLanguages[selectedTranslationId] : undefined;
                  const currentProofreading = selectedTranslationId ? proofreadingLanguages[selectedTranslationId] : undefined;
                  const isTranslating = currentTranslating?.has(langCode) ?? false;
                  const isProofreading = currentProofreading?.has(langCode) ?? false;
                  const output = outputs.find(o => o.languageCode === langCode);
                  const isCompleted = !isTranslating && !isProofreading && output;
                  
                  return (
                    <TabsTrigger key={langCode} value={langCode} data-testid={`tab-${langCode}`} className="gap-2 h-16 md:h-20 whitespace-nowrap">
                      {language?.name || langCode}
                      {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isProofreading && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      {isCompleted && <Check className="h-3 w-3 text-green-600" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {selectedLanguages.map((langCode) => {
                const output = outputs.find(o => o.languageCode === langCode);
                const language = activeLanguages.find(l => l.code === langCode);
                const currentTranslating = selectedTranslationId ? translatingLanguages[selectedTranslationId] : undefined;
                const currentProofreading = selectedTranslationId ? proofreadingLanguages[selectedTranslationId] : undefined;
                const isTranslating = currentTranslating?.has(langCode) ?? false;
                const isProofreading = currentProofreading?.has(langCode) ?? false;
                
                return <TabsContent
                  key={langCode}
                  value={langCode}
                  className="flex-1 overflow-hidden"
                >
                  {isTranslating ? (
                    <div className="flex h-full items-center justify-center p-8">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-sm font-medium">Translating to {language?.name || langCode}...</p>
                        <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                      </div>
                    </div>
                  ) : isProofreading && output ? (
                    <div className="flex flex-col h-full px-6 pt-4 pb-6 gap-4">
                      {/* Header with language and copy button */}
                      <div className="flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            {output.languageName}
                            {output.translationStatus === 'completed' && (
                              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                                <Check className="h-3 w-3" />
                                <span className="text-xs">Translated</span>
                              </span>
                            )}
                            {output.proofreadStatus === 'completed' && (
                              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                                <Check className="h-3 w-3" />
                                <span className="text-xs">Proof read</span>
                              </span>
                            )}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Proof-reading...
                          </Badge>
                        </div>
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
                        </div>
                      </div>

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
                            Last Updated: {output.updatedAt ? formatDistanceToNow(new Date(output.updatedAt), { addSuffix: true }) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : output ? (
                    <div className="flex flex-col h-full px-4 md:px-6 pt-3 md:pt-4 pb-4 md:pb-6 gap-3 md:gap-4">
                      {/* Header with language and copy button */}
                      <div className="flex items-center justify-between flex-shrink-0 gap-2">
                        <Label className="text-sm font-medium">
                          {output.languageName}
                          {output.translationStatus === 'completed' && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Translated</span>
                            </span>
                          )}
                          {output.proofreadStatus === 'completed' && (
                            <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">Proof read</span>
                            </span>
                          )}
                        </Label>
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
                        </div>
                      </div>

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
                            Last Updated: {output.updatedAt ? formatDistanceToNow(new Date(output.updatedAt), { addSuffix: true }) : 'N/A'}
                          </div>
                        </div>

                        {/* Show Save/Discard buttons when there are unsaved changes */}
                        {editedOutputs[output.id] !== undefined && 
                         editedOutputs[output.id] !== (output.translatedText ?? '') && (
                          <div className="flex items-center gap-2">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Translation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this translation? This action cannot be undone and will remove all associated translation outputs.
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
    </div>
  );
}
