import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AiModel, Language, Setting } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Settings() {
  const { toast } = useToast();
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [isAddLanguageOpen, setIsAddLanguageOpen] = useState(false);
  const [newModel, setNewModel] = useState({ name: "", provider: "openai", modelIdentifier: "", isDefault: false });
  const [newLanguage, setNewLanguage] = useState({ code: "", name: "", nativeName: "" });

  // Fetch API keys status
  const { data: apiKeysStatus } = useQuery({
    queryKey: ["/api/admin/api-keys/status"],
  });

  // Fetch models
  const { data: models = [], isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/models"],
  });

  // Fetch languages
  const { data: languages = [], isLoading: languagesLoading } = useQuery<Language[]>({
    queryKey: ["/api/languages"],
  });

  // Fetch system prompt
  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
    select: (data) => {
      const promptSetting = data.find(s => s.key === "translation_system_prompt");
      if (promptSetting && !systemPrompt) {
        setSystemPrompt(promptSetting.value);
      }
      return data;
    },
  });

  // Save API key mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async ({ provider, key }: { provider: string; key: string }) => {
      return await apiRequest("POST", "/api/admin/api-keys", { provider, apiKey: key });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/api-keys/status"] });
      if (variables.provider === "openai") setOpenaiKey("");
      if (variables.provider === "anthropic") setAnthropicKey("");
      toast({
        title: "API Key saved",
        description: `${variables.provider} API key has been saved securely.`,
      });
    },
  });

  // Save system prompt mutation
  const savePromptMutation = useMutation({
    mutationFn: async (value: string) => {
      return await apiRequest("POST", "/api/admin/settings", {
        key: "translation_system_prompt",
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "System prompt saved",
        description: "Translation system prompt has been updated.",
      });
    },
  });

  // Add model mutation
  const addModelMutation = useMutation({
    mutationFn: async (data: typeof newModel) => {
      return await apiRequest("POST", "/api/admin/models", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      setIsAddModelOpen(false);
      setNewModel({ name: "", provider: "openai", modelIdentifier: "", isDefault: false });
      toast({
        title: "Model added",
        description: "New AI model has been added to the platform.",
      });
    },
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/models/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({
        title: "Model deleted",
        description: "AI model has been removed.",
      });
    },
  });

  // Update model mutation
  const updateModelMutation = useMutation({
    mutationFn: async ({ id, isDefault }: { id: string; isDefault: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/models/${id}`, { isDefault });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({
        title: "Model updated",
        description: "Default model has been changed.",
      });
    },
  });

  // Add language mutation
  const addLanguageMutation = useMutation({
    mutationFn: async (data: typeof newLanguage) => {
      return await apiRequest("POST", "/api/admin/languages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setIsAddLanguageOpen(false);
      setNewLanguage({ code: "", name: "", nativeName: "" });
      toast({
        title: "Language added",
        description: "New language has been added to the platform.",
      });
    },
  });

  // Delete language mutation
  const deleteLanguageMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/languages/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      toast({
        title: "Language deleted",
        description: "Language has been removed.",
      });
    },
  });

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your translation platform configuration</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="container max-w-5xl py-8 px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys" data-testid="tab-api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="translation" data-testid="tab-translation">Translation</TabsTrigger>
          <TabsTrigger value="proofread" disabled data-testid="tab-proofread">Proof Read</TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>OpenAI API Key</CardTitle>
              <CardDescription>
                Configure your OpenAI API key for GPT models
                {apiKeysStatus?.openai && (
                  <Badge variant="secondary" className="ml-2">Configured</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key">API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  data-testid="input-openai-key"
                />
              </div>
              <Button
                onClick={() => saveApiKeyMutation.mutate({ provider: "openai", key: openaiKey })}
                disabled={!openaiKey || saveApiKeyMutation.isPending}
                data-testid="button-save-openai-key"
              >
                {saveApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save OpenAI Key
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anthropic API Key</CardTitle>
              <CardDescription>
                Configure your Anthropic API key for Claude models
                {apiKeysStatus?.anthropic && (
                  <Badge variant="secondary" className="ml-2">Configured</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anthropic-key">API Key</Label>
                <Input
                  id="anthropic-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  data-testid="input-anthropic-key"
                />
              </div>
              <Button
                onClick={() => saveApiKeyMutation.mutate({ provider: "anthropic", key: anthropicKey })}
                disabled={!anthropicKey || saveApiKeyMutation.isPending}
                data-testid="button-save-anthropic-key"
              >
                {saveApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Anthropic Key
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Translation Tab */}
        <TabsContent value="translation" className="space-y-6">
          {/* System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Translation System Prompt</CardTitle>
              <CardDescription>
                Customize the system prompt used for all translations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="min-h-48 font-mono text-sm"
                  placeholder="Enter system prompt for translations..."
                  data-testid="textarea-system-prompt"
                />
                <p className="text-xs text-muted-foreground">
                  {systemPrompt.length} characters
                </p>
              </div>
              <Button
                onClick={() => savePromptMutation.mutate(systemPrompt)}
                disabled={savePromptMutation.isPending}
                data-testid="button-save-prompt"
              >
                {savePromptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save System Prompt
              </Button>
            </CardContent>
          </Card>

          {/* AI Models */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Models</CardTitle>
                  <CardDescription>
                    Manage available AI models for translation
                  </CardDescription>
                </div>
                <Dialog open={isAddModelOpen} onOpenChange={setIsAddModelOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-model">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Model
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add AI Model</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="model-name">Model Name</Label>
                        <Input
                          id="model-name"
                          placeholder="e.g., GPT-5"
                          value={newModel.name}
                          onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                          data-testid="input-model-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model-provider">Provider</Label>
                        <Select
                          value={newModel.provider}
                          onValueChange={(value) => setNewModel({ ...newModel, provider: value })}
                        >
                          <SelectTrigger id="model-provider" data-testid="select-model-provider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="anthropic">Anthropic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model-identifier">Model Identifier</Label>
                        <Input
                          id="model-identifier"
                          placeholder="e.g., gpt-5"
                          value={newModel.modelIdentifier}
                          onChange={(e) => setNewModel({ ...newModel, modelIdentifier: e.target.value })}
                          data-testid="input-model-identifier"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="model-default"
                          checked={newModel.isDefault}
                          onCheckedChange={(checked) => setNewModel({ ...newModel, isDefault: !!checked })}
                          data-testid="checkbox-model-default"
                        />
                        <Label htmlFor="model-default">Set as default model</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => addModelMutation.mutate(newModel)}
                        disabled={!newModel.name || !newModel.modelIdentifier || addModelMutation.isPending}
                        data-testid="button-create-model"
                      >
                        {addModelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Model
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {modelsLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model Name</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Identifier</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell className="capitalize">{model.provider}</TableCell>
                        <TableCell className="font-mono text-sm">{model.modelIdentifier}</TableCell>
                        <TableCell>
                          <Checkbox
                            checked={model.isDefault}
                            onCheckedChange={(checked) =>
                              updateModelMutation.mutate({ id: model.id, isDefault: !!checked })
                            }
                            data-testid={`checkbox-default-${model.id}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteModelMutation.mutate(model.id)}
                            data-testid={`button-delete-model-${model.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Languages */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Languages</CardTitle>
                  <CardDescription>
                    Manage available translation languages
                  </CardDescription>
                </div>
                <Dialog open={isAddLanguageOpen} onOpenChange={setIsAddLanguageOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-language">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Language
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Language</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="lang-code">Language Code</Label>
                        <Input
                          id="lang-code"
                          placeholder="e.g., es"
                          value={newLanguage.code}
                          onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                          data-testid="input-lang-code"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lang-name">Language Name</Label>
                        <Input
                          id="lang-name"
                          placeholder="e.g., Spanish"
                          value={newLanguage.name}
                          onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                          data-testid="input-lang-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lang-native">Native Name</Label>
                        <Input
                          id="lang-native"
                          placeholder="e.g., Español"
                          value={newLanguage.nativeName}
                          onChange={(e) => setNewLanguage({ ...newLanguage, nativeName: e.target.value })}
                          data-testid="input-lang-native"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => addLanguageMutation.mutate(newLanguage)}
                        disabled={!newLanguage.code || !newLanguage.name || !newLanguage.nativeName || addLanguageMutation.isPending}
                        data-testid="button-create-language"
                      >
                        {addLanguageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Language
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {languagesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {languages.map((lang) => (
                      <div
                        key={lang.id}
                        className="group flex items-center justify-between gap-2 rounded-md border p-3 hover-elevate"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lang.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lang.nativeName}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteLanguageMutation.mutate(lang.id)}
                          data-testid={`button-delete-lang-${lang.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proof Read Tab (Placeholder) */}
        <TabsContent value="proofread">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-lg font-medium text-muted-foreground">Proof Read Settings</p>
              <p className="text-sm text-muted-foreground mt-2">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
