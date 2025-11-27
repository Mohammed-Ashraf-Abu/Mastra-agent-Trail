/**
 * App with UI Manager Middle Layer
 *
 * This uses the CopilotKit-style middle layer architecture:
 *
 * Flow:
 * Server → SSE Stream → useAgUIClientWithUIManager → UI Manager (Middle Layer) → UI Context → Components
 *
 * The UI Manager acts as the middle layer that:
 * 1. Receives UI directives from the server
 * 2. Manages UI state
 * 3. Notifies React components of changes
 * 4. Provides a clean separation between server logic and UI rendering
 */

import React, {useState} from 'react';
import {StyleSheet, Text, View, SafeAreaView} from 'react-native';
import {UIProvider} from './src/context/UIContext';
import {getUIManager} from './src/services/UIManager';
import {useAgUIClientWithUIManager} from './src/hooks/useAgUIClientWithUIManager';
import {ChatInput} from './src/components/ChatInput';
import {ChatMessagesList} from './src/components/ChatMessagesList';
import {UIDirectiveRenderer} from './src/components/ui/UIDirectiveRenderer';
import {SERVER_URL} from './src/config/server';

function AppContent(): React.JSX.Element {
  const userId = 'user-123';
  const [inputText, setInputText] = useState<string>('');

  // Get the UI Manager instance
  const uiManager = getUIManager();

  const {messages, sendMessage, isLoading, isConnected, handleUIAction} =
    useAgUIClientWithUIManager({
      serverUrl: SERVER_URL,
      userId,
      uiManager, // Pass UI Manager to the hook
      onError: error => {
        console.error('Ag-UI Client Error:', error);
      },
      onUIAction: (action, data) => {
        console.log('UI Action:', action, data);
      },
    });

  const handleSend = async () => {
    if (inputText.trim() && !isLoading) {
      await sendMessage(inputText);
      setInputText('');
    }
  };

  const handleFileUpload = async () => {
    // File upload is handled by UIDirectiveRenderer
    handleUIAction('file-uploaded', {});
  };

  const handleButtonPress = async (buttonId: string, action?: string) => {
    handleUIAction(`button-${buttonId}`, {action});
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weather Assistant</Text>
        <Text
          style={[
            styles.connectionStatus,
            {color: isConnected ? '#34C759' : '#FF3B30'},
          ]}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
      </View>

      {/* Message bubbles */}
      <View style={styles.messagesContainer}>
        <ChatMessagesList messages={messages} isLoading={isLoading} />
      </View>

      {/* Agent UI - Automatically renders based on UI Manager state */}
      <View style={styles.agentUIContainer}>
        <UIDirectiveRenderer
          onButtonPress={handleButtonPress}
          onFileUpload={handleFileUpload}
          onCancelUpload={() => {
            handleUIAction('cancel-upload', {});
          }}
        />
      </View>

      {/* Text input - always visible */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        isLoading={isLoading}
        placeholder="Ask about the weather..."
      />
    </SafeAreaView>
  );
}

function App(): React.JSX.Element {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#F9F9F9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000000',
  },
  connectionStatus: {
    fontSize: 12,
    color: '#666666',
  },
  messagesContainer: {
    flex: 1,
  },
  agentUIContainer: {
    // No flex - takes only the space it needs
    backgroundColor: '#FFFFFF',
  },
});

export default App;
