import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Save, Shield, ShieldCheck, ArrowLeft } from "lucide-react";
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
import type { AiModel, Language, Setting, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Settings() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isMobile = useIsMobile();
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [proofreadingPrompt, setProofreadingPrompt] = useState("");
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

  // Fetch system prompts
  const { data: settings } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
    select: (data) => {
      const promptSetting = data.find(s => s.key === "translation_system_prompt");
      if (promptSetting && !systemPrompt) {
        setSystemPrompt(promptSetting.value);
      }
      const proofreadingPromptSetting = data.find(s => s.key === "proofreading_system_prompt");
      if (proofreadingPromptSetting && !proofreadingPrompt) {
        setProofreadingPrompt(proofreadingPromptSetting.value);
      }
      return data;
    },
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
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

  // Save proofreading system prompt mutation
  const saveProofreadingPromptMutation = useMutation({
    mutationFn: async (value: string) => {
      return await apiRequest("POST", "/api/admin/settings", {
        key: "proofreading_system_prompt",
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Proofreading prompt saved",
        description: "Proofreading system prompt has been updated.",
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

  // Update user role mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { isAdmin });
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User role updated",
        description: `User ${variables.isAdmin ? 'promoted to' : 'removed from'} admin role.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className="border-b px-4 py-4 sm:py-6 sm:px-6 lg:px-8 flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="flex-shrink-0 h-9 w-9"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Manage your translation platform configuration</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
        <div className="container max-w-5xl py-4 sm:py-8 px-4 sm:px-6 lg:px-8 pb-8">
          <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="users" data-testid="tab-users" className="flex-shrink-0">Users</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai" className="flex-shrink-0">AI</TabsTrigger>
          <TabsTrigger value="translation" data-testid="tab-translation" className="flex-shrink-0">Translation</TabsTrigger>
          <TabsTrigger value="proofread" disabled data-testid="tab-proofread" className="flex-shrink-0">Proof Read</TabsTrigger>
        </TabsList>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-6">
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
                  placeholder={apiKeysStatus?.openai ? "••••••••••••••••" : "sk-..."}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  data-testid="input-openai-key"
                />
                {apiKeysStatus?.openai && !openaiKey && (
                  <p className="text-xs text-muted-foreground">
                    Key is configured. Enter a new key to update it.
                  </p>
                )}
              </div>
              <Button
                onClick={() => saveApiKeyMutation.mutate({ provider: "openai", key: openaiKey })}
                disabled={!openaiKey || saveApiKeyMutation.isPending}
                data-testid="button-save-openai-key"
              >
                {saveApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {apiKeysStatus?.openai && !openaiKey ? "Update" : "Save"} OpenAI Key
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
                  placeholder={apiKeysStatus?.anthropic ? "••••••••••••••••" : "sk-ant-..."}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  data-testid="input-anthropic-key"
                />
                {apiKeysStatus?.anthropic && !anthropicKey && (
                  <p className="text-xs text-muted-foreground">
                    Key is configured. Enter a new key to update it.
                  </p>
                )}
              </div>
              <Button
                onClick={() => saveApiKeyMutation.mutate({ provider: "anthropic", key: anthropicKey })}
                disabled={!anthropicKey || saveApiKeyMutation.isPending}
                data-testid="button-save-anthropic-key"
              >
                {saveApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {apiKeysStatus?.anthropic && !anthropicKey ? "Update" : "Save"} Anthropic Key
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
              ) : isMobile ? (
                <div className="space-y-3">
                  {models.map((model) => (
                    <Card key={model.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{model.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{model.provider}</p>
                            <p className="font-mono text-xs text-muted-foreground mt-1">{model.modelIdentifier}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteModelMutation.mutate(model.id)}
                            data-testid={`button-delete-model-${model.id}`}
                            className="h-8 w-8 flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`default-${model.id}`}
                            checked={model.isDefault}
                            onCheckedChange={(checked) =>
                              updateModelMutation.mutate({ id: model.id, isDefault: !!checked })
                            }
                            data-testid={`checkbox-default-${model.id}`}
                          />
                          <Label htmlFor={`default-${model.id}`} className="text-sm cursor-pointer">
                            Set as default
                          </Label>
                        </div>
                      </div>
                    </Card>
                  ))}
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

          {/* Proofreading System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Proofreading System Prompt</CardTitle>
              <CardDescription>
                Customize the system prompt used for proof-reading translations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proofreading-prompt">System Prompt</Label>
                <Textarea
                  id="proofreading-prompt"
                  value={proofreadingPrompt}
                  onChange={(e) => setProofreadingPrompt(e.target.value)}
                  className="min-h-48 font-mono text-sm"
                  placeholder="Enter system prompt for proof-reading..."
                  data-testid="textarea-proofreading-prompt"
                />
                <p className="text-xs text-muted-foreground">
                  {proofreadingPrompt.length} characters
                </p>
              </div>
              <Button
                onClick={() => saveProofreadingPromptMutation.mutate(proofreadingPrompt)}
                disabled={saveProofreadingPromptMutation.isPending}
                data-testid="button-save-proofreading-prompt"
              >
                {saveProofreadingPromptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Proofreading Prompt
              </Button>
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
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
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

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions. Admins can change roles but cannot modify their own.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : isMobile ? (
                <div className="space-y-3">
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;
                    const displayName = user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.firstName || user.email || "Unknown User";

                    return (
                      <Card key={user.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            {user.profileImageUrl ? (
                              <img 
                                src={user.profileImageUrl} 
                                alt={displayName}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{displayName}</p>
                              <p className="text-sm text-muted-foreground truncate">{user.email || "—"}</p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs mt-1">You</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              {user.isAdmin ? (
                                <Badge variant="default" className="gap-1">
                                  <ShieldCheck className="h-3 w-3" />
                                  Admin
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="gap-1">
                                  <Shield className="h-3 w-3" />
                                  User
                                </Badge>
                              )}
                            </div>
                            <Switch
                              checked={user.isAdmin}
                              onCheckedChange={(checked) => {
                                updateUserRoleMutation.mutate({
                                  userId: user.id,
                                  isAdmin: checked,
                                });
                              }}
                              disabled={isCurrentUser || updateUserRoleMutation.isPending}
                              aria-label={`Toggle admin access for ${displayName}`}
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-center">Role</TableHead>
                      <TableHead className="text-center">Admin Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isCurrentUser = user.id === currentUser?.id;
                      const displayName = user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || user.email || "Unknown User";

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {user.profileImageUrl ? (
                                <img 
                                  src={user.profileImageUrl} 
                                  alt={displayName}
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium">
                                    {displayName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{displayName}</p>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell className="text-center">
                            {user.isAdmin ? (
                              <Badge variant="default" className="gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                User
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={user.isAdmin}
                              onCheckedChange={(checked) => {
                                updateUserRoleMutation.mutate({
                                  userId: user.id,
                                  isAdmin: checked,
                                });
                              }}
                              disabled={isCurrentUser || updateUserRoleMutation.isPending}
                              aria-label={`Toggle admin access for ${displayName}`}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
