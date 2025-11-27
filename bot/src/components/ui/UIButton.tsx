/**
 * Basic UI Button Component
 * Responds to UI state directives from the agent
 */

import React from 'react';
import {Text, TouchableOpacity, StyleSheet} from 'react-native';
import {ButtonState} from '../../types/ui-state';

interface UIButtonProps {
  button: ButtonState;
  onPress: () => void;
}

export const UIButton: React.FC<UIButtonProps> = ({button, onPress}) => {
  if (!button.visible) {
    return null;
  }

  const buttonStyle = [
    styles.button,
    button.style === 'primary' && styles.buttonPrimary,
    button.style === 'secondary' && styles.buttonSecondary,
    button.style === 'danger' && styles.buttonDanger,
    !button.enabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonText,
    button.style === 'primary' && styles.buttonTextPrimary,
    button.style === 'secondary' && styles.buttonTextSecondary,
    button.style === 'danger' && styles.buttonTextDanger,
    !button.enabled && styles.buttonTextDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={!button.enabled}
      activeOpacity={0.7}>
      <Text style={textStyle}>{button.label || 'Button'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    width: '100%', // Full width but constrained by parent
    marginVertical: 4, // Add spacing between buttons
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#E5E5EA',
  },
  buttonDanger: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextPrimary: {
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    color: '#000000',
  },
  buttonTextDanger: {
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: '#999999',
  },
});
