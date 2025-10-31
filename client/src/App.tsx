import { Switch, Route } from "wouter";
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
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Reference: javascript_log_in_with_replit blueprint
function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { toast } = useToast();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Translate} />
          <Route path="/translate" component={Translate} />
          {user?.isAdmin && <Route path="/settings" component={Settings} />}
        </>
      )}
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
