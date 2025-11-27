/**
 * Basic UI Input Component
 * For file uploads and other input types
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {MediaUploadState} from '../../types/ui-state';

interface UIInputProps {
  state: MediaUploadState;
  onUpload: () => void;
  onCancel: () => void;
}

export const UIInput: React.FC<UIInputProps> = ({
  state,
  onUpload,
  onCancel,
}) => {
  if (!state.visible) {
    return null;
  }

  const isUploading = state.status === 'uploading';
  const isCompleted = state.status === 'completed';
  const hasError = state.status === 'error';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>{state.label || 'Upload File'}</Text>
        {isUploading && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>Uploading...</Text>
          </View>
        )}
        {isCompleted && (
          <Text style={[styles.statusText, styles.successText]}>
            Upload completed!
          </Text>
        )}
        {hasError && (
          <Text style={[styles.statusText, styles.errorText]}>
            Upload failed. Please try again.
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {!isUploading && !isCompleted && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onUpload}
            activeOpacity={0.7}>
            <Text style={styles.uploadButtonText}>Choose File</Text>
          </TouchableOpacity>
        )}
        {!isCompleted && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.7}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginVertical: 8,
  },
  content: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#666666',
  },
  successText: {
    color: '#34C759',
  },
  errorText: {
    color: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
