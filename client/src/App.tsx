import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/app-header";
import Landing from "@/pages/landing";
import Translate from "@/pages/translate";
import Proofread from "@/pages/proofread";
import ImageTranslate from "@/pages/image-translate";
import Feedback from "@/pages/feedback";
import Settings from "@/pages/settings";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import { useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSaveLastVisitedPage, useLastVisitedPage } from "@/hooks/useLastVisitedPage";

// Wrapper component to handle unauthenticated access to /translate
function ProtectedTranslate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_location, setLocation] = useLocation();

  // Save this page as last visited
  useSaveLastVisitedPage("/translate");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access the translation platform.",
        variant: "default",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Translate />;
}

// Wrapper component to handle unauthenticated access to /proofread
function ProtectedProofread() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_location, setLocation] = useLocation();

  // Save this page as last visited
  useSaveLastVisitedPage("/proofread");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access proofreading.",
        variant: "default",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Proofread />;
}

// Wrapper component to handle unauthenticated access to /image-translate
function ProtectedImageTranslate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_location, setLocation] = useLocation();

  // Save this page as last visited
  useSaveLastVisitedPage("/image-translate");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access image translation.",
        variant: "default",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <ImageTranslate />;
}

// Wrapper component to handle unauthenticated access to /feedback
function ProtectedFeedback() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_location, setLocation] = useLocation();

  // Save this page as last visited
  useSaveLastVisitedPage("/feedback");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to access feedback.",
        variant: "default",
      });
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, toast, setLocation]);

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <Feedback />;
}

// Reference: javascript_log_in_with_replit blueprint
function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { getLastVisitedPage, getLastVisitedBasePage } = useLastVisitedPage();

  // Get the last visited page or default to /translate
  const redirectPath = useMemo(() => {
    const lastPage = getLastVisitedPage();
    const basePage = getLastVisitedBasePage();
    
    // Only redirect to settings if user is admin
    if (basePage === "/settings" && !user?.isAdmin) {
      return "/translate";
    }
    
    // Valid base pages (can have IDs appended for translate, proofread, image-translate)
    const validBasePages = ["/translate", "/proofread", "/image-translate", "/feedback", "/settings"];
    if (lastPage && basePage && validBasePages.includes(basePage)) {
      // For settings, only allow admins
      if (basePage === "/settings" && !user?.isAdmin) {
        return "/translate";
      }
      return lastPage;
    }
    return "/translate";
  }, [getLastVisitedPage, getLastVisitedBasePage, user?.isAdmin]);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms-and-conditions" component={Terms} />
      
      {/* Landing page for unauthenticated users, redirect to last visited page (or /translate) for authenticated */}
      <Route path="/">
        {!isLoading && isAuthenticated ? <Redirect to={redirectPath} /> : <Landing />}
      </Route>
      
      {/* Protected proofread route */}
      <Route path="/proofread" component={ProtectedProofread} />
      <Route path="/proofread/:id" component={ProtectedProofread} />
      
      {/* Protected translate route */}
      <Route path="/translate" component={ProtectedTranslate} />
      <Route path="/translate/:id" component={ProtectedTranslate} />
      
      {/* Protected image translate route */}
      <Route path="/image-translate" component={ProtectedImageTranslate} />
      <Route path="/image-translate/:id" component={ProtectedImageTranslate} />
      
      {/* Protected feedback route */}
      <Route path="/feedback" component={ProtectedFeedback} />
      
      {/* Admin-only settings route */}
      {user?.isAdmin && <Route path="/settings" component={Settings} />}
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-hidden">
        <Router />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="translatepro-theme">
        <TooltipProvider>
          <AuthenticatedLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;


