import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Lock, Globe, Pencil, Save, X, RotateCw, ChevronLeft, ChevronRight, Search, Upload, ImageIcon, Download, ChevronsUpDown, Check, Languages, EllipsisVertical, Square } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Language, ImageTranslation, ImageTranslationOutput } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
  CommandList,
} from "@/components/ui/command";
import { History } from "lucide-react";

// Component to lazily load translated images
function TranslatedImage({ 
  outputId, 
  title, 
  languageName,
  onPreview,
  onDownload,
  canEdit,
  onRetranslate,
  isRetranslating
}: { 
  outputId: string;
  title: string;
  languageName: string;
  onPreview: (src: string, alt: string) => void;
  onDownload: (imageBase64: string, mimeType: string) => void;
  canEdit: boolean;
  onRetranslate: () => void;
  isRetranslating: boolean;
}) {
  const { data: imageData, isLoading } = useQuery<{ translatedImageBase64: string | null; translatedMimeType: string | null }>({
    queryKey: ["/api/image-translation-outputs", outputId, "image"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-translation-outputs/${outputId}/image`);
      return await response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading translated image...</p>
      </div>
    );
  }

  if (!imageData?.translatedImageBase64 || !imageData?.translatedMimeType) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-4" />
        <p>No translated image available</p>
      </div>
    );
  }

  const imageSrc = `data:${imageData.translatedMimeType};base64,${imageData.translatedImageBase64}`;

  return (
    <div className="flex flex-col items-center h-full">
      <div className="flex-1 flex items-center justify-center w-full">
        <img
          src={imageSrc}
          alt={`${title} - ${languageName}`}
          className="max-w-full max-h-full object-contain rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onPreview(imageSrc, `${title} - ${languageName}`)}
          title="Click to view full size"
        />
      </div>
      <div className="flex gap-2 mt-4 pb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onDownload(imageData.translatedImageBase64!, imageData.translatedMimeType!)}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Download translated image</p>
          </TooltipContent>
        </Tooltip>
        
        {canEdit && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onRetranslate}
                disabled={isRetranslating}
              >
                {isRetranslating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4 mr-2" />
                )}
                {isRetranslating ? "Starting..." : "Retranslate"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Retranslate this image</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

export default function ImageTranslate() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedImageTranslationId, setSelectedImageTranslationId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Image");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isEscapePressed, setIsEscapePressed] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [translatingLanguages, setTranslatingLanguages] = useState<Record<string, Set<string>>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [translationRuntimes, setTranslationRuntimes] = useState<Record<string, Record<string, number>>>({});
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem('image-translate-left-panel-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [stoppedPollingOutputs, setStoppedPollingOutputs] = useState<Set<string>>(new Set());
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const isMobile = useIsMobile();
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  // Auto-focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Save left panel collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('image-translate-left-panel-collapsed', JSON.stringify(isLeftPanelCollapsed));
  }, [isLeftPanelCollapsed]);

  // Fetch image translations with infinite scroll and server-side search
  // Note: list does NOT include sourceImageBase64 for performance
  const {
    data: imageTranslationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: imageTranslationsLoading,
  } = useInfiniteQuery({
    queryKey: ["/api/image-translations", searchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "20",
        ...(searchTerm && searchTerm.length >= 2 ? { search: searchTerm } : {}),
      });
      const response = await apiRequest("GET", `/api/image-translations?${params}`);
      return await response.json() as {
        data: Omit<ImageTranslation, 'sourceImageBase64'>[];
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

  // Flatten paginated image translations (without sourceImageBase64)
  const imageTranslations = imageTranslationsData?.pages.flatMap(page => page.data) ?? [];

  // Fetch languages
  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
  });

  // Hardcoded model for image translation
  const IMAGE_TRANSLATION_MODEL = {
    name: "Nano Banana Pro",
    identifier: "gemini-3-pro-image-preview",
  };

  // Fetch image translation metadata (without source image) for selected item
  const { data: selectedImageTranslationData, isLoading: metadataLoading } = useQuery<Omit<ImageTranslation, 'sourceImageBase64'>>({
    queryKey: ["/api/image-translations", selectedImageTranslationId, "metadata"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-translations/${selectedImageTranslationId}/metadata`);
      return await response.json();
    },
    enabled: !!selectedImageTranslationId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch source image separately (lazy load)
  const { data: sourceImageData, isLoading: sourceImageLoading } = useQuery<{ sourceImageBase64: string; sourceMimeType: string }>({
    queryKey: ["/api/image-translations", selectedImageTranslationId, "source-image"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-translations/${selectedImageTranslationId}/source-image`);
      return await response.json();
    },
    enabled: !!selectedImageTranslationId && !!selectedImageTranslationData,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes since images don't change
  });

  // Track outputs that have timed out (to show toast only once)
  const timedOutOutputsRef = useRef<Set<string>>(new Set());

  // Fetch outputs metadata (without translated images) for selected image translation
  const { data: outputsMetadata = [], isLoading: outputsLoading } = useQuery<Omit<ImageTranslationOutput, 'translatedImageBase64'>[]>({
    queryKey: ["/api/image-translations", selectedImageTranslationId, "outputs-metadata"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-translations/${selectedImageTranslationId}/outputs-metadata`);
      return await response.json();
    },
    enabled: !!selectedImageTranslationId,
    refetchInterval: (query) => {
      const data = query.state.data || [];
      const hasInProgress = data.some((output: Omit<ImageTranslationOutput, 'translatedImageBase64'>) => {
        if (stoppedPollingOutputs.has(output.id)) {
          return false;
        }
        
        const isTranslating = output.status === 'translating';
        
        if (isTranslating) {
          if (output.updatedAt) {
            const lastUpdate = new Date(output.updatedAt);
            const now = new Date();
            const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
            
            // Auto-stop polling after 2 minutes of no response
            if (minutesSinceUpdate > 2) {
              console.warn(`[Polling] Output ${output.id} has been stuck for ${minutesSinceUpdate.toFixed(1)} minutes, auto-stopping`);
              setStoppedPollingOutputs(prev => new Set(prev).add(output.id));
              
              // Show toast only once per output
              if (!timedOutOutputsRef.current.has(output.id)) {
                timedOutOutputsRef.current.add(output.id);
                toast({
                  title: `Timeout for ${title}: ${output.languageName}`,
                  description: "Please try again.",
                  variant: "destructive",
                });
              }
              return false;
            }
          }
          return true;
        }
        return false;
      });
      return hasInProgress ? 2000 : false;
    },
  });

  // Use outputsMetadata as outputs for UI
  const outputs = outputsMetadata;

  // Track if we've initialized to avoid loops
  const hasInitialized = useRef(false);
  const selectedImageTranslationIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    selectedImageTranslationIdRef.current = selectedImageTranslationId;
  }, [selectedImageTranslationId]);

  // Handle search
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.length >= 2) {
        setSearchTerm(searchQuery);
      } else {
        setSearchTerm("");
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

  // Handle hash-based URL navigation on initial load only
  useEffect(() => {
    if (!imageTranslationsLoading && imageTranslations.length > 0 && !hasInitialized.current && !selectedImageTranslationId) {
      hasInitialized.current = true;
      const hash = window.location.hash.slice(1);
      if (hash) {
        const imageTranslation = imageTranslations.find(t => t.id === hash);
        if (imageTranslation) {
          handleSelectImageTranslation(imageTranslation);
          return;
        }
      }
      const firstImageTranslation = imageTranslations[0];
      if (firstImageTranslation) {
        handleSelectImageTranslation(firstImageTranslation);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageTranslationsLoading]);

  // Update URL hash when image translation is manually selected
  useEffect(() => {
    if (selectedImageTranslationId && hasInitialized.current) {
      const currentHash = window.location.hash.slice(1);
      if (currentHash !== selectedImageTranslationId) {
        window.history.replaceState(null, '', `${window.location.pathname}#${selectedImageTranslationId}`);
      }
    }
  }, [selectedImageTranslationId]);

  // Handle selecting an image translation (from list - without image data)
  const handleSelectImageTranslation = (imageTranslation: Omit<ImageTranslation, 'sourceImageBase64'>) => {
    setSelectedImageTranslationId(imageTranslation.id);
    setTitle(imageTranslation.title);
    setSelectedLanguages(imageTranslation.selectedLanguages || []);
    setIsPrivate(imageTranslation.isPrivate);
    setIsEditingTitle(false);
    
    // Set active tab to first selected language output
    if (imageTranslation.selectedLanguages && imageTranslation.selectedLanguages.length > 0) {
      setActiveLanguageTab(imageTranslation.selectedLanguages[0]);
    } else {
      setActiveLanguageTab("");
    }
  };

  // Create new image translation (upload image)
  const handleUploadImage = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', file.name.replace(/\.[^/.]+$/, '') || 'Untitled Image');
      formData.append('isPrivate', String(false));

      const response = await fetch('/api/image-translations', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload image');
      }

      const newImageTranslation = await response.json() as ImageTranslation;
      
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/image-translations"] });
      
      // Select the new image translation
      handleSelectImageTranslation(newImageTranslation);
      
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Update image translation mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageTranslation> }) => {
      return await apiRequest("PATCH", `/api/image-translations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-translations"] });
      toast({
        title: "Image translation updated",
        description: "Your changes have been saved.",
      });
    },
  });

  // Delete image translation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/image-translations/${id}`, {});
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-translations"] });
      if (selectedImageTranslationId === deletedId) {
        setSelectedImageTranslationId(null);
        setTitle("Untitled Image");
      }
      setDeleteConfirmId(null);
      toast({
        title: "Image translation deleted",
        description: "The image translation has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete",
        description: error.message || "You don't have permission to delete this image translation.",
        variant: "destructive",
      });
    },
  });

  // Individual language translation mutation (uses hardcoded model on backend)
  const translateSingleMutation = useMutation({
    mutationFn: async ({ languageCode }: { languageCode: string }) => {
      if (!selectedImageTranslationId) {
        throw new Error("No image selected");
      }
      const response = await apiRequest("POST", "/api/translate-image-single", {
        imageTranslationId: selectedImageTranslationId,
        languageCode,
      });
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate outputs metadata query to trigger refetch and resume polling
      queryClient.invalidateQueries({ queryKey: ["/api/image-translations", selectedImageTranslationId, "outputs-metadata"] });
    },
  });

  // Handle translation for a single language
  const handleTranslateSingle = async (languageCode: string) => {
    if (!selectedImageTranslationId) return;
    
    // Track that this language is translating for this image (optimistic UI)
    setTranslatingLanguages(prev => {
      const current = prev[selectedImageTranslationId] || new Set();
      const updated = new Set(current);
      updated.add(languageCode);
      return { ...prev, [selectedImageTranslationId]: updated };
    });
    
    // Track start time
    const startTime = Date.now();
    setTranslationRuntimes(prev => ({
      ...prev,
      [selectedImageTranslationId]: {
        ...(prev[selectedImageTranslationId] || {}),
        [languageCode]: startTime,
      },
    }));
    
    try {
      // Start the async translation - backend will update status via polling
      await translateSingleMutation.mutateAsync({ languageCode });
      
      // Save selected languages to the image translation
      if (!selectedLanguages.includes(languageCode)) {
        const newSelectedLanguages = [...selectedLanguages, languageCode];
        setSelectedLanguages(newSelectedLanguages);
        await updateMutation.mutateAsync({
          id: selectedImageTranslationId,
          data: { selectedLanguages: newSelectedLanguages },
        });
      }
      
      // Don't remove from translatingLanguages here - let useEffect handle it
      // when we see the output status change to 'completed' or 'failed'
      // This prevents race conditions between state update and query refetch
    } catch (error) {
      console.error("Translation failed:", error);
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "Failed to translate image",
        variant: "destructive",
      });
      
      // Remove from translating set on error
      setTranslatingLanguages(prev => {
        const current = prev[selectedImageTranslationId] || new Set();
        const updated = new Set(current);
        updated.delete(languageCode);
        return { ...prev, [selectedImageTranslationId]: updated };
      });
    }
  };

  // Handle translate all selected languages
  const handleTranslateAll = async () => {
    if (!selectedImageTranslationId || selectedLanguages.length === 0) return;
    
    // Set active tab to first language immediately
    if (selectedLanguages.length > 0) {
      setActiveLanguageTab(selectedLanguages[0]);
    }
    
    // Mark all languages as translating immediately for UI feedback
    setTranslatingLanguages(prev => ({
      ...prev,
      [selectedImageTranslationId]: new Set(selectedLanguages)
    }));
    
    // Start all translations in parallel
    for (const langCode of selectedLanguages) {
      handleTranslateSingle(langCode);
    }
  };

  // Handle retranslate for a single output
  const handleRetranslate = (languageCode: string) => {
    // Clear stopped polling state for this language's output (if any)
    // This ensures the new translation can poll properly
    const output = outputs.find(o => o.languageCode === languageCode);
    if (output) {
      setStoppedPollingOutputs(prev => {
        const next = new Set(prev);
        next.delete(output.id);
        return next;
      });
      // Also clear from timeout tracking so toast can show again if it times out
      timedOutOutputsRef.current.delete(output.id);
    }
    handleTranslateSingle(languageCode);
  };

  // Handle title save
  const handleSaveTitle = async () => {
    if (!selectedImageTranslationId || !editedTitle.trim()) return;
    
    await updateMutation.mutateAsync({
      id: selectedImageTranslationId,
      data: { title: editedTitle.trim() },
    });
    
    setTitle(editedTitle.trim());
    setIsEditingTitle(false);
  };

  // Handle rename from list
  const handleRenameInList = (id: string, newTitle: string) => {
    if (!isEscapePressed && newTitle.trim()) {
      const trimmedTitle = newTitle.trim();
      updateMutation.mutate(
        { id, data: { title: trimmedTitle } },
        {
          onSuccess: () => {
            // If renaming the currently selected item, update the title in header
            if (id === selectedImageTranslationId) {
              setTitle(trimmedTitle);
            }
          }
        }
      );
    }
    setIsRenamingId(null);
    setIsEscapePressed(false);
  };

  // Download translated image
  const handleDownloadImage = (output: ImageTranslationOutput) => {
    if (!output.translatedImageBase64 || !output.translatedMimeType) return;
    
    const link = document.createElement('a');
    link.href = `data:${output.translatedMimeType};base64,${output.translatedImageBase64}`;
    link.download = `${title}_${output.languageName}.${output.translatedMimeType.split('/')[1] || 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Language selection handler - immediate toggle with save
  const handleLanguageToggle = async (languageCode: string) => {
    const newSelectedLanguages = selectedLanguages.includes(languageCode)
      ? selectedLanguages.filter(l => l !== languageCode)
      : [...selectedLanguages, languageCode];
    
    setSelectedLanguages(newSelectedLanguages);
    
    // Set active tab to first language if not set
    if (newSelectedLanguages.length > 0 && !activeLanguageTab) {
      setActiveLanguageTab(newSelectedLanguages[0]);
    }
    
    // Save to backend if image translation exists
    if (selectedImageTranslationId) {
      await updateMutation.mutateAsync({
        id: selectedImageTranslationId,
        data: { selectedLanguages: newSelectedLanguages },
      });
    }
  };

  // Get the selected image translation from local state
  const selectedImageTranslation = selectedImageTranslationData;

  // Permission helper - check if user can edit an image translation
  const canEdit = (imageTranslation: { userId: string; isPrivate: boolean } | null | undefined) => {
    if (!user || !imageTranslation) return false;
    
    // User can edit their own image translations (public or private)
    if (imageTranslation.userId === user.id) return true;
    
    // Admins can edit PUBLIC image translations from other users
    if (user.isAdmin && !imageTranslation.isPrivate) return true;
    
    return false;
  };
  
  // Check if current user can edit the selected image translation
  const canEditSelected = canEdit(selectedImageTranslation);

  // Get currently translating languages for this image
  const currentTranslatingLanguages = selectedImageTranslationId 
    ? translatingLanguages[selectedImageTranslationId] || new Set()
    : new Set();

  // Clear translatingLanguages when output status changes to completed/failed
  // This ensures spinner stays visible until server confirms translation is done
  useEffect(() => {
    if (!selectedImageTranslationId || outputs.length === 0) return;
    
    const languagesToClear: string[] = [];
    
    currentTranslatingLanguages.forEach((langCode: string) => {
      const output = outputs.find(o => o.languageCode === langCode);
      // Only clear if we have an output and it's no longer translating
      if (output && output.status !== 'translating') {
        languagesToClear.push(langCode);
      }
    });
    
    if (languagesToClear.length > 0) {
      setTranslatingLanguages(prev => {
        const current = prev[selectedImageTranslationId] || new Set();
        const updated = new Set(current);
        languagesToClear.forEach(lang => updated.delete(lang));
        return { ...prev, [selectedImageTranslationId]: updated };
      });
    }
  }, [selectedImageTranslationId, outputs, currentTranslatingLanguages]);

  // Check if any translation is in progress
  const isAnyTranslating = currentTranslatingLanguages.size > 0 || 
    outputs.some(o => o.status === 'translating');

  // Get languages to show in tabs (selected languages that are active)
  // This shows tabs immediately when translation starts
  const activeLanguages = languages.filter(lang => 
    lang.isActive && selectedLanguages.includes(lang.code)
  );

  // Create output lookup map
  const outputsByLanguage = outputs.reduce((acc, output) => {
    acc[output.languageCode] = output;
    return acc;
  }, {} as Record<string, ImageTranslationOutput>);

  // Mobile history content
  const historyContent = (
    <div className="h-full flex flex-col">
      {/* Search and actions */}
      <div className="p-4 border-b flex items-center gap-2">
        {isSearchExpanded ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="flex-1"
            />
            <Button variant="ghost" size="icon" onClick={handleClearSearch}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Button variant="ghost" size="icon" onClick={handleToggleSearch}>
              <Search className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Upload Image
            </Button>
          </>
        )}
      </div>
      
      {/* List */}
      <ScrollArea className="flex-1">
        {imageTranslationsLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : imageTranslations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="mb-2 text-sm font-medium">{searchTerm ? "No results found" : "No image translations yet"}</p>
            <p className="mb-4 text-xs text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Upload an image to get started"}
            </p>
          </div>
        ) : (
        <div className="p-2 space-y-0.5" style={{ width: '100%', maxWidth: '20rem' }}>
          {imageTranslations.map((imageTranslation) => (
            <Card
              key={imageTranslation.id}
              className={`group p-2 cursor-pointer hover-elevate overflow-hidden ${
                selectedImageTranslationId === imageTranslation.id ? 'bg-sidebar-accent' : ''
              }`}
              onClick={() => {
                handleSelectImageTranslation(imageTranslation);
                setMobileHistoryOpen(false);
              }}
            >
              <div className="flex items-start gap-2 min-w-0">
                <div className="flex-shrink-0 pt-0.5">
                  {imageTranslation.isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground/60" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground/60" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {isRenamingId === imageTranslation.id ? (
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameInList(imageTranslation.id, renameValue)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setIsEscapePressed(false);
                          handleRenameInList(imageTranslation.id, renameValue);
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
                      <h3 className="text-sm font-medium truncate flex-1 min-w-0">{imageTranslation.title}</h3>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {formatDate(imageTranslation.updatedAt)}
                  </p>
                </div>
                {canEdit(imageTranslation) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenamingId(imageTranslation.id);
                          setRenameValue(imageTranslation.title);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(imageTranslation.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </Card>
          ))}
          
          {hasNextPage && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Load more"
              )}
            </Button>
          )}
        </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <TooltipProvider>
      <div className="h-full flex">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadImage(file);
          }}
        />

        {/* Left Panel - History (desktop only) */}
        {!isMobile && (
          <div
            className={`flex flex-col border-r bg-sidebar flex-none transition-all duration-200 ${
              isLeftPanelCollapsed ? 'w-12' : 'w-80'
            }`}
          >
            {/* Header with buttons */}
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
                    className="flex-1"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleClearSearch}
                    className="h-8 w-8 p-0"
                    title="Close search"
                  >
                    <X className="h-4 w-4" />
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
                      title="Search"
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading} 
                    variant="outline"
                    className={isLeftPanelCollapsed ? "h-8 w-8 p-0" : ""}
                    title="Upload Image"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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

            {/* History list */}
            {!isLeftPanelCollapsed && (
              <ScrollArea className="flex-1">
                {imageTranslationsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : imageTranslations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="mb-2 text-sm font-medium">{searchTerm ? "No results found" : "No image translations yet"}</p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      {searchTerm ? "Try a different search term" : "Upload an image to get started"}
                    </p>
                  </div>
                ) : (
                <div className="p-2 space-y-0.5" style={{ width: '100%', maxWidth: '20rem' }}>
                  {imageTranslations.map((imageTranslation) => (
                    <Card
                      key={imageTranslation.id}
                      className={`group p-2 cursor-pointer hover-elevate overflow-hidden ${
                        selectedImageTranslationId === imageTranslation.id ? 'bg-sidebar-accent' : ''
                      }`}
                      onClick={() => handleSelectImageTranslation(imageTranslation)}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="flex-shrink-0 pt-0.5">
                          {imageTranslation.isPrivate ? (
                            <Lock className="h-4 w-4 text-muted-foreground/60" />
                          ) : (
                            <Globe className="h-4 w-4 text-muted-foreground/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {isRenamingId === imageTranslation.id ? (
                            <Input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => handleRenameInList(imageTranslation.id, renameValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  setIsEscapePressed(false);
                                  handleRenameInList(imageTranslation.id, renameValue);
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
                              <h3 className="text-sm font-medium truncate flex-1 min-w-0">{imageTranslation.title}</h3>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {formatDate(imageTranslation.updatedAt)}
                          </p>
                        </div>
                        {canEdit(imageTranslation) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                              >
                                <EllipsisVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsRenamingId(imageTranslation.id);
                                  setRenameValue(imageTranslation.title);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(imageTranslation.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </Card>
                  ))}
                  
                  {hasNextPage && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  )}
                </div>
                )}
              </ScrollArea>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Single Row */}
          <div className="border-b p-4 flex items-center gap-4">
            {/* Left side: Mobile history trigger + Title + Public/Private toggle */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile history trigger */}
              {isMobile && (
                <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <History className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] flex flex-col">
                    <SheetHeader>
                      <SheetTitle>History</SheetTitle>
                    </SheetHeader>
                    {historyContent}
                  </SheetContent>
                </Sheet>
              )}
              
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-48"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveTitle} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-w-0">
                  <h1 className="text-lg font-semibold truncate">{title}</h1>
                  {canEditSelected && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditedTitle(title);
                        setIsEditingTitle(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {/* Public/Private Toggle */}
              {canEditSelected && selectedImageTranslation && (
                <div className="flex items-center gap-2 ml-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPrivate}
                    onClick={async () => {
                      const newValue = !isPrivate;
                      setIsPrivate(newValue);
                      await updateMutation.mutateAsync({
                        id: selectedImageTranslationId!,
                        data: { isPrivate: newValue },
                      });
                    }}
                    className={`
                      relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full 
                      border border-gray-300 transition-colors duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      ${isPrivate ? 'bg-primary' : 'bg-input'}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none flex h-5 w-5 items-center justify-center rounded-full 
                        bg-background shadow-lg ring-0 transition-transform duration-200
                        border border-gray-300
                        ${isPrivate ? 'translate-x-6' : 'translate-x-0.5'}
                      `}
                    >
                      {isPrivate ? (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground" />
                      )}
                    </span>
                  </button>
                  <Label className="text-sm">{isPrivate ? 'Private' : 'Public'}</Label>
                </div>
              )}
            </div>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Right side: Model + Languages + Translate */}
            <div className="flex items-center gap-2">
              {canEditSelected && selectedImageTranslation && (
                <>
                  {/* Model Display (hardcoded) */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">Model:</Label>
                    <span className="text-sm text-muted-foreground">{IMAGE_TRANSLATION_MODEL.name}</span>
                  </div>

                  {/* Language Multi-Select Dropdown */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium whitespace-nowrap">Languages:</Label>
                    <Popover open={isLanguagePopoverOpen} onOpenChange={setIsLanguagePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          role="combobox"
                          aria-expanded={isLanguagePopoverOpen}
                          className="w-40 justify-between"
                          disabled={!sourceImageData?.sourceImageBase64}
                        >
                          {selectedLanguages.length === 0
                            ? "Select..."
                            : `${selectedLanguages.length} selected`}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search languages..." />
                          <CommandList>
                            <CommandEmpty>No language found.</CommandEmpty>
                            <CommandGroup>
                              {languages.filter(l => l.isActive).map((lang) => (
                                <CommandItem
                                  key={lang.code}
                                  value={`${lang.name} ${lang.nativeName}`}
                                  onSelect={() => handleLanguageToggle(lang.code)}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      selectedLanguages.includes(lang.code) ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {lang.name} ({lang.nativeName})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Translate Button */}
                  <Button
                    onClick={handleTranslateAll}
                    disabled={!sourceImageData?.sourceImageBase64 || selectedLanguages.length === 0 || isAnyTranslating}
                  >
                    {isAnyTranslating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Translating...
                      </>
                    ) : (
                      "Translate"
                    )}
                  </Button>
                </>
              )}
              
              {isMobile && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Source Image Panel */}
            <div className="flex-1 p-4 overflow-auto border-r">
              {sourceImageLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-4" />
                  <p>Loading image...</p>
                </div>
              ) : sourceImageData?.sourceImageBase64 ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={`data:${sourceImageData.sourceMimeType};base64,${sourceImageData.sourceImageBase64}`}
                    alt={selectedImageTranslation?.title || 'Source image'}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setPreviewImage({
                      src: `data:${sourceImageData.sourceMimeType};base64,${sourceImageData.sourceImageBase64}`,
                      alt: `${selectedImageTranslation?.title || 'Image'} - Original`
                    })}
                    title="Click to view full size"
                  />
                </div>
              ) : selectedImageTranslation ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mb-4" />
                  <p>No image loaded</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Upload className="h-16 w-16 mb-4" />
                  <p className="text-lg mb-2">Upload an image to get started</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="mt-4"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Choose Image
                  </Button>
                </div>
              )}
            </div>

            {/* Translated Images Panel */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {selectedImageTranslation && activeLanguages.length > 0 ? (
                <Tabs value={activeLanguageTab} onValueChange={setActiveLanguageTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="shrink-0 flex-wrap h-auto justify-start">
                    {activeLanguages.map((lang) => {
                      const output = outputsByLanguage[lang.code];
                      const isTranslating = output?.status === 'translating' || currentTranslatingLanguages.has(lang.code);
                      const isCompleted = output?.status === 'completed';
                      const isFailed = output?.status === 'failed';
                      const isPending = !output && !currentTranslatingLanguages.has(lang.code);
                      const isPollingStopped = output && stoppedPollingOutputs.has(output.id);
                      
                      return (
                        <TabsTrigger key={lang.code} value={lang.code} className="gap-2">
                          {lang.name}
                          {isTranslating && !isPollingStopped && <Loader2 className="h-3 w-3 animate-spin" />}
                          {isPollingStopped && <Square className="h-3 w-3 text-orange-500 fill-orange-500" />}
                          {isCompleted && <Check className="h-3 w-3 text-green-600" />}
                          {isFailed && <X className="h-3 w-3 text-red-600" />}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  {activeLanguages.map((lang) => {
                    const output = outputsByLanguage[lang.code];
                    const isTranslating = output?.status === 'translating' || currentTranslatingLanguages.has(lang.code);
                    const isPending = !output && !currentTranslatingLanguages.has(lang.code);
                    const isPollingStopped = output && stoppedPollingOutputs.has(output.id);
                    
                    return (
                      <TabsContent key={lang.code} value={lang.code} className="flex-1 overflow-auto mt-4">
                        {isTranslating && isPollingStopped ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Square className="h-12 w-12 text-orange-500 fill-orange-500 mb-4" />
                            <p className="text-sm font-medium">Translation stopped</p>
                            <p className="text-xs text-muted-foreground mt-1 mb-4">The translation was interrupted</p>
                            <Button
                              onClick={() => handleRetranslate(lang.code)}
                              variant="outline"
                              size="sm"
                              disabled={currentTranslatingLanguages.has(lang.code)}
                            >
                              {currentTranslatingLanguages.has(lang.code) ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <RotateCw className="h-4 w-4 mr-2" />
                              )}
                              {currentTranslatingLanguages.has(lang.code) ? "Starting..." : "Translate Again"}
                            </Button>
                          </div>
                        ) : isTranslating ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Loader2 className="h-12 w-12 animate-spin mb-4" />
                            <p>Translating to {lang.name}...</p>
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
                        ) : isPending ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <ImageIcon className="h-12 w-12 mb-4" />
                            <p className="mb-4">Ready to translate</p>
                            {canEditSelected && (
                              <Button 
                                onClick={() => handleRetranslate(lang.code)}
                                disabled={currentTranslatingLanguages.has(lang.code)}
                              >
                                {currentTranslatingLanguages.has(lang.code) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Languages className="h-4 w-4 mr-2" />
                                )}
                                {currentTranslatingLanguages.has(lang.code) ? "Starting..." : `Translate to ${lang.name}`}
                              </Button>
                            )}
                          </div>
                        ) : output?.status === 'completed' ? (
                          <TranslatedImage
                            outputId={output.id}
                            title={selectedImageTranslation?.title || 'Image'}
                            languageName={lang.name}
                            onPreview={(src, alt) => setPreviewImage({ src, alt })}
                            onDownload={(imageBase64, mimeType) => {
                              const link = document.createElement('a');
                              link.href = `data:${mimeType};base64,${imageBase64}`;
                              link.download = `${title}_${lang.name}.${mimeType.split('/')[1] || 'png'}`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            canEdit={canEditSelected}
                            onRetranslate={() => handleRetranslate(lang.code)}
                            isRetranslating={currentTranslatingLanguages.has(lang.code)}
                          />
                        ) : output?.status === 'failed' ? (
                          <div className="flex flex-col items-center justify-center h-full text-destructive">
                            <p className="mb-4">Translation failed</p>
                            {canEditSelected && (
                              <Button onClick={() => handleRetranslate(lang.code)}>
                                <RotateCw className="h-4 w-4 mr-2" />
                                Retry
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>No translation available</p>
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImageIcon className="h-16 w-16 mb-4" />
                  <p className="text-lg mb-2">No translations yet</p>
                  <p className="text-sm">Select languages and click Translate to start</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Image Translation?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The image and all its translations will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Image Preview Modal */}
        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-visible bg-transparent border-none shadow-none [&>button]:hidden">
            {previewImage && (
              <div className="relative flex flex-col items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="fixed top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full"
                  onClick={() => setPreviewImage(null)}
                >
                  <X className="h-6 w-6" />
                </Button>
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
                <div className="mt-3 px-4 py-2 bg-black/60 rounded-full text-center text-white text-sm">
                  {previewImage.alt}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

