/**
 * UI Directive Renderer
 *
 * This component automatically renders UI components based on the current UI state.
 * It acts as the bridge between the UI Manager (middle layer) and React Native components.
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useUIState, useUIManager} from '../../context/UIContext';
import {UIButton} from './UIButton';
import {UICard} from './UICard';
import {UIInput} from './UIInput';

interface UIDirectiveRendererProps {
  onButtonPress?: (buttonId: string, action?: string) => void;
  onFileUpload?: () => void;
  onCancelUpload?: () => void;
}

export const UIDirectiveRenderer: React.FC<UIDirectiveRendererProps> = ({
  onButtonPress,
  onFileUpload,
  onCancelUpload,
}) => {
  const uiState = useUIState();
  const uiManager = useUIManager();

  const handleButtonPress = (buttonId: string) => {
    const button = uiState.buttons[buttonId];
    if (button?.action) {
      onButtonPress?.(buttonId, button.action);
    } else {
      onButtonPress?.(buttonId);
    }
  };

  const handleFileUpload = () => {
    uiManager.updateMediaUploadStatus('uploading');
    // In a real app, this would trigger file picker (e.g., react-native-image-picker)
    // For now, simulate upload completion
    setTimeout(() => {
      uiManager.updateMediaUploadStatus('completed');
      onFileUpload?.();
    }, 2000);
  };

  const handleCancelUpload = () => {
    uiManager.updateMediaUploadStatus('idle');
    onCancelUpload?.();
  };

  // Check if there's anything to render
  const hasContent =
    (uiState.content.visible && uiState.content.text) ||
    Object.values(uiState.buttons).some(btn => btn.visible) ||
    uiState.mediaUpload.visible;

  if (!hasContent) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Content Card */}
      <UICard content={uiState.content} />

      {/* Action Buttons */}
      {Object.entries(uiState.buttons).map(([buttonId, button]) => (
        <UIButton
          key={buttonId}
          button={button}
          onPress={() => handleButtonPress(buttonId)}
        />
      ))}

      {/* Media Upload */}
      <UIInput
        state={uiState.mediaUpload}
        onUpload={handleFileUpload}
        onCancel={handleCancelUpload}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
});
