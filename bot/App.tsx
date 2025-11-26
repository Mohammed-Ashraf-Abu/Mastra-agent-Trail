import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {SERVER_URL} from './src/config/server';

function App(): React.JSX.Element {
  const userId = 'user-123';
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');
  const [response, setResponse] = useState<string>('');
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  useEffect(() => {
    async function fetchHealthCheck() {
      console.log('App mounted');
      console.log('App details:', {userId});

      try {
        const healthResponse = await fetch(`${SERVER_URL}/health`);
        const data = await healthResponse.json();

        if (data.ok && data.status === 'healthy') {
          setHealthStatus(`✅ Server is healthy (${data.timestamp})`);
          console.log('Health check passed:', data);
        } else {
          setHealthStatus('⚠️ Server health check failed');
          console.warn('Health check failed:', data);
        }

        // Use Reactotron for debugging
        if (__DEV__ && console.tron) {
          console.tron.log('Health check result', data);
        }
      } catch (error) {
        setHealthStatus('❌ Server connection failed');
        console.error('Health check error:', error);
      }
    }
    fetchHealthCheck();
  }, [userId]);

  const handleButtonPress = async (userPrompt: string) => {
    if (!userPrompt.trim() || isLoading) {
      return;
    }

    setIsLoading(true);
    setResponse('');

    try {
      const chatResponse = await fetch(`${SERVER_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: userPrompt,
        }),
      });
      const data = await chatResponse.json();
      console.log('Chat response:', data);
      setResponse(data.response);
      setPrompt('');
    } catch (error) {
      console.error('Chat error:', error);
      setResponse(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weather Assistant</Text>
      <Text style={styles.healthStatus}>{healthStatus}</Text>
      <TextInput
        value={prompt}
        onChangeText={setPrompt}
        style={styles.textInput}
      />
      <TouchableOpacity
        onPress={() => handleButtonPress(prompt)}
        disabled={isLoading || !prompt.trim()}
        style={[
          styles.button,
          (isLoading || !prompt.trim()) && styles.buttonDisabled,
        ]}>
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={styles.buttonLoader}
          />
        )}
        <Text style={styles.buttonText}>
          {isLoading ? 'Sending...' : 'Send'}
        </Text>
      </TouchableOpacity>
      <View style={styles.responseContainer}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : (
          <Text style={styles.responseText}>
            {response || 'No response yet'}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  healthStatus: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'black',
    padding: 10,
    width: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonLoader: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  responseContainer: {
    minHeight: 100,
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  responseText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default App;
