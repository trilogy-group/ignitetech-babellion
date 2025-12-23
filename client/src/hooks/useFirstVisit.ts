import { useState, useEffect, useCallback } from 'react';
import type { FeatureId } from '@/lib/help-content';

const STORAGE_PREFIX = 'babellion-visited-';
const WELCOME_DISMISSED_PREFIX = 'babellion-welcome-dismissed-';

/**
 * Hook to track first visits to features and manage welcome modal state.
 * Uses localStorage to persist state across sessions.
 */
export function useFirstVisit(featureId: FeatureId) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const visitedKey = `${STORAGE_PREFIX}${featureId}`;
    const dismissedKey = `${WELCOME_DISMISSED_PREFIX}${featureId}`;
    
    const hasVisited = localStorage.getItem(visitedKey) === 'true';
    const hasDismissed = localStorage.getItem(dismissedKey) === 'true';
    
    setIsFirstVisit(!hasVisited);
    
    // Show welcome if first visit and not permanently dismissed
    if (!hasVisited && !hasDismissed) {
      setShowWelcome(true);
    }
    
    // Mark as visited
    if (!hasVisited) {
      localStorage.setItem(visitedKey, 'true');
    }
    
    setIsLoaded(true);
  }, [featureId]);

  /**
   * Close the welcome modal
   */
  const closeWelcome = useCallback(() => {
    setShowWelcome(false);
  }, []);

  /**
   * Permanently dismiss the welcome modal for this feature
   */
  const dismissWelcomePermanently = useCallback(() => {
    const dismissedKey = `${WELCOME_DISMISSED_PREFIX}${featureId}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowWelcome(false);
  }, [featureId]);

  /**
   * Reset first visit state (for testing)
   */
  const resetFirstVisit = useCallback(() => {
    const visitedKey = `${STORAGE_PREFIX}${featureId}`;
    const dismissedKey = `${WELCOME_DISMISSED_PREFIX}${featureId}`;
    localStorage.removeItem(visitedKey);
    localStorage.removeItem(dismissedKey);
    setIsFirstVisit(true);
    setShowWelcome(true);
  }, [featureId]);

  return {
    isFirstVisit,
    showWelcome,
    isLoaded,
    closeWelcome,
    dismissWelcomePermanently,
    resetFirstVisit,
  };
}

/**
 * Reset all first visit states (for testing/debugging)
 */
export function resetAllFirstVisits() {
  const featureIds: FeatureId[] = ['proofread', 'translate', 'image-translate', 'image-edit', 'settings'];
  
  featureIds.forEach((featureId) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${featureId}`);
    localStorage.removeItem(`${WELCOME_DISMISSED_PREFIX}${featureId}`);
  });
}

/**
 * Check if a specific feature has been visited
 */
export function hasVisitedFeature(featureId: FeatureId): boolean {
  const visitedKey = `${STORAGE_PREFIX}${featureId}`;
  return localStorage.getItem(visitedKey) === 'true';
}


