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
import Settings from "@/pages/settings";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Wrapper component to handle unauthenticated access to /translate
function ProtectedTranslate() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [_location, setLocation] = useLocation();

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

// Reference: javascript_log_in_with_replit blueprint
function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms-and-conditions" component={Terms} />
      
      {/* Landing page for unauthenticated users, redirect to /translate for authenticated */}
      <Route path="/">
        {!isLoading && isAuthenticated ? <Redirect to="/translate" /> : <Landing />}
      </Route>
      
      {/* Protected translate route */}
      <Route path="/translate" component={ProtectedTranslate} />
      
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
