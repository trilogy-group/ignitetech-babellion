import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const LAST_VISITED_PAGE_KEY = "babellion-last-visited-page";

// Base pages that are valid (without IDs)
const VALID_BASE_PAGES = ["/translate", "/proofread", "/image-translate", "/feedback", "/settings"] as const;
type ValidBasePage = typeof VALID_BASE_PAGES[number];

// Pages that can have an ID appended
const PAGES_WITH_IDS = ["/translate", "/proofread", "/image-translate"] as const;

/**
 * Check if a path is valid (either a base page or a base page with an ID)
 */
function isValidPath(path: string): boolean {
  // Check if it's a valid base page
  if (VALID_BASE_PAGES.includes(path as ValidBasePage)) {
    return true;
  }
  
  // Check if it's a page with an ID (e.g., /translate/123)
  for (const basePage of PAGES_WITH_IDS) {
    if (path.startsWith(`${basePage}/`)) {
      const id = path.slice(basePage.length + 1);
      // Ensure the ID is a valid number
      if (id && !isNaN(Number(id))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get the base page from a path (strips the ID if present)
 */
function getBasePage(path: string): ValidBasePage | null {
  for (const basePage of VALID_BASE_PAGES) {
    if (path === basePage || path.startsWith(`${basePage}/`)) {
      return basePage;
    }
  }
  return null;
}

/**
 * Hook to save and retrieve the last visited page
 */
export function useLastVisitedPage() {
  /**
   * Save the current page to localStorage
   */
  const saveLastVisitedPage = useCallback((path: string) => {
    if (isValidPath(path)) {
      localStorage.setItem(LAST_VISITED_PAGE_KEY, path);
    }
  }, []);

  /**
   * Get the last visited page from localStorage
   */
  const getLastVisitedPage = useCallback((): string | null => {
    const saved = localStorage.getItem(LAST_VISITED_PAGE_KEY);
    if (saved && isValidPath(saved)) {
      return saved;
    }
    return null;
  }, []);

  /**
   * Get the base page of the last visited page (for permission checks)
   */
  const getLastVisitedBasePage = useCallback((): ValidBasePage | null => {
    const saved = localStorage.getItem(LAST_VISITED_PAGE_KEY);
    if (saved) {
      return getBasePage(saved);
    }
    return null;
  }, []);

  return {
    saveLastVisitedPage,
    getLastVisitedPage,
    getLastVisitedBasePage,
  };
}

/**
 * Hook to automatically save the current page (with ID) when location changes
 */
export function useSaveLastVisitedPage(_basePath: string) {
  const [location] = useLocation();
  const { saveLastVisitedPage } = useLastVisitedPage();

  useEffect(() => {
    // Save the full location path including any ID
    saveLastVisitedPage(location);
  }, [location, saveLastVisitedPage]);
}

