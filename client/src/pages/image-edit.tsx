import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import Konva from "konva";
import {
  Loader2,
  Upload,
  Trash2,
  Download,
  ImageIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
  History,
  Pencil,
  Save,
  Lock,
  Globe,
  EllipsisVertical,
  Check,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DrawingCanvas, exportStageToBase64 } from "@/components/drawing-canvas";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobilePanelToggle, type PanelType } from "@/components/mobile-panel-toggle";
import { CollapsibleControls } from "@/components/collapsible-controls";
import type { ImageEdit, ImageEditOutput, ImageEditMetadata, ImageEditOutputMetadata } from "@shared/schema";

// Lazy-loaded output thumbnail component
function OutputThumbnail({
  output,
  isViewing,
  isChecked,
  isDeleting,
  onView,
  onToggleCheck,
  onDelete,
  onUseAsSource,
  onDownload,
  showCheckbox,
  isMobile = false,
}: {
  output: ImageEditOutputMetadata;
  isViewing: boolean;
  isChecked: boolean;
  isDeleting: boolean;
  onView: () => void;
  onToggleCheck: () => void;
  onDelete: () => void;
  onUseAsSource: () => void;
  onDownload: () => void;
  showCheckbox: boolean;
  isMobile?: boolean;
}) {
  const { data: imageData, isLoading } = useQuery<{
    editedImageBase64: string | null;
    editedMimeType: string | null;
  }>({
    queryKey: ["/api/image-edit-outputs", output.id, "image"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-edit-outputs/${output.id}/image`);
      return await response.json();
    },
    enabled: output.status === "completed",
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const isProcessing = output.status === "processing" || output.status === "pending";
  const isFailed = output.status === "failed";

  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
        isViewing ? "border-primary ring-2 ring-primary/30" : isChecked ? "border-blue-500 ring-2 ring-blue-500/30" : "border-border hover:border-primary/50"
      }`}
      onClick={onView}
    >
      <div className="aspect-square w-20 bg-muted flex items-center justify-center">
        {isProcessing && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {isFailed && (
          <X className="h-6 w-6 text-destructive" />
        )}
        {isLoading && output.status === "completed" && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {imageData?.editedImageBase64 && (
          <img
            src={`data:${imageData.editedMimeType};base64,${imageData.editedImageBase64}`}
            alt={output.prompt.slice(0, 30)}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Checkbox - always visible on mobile, show on hover on desktop, stay visible when checked */}
      {output.status === "completed" && (
        <div
          className={`absolute top-1 left-1 ${isMobile || isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`${isMobile ? 'h-7 w-7' : 'h-5 w-5'} rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
              isChecked ? 'bg-blue-500 border-blue-500' : 'bg-black/40 border-white/60 hover:border-blue-400 hover:bg-black/60'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCheck();
            }}
          >
            {isChecked && <Check className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'} text-white`} />}
          </div>
        </div>
      )}

      {/* Kebab menu - always visible on mobile, show on hover on desktop */}
      {output.status === "completed" && (
        <div className={`absolute top-1 right-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className={`${isMobile ? 'h-7 w-7' : 'h-5 w-5'} bg-black/40 hover:bg-black/60 text-white`}
              >
                <EllipsisVertical className={`${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCheck();
                }}
              >
                <Check className="h-4 w-4 mr-2" />
                {isChecked ? 'Deselect' : 'Select'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onUseAsSource();
                }}
                disabled={!imageData?.editedImageBase64}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Use as Source
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                disabled={!imageData?.editedImageBase64}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Model badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1 py-0.5 truncate">
        {output.model}
      </div>

      {/* Deleting overlay */}
      {isDeleting && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}

export default function ImageEditPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Refs
  const stageRef = useRef<Konva.Stage>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // For creating new sessions
  const replaceImageInputRef = useRef<HTMLInputElement>(null); // For replacing image in current session

  // State
  const [selectedImageEditId, setSelectedImageEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled Edit");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"openai" | "gemini">("gemini");
  const [editPrompt, setEditPrompt] = useState("");
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [checkedOutputIds, setCheckedOutputIds] = useState<Set<string>>(new Set());
  const [deletingOutputIds, setDeletingOutputIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteOutputConfirmId, setDeleteOutputConfirmId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem("image-edit-left-panel-collapsed");
    return saved ? JSON.parse(saved) : false;
  });
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const [mobileActivePanel, setMobileActivePanel] = useState<PanelType>('source');
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isEscapePressed, setIsEscapePressed] = useState(false);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);

  // Save panel state
  useEffect(() => {
    localStorage.setItem("image-edit-left-panel-collapsed", JSON.stringify(isLeftPanelCollapsed));
  }, [isLeftPanelCollapsed]);

  // Auto-focus search
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Annotation instruction text to append when annotations are present
  const ANNOTATION_INSTRUCTION = "Follow the instructions on the image, but don't include those instructions in the final image.";
  const instructionAddedRef = useRef(false); // Track if we've already added the instruction

  // Handle annotation state change from DrawingCanvas
  const handleAnnotationChange = (hasAnnotationsNow: boolean) => {
    const hadAnnotations = hasAnnotations;
    setHasAnnotations(hasAnnotationsNow);
    
    // Only act on transitions (false -> true or true -> false)
    if (hasAnnotationsNow && !hadAnnotations && !instructionAddedRef.current) {
      // First annotation added - add instruction once
      instructionAddedRef.current = true;
      setEditPrompt((prevPrompt) => {
        const trimmedPrompt = prevPrompt.trim();
        if (trimmedPrompt) {
          return `${trimmedPrompt}\n\n${ANNOTATION_INSTRUCTION}`;
        }
        return ANNOTATION_INSTRUCTION;
      });
    } else if (!hasAnnotationsNow && hadAnnotations) {
      // All annotations removed - try to remove instruction if user didn't edit it
      setEditPrompt((prevPrompt) => {
        // Only remove if the exact instruction text is still there
        if (prevPrompt.includes(ANNOTATION_INSTRUCTION)) {
          instructionAddedRef.current = false; // Reset so it can be added again if user adds annotations
          return prevPrompt
            .replace(`\n\n${ANNOTATION_INSTRUCTION}`, '')
            .replace(ANNOTATION_INSTRUCTION, '')
            .trim();
        }
        // User edited the text, leave it alone but reset the flag
        instructionAddedRef.current = false;
        return prevPrompt;
      });
    }
  };

  // Fetch image edits list (paginated, metadata only)
  const {
    data: imageEditsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: imageEditsLoading,
  } = useInfiniteQuery({
    queryKey: ["/api/image-edits", searchTerm],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: "20",
        ...(searchTerm && searchTerm.length >= 2 ? { search: searchTerm } : {}),
      });
      const response = await apiRequest("GET", `/api/image-edits?${params}`);
      return (await response.json()) as {
        data: ImageEditMetadata[];
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

  const imageEdits = imageEditsData?.pages.flatMap((page) => page.data) ?? [];

  // Auto-select first image edit when list loads and nothing is selected
  useEffect(() => {
    if (imageEdits.length > 0 && !selectedImageEditId) {
      const firstEdit = imageEdits[0];
      setSelectedImageEditId(firstEdit.id);
      setTitle(firstEdit.title);
      setIsPrivate(firstEdit.isPrivate);
    }
  }, [imageEdits, selectedImageEditId]);

  // Fetch selected image edit metadata
  const { data: selectedImageEditData } = useQuery<ImageEditMetadata>({
    queryKey: ["/api/image-edits", selectedImageEditId, "metadata"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-edits/${selectedImageEditId}`);
      return await response.json();
    },
    enabled: !!selectedImageEditId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch source image (lazy load)
  const { data: sourceImageData, isLoading: sourceImageLoading } = useQuery<{
    sourceImageBase64: string;
    sourceMimeType: string;
  }>({
    queryKey: ["/api/image-edits", selectedImageEditId, "source-image"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-edits/${selectedImageEditId}/source-image`);
      return await response.json();
    },
    enabled: !!selectedImageEditId && !!selectedImageEditData,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch outputs metadata (lazy loading for images)
  const { data: outputsMetadata = [] } = useQuery<ImageEditOutputMetadata[]>({
    queryKey: ["/api/image-edits", selectedImageEditId, "outputs-metadata"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-edits/${selectedImageEditId}/outputs-metadata`);
      return await response.json();
    },
    enabled: !!selectedImageEditId,
    refetchInterval: (query) => {
      const data = query.state.data || [];
      const hasInProgress = data.some(
        (output: ImageEditOutputMetadata) =>
          output.status === "processing" || output.status === "pending"
      );
      return hasInProgress ? 2000 : false;
    },
  });

  // Selected output image data
  const selectedOutput = outputsMetadata.find((o) => o.id === selectedOutputId);
  const { data: selectedOutputImageData } = useQuery<{
    editedImageBase64: string | null;
    editedMimeType: string | null;
  }>({
    queryKey: ["/api/image-edit-outputs", selectedOutputId, "image"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/image-edit-outputs/${selectedOutputId}/image`);
      return await response.json();
    },
    enabled: !!selectedOutputId && selectedOutput?.status === "completed",
    staleTime: 10 * 60 * 1000,
  });

  // Handle select image edit
  const handleSelectImageEdit = (imageEdit: ImageEditMetadata) => {
    setSelectedImageEditId(imageEdit.id);
    setTitle(imageEdit.title);
    setIsPrivate(imageEdit.isPrivate);
    setIsEditingTitle(false);
    setSelectedOutputId(null);
    setCheckedOutputIds(new Set()); // Clear multi-select when switching sessions
    setEditPrompt("");
    instructionAddedRef.current = false; // Reset annotation instruction state
  };

  // Handle upload image
  const handleUploadImage = async (file: File) => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("title", file.name.replace(/\.[^/.]+$/, "") || "Untitled Edit");
      formData.append("isPrivate", String(false));

      const response = await fetch("/api/image-edits", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload image");
      }

      const newImageEdit = (await response.json()) as ImageEdit;

      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/image-edits"] });

      // Select the new image edit
      handleSelectImageEdit(newImageEdit);

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
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle replace image in current session
  const handleReplaceImage = async (file: File) => {
    if (!file || !selectedImageEditId) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch(`/api/image-edits/${selectedImageEditId}/replace-image`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to replace image");
      }

      // Invalidate queries to refresh the source image
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/image-edits", selectedImageEditId, "source-image"] 
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/image-edits"] });

      toast({
        title: "Image replaced",
        description: "The source image has been replaced.",
      });
    } catch (error) {
      console.error("Error replacing image:", error);
      toast({
        title: "Replace failed",
        description: error instanceof Error ? error.message : "Failed to replace image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (replaceImageInputRef.current) {
        replaceImageInputRef.current.value = "";
      }
    }
  };

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ImageEdit> }) => {
      return await apiRequest("PATCH", `/api/image-edits/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-edits"] });
      toast({
        title: "Updated",
        description: "Your changes have been saved.",
      });
    },
  });

  // Delete image edit mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/image-edits/${id}`, {});
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/image-edits"] });
      if (selectedImageEditId === deletedId) {
        setSelectedImageEditId(null);
        setTitle("Untitled Edit");
      }
      setDeleteConfirmId(null);
      toast({
        title: "Deleted",
        description: "The image edit has been removed.",
      });
    },
  });

  // Delete output mutation
  const deleteOutputMutation = useMutation({
    mutationFn: async (id: string) => {
      // Track that this output is being deleted
      setDeletingOutputIds((prev) => new Set(prev).add(id));
      return await apiRequest("DELETE", `/api/image-edit-outputs/${id}`, {});
    },
    onSuccess: (_, deletedId) => {
      // Remove from deleting set
      setDeletingOutputIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
      // Remove from checked set if it was checked
      setCheckedOutputIds((prev) => {
        const next = new Set(prev);
        next.delete(deletedId);
        return next;
      });
      // Refresh the outputs list
      queryClient.invalidateQueries({
        queryKey: ["/api/image-edits", selectedImageEditId, "outputs-metadata"],
      });
      if (selectedOutputId === deletedId) {
        setSelectedOutputId(null);
      }
      setDeleteOutputConfirmId(null);
      toast({
        title: "Output deleted",
        description: "The edit result has been removed.",
      });
    },
    onError: (_, failedId) => {
      // Remove from deleting set on error
      setDeletingOutputIds((prev) => {
        const next = new Set(prev);
        next.delete(failedId);
        return next;
      });
      toast({
        title: "Delete failed",
        description: "Failed to delete the edit result.",
        variant: "destructive",
      });
    },
  });

  // Submit edit
  const handleSubmitEdit = async () => {
    if (!editPrompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe how you want to edit the image.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedImageEditId || !stageRef.current) {
      toast({
        title: "No image selected",
        description: "Please upload an image first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Export canvas with annotations as base64
      const annotatedImageData = exportStageToBase64(stageRef.current);

      if (!annotatedImageData) {
        throw new Error("Failed to export canvas");
      }

      const response = await apiRequest("POST", "/api/edit-image", {
        imageEditId: selectedImageEditId,
        prompt: editPrompt.trim(),
        model: selectedModel,
        imageData: annotatedImageData,
      });

      const result = await response.json();

      // Refresh outputs
      await queryClient.invalidateQueries({
        queryKey: ["/api/image-edits", selectedImageEditId, "outputs-metadata"],
      });

      // Select the new output
      if (result.output?.id) {
        setSelectedOutputId(result.output.id);
      }

      toast({
        title: "Edit submitted",
        description: "Your image is being processed...",
      });
    } catch (error) {
      console.error("Error submitting edit:", error);
      toast({
        title: "Edit failed",
        description: error instanceof Error ? error.message : "Failed to submit edit",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use output as source
  const handleUseAsSource = async (outputId: string) => {
    const output = outputsMetadata.find((o) => o.id === outputId);
    if (!output || output.status !== "completed") return;

    try {
      // Fetch the full image
      const response = await apiRequest("GET", `/api/image-edit-outputs/${outputId}/image`);
      const imageData = await response.json();

      if (!imageData?.editedImageBase64) {
        throw new Error("No image data");
      }

      // Create a new image edit with this as source
      const formData = new FormData();
      
      // Convert base64 to blob
      const byteCharacters = atob(imageData.editedImageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: imageData.editedMimeType || "image/png" });
      
      formData.append("image", blob, "edited-image.png");
      formData.append("title", `${title} - Iteration`);
      formData.append("isPrivate", String(isPrivate));

      const createResponse = await fetch("/api/image-edits", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!createResponse.ok) {
        throw new Error("Failed to create new edit session");
      }

      const newImageEdit = await createResponse.json();
      await queryClient.invalidateQueries({ queryKey: ["/api/image-edits"] });
      handleSelectImageEdit(newImageEdit);

      toast({
        title: "New session created",
        description: "You can continue editing from this result.",
      });
    } catch (error) {
      console.error("Error using as source:", error);
      toast({
        title: "Failed",
        description: "Could not use this image as source.",
        variant: "destructive",
      });
    }
  };

  // Download output
  const handleDownloadOutput = async (outputId: string) => {
    const output = outputsMetadata.find((o) => o.id === outputId);
    if (!output || output.status !== "completed") return;

    try {
      const response = await apiRequest("GET", `/api/image-edit-outputs/${outputId}/image`);
      const imageData = await response.json();

      if (!imageData?.editedImageBase64) return;

      const link = document.createElement("a");
      link.href = `data:${imageData.editedMimeType};base64,${imageData.editedImageBase64}`;
      link.download = `${title}_edit_${Date.now()}.${imageData.editedMimeType?.split("/")[1] || "png"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error downloading:", error);
    }
  };

  // Handle title save
  const handleSaveTitle = async () => {
    if (!selectedImageEditId || !editedTitle.trim()) return;

    await updateMutation.mutateAsync({
      id: selectedImageEditId,
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
            if (id === selectedImageEditId) {
              setTitle(trimmedTitle);
            }
          },
        }
      );
    }
    setIsRenamingId(null);
    setIsEscapePressed(false);
  };

  // Search handlers
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
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

  // Permission helper
  const canEdit = (item: { userId: string; isPrivate: boolean } | null | undefined) => {
    if (!user || !item) return false;
    if (item.userId === user.id) return true;
    if (user.isAdmin && !item.isPrivate) return true;
    return false;
  };

  const canEditSelected = canEdit(selectedImageEditData);

  // Get source image URL
  const sourceImageUrl = sourceImageData
    ? `data:${sourceImageData.sourceMimeType};base64,${sourceImageData.sourceImageBase64}`
    : null;

  // History content for mobile sheet
  const historyContent = (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center gap-2">
        {isSearchExpanded ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              ref={searchInputRef}
              placeholder="Search..."
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

      <ScrollArea className="flex-1">
        {imageEditsLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : imageEdits.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="mb-2 text-sm font-medium">
              {searchTerm ? "No results found" : "No image edits yet"}
            </p>
            <p className="mb-4 text-xs text-muted-foreground">
              {searchTerm ? "Try a different search term" : "Upload an image to get started"}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5" style={{ width: '100%', maxWidth: '20rem' }}>
            {imageEdits.map((imageEdit) => (
              <Card
                key={imageEdit.id}
                className={`group p-2 cursor-pointer hover-elevate overflow-hidden ${
                  selectedImageEditId === imageEdit.id ? "bg-sidebar-accent" : ""
                }`}
                onClick={() => {
                  handleSelectImageEdit(imageEdit);
                  setMobileHistoryOpen(false);
                }}
              >
                <div className="flex items-start gap-2 min-w-0">
                  <div className="flex-shrink-0 pt-0.5">
                    {imageEdit.isPrivate ? (
                      <Lock className="h-4 w-4 text-muted-foreground/60" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isRenamingId === imageEdit.id ? (
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameInList(imageEdit.id, renameValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setIsEscapePressed(false);
                            handleRenameInList(imageEdit.id, renameValue);
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
                        <h3 className="text-sm font-medium truncate flex-1 min-w-0">{imageEdit.title}</h3>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {formatDate(imageEdit.updatedAt)}
                    </p>
                  </div>
                  {canEdit(imageEdit) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                          <EllipsisVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsRenamingId(imageEdit.id);
                            setRenameValue(imageEdit.title);
                          }}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(imageEdit.id);
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
        {/* Hidden file input for creating new sessions */}
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

        {/* Hidden file input for replacing image in current session */}
        <input
          ref={replaceImageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              // Show confirmation dialog before replacing
              setPendingReplaceFile(file);
            }
          }}
        />

        {/* Left Panel - History (desktop only) */}
        {!isMobile && (
          <div
            className={`flex flex-col border-r bg-sidebar flex-none transition-all duration-200 ${
              isLeftPanelCollapsed ? "w-12" : "w-80"
            }`}
          >
            <div
              className={`flex items-center ${
                isLeftPanelCollapsed ? "flex-col justify-start gap-2" : "justify-between"
              } border-b p-4`}
            >
              {!isLeftPanelCollapsed && !isSearchExpanded && (
                <h2 className="text-lg font-semibold">History</h2>
              )}
              {!isLeftPanelCollapsed && isSearchExpanded ? (
                <div className="flex-1 flex items-center gap-2 w-full">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
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
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`flex items-center ${isLeftPanelCollapsed ? "flex-col" : "gap-2"} ${
                    isLeftPanelCollapsed ? "" : "ml-auto"
                  }`}
                >
                  {!isLeftPanelCollapsed && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleToggleSearch}
                      className="h-8 w-8 p-0"
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
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                    className="h-8 w-8 p-0"
                  >
                    {isLeftPanelCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            {!isLeftPanelCollapsed && (
              <ScrollArea className="flex-1">
                {imageEditsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : imageEdits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <p className="mb-2 text-sm font-medium">
                      {searchTerm ? "No results found" : "No image edits yet"}
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      {searchTerm ? "Try a different search term" : "Upload an image to get started"}
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-0.5" style={{ width: '100%', maxWidth: '20rem' }}>
                    {imageEdits.map((imageEdit) => (
                      <Card
                        key={imageEdit.id}
                        className={`group p-2 cursor-pointer hover-elevate overflow-hidden ${
                          selectedImageEditId === imageEdit.id ? "bg-sidebar-accent" : ""
                        }`}
                        onClick={() => handleSelectImageEdit(imageEdit)}
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="flex-shrink-0 pt-0.5">
                            {imageEdit.isPrivate ? (
                              <Lock className="h-4 w-4 text-muted-foreground/60" />
                            ) : (
                              <Globe className="h-4 w-4 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {isRenamingId === imageEdit.id ? (
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={() => handleRenameInList(imageEdit.id, renameValue)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setIsEscapePressed(false);
                                    handleRenameInList(imageEdit.id, renameValue);
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
                                <h3 className="text-sm font-medium truncate flex-1 min-w-0">{imageEdit.title}</h3>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {formatDate(imageEdit.updatedAt)}
                            </p>
                          </div>
                          {canEdit(imageEdit) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                  <EllipsisVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRenamingId(imageEdit.id);
                                    setRenameValue(imageEdit.title);
                                  }}
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(imageEdit.id);
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
          {/* Header */}
          <div className="border-b p-3 md:p-4">
            <div className="flex items-center gap-2 md:gap-4">
              {/* Mobile history trigger */}
              {isMobile && (
                <Sheet open={mobileHistoryOpen} onOpenChange={setMobileHistoryOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <History className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] flex flex-col pb-safe">
                    <SheetHeader>
                      <SheetTitle>History</SheetTitle>
                    </SheetHeader>
                    {historyContent}
                  </SheetContent>
                </Sheet>
              )}

              {/* Title */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-32 md:w-48"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") setIsEditingTitle(false);
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleSaveTitle}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingTitle(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h1 className="text-base md:text-lg font-semibold truncate">{title}</h1>
                    {canEditSelected && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
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
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2 md:gap-3">
                {/* Desktop controls - Visibility toggle */}
                {!isMobile && selectedImageEditId && canEditSelected && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPrivate}
                      onClick={async () => {
                        const newValue = !isPrivate;
                        setIsPrivate(newValue);
                        await updateMutation.mutateAsync({
                          id: selectedImageEditId,
                          data: { isPrivate: newValue },
                        });
                      }}
                      disabled={updateMutation.isPending}
                      className={`
                        relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full 
                        border border-gray-300 transition-colors duration-200
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                        disabled:cursor-not-allowed disabled:opacity-50
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
                    <span className="text-sm text-muted-foreground">
                      {isPrivate ? 'Private' : 'Public'}
                    </span>
                  </div>
                )}

                {/* Desktop Model selector */}
                {!isMobile && (
                  <Select
                    value={selectedModel}
                    onValueChange={(value: "openai" | "gemini") => setSelectedModel(value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {/* Upload button to replace image in current session (desktop only) */}
                {!isMobile && selectedImageEditId && canEditSelected && (
                  <Button
                    variant="outline"
                    onClick={() => replaceImageInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload
                  </Button>
                )}

                {/* Mobile + button for new upload */}
                {isMobile && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="h-10 w-10"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Panel Toggle */}
          {isMobile && selectedImageEditId && (
            <div className="p-3 border-b md:hidden">
              <MobilePanelToggle
                activePanel={mobileActivePanel}
                onPanelChange={setMobileActivePanel}
                sourceLabel="Edit"
                outputLabel="Result"
                sourceIcon={<Pencil className="h-4 w-4" />}
                outputIcon={<ImageIcon className="h-4 w-4" />}
              />
            </div>
          )}

          {/* Mobile Collapsible Controls - Model and Visibility */}
          {isMobile && canEditSelected && selectedImageEditId && (
            <CollapsibleControls
              title="Edit Options"
              modelName={selectedModel === 'gemini' ? 'Gemini' : 'OpenAI'}
              className="md:hidden"
            >
              {/* Model selector */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Model</Label>
                <Select
                  value={selectedModel}
                  onValueChange={(value: "openai" | "gemini") => setSelectedModel(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Visibility</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isPrivate}
                    onClick={async () => {
                      const newValue = !isPrivate;
                      setIsPrivate(newValue);
                      await updateMutation.mutateAsync({
                        id: selectedImageEditId,
                        data: { isPrivate: newValue },
                      });
                    }}
                    disabled={updateMutation.isPending}
                    className={`
                      relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full 
                      border border-gray-300 transition-colors duration-200
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                      disabled:cursor-not-allowed disabled:opacity-50
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
                  <span className="text-sm">{isPrivate ? 'Private' : 'Public'}</span>
                </div>
              </div>
            </CollapsibleControls>
          )}

          {/* Content Area - Two Column Layout */}
          <div className="flex-1 overflow-hidden p-4 flex flex-col">
            {/* Top Row - Both Images (fixed ratio) */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left - Drawing Canvas (hide on mobile when Result panel is active) */}
              <div className={`min-h-0 flex flex-col relative ${isMobile && mobileActivePanel === 'output' ? 'hidden' : ''}`}>
                {sourceImageLoading ? (
                  <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <DrawingCanvas
                    imageUrl={sourceImageUrl}
                    stageRef={stageRef}
                    disabled={isSubmitting || isUploading}
                    onUploadClick={() => {
                      // If a session is selected and user can edit it, replace the image
                      // Otherwise, create a new session
                      if (selectedImageEditId && canEditSelected) {
                        replaceImageInputRef.current?.click();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    onAnnotationChange={handleAnnotationChange}
                    fillContainer
                    isMobile={isMobile}
                  />
                )}
                {/* Upload overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
                    <div className="text-center">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-sm font-medium">Uploading image...</p>
                      <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right - Result Image with Header (hide on mobile when Edit panel is active) */}
              <div className={`min-h-0 flex flex-col gap-3 ${isMobile && mobileActivePanel === 'source' ? 'hidden' : ''}`}>
                {/* Header - matches toolbar height */}
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg w-full min-h-[44px]">
                  {selectedOutput ? (
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <span className="text-xs font-medium text-muted-foreground shrink-0">
                        Model: <span className="text-foreground capitalize">{selectedOutput.model}</span>
                      </span>
                      <span className="text-muted-foreground/50">|</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground truncate min-w-0 cursor-help">
                            <span className="font-medium">Prompt:</span>{" "}
                            <span className="text-foreground">{selectedOutput.prompt}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-md">
                          <p className="text-sm whitespace-pre-wrap">{selectedOutput.prompt}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">No edit selected</span>
                  )}
                </div>

                {/* Result Image */}
                <div className="flex-1 border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                  {selectedOutputId && selectedOutput?.status === "completed" && selectedOutputImageData?.editedImageBase64 ? (
                    <img
                      src={`data:${selectedOutputImageData.editedMimeType};base64,${selectedOutputImageData.editedImageBase64}`}
                      alt="Edited result"
                      className="max-w-full max-h-full object-contain cursor-pointer"
                      onClick={() =>
                        setPreviewImage({
                          src: `data:${selectedOutputImageData.editedMimeType};base64,${selectedOutputImageData.editedImageBase64}`,
                          alt: "Edited result",
                        })
                      }
                    />
                  ) : selectedOutputId && selectedOutput?.status === "processing" ? (
                    <div className="text-center text-muted-foreground">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                      <p>Processing your edit...</p>
                      <p className="text-xs mt-1">This may take a moment</p>
                    </div>
                  ) : selectedOutputId && selectedOutput?.status === "failed" ? (
                    <div className="text-center text-destructive">
                      <X className="h-12 w-12 mx-auto mb-4" />
                      <p>Edit failed</p>
                      <p className="text-xs mt-1">Please try again</p>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                      <p>No result selected</p>
                      <p className="text-xs mt-1">Submit an edit or select from gallery below</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Row - Prompt & History (aligned) */}
            <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3">
              {/* Left - Prompt Input (hide on mobile when Result panel is active) */}
              <div className={`space-y-2 ${isMobile && mobileActivePanel === 'output' ? 'hidden' : ''}`}>
                <Label className="text-sm">Edit Instructions</Label>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Describe how you want to edit the image... (e.g., 'Remove the background', 'Add a sunset sky', 'Make it look like a painting')"
                  className="min-h-[80px] resize-none text-sm"
                  disabled={isSubmitting || !sourceImageUrl}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Tip: Use drawing tools to highlight specific areas
                  </p>
                  <Button
                    onClick={handleSubmitEdit}
                    disabled={isSubmitting || !sourceImageUrl || !editPrompt.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Apply Edit"
                    )}
                  </Button>
                </div>
              </div>

              {/* Right - Gallery (hide on mobile when Edit panel is active) */}
              <div className={`space-y-2 ${isMobile && mobileActivePanel === 'source' ? 'hidden' : ''}`}>
                <div className="flex items-center justify-between min-h-[28px] gap-2">
                  <Label className="shrink-0">
                    History{!isMobile && ` (${outputsMetadata.length} edits)`}
                  </Label>
                  {/* Bulk actions - show when items are checked */}
                  {checkedOutputIds.size > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {checkedOutputIds.size}{!isMobile && ' selected'}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size={isMobile ? "icon" : "sm"}
                            className={isMobile ? "h-7 w-7" : "h-7 text-xs"}
                            onClick={async () => {
                              // Download all checked items
                              for (const id of Array.from(checkedOutputIds)) {
                                await handleDownloadOutput(id);
                              }
                            }}
                          >
                            <Download className={isMobile ? "h-4 w-4" : "h-3 w-3 mr-1"} />
                            {!isMobile && "Download"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download selected</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size={isMobile ? "icon" : "sm"}
                            className={isMobile ? "h-7 w-7 text-destructive hover:text-destructive" : "h-7 text-xs text-destructive hover:text-destructive"}
                            onClick={() => {
                              // Delete all checked items
                              checkedOutputIds.forEach((id) => {
                                deleteOutputMutation.mutate(id);
                              });
                              setCheckedOutputIds(new Set());
                            }}
                          >
                            <Trash2 className={isMobile ? "h-4 w-4" : "h-3 w-3 mr-1"} />
                            {!isMobile && "Delete"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete selected</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size={isMobile ? "icon" : "sm"}
                            className={isMobile ? "h-7 w-7" : "h-7 text-xs"}
                            onClick={() => setCheckedOutputIds(new Set())}
                          >
                            <X className={isMobile ? "h-4 w-4" : "h-3 w-3 mr-1"} />
                            {!isMobile && "Clear"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Clear selection</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      {outputsMetadata.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4">
                          No edits yet. Submit an edit to see results here.
                        </p>
                      ) : (
                        outputsMetadata.map((output) => (
                          <OutputThumbnail
                            key={output.id}
                            output={output}
                            isViewing={selectedOutputId === output.id}
                            isChecked={checkedOutputIds.has(output.id)}
                            isDeleting={deletingOutputIds.has(output.id)}
                            showCheckbox={checkedOutputIds.size > 0}
                            onView={() => setSelectedOutputId(output.id)}
                            onToggleCheck={() => {
                              setCheckedOutputIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(output.id)) {
                                  next.delete(output.id);
                                } else {
                                  next.add(output.id);
                                }
                                return next;
                              });
                            }}
                            onDelete={() => setDeleteOutputConfirmId(output.id)}
                            onUseAsSource={() => handleUseAsSource(output.id)}
                            onDownload={() => handleDownloadOutput(output.id)}
                            isMobile={isMobile}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>

        {/* Delete Image Edit Confirmation */}
        <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Image Edit?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The image and all its edits will be permanently deleted.
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

        {/* Delete Output Confirmation */}
        <AlertDialog
          open={!!deleteOutputConfirmId}
          onOpenChange={(open) => !open && setDeleteOutputConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this edit result?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This edit result will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteOutputConfirmId && deleteOutputMutation.mutate(deleteOutputConfirmId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Replace Image Confirmation */}
        <AlertDialog
          open={!!pendingReplaceFile}
          onOpenChange={(open) => {
            if (!open) {
              setPendingReplaceFile(null);
              if (replaceImageInputRef.current) {
                replaceImageInputRef.current.value = "";
              }
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace existing image?</AlertDialogTitle>
              <AlertDialogDescription>
                This will replace the current source image with the new one. Your existing edit history will be preserved, but annotations on the canvas will be cleared.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingReplaceFile) {
                    handleReplaceImage(pendingReplaceFile);
                    setPendingReplaceFile(null);
                  }
                }}
              >
                Replace Image
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
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

