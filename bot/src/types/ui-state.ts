/**
 * UI State Management Types
 * Based on AG-UI Protocol state management
 */

export interface MediaUploadState {
  visible: boolean;
  status: 'idle' | 'uploading' | 'completed' | 'error';
  acceptedTypes?: string[];
  multiple?: boolean;
  label?: string;
}

export interface ButtonState {
  visible: boolean;
  enabled: boolean;
  label?: string;
  action?: string;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface ContentState {
  text?: string;
  visible: boolean;
}

export interface UIState {
  content: ContentState;
  mediaUpload: MediaUploadState;
  buttons: Record<string, ButtonState>;
}

export interface UIDirective {
  type: 'ui-directive';
  action:
    | 'show-content'
    | 'update-content'
    | 'hide-content'
    | 'show-upload'
    | 'hide-upload'
    | 'cancel-upload'
    | 'show-button'
    | 'hide-button'
    | 'update-button';
  component?: 'content' | 'media-upload' | 'button';
  props?: {
    // For content
    text?: string;
    visible?: boolean;
    // For media upload
    accept?: string;
    multiple?: boolean;
    uploadLabel?: string;
    // For buttons
    buttonId?: string;
    buttonLabel?: string;
    enabled?: boolean;
    action?: string;
    style?: 'primary' | 'secondary' | 'danger';
  };
}

export interface StateSnapshot {
  type: 'state-snapshot';
  // AG-UI protocol may send state nested under `state.ui` or flat `state`
  // This allows both formats for compatibility
  state: UIState | {ui: UIState};
}

export interface StateDelta {
  type: 'state-delta';
  patch: Array<{
    op: 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';
    path: string;
    value?: any;
  }>;
}

export type UIStateMessage = UIDirective | StateSnapshot | StateDelta;
