/**
 * Basic UI Card Component
 * Displays content from UI state directives
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ContentState} from '../../types/ui-state';

interface UICardProps {
  content: ContentState;
}

export const UICard: React.FC<UICardProps> = ({content}) => {
  if (!content.visible || !content.text) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{content.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginVertical: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
  },
});
