/**
 * UI Manager - CopilotKit-style Middle Layer
 *
 * This service acts as the middle layer between the server (which sends UI directives)
 * and React Native components (which render the UI). It manages UI state and applies
 * changes based on directives from the agent.
 */

import {
  UIState,
  UIDirective,
  StateSnapshot,
  StateDelta,
  MediaUploadState,
} from '../types/ui-state';

type UIStateListener = (state: UIState) => void;

class UIManager {
  private state: UIState;
  private listeners: Set<UIStateListener> = new Set();

  constructor(initialState?: UIState) {
    this.state = initialState || this.getInitialState();
  }

  /**
   * Get initial UI state
   */
  private getInitialState(): UIState {
    return {
      content: {
        visible: false,
        text: '',
      },
      mediaUpload: {
        visible: false,
        status: 'idle',
        acceptedTypes: ['image/*'],
        multiple: false,
      },
      buttons: {},
    };
  }

  /**
   * Subscribe to UI state changes
   */
  subscribe(listener: UIStateListener): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this.state);
    });
  }

  /**
   * Get current UI state
   */
  getState(): UIState {
    return this.state;
  }

  /**
   * Apply a UI directive to the state
   */
  applyDirective(directive: UIDirective): void {
    const newState = this.applyUIDirective(this.state, directive);
    this.state = newState;
    this.notifyListeners();
  }

  /**
   * Apply a state snapshot (complete state replacement)
   * Handles AG-UI protocol format where state may be nested under `state.ui`
   */
  applySnapshot(snapshot: StateSnapshot): void {
    // AG-UI protocol may send state nested under `state.ui` or flat `state`
    // Handle both formats for compatibility
    if (
      snapshot.state &&
      typeof snapshot.state === 'object' &&
      'ui' in snapshot.state
    ) {
      // AG-UI protocol format: { state: { ui: { ... } } }
      this.state = (snapshot.state as {ui: UIState}).ui;
    } else {
      // Flat format: { state: { ... } }
      this.state = snapshot.state as UIState;
    }
    this.notifyListeners();
  }

  /**
   * Apply a state delta (incremental update using JSON Patch)
   */
  applyDelta(delta: StateDelta): void {
    const newState = this.applyStateDelta(this.state, delta);
    this.state = newState;
    this.notifyListeners();
  }

  /**
   * Process any UI state message (directive, snapshot, or delta)
   */
  processMessage(message: UIDirective | StateSnapshot | StateDelta): void {
    if (message.type === 'ui-directive') {
      this.applyDirective(message);
    } else if (message.type === 'state-snapshot') {
      this.applySnapshot(message);
    } else if (message.type === 'state-delta') {
      this.applyDelta(message);
    }
  }

  /**
   * Reset UI state to initial state
   */
  reset(): void {
    this.state = this.getInitialState();
    this.notifyListeners();
  }

  /**
   * Apply UI directive to state (internal helper)
   */
  private applyUIDirective(state: UIState, directive: UIDirective): UIState {
    const newState = {...state};

    switch (directive.action) {
      case 'show-content':
        newState.content = {
          visible: true,
          text: directive.props?.text || '',
        };
        break;

      case 'update-content':
        newState.content = {
          ...newState.content,
          text: directive.props?.text ?? newState.content.text,
          visible: directive.props?.visible ?? newState.content.visible,
        };
        break;

      case 'hide-content':
        newState.content = {
          ...newState.content,
          visible: false,
        };
        break;

      case 'show-upload':
        newState.mediaUpload = {
          visible: true,
          status: 'idle',
          acceptedTypes: directive.props?.accept
            ? [directive.props.accept]
            : ['image/*'],
          multiple: directive.props?.multiple ?? false,
          label: directive.props?.uploadLabel,
        };
        break;

      case 'hide-upload':
        newState.mediaUpload = {
          ...newState.mediaUpload,
          visible: false,
          status: 'idle',
        };
        break;

      case 'cancel-upload':
        newState.mediaUpload = {
          ...newState.mediaUpload,
          visible: false,
          status: 'idle',
        };
        break;

      case 'show-button':
        if (directive.props?.buttonId) {
          newState.buttons[directive.props.buttonId] = {
            visible: true,
            enabled: directive.props.enabled ?? true,
            label: directive.props.buttonLabel,
            action: directive.props.action,
            style: directive.props.style ?? 'primary',
          };
        }
        break;

      case 'hide-button':
        if (
          directive.props?.buttonId &&
          newState.buttons[directive.props.buttonId]
        ) {
          newState.buttons[directive.props.buttonId] = {
            ...newState.buttons[directive.props.buttonId],
            visible: false,
          };
        }
        break;

      case 'update-button':
        if (
          directive.props?.buttonId &&
          newState.buttons[directive.props.buttonId]
        ) {
          newState.buttons[directive.props.buttonId] = {
            ...newState.buttons[directive.props.buttonId],
            ...(directive.props.enabled !== undefined && {
              enabled: directive.props.enabled,
            }),
            ...(directive.props.buttonLabel && {
              label: directive.props.buttonLabel,
            }),
            ...(directive.props.action && {action: directive.props.action}),
            ...(directive.props.style && {style: directive.props.style}),
          };
        }
        break;
    }

    return newState;
  }

  /**
   * Apply state delta using JSON Patch (RFC 6902)
   * Handles AG-UI protocol paths that may include `/ui/` prefix
   */
  private applyStateDelta(state: UIState, delta: StateDelta): UIState {
    const newState = JSON.parse(JSON.stringify(state));

    for (const patch of delta.patch) {
      let pathParts = patch.path.split('/').filter(p => p);

      // AG-UI protocol may send paths like "/ui/mediaUpload/visible"
      // Strip the "/ui/" prefix if present to match our flat structure
      if (pathParts.length > 0 && pathParts[0] === 'ui') {
        pathParts = pathParts.slice(1);
      }

      let current: any = newState;

      // Navigate to the parent of the target
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }

      const key = pathParts[pathParts.length - 1];

      switch (patch.op) {
        case 'add':
        case 'replace':
          current[key] = patch.value;
          break;
        case 'remove':
          delete current[key];
          break;
        case 'move':
        case 'copy':
          // For now, treat as replace
          if (patch.value !== undefined) {
            current[key] = patch.value;
          }
          break;
        case 'test':
          // Test operation - verify value matches
          if (current[key] !== patch.value) {
            console.warn(`State delta test failed for path: ${patch.path}`);
          }
          break;
      }
    }

    return newState;
  }

  /**
   * Update media upload status
   */
  updateMediaUploadStatus(status: MediaUploadState['status']): void {
    this.state = {
      ...this.state,
      mediaUpload: {
        ...this.state.mediaUpload,
        status,
      },
    };
    this.notifyListeners();

    // Auto-hide after completion
    if (status === 'completed') {
      setTimeout(() => {
        this.state = {
          ...this.state,
          mediaUpload: {
            ...this.state.mediaUpload,
            visible: false,
            status: 'idle',
          },
        };
        this.notifyListeners();
      }, 2000);
    }
  }

  /**
   * Manually update a specific part of the state
   */
  updateState(updater: (state: UIState) => UIState): void {
    this.state = updater(this.state);
    this.notifyListeners();
  }
}

// Singleton instance
let uiManagerInstance: UIManager | null = null;

/**
 * Get or create the UI Manager instance
 */
export function getUIManager(initialState?: UIState): UIManager {
  if (!uiManagerInstance) {
    uiManagerInstance = new UIManager(initialState);
  }
  return uiManagerInstance;
}

/**
 * Create a new UI Manager instance (for testing or multiple instances)
 */
export function createUIManager(initialState?: UIState): UIManager {
  return new UIManager(initialState);
}

export {UIManager};
export default UIManager;
