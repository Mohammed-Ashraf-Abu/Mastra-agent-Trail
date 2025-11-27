import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ChatMessage as ChatMessageType} from '../hooks/useAgUIClientWithUIManager';

interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({message}) => {
  const isUser = message.role === 'user';

  // Extract content text - handle string or object
  const getContentText = (): string => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    if (message.content && typeof message.content === 'object') {
      // Handle nested content structure
      if (message.content.text) {
        return message.content.text;
      }
      if (message.content.content) {
        return message.content.content;
      }
    }
    return message.role === 'assistant' ? '...' : '';
  };

  const contentText = getContentText();

  // Don't render empty messages
  if (!contentText || contentText.trim() === '') {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}>
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}>
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}>
          {contentText}
        </Text>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.6,
    color: '#666',
  },
});
