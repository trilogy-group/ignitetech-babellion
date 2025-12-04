import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Save, Shield, ShieldCheck, ArrowLeft, Pencil, Check, ChevronsUpDown, BarChart3, Languages, FileText, Users, ThumbsUp, ThumbsDown, Bot, TrendingUp, Image } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AiModel, Language, Setting, User, ProofreadingRuleCategory, ProofreadingRule } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useSaveLastVisitedPage } from "@/hooks/useLastVisitedPage";

export default function Settings() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isMobile = useIsMobile();
  
  // Save this page as last visited
  useSaveLastVisitedPage("/settings");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [imageTranslationPrompt, setImageTranslationPrompt] = useState("");
  const [proofreadingPrompt, setProofreadingPrompt] = useState("");
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);
  const [isAddLanguageOpen, setIsAddLanguageOpen] = useState(false);
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [isEditRuleOpen, setIsEditRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProofreadingRule | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isEditCategoryDropdownOpen, setIsEditCategoryDropdownOpen] = useState(false);
  const [newModel, setNewModel] = useState({ name: "", provider: "openai", modelIdentifier: "", isDefault: false });
  const [newLanguage, setNewLanguage] = useState({ code: "", name: "", nativeName: "" });
  const [newRule, setNewRule] = useState({ title: "", categoryId: "", categoryName: "", ruleText: "", isActive: true });
  const [pdfCleanupModel, setPdfCleanupModel] = useState("");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'30d' | '60d' | '90d' | '1y'>('30d');

  // Fetch API keys status
  const { data: apiKeysStatus } = useQuery<{ openai: boolean; anthropic: boolean; gemini: boolean }>({
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
      const imageTranslationPromptSetting = data.find(s => s.key === "image_translation_system_prompt");
      if (imageTranslationPromptSetting && !imageTranslationPrompt) {
        setImageTranslationPrompt(imageTranslationPromptSetting.value);
      }
      return data;
    },
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Fetch proofreading categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ProofreadingRuleCategory[]>({
    queryKey: ["/api/admin/proofreading-categories"],
  });

  // Fetch proofreading rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery<ProofreadingRule[]>({
    queryKey: ["/api/admin/proofreading-rules"],
  });

  // Fetch PDF cleanup model setting
  const { data: pdfCleanupModelSetting } = useQuery<{ value: string; isDefault: boolean }>({
    queryKey: ["/api/settings/pdf-cleanup-model"],
    select: (data) => {
      if (data?.value && !pdfCleanupModel) {
        setPdfCleanupModel(data.value);
      }
      return data;
    },
  });

  // Analytics queries
  const { data: analyticsOverview, isLoading: overviewLoading } = useQuery<{
    totalTranslations: number;
    totalProofreadings: number;
    totalImageTranslations: number;
    activeUsers: number;
    totalFeedback: number;
  }>({
    queryKey: ["/api/admin/analytics/overview", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/overview?period=${analyticsPeriod}`);
      if (!res.ok) throw new Error('Failed to fetch overview');
      return res.json();
    },
  });

  const { data: usageOverTime, isLoading: usageLoading } = useQuery<{
    data: { date: string; translations: number; proofreadings: number; imageTranslations: number }[];
    granularity: 'day' | 'week' | 'month';
  }>({
    queryKey: ["/api/admin/analytics/usage-over-time", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/usage-over-time?period=${analyticsPeriod}`);
      if (!res.ok) throw new Error('Failed to fetch usage over time');
      return res.json();
    },
  });

  const { data: topLanguages, isLoading: languagesLoading2 } = useQuery<{
    languageName: string;
    count: number;
  }[]>({
    queryKey: ["/api/admin/analytics/languages", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/languages?period=${analyticsPeriod}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch top languages');
      return res.json();
    },
  });

  const { data: categoryUsage, isLoading: categoryLoading } = useQuery<{
    categoryId: string;
    categoryName: string;
    count: number;
  }[]>({
    queryKey: ["/api/admin/analytics/proofreading-categories", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/proofreading-categories?period=${analyticsPeriod}`);
      if (!res.ok) throw new Error('Failed to fetch category usage');
      return res.json();
    },
  });

  const { data: feedbackSentiment, isLoading: sentimentLoading } = useQuery<{
    positive: number;
    negative: number;
  }>({
    queryKey: ["/api/admin/analytics/feedback-sentiment", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/feedback-sentiment?period=${analyticsPeriod}`);
      if (!res.ok) throw new Error('Failed to fetch feedback sentiment');
      return res.json();
    },
  });

  const { data: modelUsage, isLoading: modelUsageLoading } = useQuery<{
    modelId: string;
    modelName: string;
    count: number;
  }[]>({
    queryKey: ["/api/admin/analytics/model-usage", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/model-usage?period=${analyticsPeriod}`);
      if (!res.ok) throw new Error('Failed to fetch model usage');
      return res.json();
    },
  });

  const { data: topUsers, isLoading: topUsersLoading } = useQuery<{
    userId: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    profileImageUrl: string | null;
    translationCount: number;
    proofreadingCount: number;
    totalCount: number;
  }[]>({
    queryKey: ["/api/admin/analytics/top-users", analyticsPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/top-users?period=${analyticsPeriod}&limit=10`);
      if (!res.ok) throw new Error('Failed to fetch top users');
      return res.json();
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
      if (variables.provider === "gemini") setGeminiKey("");
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

  // Save image translation system prompt mutation
  const saveImageTranslationPromptMutation = useMutation({
    mutationFn: async (value: string) => {
      return await apiRequest("POST", "/api/admin/settings/image-translation-prompt", { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Image translation prompt saved",
        description: "Image translation system prompt has been updated.",
      });
    },
  });

  // Save PDF cleanup model mutation
  const savePdfCleanupModelMutation = useMutation({
    mutationFn: async (value: string) => {
      return await apiRequest("POST", "/api/admin/settings/pdf-cleanup-model", { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/pdf-cleanup-model"] });
      toast({
        title: "PDF cleanup model saved",
        description: "The model for PDF Deep Import has been updated.",
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

  // Helper function to get or create category
  const getOrCreateCategory = async (categoryName: string): Promise<string> => {
    if (!categoryName.trim()) {
      throw new Error("Category name is required");
    }

    // Check if category exists
    const existingCategory = categories.find(
      c => c.name.toLowerCase() === categoryName.trim().toLowerCase()
    );

    if (existingCategory) {
      return existingCategory.id;
    }

    // Create new category
    const response = await apiRequest("POST", "/api/admin/proofreading-categories", {
      name: categoryName.trim(),
      description: "",
      isActive: true,
    });
    const newCategory = await response.json() as ProofreadingRuleCategory;
    
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ["/api/admin/proofreading-categories"] });
    queryClient.invalidateQueries({ queryKey: ["/api/proofreading-categories"] });
    
    return newCategory.id;
  };

  // Proofreading rule mutations
  const addRuleMutation = useMutation({
    mutationFn: async (data: typeof newRule) => {
      // If categoryName is provided and categoryId is not, create the category
      let categoryId = data.categoryId;
      if (data.categoryName && !categoryId) {
        categoryId = await getOrCreateCategory(data.categoryName);
      }
      
      if (!categoryId) {
        throw new Error("Category is required");
      }

      return await apiRequest("POST", "/api/admin/proofreading-rules", {
        title: data.title,
        categoryId,
        ruleText: data.ruleText,
        isActive: data.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proofreading-rules"] });
      setIsAddRuleOpen(false);
      setNewRule({ title: "", categoryId: "", categoryName: "", ruleText: "", isActive: true });
      setNewCategoryName("");
      toast({
        title: "Rule added",
        description: "New proofreading rule has been added.",
      });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProofreadingRule> & { categoryName?: string } }) => {
      // If categoryName is provided, get or create the category
      let categoryId = data.categoryId;
      if (data.categoryName && !categoryId) {
        categoryId = await getOrCreateCategory(data.categoryName);
      }

      const updateData: Partial<ProofreadingRule> = {
        ...data,
        categoryId: categoryId || data.categoryId,
      };
      delete (updateData as unknown as Record<string, unknown>).categoryName;

      return await apiRequest("PATCH", `/api/admin/proofreading-rules/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proofreading-rules"] });
      setIsEditRuleOpen(false);
      setEditingRule(null);
      toast({
        title: "Rule updated",
        description: "Proofreading rule has been updated.",
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/admin/proofreading-rules/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proofreading-rules"] });
      toast({
        title: "Rule deleted",
        description: "Proofreading rule has been removed.",
      });
    },
  });

  return (
    <div className="flex h-full flex-col overflow-hidden">
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

      <ScrollArea className="flex-1 min-h-0">
        <div className="container max-w-5xl py-4 sm:py-8 px-4 sm:px-6 lg:px-8 pb-12">
          <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full overflow-x-auto scrollbar-hide scroll-shadow-x h-auto flex-wrap md:flex-nowrap justify-start gap-1 p-1">
          <TabsTrigger value="users" data-testid="tab-users" className="flex-shrink-0 h-10 min-h-touch px-3">Users</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics" className="flex-shrink-0 h-10 min-h-touch px-3">Analytics</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai" className="flex-shrink-0 h-10 min-h-touch px-3">AI</TabsTrigger>
          <TabsTrigger value="proofread" data-testid="tab-proofread" className="flex-shrink-0 h-10 min-h-touch px-3">Proof Read</TabsTrigger>
          <TabsTrigger value="translation" data-testid="tab-translation" className="flex-shrink-0 h-10 min-h-touch px-3">Translation</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Period Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Period:</span>
            <div className="flex gap-1">
              {(['30d', '60d', '90d', '1y'] as const).map((period) => (
                <Button
                  key={period}
                  variant={analyticsPeriod === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsPeriod(period)}
                  className="px-3"
                >
                  {period === '30d' ? '30 Days' : period === '60d' ? '60 Days' : period === '90d' ? '90 Days' : '1 Year'}
                </Button>
              ))}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Text Translations</CardTitle>
                <Languages className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : analyticsOverview?.totalTranslations || 0}
                </div>
                <p className="text-xs text-muted-foreground">documents created</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Image Translations</CardTitle>
                <Image className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : analyticsOverview?.totalImageTranslations || 0}
                </div>
                <p className="text-xs text-muted-foreground">images translated</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Proofreadings</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : analyticsOverview?.totalProofreadings || 0}
                </div>
                <p className="text-xs text-muted-foreground">documents proofread</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : analyticsOverview?.activeUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">in this period</p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Usage Over Time
              </CardTitle>
              <CardDescription>
                Translation and proofreading activity by {usageOverTime?.granularity || 'day'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : usageOverTime?.data && usageOverTime.data.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageOverTime.data}>
                      <defs>
                        <linearGradient id="colorTranslations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProofreadings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorImageTranslations" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return usageOverTime?.granularity === 'month' 
                            ? date.toLocaleDateString('en-US', { month: 'short' })
                            : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="font-medium">{new Date(label).toLocaleDateString()}</div>
                                {payload.map((entry, index) => (
                                  <div key={index} className="flex items-center gap-2 text-sm">
                                    <div 
                                      className="h-2 w-2 rounded-full" 
                                      style={{ backgroundColor: entry.color }} 
                                    />
                                    <span className="text-muted-foreground">{entry.name}:</span>
                                    <span className="font-medium">{entry.value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="translations"
                        name="Text Translations"
                        stroke="hsl(var(--chart-1))"
                        fillOpacity={1}
                        fill="url(#colorTranslations)"
                      />
                      <Area
                        type="monotone"
                        dataKey="imageTranslations"
                        name="Image Translations"
                        stroke="hsl(var(--chart-3))"
                        fillOpacity={1}
                        fill="url(#colorImageTranslations)"
                      />
                      <Area
                        type="monotone"
                        dataKey="proofreadings"
                        name="Proofreadings"
                        stroke="hsl(var(--chart-2))"
                        fillOpacity={1}
                        fill="url(#colorProofreadings)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-2 opacity-50" />
                  <p>No data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Two-column charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Languages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Most Translated Languages
                </CardTitle>
                <CardDescription>Top 10 target languages</CardDescription>
              </CardHeader>
              <CardContent>
                {languagesLoading2 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : topLanguages && topLanguages.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topLanguages} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="languageName" 
                          width={80} 
                          className="text-xs"
                          tickFormatter={(value) => value.length > 10 ? value.slice(0, 10) + '...' : value}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="font-medium">{payload[0].payload.languageName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {payload[0].value} translations
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Languages className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No language data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proofreading Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Proofreading Categories
                </CardTitle>
                <CardDescription>Most used rule categories</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : categoryUsage && categoryUsage.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryUsage}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="categoryName"
                          label={({ categoryName, percent }) => `${categoryName} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {categoryUsage.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="font-medium">{payload[0].payload.categoryName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {payload[0].value} uses
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Second row of two-column charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Feedback Sentiment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5" />
                  Feedback Sentiment
                </CardTitle>
                <CardDescription>User feedback on translations</CardDescription>
              </CardHeader>
              <CardContent>
                {sentimentLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : feedbackSentiment && (feedbackSentiment.positive > 0 || feedbackSentiment.negative > 0) ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Positive', value: feedbackSentiment.positive, fill: 'hsl(142, 71%, 45%)' },
                            { name: 'Negative', value: feedbackSentiment.negative, fill: 'hsl(0, 84%, 60%)' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const total = feedbackSentiment.positive + feedbackSentiment.negative;
                              const percent = total > 0 ? ((payload[0].value as number) / total * 100).toFixed(0) : 0;
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="font-medium">{payload[0].name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {payload[0].value} ({percent}%)
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ThumbsUp className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No feedback data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Model Usage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Model Usage
                </CardTitle>
                <CardDescription>Most used AI models</CardDescription>
              </CardHeader>
              <CardContent>
                {modelUsageLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : modelUsage && modelUsage.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={modelUsage} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="modelName" 
                          width={100} 
                          className="text-xs"
                          tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + '...' : value}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm">
                                  <div className="font-medium">{payload[0].payload.modelName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {payload[0].value} uses
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bot className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No model data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Active Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Active Users
              </CardTitle>
              <CardDescription>Users with most activity in this period</CardDescription>
            </CardHeader>
            <CardContent>
              {topUsersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : topUsers && topUsers.length > 0 ? (
                isMobile ? (
                  <div className="space-y-3">
                    {topUsers.map((user, index) => {
                      const displayName = user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || user.email || "Unknown User";
                      return (
                        <Card key={user.userId} className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-6 text-center font-bold text-muted-foreground">
                              #{index + 1}
                            </div>
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
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{displayName}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>{user.translationCount} translations</span>
                                <span>{user.proofreadingCount} proofreadings</span>
                              </div>
                            </div>
                            <Badge variant="secondary">{user.totalCount}</Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead className="text-center">Translations</TableHead>
                        <TableHead className="text-center">Proofreadings</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topUsers.map((user, index) => {
                        const displayName = user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.firstName || user.email || "Unknown User";
                        return (
                          <TableRow key={user.userId}>
                            <TableCell className="font-bold text-muted-foreground">
                              {index + 1}
                            </TableCell>
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
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{user.translationCount}</TableCell>
                            <TableCell className="text-center">{user.proofreadingCount}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{user.totalCount}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-10 w-10 mb-2 opacity-50" />
                  <p className="text-sm">No user activity data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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

          <Card>
            <CardHeader>
              <CardTitle>Google Gemini API Key</CardTitle>
              <CardDescription>
                Configure your Google Gemini API key for image translation
                {apiKeysStatus?.gemini && (
                  <Badge variant="secondary" className="ml-2">Configured</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-key">API Key</Label>
                <Input
                  id="gemini-key"
                  type="password"
                  placeholder={apiKeysStatus?.gemini ? "••••••••••••••••" : "AIza..."}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  data-testid="input-gemini-key"
                />
                {apiKeysStatus?.gemini && !geminiKey && (
                  <p className="text-xs text-muted-foreground">
                    Key is configured. Enter a new key to update it.
                  </p>
                )}
              </div>
              <Button
                onClick={() => saveApiKeyMutation.mutate({ provider: "gemini", key: geminiKey })}
                disabled={!geminiKey || saveApiKeyMutation.isPending}
                data-testid="button-save-gemini-key"
              >
                {saveApiKeyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {apiKeysStatus?.gemini && !geminiKey ? "Update" : "Save"} Gemini Key
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
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                          className="h-11 min-h-touch"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="model-provider">Provider</Label>
                        <Select
                          value={newModel.provider}
                          onValueChange={(value) => setNewModel({ ...newModel, provider: value })}
                        >
                          <SelectTrigger id="model-provider" data-testid="select-model-provider" className="h-11 min-h-touch">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai" className="min-h-touch">OpenAI</SelectItem>
                            <SelectItem value="anthropic" className="min-h-touch">Anthropic</SelectItem>
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
                          className="h-11 min-h-touch"
                        />
                      </div>
                      <div className="flex items-center gap-2 min-h-touch">
                        <Checkbox
                          id="model-default"
                          checked={newModel.isDefault}
                          onCheckedChange={(checked) => setNewModel({ ...newModel, isDefault: !!checked })}
                          data-testid="checkbox-model-default"
                          className="h-5 w-5"
                        />
                        <Label htmlFor="model-default">Set as default model</Label>
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        onClick={() => addModelMutation.mutate(newModel)}
                        disabled={!newModel.name || !newModel.modelIdentifier || addModelMutation.isPending}
                        data-testid="button-create-model"
                        className="h-11 min-h-touch flex-1 md:flex-none"
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

          {/* PDF Deep Import Model */}
          <Card>
            <CardHeader>
              <CardTitle>PDF Deep Import Model</CardTitle>
              <CardDescription>
                Select the Anthropic model to use for PDF Deep Import (AI-enhanced formatting)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pdf-cleanup-model">Anthropic Model</Label>
                <Select
                  value={pdfCleanupModel}
                  onValueChange={setPdfCleanupModel}
                >
                  <SelectTrigger id="pdf-cleanup-model" data-testid="select-pdf-cleanup-model">
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models
                      .filter(m => m.provider === 'anthropic' && m.isActive)
                      .map((model) => (
                        <SelectItem key={model.id} value={model.modelIdentifier}>
                          {model.name} ({model.modelIdentifier})
                        </SelectItem>
                      ))}
                    {/* Fallback options if no Anthropic models configured */}
                    {models.filter(m => m.provider === 'anthropic' && m.isActive).length === 0 && (
                      <>
                        <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4 (claude-sonnet-4-20250514)</SelectItem>
                        <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)</SelectItem>
                        <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (claude-3-haiku-20240307)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {pdfCleanupModelSetting?.isDefault && (
                  <p className="text-xs text-muted-foreground">
                    Using default model. Select a model to customize.
                  </p>
                )}
              </div>
              <Button
                onClick={() => savePdfCleanupModelMutation.mutate(pdfCleanupModel)}
                disabled={!pdfCleanupModel || savePdfCleanupModelMutation.isPending}
                data-testid="button-save-pdf-cleanup-model"
              >
                {savePdfCleanupModelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save PDF Model
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

          {/* Image Translation System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle>Image Translation System Prompt</CardTitle>
              <CardDescription>
                Customize the system prompt used for image translation. Use {'{language}'} as a placeholder for the target language.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image-translation-prompt">System Prompt</Label>
                <Textarea
                  id="image-translation-prompt"
                  value={imageTranslationPrompt}
                  onChange={(e) => setImageTranslationPrompt(e.target.value)}
                  className="min-h-48 font-mono text-sm"
                  placeholder="Translate all text visible in this image to {language}. Preserve the original image layout, styling, fonts, and visual design..."
                  data-testid="textarea-image-translation-prompt"
                />
                <p className="text-xs text-muted-foreground">
                  {imageTranslationPrompt.length} characters. Leave empty to use the default prompt.
                </p>
              </div>
              <Button
                onClick={() => saveImageTranslationPromptMutation.mutate(imageTranslationPrompt)}
                disabled={saveImageTranslationPromptMutation.isPending}
                data-testid="button-save-image-translation-prompt"
              >
                {saveImageTranslationPromptMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Image Translation Prompt
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
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                          className="h-11 min-h-touch"
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
                          className="h-11 min-h-touch"
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
                          className="h-11 min-h-touch"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-2">
                      <Button
                        onClick={() => addLanguageMutation.mutate(newLanguage)}
                        disabled={!newLanguage.code || !newLanguage.name || !newLanguage.nativeName || addLanguageMutation.isPending}
                        data-testid="button-create-language"
                        className="h-11 min-h-touch flex-1 md:flex-none"
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

        {/* Proof Read Tab */}
        <TabsContent value="proofread" className="space-y-6">
          {/* Rules Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Proofreading Rules</CardTitle>
                  <CardDescription>
                    Manage individual proofreading rules
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={isAddRuleOpen} onOpenChange={(open) => {
                    setIsAddRuleOpen(open);
                    if (!open) {
                      setNewCategoryName("");
                      setNewRule({ title: "", categoryId: "", categoryName: "", ruleText: "", isActive: true });
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
                      <DialogHeader className="flex-shrink-0">
                        <DialogTitle>Add Proofreading Rule</DialogTitle>
                      </DialogHeader>
                      <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
                        <div className="space-y-2">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="rule-title">Rule Title</Label>
                              <Input
                                id="rule-title"
                                placeholder="e.g., Check for passive voice"
                                value={newRule.title}
                                onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                                className="h-11 min-h-touch"
                              />
                            </div>
                            <div className="flex items-center gap-2 md:pt-8">
                              <Switch
                                checked={newRule.isActive}
                                onCheckedChange={(checked) => setNewRule({ ...newRule, isActive: !!checked })}
                              />
                              <Label htmlFor="rule-active">Active</Label>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rule-category">Category</Label>
                          <Popover open={isCategoryDropdownOpen} onOpenChange={setIsCategoryDropdownOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={isCategoryDropdownOpen}
                                className="w-full justify-between h-11 min-h-touch"
                                id="rule-category"
                              >
                                {newRule.categoryId
                                  ? categories.find((cat) => cat.id === newRule.categoryId)?.name || newCategoryName || "Select category..."
                                  : newCategoryName || "Select or create category..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0" align="start">
                              <Command>
                                <CommandInput
                                  placeholder="Search or type new category..."
                                  value={newCategoryName}
                                  onValueChange={(value) => {
                                    setNewCategoryName(value);
                                    const foundCategory = categories.find(
                                      (cat) => cat.name.toLowerCase() === value.toLowerCase()
                                    );
                                    if (foundCategory) {
                                      setNewRule({ ...newRule, categoryId: foundCategory.id, categoryName: "" });
                                      setIsCategoryDropdownOpen(false);
                                    } else {
                                      setNewRule({ ...newRule, categoryId: "", categoryName: value });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && newCategoryName && !categories.find(c => c.name.toLowerCase() === newCategoryName.toLowerCase())) {
                                      e.preventDefault();
                                      setIsCategoryDropdownOpen(false);
                                    }
                                  }}
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {newCategoryName ? (
                                      <div className="py-2 text-sm text-muted-foreground">
                                        Press Enter to create "{newCategoryName}"
                                      </div>
                                    ) : (
                                      "No category found."
                                    )}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {categories.map((cat) => (
                                      <CommandItem
                                        key={cat.id}
                                        value={cat.name}
                                        onSelect={() => {
                                          setNewRule({ ...newRule, categoryId: cat.id, categoryName: "" });
                                          setNewCategoryName("");
                                          setIsCategoryDropdownOpen(false);
                                        }}
                                        className="min-h-touch"
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            newRule.categoryId === cat.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {cat.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {newCategoryName && !categories.find(c => c.name.toLowerCase() === newCategoryName.toLowerCase()) && (
                            <p className="text-xs text-muted-foreground">
                              New category "{newCategoryName}" will be created when you save this rule.
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rule-text">Rule Text</Label>
                          <Textarea
                            id="rule-text"
                            placeholder="Describe the rule in detail..."
                            value={newRule.ruleText}
                            onChange={(e) => setNewRule({ ...newRule, ruleText: e.target.value })}
                            className="min-h-40 md:min-h-64"
                          />
                        </div>
                      </div>
                      <DialogFooter className="flex-shrink-0 gap-2">
                        <Button
                          onClick={() => {
                            // Ensure categoryName is set if categoryId is not set
                            const ruleToSave = {
                              ...newRule,
                              categoryName: newRule.categoryId ? "" : (newRule.categoryName || newCategoryName),
                            };
                            addRuleMutation.mutate(ruleToSave);
                          }}
                          disabled={!newRule.title || (!newRule.categoryId && !newRule.categoryName && !newCategoryName) || !newRule.ruleText || addRuleMutation.isPending}
                          className="h-11 min-h-touch flex-1 md:flex-none"
                        >
                          {addRuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Add Rule
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {rules
                    .filter(rule => selectedCategoryFilter === "all" || rule.categoryId === selectedCategoryFilter)
                    .map((rule) => {
                      const category = categories.find(c => c.id === rule.categoryId);
                      return (
                        <Card key={rule.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{rule.title}</p>
                                  {category && (
                                    <Badge variant="outline">{category.name}</Badge>
                                  )}
                                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                                    {rule.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{rule.ruleText}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingRule(rule);
                                    const category = categories.find(c => c.id === rule.categoryId);
                                    setEditCategoryName(category?.name || "");
                                    setIsEditRuleOpen(true);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  {rules.filter(rule => selectedCategoryFilter === "all" || rule.categoryId === selectedCategoryFilter).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No rules found{selectedCategoryFilter !== "all" ? " in this category" : ""}.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Rule Dialog */}
          <Dialog open={isEditRuleOpen} onOpenChange={(open) => {
            setIsEditRuleOpen(open);
            if (!open) {
              setEditCategoryName("");
            }
          }}>
            <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>Edit Proofreading Rule</DialogTitle>
              </DialogHeader>
              {editingRule && (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
                    <div className="space-y-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="edit-rule-title">Rule Title</Label>
                          <Input
                            id="edit-rule-title"
                            value={editingRule.title}
                            onChange={(e) => setEditingRule({ ...editingRule, title: e.target.value })}
                            className="h-11 min-h-touch"
                          />
                        </div>
                        <div className="flex items-center gap-2 md:pt-8">
                          <Switch
                            checked={editingRule.isActive}
                            onCheckedChange={(checked) => setEditingRule({ ...editingRule, isActive: checked })}
                          />
                          <Label>Active</Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-rule-category">Category</Label>
                      <Popover open={isEditCategoryDropdownOpen} onOpenChange={setIsEditCategoryDropdownOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isEditCategoryDropdownOpen}
                            className="w-full justify-between h-11 min-h-touch"
                            id="edit-rule-category"
                          >
                            {editingRule.categoryId
                              ? categories.find((cat) => cat.id === editingRule.categoryId)?.name || editCategoryName || "Select category..."
                              : editCategoryName || "Select or create category..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search or type new category..."
                              value={editCategoryName}
                              onValueChange={(value) => {
                                setEditCategoryName(value);
                                const foundCategory = categories.find(
                                  (cat) => cat.name.toLowerCase() === value.toLowerCase()
                                );
                                if (foundCategory) {
                                  setEditingRule({ ...editingRule, categoryId: foundCategory.id });
                                  setIsEditCategoryDropdownOpen(false);
                                } else {
                                  setEditingRule({ ...editingRule, categoryId: "", categoryName: value } as ProofreadingRule & { categoryName?: string });
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editCategoryName && !categories.find(c => c.name.toLowerCase() === editCategoryName.toLowerCase())) {
                                  e.preventDefault();
                                  setIsEditCategoryDropdownOpen(false);
                                }
                              }}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {editCategoryName ? (
                                  <div className="py-2 text-sm text-muted-foreground">
                                    Press Enter to create "{editCategoryName}"
                                  </div>
                                ) : (
                                  "No category found."
                                )}
                              </CommandEmpty>
                              <CommandGroup>
                                {categories.map((cat) => (
                                  <CommandItem
                                    key={cat.id}
                                    value={cat.name}
                                    onSelect={() => {
                                      setEditingRule({ ...editingRule, categoryId: cat.id });
                                      setEditCategoryName("");
                                      setIsEditCategoryDropdownOpen(false);
                                    }}
                                    className="min-h-touch"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        editingRule.categoryId === cat.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cat.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {editCategoryName && !categories.find(c => c.name.toLowerCase() === editCategoryName.toLowerCase()) && (
                        <p className="text-xs text-muted-foreground">
                          New category "{editCategoryName}" will be created when you save this rule.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-rule-text">Rule Text</Label>
                      <Textarea
                        id="edit-rule-text"
                        value={editingRule.ruleText}
                        onChange={(e) => setEditingRule({ ...editingRule, ruleText: e.target.value })}
                        className="min-h-40 md:min-h-64"
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex-shrink-0 gap-2">
                    <Button
                      onClick={() => {
                        const ruleData = editingRule as ProofreadingRule & { categoryName?: string };
                        updateRuleMutation.mutate({
                          id: editingRule.id,
                          data: {
                            title: editingRule.title,
                            categoryId: editingRule.categoryId,
                            categoryName: ruleData.categoryName || editCategoryName || undefined,
                            ruleText: editingRule.ruleText,
                            isActive: editingRule.isActive,
                          },
                        });
                        setEditCategoryName("");
                      }}
                      disabled={!editingRule.title || (!editingRule.categoryId && !editCategoryName) || !editingRule.ruleText || updateRuleMutation.isPending}
                      className="h-11 min-h-touch flex-1 md:flex-none"
                    >
                      {updateRuleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
