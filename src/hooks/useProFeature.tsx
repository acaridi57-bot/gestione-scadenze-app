import { useState, useCallback, useRef } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';

// Session-based tracking to show popup only once per session per feature
const shownFeaturesThisSession = new Set<string>();

export function useProFeature() {
  const { isPro, isInTrial, subscription } = useSubscription();
  const { isAdmin } = useAdmin();
  const [showGate, setShowGate] = useState(false);
  const [featureName, setFeatureName] = useState('');

  // ADMIN RULE: Admin always has full Pro access, bypassing all checks
  // TRIAL RULE: User has Pro access if they have active subscription OR are in trial
  const hasProAccess = isAdmin || isPro || isInTrial;

  const checkProFeature = useCallback((feature: string): boolean => {
    // Admin bypass - never show popup
    if (isAdmin) {
      return true;
    }
    
    if (hasProAccess) {
      return true;
    }
    
    // POPUP BEHAVIOR: Show popup only once per session per feature
    if (shownFeaturesThisSession.has(feature)) {
      return false; // Already shown this session, don't show again
    }
    
    shownFeaturesThisSession.add(feature);
    setFeatureName(feature);
    setShowGate(true);
    return false;
  }, [hasProAccess, isAdmin]);

  const closeGate = useCallback(() => {
    setShowGate(false);
  }, []);

  return {
    isPro: hasProAccess,
    isInTrial,
    isAdmin,
    showGate,
    featureName,
    checkProFeature,
    closeGate,
    setShowGate,
  };
}
