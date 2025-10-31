import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, Copy, Check, Lock } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Translation, TranslationOutput, AiModel, Language } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Translate() {
  const { toast } = useToast();
  const [selectedTranslationId, setSelectedTranslationId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [title, setTitle] = useState("Untitled Translation");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [tempSelectedLanguages, setTempSelectedLanguages] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [copiedOutputId, setCopiedOutputId] = useState<string | null>(null);
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>("");
  const [editedOutputs, setEditedOutputs] = useState<Record<string, string>>({});
  const [isPrivate, setIsPrivate] = useState(false);

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

  // Create new translation mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/translations", {
        title: title || "Untitled Translation",
        sourceText: sourceText || "",
        isPrivate: isPrivate,
      });
      return await response.json() as Translation;
    },
    onSuccess: (data: Translation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      setSelectedTranslationId(data.id);
      setIsNewDialogOpen(false);
      setSourceText(data.sourceText);
      setTitle(data.title);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations"] });
      if (selectedTranslationId === deleteMutation.variables) {
        setSelectedTranslationId(null);
        setSourceText("");
        setTitle("Untitled Translation");
      }
      toast({
        title: "Translation deleted",
        description: "The translation has been removed.",
      });
    },
  });

  // Translate mutation
  const translateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTranslationId || !selectedModel || selectedLanguages.length === 0) {
        throw new Error("Missing required fields");
      }
      return await apiRequest("POST", "/api/translate", {
        translationId: selectedTranslationId,
        languageCodes: selectedLanguages,
        modelId: selectedModel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/translations", selectedTranslationId, "outputs"] });
      toast({
        title: "Translation complete",
        description: `Successfully translated to ${selectedLanguages.length} language${selectedLanguages.length > 1 ? 's' : ''}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Translation failed",
        description: error.message || "Failed to translate. Please check your API keys in settings.",
        variant: "destructive",
      });
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
    setEditedOutputs({});
  };

  const handleNewTranslation = () => {
    setTitle("Untitled Translation");
    setSourceText("");
    setIsPrivate(false);
    setIsNewDialogOpen(true);
  };

  const handleCreateNew = () => {
    createMutation.mutate();
  };

  const handleRename = (id: string, newTitle: string) => {
    updateMutation.mutate({ id, data: { title: newTitle } });
    setIsRenaming(null);
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

  const handleTranslate = () => {
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
    translateMutation.mutate();
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

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Sidebar - Translation History */}
      <div className="flex w-80 flex-col border-r bg-sidebar">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <h2 className="text-lg font-semibold">Translation History</h2>
          <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleNewTranslation} data-testid="button-new-translation">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-new-translation">
              <DialogHeader>
                <DialogTitle>Create New Translation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-title">Title</Label>
                  <Input
                    id="new-title"
                    placeholder="Enter translation title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-new-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-source">Source Text</Label>
                  <Textarea
                    id="new-source"
                    placeholder="Enter text to translate..."
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    className="min-h-32"
                    data-testid="textarea-new-source"
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="private-toggle" className="text-sm font-medium">
                      Private Translation
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Only you can see this translation
                    </p>
                  </div>
                  <Switch
                    id="private-toggle"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                    data-testid="switch-private"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateNew}
                  disabled={createMutation.isPending}
                  data-testid="button-create-translation"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="flex-1">
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {isRenaming === translation.id ? (
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => handleRename(translation.id, renameValue)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRename(translation.id, renameValue);
                            } else if (e.key === "Escape") {
                              setIsRenaming(null);
                            }
                          }}
                          autoFocus
                          className="h-auto p-0 border-none focus-visible:ring-0"
                          onClick={(e) => e.stopPropagation()}
                          data-testid="input-rename-translation"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{translation.title}</h3>
                          {translation.isPrivate && (
                            <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" data-testid={`icon-private-${translation.id}`} />
                          )}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(translation.updatedAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenaming(translation.id);
                          setRenameValue(translation.title);
                        }}
                        data-testid={`button-rename-${translation.id}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(translation.id);
                        }}
                        data-testid={`button-delete-${translation.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Middle Panel - Input */}
      <div className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-4 border-b p-4">
          {/* Language Multi-Select */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Languages:</Label>
            <Dialog open={isLanguageDialogOpen} onOpenChange={setIsLanguageDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="min-w-64" onClick={handleOpenLanguageDialog} data-testid="button-select-languages">
                  {selectedLanguages.length === 0
                    ? "Select languages..."
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
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium whitespace-nowrap">Model:</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="min-w-48" data-testid="select-model">
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
            disabled={!selectedTranslationId || translateMutation.isPending || selectedLanguages.length === 0}
            className="ml-auto"
            data-testid="button-translate"
          >
            {translateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Translate
          </Button>
        </div>

        <div className="flex-1 overflow-hidden p-6">
          <div className="flex h-full flex-col gap-4">
            <div>
              <Label htmlFor="title" className="mb-2 block text-sm font-medium">
                Translation Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveSource}
                placeholder="Enter translation title..."
                disabled={!selectedTranslationId}
                data-testid="input-translation-title"
              />
            </div>

            <div className="flex flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
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
                onBlur={handleSaveSource}
                placeholder="Enter text to translate..."
                className="flex-1 resize-none"
                disabled={!selectedTranslationId}
                data-testid="textarea-source"
              />
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
          ) : outputsLoading || translateMutation.isPending ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : outputs.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <p className="mb-2 text-sm font-medium">No translations yet</p>
                <p className="text-xs text-muted-foreground">
                  Select languages and click Translate to generate translations
                </p>
              </div>
            </div>
          ) : (
            <Tabs value={activeLanguageTab} onValueChange={setActiveLanguageTab} className="flex h-full flex-col">
              <TabsList className="mx-4 mt-4 w-auto justify-start overflow-x-auto">
                {outputs.map((output) => (
                  <TabsTrigger key={output.id} value={output.languageCode} data-testid={`tab-${output.languageCode}`}>
                    {output.languageName}
                  </TabsTrigger>
                ))}
              </TabsList>

              {outputs.map((output) => (
                <TabsContent
                  key={output.id}
                  value={output.languageCode}
                  className="flex-1 overflow-hidden p-6"
                >
                  <div className="flex h-full flex-col gap-4">
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
                      className="flex-1 resize-none"
                      data-testid={`textarea-output-${output.id}`}
                    />

                    <div className="text-xs text-muted-foreground">
                      Model: {models.find(m => m.id === output.modelId)?.name || "Unknown"}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
