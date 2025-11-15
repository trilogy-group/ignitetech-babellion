import { useEffect, useCallback } from "react";

const LAST_VISITED_PAGE_KEY = "babellion-last-visited-page";

const VALID_PAGES = ["/translate", "/proofread", "/settings"] as const;
type ValidPage = typeof VALID_PAGES[number];

/**
 * Hook to save and retrieve the last visited page
 */
export function useLastVisitedPage() {
  /**
   * Save the current page to localStorage
   */
  const saveLastVisitedPage = useCallback((path: string) => {
    if (VALID_PAGES.includes(path as ValidPage)) {
      localStorage.setItem(LAST_VISITED_PAGE_KEY, path);
    }
  }, []);

  /**
   * Get the last visited page from localStorage
   */
  const getLastVisitedPage = useCallback((): ValidPage | null => {
    const saved = localStorage.getItem(LAST_VISITED_PAGE_KEY);
    if (saved && VALID_PAGES.includes(saved as ValidPage)) {
      return saved as ValidPage;
    }
    return null;
  }, []);

  return {
    saveLastVisitedPage,
    getLastVisitedPage,
  };
}

/**
 * Hook to automatically save the current page when component mounts
 */
export function useSaveLastVisitedPage(path: string) {
  const { saveLastVisitedPage } = useLastVisitedPage();

  useEffect(() => {
    saveLastVisitedPage(path);
  }, [path, saveLastVisitedPage]);
}

