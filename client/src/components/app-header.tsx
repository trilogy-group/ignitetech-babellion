import { Settings as SettingsIcon, LogOut, User, MessageSquare, Info } from "lucide-react";
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
import { MobileNavMenu } from "./mobile-nav-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { ReleaseNotesModal } from "./release-notes-modal";

/**
 * Renders the application header containing brand navigation, primary navigation links, feedback and theme controls, and the user menu with release notes and logout.
 *
 * The header adapts for mobile and desktop layouts, highlights the active route, conditionally shows admin options, and controls the visibility of the release notes modal.
 *
 * @returns The header element for the app's top navigation bar
 */
export function AppHeader() {
  const [location] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

  const isProofread = location === "/proofread";
  const isTranslate = location === "/translate";
  const isFeedback = location === "/feedback";
  const isSettings = location === "/settings";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/translate">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
              <img src="/favicon.png" alt="Babellion" className="h-8 w-8" />
              <span className="text-lg sm:text-xl font-semibold">Babellion</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/proofread">
              <button
                data-testid="nav-proofread"
                className={`
                  relative px-1 py-2 text-sm font-medium transition-all
                  ${isProofread 
                    ? "text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                Proofread
                {isProofread && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 rounded-full"
                    style={{ boxShadow: '0 0 8px rgba(147, 51, 234, 0.6)' }}
                  />
                )}
              </button>
            </Link>
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
          </nav>
        </div>

        {/* Right side - Feedback + Theme toggle + User menu */}
        <div className="flex items-center gap-2">
          {/* Mobile Navigation */}
          <div className="md:hidden">
            <MobileNavMenu />
          </div>

          {/* Feedback Button - Desktop only */}
          <Link href="/feedback" className="hidden md:block">
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 ${isFeedback ? 'bg-accent' : ''}`}
              data-testid="button-feedback-header"
              title="Feedback"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </Link>

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
                onClick={() => setIsReleaseNotesOpen(true)}
                data-testid="menu-release-notes"
              >
                <Info className="mr-2 h-4 w-4" />
                <div className="flex items-center justify-between flex-1">
                  <span>Babellion</span>
                  <Badge variant="secondary" className="ml-2 text-xs">v1.4.2</Badge>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
      
      <ReleaseNotesModal open={isReleaseNotesOpen} onOpenChange={setIsReleaseNotesOpen} />
    </header>
  );
}