import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Loader2, Copy, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Translation, TranslationOutput, AiModel, Language } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Translate() {
  const { toast } = useToast();
  const { user } = useAuth();
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
  const [translatingLanguages, setTranslatingLanguages] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  // Auto-select first translation on load
  useEffect(() => {
    if (!translationsLoading && translations.length > 0 && !selectedTranslationId) {
      const firstTranslation = translations[0];
      handleSelectTranslation(firstTranslation);
    }
  }, [translations, translationsLoading, selectedTranslationId]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      setSelectedTranslationId(data.id);
      setSourceText("");
      setTitle(data.title);
      setSelectedLanguages([]);
      setIsEditingTitle(false);
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

  const handleSelectTranslation = (translation: Translation) => {
    setSelectedTranslationId(translation.id);
    setSourceText(translation.sourceText);
    setTitle(translation.title);
    setSelectedLanguages(translation.selectedLanguages || []);
    // Pre-select the last used model if available
    if (translation.lastUsedModelId) {
      setSelectedModel(translation.lastUsedModelId);
    }
    setEditedOutputs({});
    setTranslatingLanguages(new Set());
  };

  const handleNewTranslation = () => {
    // Create immediately
    createMutation.mutate();
  };

  const handleRenameInList = (id: string, newTitle: string) => {
    if (!isEscapePressed && newTitle.trim()) {
      updateMutation.mutate({ id, data: { title: newTitle.trim() } });
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
      setTitle(trimmedTitle);
      updateMutation.mutate({
        id: selectedTranslationId,
        data: { title: trimmedTitle },
      });
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
        data: { sourceText, title, selectedLanguages },
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

    // Mark all languages as translating
    setTranslatingLanguages(new Set(selectedLanguages));
    
    // Set active tab to first language
    if (selectedLanguages.length > 0) {
      setActiveLanguageTab(selectedLanguages[0]);
    }

    // Translate all languages in parallel
    const promises = selectedLanguages.map(async (langCode) => {
      try {
        await translateSingleMutation.mutateAsync({ languageCode: langCode });
        // Remove from translating set when done
        setTranslatingLanguages(prev => {
          const newSet = new Set(prev);
          newSet.delete(langCode);
          return newSet;
        });
      } catch (error) {
        console.error(`Failed to translate to ${langCode}:`, error);
        setTranslatingLanguages(prev => {
          const newSet = new Set(prev);
          newSet.delete(langCode);
          return newSet;
        });
        throw error;
      }
    });

    try {
      await Promise.all(promises);
      toast({
        title: "Translation complete",
        description: `Successfully translated to ${selectedLanguages.length} language${selectedLanguages.length > 1 ? 's' : ''}.`,
      });
    } catch (error) {
      toast({
        title: "Translation failed",
        description: error instanceof Error ? error.message : "Failed to translate. Please check your API keys in settings.",
        variant: "destructive",
      });
    }
  };

  const handleCopyOutput = (text: string, outputId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOutputId(outputId);
    setTimeout(() => setCopiedOutputId(null), 2000);
    toast({
      title: "Copied to clipboard",
      description: "Translation text has been copied.",
    });
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
      setEditedOutputs(prev => {
        const newOutputs = { ...prev };
        delete newOutputs[outputId];
        return newOutputs;
      });
    }
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
    return user.isAdmin || translation.userId === user.id;
  };

  // Get currently selected translation
  const selectedTranslation = translations.find(t => t.id === selectedTranslationId) || null;
  const canEditSelected = canEdit(selectedTranslation);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Translation History */}
      <div className="flex w-80 flex-col border-r bg-sidebar flex-shrink-0">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="text-lg font-semibold">Translation History</h2>
          <Button size="sm" onClick={handleNewTranslation} disabled={createMutation.isPending} data-testid="button-new-translation">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 overflow-x-hidden">
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
            <div className="space-y-1 p-2">
              {translations.map((translation) => (
                <Card
                  key={translation.id}
                  className={`group cursor-pointer p-4 hover-elevate ${
                    selectedTranslationId === translation.id ? "bg-sidebar-accent" : ""
                  }`}
                  onClick={() => handleSelectTranslation(translation)}
                  data-testid={`card-translation-${translation.id}`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
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
                        <div 
                          className={`flex items-center gap-2 min-w-0 ${canEdit(translation) ? 'cursor-text' : ''}`}
                          onClick={(e) => {
                            if (canEdit(translation)) {
                              e.stopPropagation();
                              setIsRenamingId(translation.id);
                              setRenameValue(translation.title);
                            }
                          }}
                        >
                          <h3 className="font-medium truncate flex-1 min-w-0">{translation.title}</h3>
                          {translation.isPrivate && (
                            <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" data-testid={`icon-private-${translation.id}`} />
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {new Date(translation.updatedAt!).toLocaleDateString()}
                      </p>
                    </div>
                    {canEdit(translation) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Middle Panel - Input */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2 border-b p-4">
          {/* Language Multi-Select */}
          <div className="flex items-center gap-2 flex-shrink-0">
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Label className="text-sm font-medium whitespace-nowrap">Model:</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!canEditSelected}>
              <SelectTrigger className="w-full max-w-xs" data-testid="select-model">
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
          <Button
            onClick={handleTranslate}
            disabled={!selectedTranslationId || !canEditSelected || translatingLanguages.size > 0 || selectedLanguages.length === 0}
            className="flex-shrink-0"
            data-testid="button-translate"
          >
            {translatingLanguages.size > 0 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Translate
          </Button>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <div className="flex h-full flex-col gap-4">
            <div className="flex-shrink-0">
              <Label className="mb-2 block text-sm font-medium">
                Translation Title
              </Label>
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

            <div className="flex flex-1 flex-col min-h-0">
              <div className="mb-2 flex items-center justify-between flex-shrink-0">
                <Label htmlFor="source-text" className="text-sm font-medium">
                  Source Text
                </Label>
                <span className="text-xs text-muted-foreground">
                  {(sourceText || "").length} characters
                </span>
              </div>
              <Textarea
                id="source-text"
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Enter text to translate..."
                className="flex-1 min-h-0 resize-none"
                disabled={!selectedTranslationId || !canEditSelected}
                data-testid="textarea-source"
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
      <div className="flex w-full max-w-3xl flex-col border-l">
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">Translations</h2>
        </div>

        <div className="flex-1 overflow-hidden">
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
              <TabsList className="mx-4 mt-4 w-auto justify-start overflow-x-auto">
                {selectedLanguages.map((langCode) => {
                  const language = activeLanguages.find(l => l.code === langCode);
                  const isTranslating = translatingLanguages.has(langCode);
                  const output = outputs.find(o => o.languageCode === langCode);
                  const isCompleted = !isTranslating && output;
                  
                  return (
                    <TabsTrigger key={langCode} value={langCode} data-testid={`tab-${langCode}`} className="gap-2">
                      {language?.name || langCode}
                      {isTranslating && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isCompleted && <Check className="h-3 w-3 text-green-600" />}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {selectedLanguages.map((langCode) => {
                const output = outputs.find(o => o.languageCode === langCode);
                const language = activeLanguages.find(l => l.code === langCode);
                const isTranslating = translatingLanguages.has(langCode);
                
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
                  ) : output ? (
                    <ScrollArea className="h-full">
                      <div className="flex flex-col gap-4 p-6">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{output.languageName}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyOutput(editedOutputs[output.id] ?? output.translatedText, output.id)}
                            data-testid={`button-copy-${output.id}`}
                          >
                            {copiedOutputId === output.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <Textarea
                          value={editedOutputs[output.id] ?? output.translatedText}
                          onChange={(e) => setEditedOutputs(prev => ({ ...prev, [output.id]: e.target.value }))}
                          onBlur={() => handleSaveOutput(output.id)}
                          className="min-h-96 resize-none"
                          disabled={!canEditSelected}
                          data-testid={`textarea-output-${output.id}`}
                        />

                        <div className="text-xs text-muted-foreground">
                          Model: {models.find(m => m.id === output.modelId)?.name || "Unknown"}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                      <div>
                        <p className="mb-2 text-sm font-medium">Not yet translated</p>
                        <p className="text-xs text-muted-foreground">
                          Click Translate to generate translation for {language?.name || langCode}
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>;
              })}
            </Tabs>
          )}
        </div>
      </div>

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
