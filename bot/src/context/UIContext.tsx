/**
 * UI Context Provider
 *
 * Provides UI state management to React Native components through context.
 * This wraps the UIManager service and makes it available to the component tree.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {UIManager, getUIManager} from '../services/UIManager';
import {UIState} from '../types/ui-state';
import {MediaUploadState} from '../types/ui-state';

interface UIContextValue {
  uiState: UIState;
  uiManager: UIManager;
  // Helper methods
  updateMediaUploadStatus: (status: MediaUploadState['status']) => void;
  reset: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

interface UIProviderProps {
  children: ReactNode;
  initialManager?: UIManager;
}

export const UIProvider: React.FC<UIProviderProps> = ({
  children,
  initialManager,
}) => {
  const [uiState, setUIState] = useState<UIState>(() => {
    const manager = initialManager || getUIManager();
    return manager.getState();
  });

  const uiManager = initialManager || getUIManager();

  useEffect(() => {
    // Subscribe to UI state changes
    const unsubscribe = uiManager.subscribe((newState: UIState) => {
      setUIState(newState);
    });

    // Initialize with current state
    setUIState(uiManager.getState());

    return unsubscribe;
  }, [uiManager]);

  const updateMediaUploadStatus = useCallback(
    (status: MediaUploadState['status']) => {
      uiManager.updateMediaUploadStatus(status);
    },
    [uiManager],
  );

  const reset = useCallback(() => {
    uiManager.reset();
  }, [uiManager]);

  const value: UIContextValue = {
    uiState,
    uiManager,
    updateMediaUploadStatus,
    reset,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

/**
 * Hook to access UI context
 */
export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

/**
 * Hook to access just the UI state
 */
export function useUIState(): UIState {
  const {uiState} = useUI();
  return uiState;
}

/**
 * Hook to access the UI manager directly
 */
export function useUIManager(): UIManager {
  const {uiManager} = useUI();
  return uiManager;
}
