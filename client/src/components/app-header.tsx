import { Settings as SettingsIcon, LogOut, User, MessageSquare } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";

export function AppHeader() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isTranslate = location === "/translate";
  const isFeedback = location === "/feedback";
  const isSettings = location === "/settings";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/translate">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src="/favicon.png" alt="Babellion" className="h-8 w-8" />
              <span className="text-xl font-semibold">Babellion</span>
            </div>
          </Link>

          <nav className="flex items-center gap-6">
            <Link href="/translate">
              <button
                data-testid="nav-translate"
                className={`
                  relative px-1 py-2 text-sm font-medium transition-all
                  ${isTranslate 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                Translate
                {isTranslate && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(147, 51, 234, 0.6)' }}
                  />
                )}
              </button>
            </Link>
            <Link href="/feedback">
              <button
                data-testid="nav-feedback"
                className={`
                  relative px-1 py-2 text-sm font-medium transition-all flex items-center gap-1.5
                  ${isFeedback 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                <MessageSquare className="h-4 w-4" />
                Feedback
                {isFeedback && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(147, 51, 234, 0.6)' }}
                  />
                )}
              </button>
            </Link>
            <button
              disabled
              data-testid="nav-proofread"
              className="relative px-1 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
            >
              Proofread
            </button>
          </nav>
        </div>

        {/* Right side - User menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-testid="button-user-menu">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  )}
                  {user?.isAdmin && (
                    <Badge variant="secondary" className="w-fit text-xs mt-1">
                      Admin
                    </Badge>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.isAdmin && (
                <>
                  <Link href="/settings">
                    <DropdownMenuItem data-testid="menu-settings">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => window.location.href = '/api/logout'}
                data-testid="menu-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
