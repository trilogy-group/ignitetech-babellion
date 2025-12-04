import React from "react";
import { Settings as SettingsIcon, LogOut, MessageSquare, FileText, ImageIcon } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";

interface MobileNavMenuProps {
  trigger?: React.ReactNode;
}

export function MobileNavMenu({ trigger }: MobileNavMenuProps) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const isProofread = location === "/proofread";
  const isTranslate = location === "/translate";
  const isImageTranslate = location === "/image-translate";
  const isFeedback = location === "/feedback";
  const isSettings = location === "/settings";

  const handleNavClick = (path: string) => {
    setLocation(path);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="md:hidden">
            <span className="sr-only">Open menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 mt-8">
          <Button
            variant={isProofread ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleNavClick("/proofread")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Proofread
          </Button>
          <Button
            variant={isTranslate ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleNavClick("/translate")}
          >
            <FileText className="mr-2 h-4 w-4" />
            Translate
          </Button>
          <Button
            variant={isImageTranslate ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleNavClick("/image-translate")}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Image Translation
          </Button>
          <Button
            variant={isFeedback ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleNavClick("/feedback")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Feedback
          </Button>

          <DropdownMenuSeparator className="my-2" />

          {user?.isAdmin && (
            <>
              <Button
                variant={isSettings ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavClick("/settings")}
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <DropdownMenuSeparator className="my-2" />
            </>
          )}

          <Button
            variant="ghost"
            className="w-full justify-start text-destructive"
            onClick={() => (window.location.href = "/api/logout")}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Out
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

