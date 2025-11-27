import React, {useRef, useEffect} from 'react';
import {FlatList, View, StyleSheet, ActivityIndicator} from 'react-native';
import {ChatMessage} from './ChatMessage';
import {ChatMessage as ChatMessageType} from '../hooks/useAgUIClientWithUIManager';

interface ChatMessagesListProps {
  messages: ChatMessageType[];
  isLoading?: boolean;
}

export const ChatMessagesList: React.FC<ChatMessagesListProps> = ({
  messages,
  isLoading = false,
}) => {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages.length]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({item}) => <ChatMessage message={item} />}
        contentContainerStyle={styles.listContent}
        inverted={false}
        ListFooterComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
});
