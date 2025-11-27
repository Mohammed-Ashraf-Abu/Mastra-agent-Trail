/**
 * useAgUIClient with UI Manager Integration
 *
 * This hook integrates the AG-UI client with the UI Manager middle layer.
 * UI directives from the server are automatically processed by the UI Manager.
 */

import {useState, useCallback, useRef, useEffect} from 'react';
import {UIManager} from '../services/UIManager';
import {UIDirective, StateSnapshot, StateDelta} from '../types/ui-state';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface UseAgUIClientWithUIManagerOptions {
  serverUrl: string;
  userId?: string;
  uiManager: UIManager;
  onError?: (error: Error) => void;
  onUIAction?: (action: string, data?: any) => void;
}

// Helper function to log to Reactotron if available, otherwise use console.log
const log = (...args: any[]) => {
  if (__DEV__ && console.tron) {
    console.tron.log(...args);
  } else {
    console.log(...args);
  }
};

// Helper function to parse SSE data line
const parseSSEData = (data: string): any | null => {
  if (!data.startsWith('data: ')) {
    return null;
  }

  const jsonData = data.slice(6).trim();

  if (jsonData === '[DONE]') {
    return {done: true};
  }

  try {
    return JSON.parse(jsonData);
  } catch (error) {
    log('[parseSSEData] Error parsing JSON:', error, 'Data:', jsonData);
    return null;
  }
};

export function useAgUIClientWithUIManager({
  serverUrl,
  userId = 'user-123',
  uiManager,
  onError,
  onUIAction,
}: UseAgUIClientWithUIManagerOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageHistoryRef = useRef<Array<{role: string; content: string}>>([]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) {
        return;
      }

      // Add to message history for context
      messageHistoryRef.current = [
        ...messageHistoryRef.current,
        {role: 'user', content: content.trim()},
      ];

      // Add user message to messages for display
      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      setIsLoading(true);

      // Track final content for message history
      let finalContent = '';
      // Add placeholder assistant message
      const assistantMessageId = `msg-${Date.now()}-assistant`;

      // Create placeholder assistant message immediately
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);

      try {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await fetch(`${serverUrl}/copilotkit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            messages: messageHistoryRef.current,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          console.error(`HTTP error! status: ${response.status}`);
          return;
        }

        log('[sendMessage] Response status:', response.status);

        // Reset UI state at the start of a new message
        uiManager.reset();

        // In React Native, response.body might not be available
        // Try to get the reader, and if body is null, try reading as text
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

        if (response.body) {
          reader = response.body.getReader();
        } else {
          // Fallback: React Native doesn't support ReadableStream, read as text
          log(
            '[sendMessage] Response body is null, reading as text (React Native fallback)',
          );
          const text = await response.text();
          log('[sendMessage] Response text:', text);

          // Parse the text as SSE and concatenate
          const lines = text.split('\n\n');
          for (const line of lines) {
            const parsed = parseSSEData(line);
            if (!parsed) {
              continue;
            }

            if (parsed.done) {
              break;
            }

            log('[sendMessage] Parsed SSE data:', parsed);
            console.log('📊 STREAM MESSAGE TYPE (fallback):', parsed.type);

            // Process UI directives through UI Manager
            if (parsed.type === 'ui-directive') {
              log(
                '[sendMessage] UI directive received (fallback/React Native path):',
                parsed,
              );
              console.log('🔵 UI DIRECTIVE → UI MANAGER (Middle Layer)');
              uiManager.processMessage(parsed as UIDirective);
            } else if (parsed.type === 'state-snapshot') {
              log('[sendMessage] State snapshot received (fallback):', parsed);
              uiManager.processMessage(parsed as StateSnapshot);
            } else if (parsed.type === 'state-delta') {
              log('[sendMessage] State delta received (fallback):', parsed);
              uiManager.processMessage(parsed as StateDelta);
            } else if (parsed.type === 'text-delta') {
              log('[sendMessage] text-delta (fallback):', parsed.content);
              finalContent = (finalContent || '') + parsed.content;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? {...msg, content: finalContent}
                    : msg,
                ),
              );
            } else if (
              parsed.type === 'response-messages' &&
              parsed.messages?.[0]
            ) {
              const serverMessage = parsed.messages[0];
              let messageContent = '';
              if (typeof serverMessage.content === 'string') {
                messageContent = serverMessage.content;
              } else if (serverMessage.content?.text) {
                messageContent = serverMessage.content.text;
              } else if (serverMessage.content?.content) {
                messageContent = serverMessage.content.content;
              }
              finalContent = messageContent;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: finalContent,
                      }
                    : msg,
                ),
              );
            }
          }
          return;
        }

        if (!reader) {
          console.error('Failed to get response reader');
          return;
        }

        let buffer = '';
        let streamDone = false;
        const textDecoder = new TextDecoder();

        try {
          while (!streamDone) {
            const {done, value} = await reader.read();

            if (done) {
              break;
            }

            if (value) {
              buffer += textDecoder.decode(value, {stream: true});
            }

            // Process complete SSE messages (separated by \n\n)
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const parsed = parseSSEData(line);
              if (!parsed) {
                continue;
              }

              if (parsed.done) {
                log('[sendMessage] Stream completed');
                streamDone = true;
                break;
              }

              log('[sendMessage] Parsed SSE data:', parsed);
              console.log('📊 STREAM MESSAGE TYPE:', parsed.type);

              // Process UI directives through UI Manager (Middle Layer)
              if (parsed.type === 'ui-directive') {
                log('[sendMessage] UI directive received:', parsed);
                console.log('🔵 UI DIRECTIVE → UI MANAGER (Middle Layer)');
                console.log(
                  '📦 UI Directive Data:',
                  JSON.stringify(parsed, null, 2),
                );
                const directive = parsed as UIDirective;
                uiManager.processMessage(directive);
              } else if (parsed.type === 'state-snapshot') {
                log('[sendMessage] State snapshot received:', parsed);
                uiManager.processMessage(parsed as StateSnapshot);
              } else if (parsed.type === 'state-delta') {
                log('[sendMessage] State delta received:', parsed);
                uiManager.processMessage(parsed as StateDelta);
              } else if (parsed.type === 'text-delta') {
                log('[sendMessage] text-delta:', parsed.content);
                finalContent = (finalContent || '') + parsed.content;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? {...msg, content: finalContent}
                      : msg,
                  ),
                );
              } else if (
                parsed.type === 'response-messages' &&
                parsed.messages?.[0]
              ) {
                const serverMessage = parsed.messages[0];
                let messageContent = '';
                if (typeof serverMessage.content === 'string') {
                  messageContent = serverMessage.content;
                } else if (serverMessage.content?.text) {
                  messageContent = serverMessage.content.text;
                } else if (serverMessage.content?.content) {
                  messageContent = serverMessage.content.content;
                }
                finalContent = messageContent;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          content: finalContent,
                        }
                      : msg,
                  ),
                );
              } else if (parsed.type === 'error') {
                console.error(parsed.content || 'Unknown error');
                finalContent = `Error: ${parsed.content || 'Unknown error'}`;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? {...msg, content: finalContent}
                      : msg,
                  ),
                );
                return;
              }
            }
          }

          // Process any remaining buffered data
          if (buffer) {
            const parsed = parseSSEData(buffer);
            if (parsed && !parsed.done) {
              if (parsed.type === 'ui-directive') {
                console.log('🔵 UI DIRECTIVE → UI MANAGER (Remaining Buffer)');
                uiManager.processMessage(parsed as UIDirective);
              } else if (parsed.type === 'state-snapshot') {
                uiManager.processMessage(parsed as StateSnapshot);
              } else if (parsed.type === 'state-delta') {
                uiManager.processMessage(parsed as StateDelta);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          if (__DEV__ && console.tron) {
            console.tron.error('[sendMessage] Error sending message:', error);
          } else {
            console.error('[sendMessage] Error sending message:', error);
          }
          onError?.(error);

          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId
                ? {...msg, content: `Error: ${error.message}`}
                : msg,
            ),
          );
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;

        // Ensure assistant message has final content
        if (finalContent) {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMessageId && msg.content !== finalContent
                ? {...msg, content: finalContent}
                : msg,
            ),
          );

          // Add assistant response to message history for context
          messageHistoryRef.current = [
            ...messageHistoryRef.current,
            {role: 'assistant', content: finalContent},
          ];
        }
      }
    },
    [serverUrl, userId, isLoading, onError, uiManager],
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  // Healthcheck to determine connection status
  useEffect(() => {
    async function checkHealth() {
      try {
        const healthResponse = await fetch(`${serverUrl}/health`);
        const data = await healthResponse.json();

        if (data.ok && data.status === 'healthy') {
          setIsConnected(true);
          log('[healthcheck] Server is healthy:', data);
        } else {
          setIsConnected(false);
          log('[healthcheck] Server health check failed:', data);
        }
      } catch (error) {
        setIsConnected(false);
        log('[healthcheck] Connection failed:', error);
      }
    }

    // Initial healthcheck
    checkHealth();

    // Periodic healthcheck every 30 seconds
    const healthCheckInterval = setInterval(checkHealth, 30000);

    return () => {
      clearInterval(healthCheckInterval);
      cancelRequest();
    };
  }, [serverUrl, cancelRequest]);

  // Handler for UI actions (button clicks, file uploads, etc.)
  const handleUIAction = useCallback(
    async (action: string, data?: any) => {
      log('[handleUIAction] Action:', action, 'Data:', data);
      onUIAction?.(action, data);

      // Send UI action back to server as a message
      if (action === 'file-uploaded' && data?.file) {
        await sendMessage(`[File uploaded: ${data.file.name || 'file'}]`);
      } else if (action.startsWith('button-')) {
        const buttonId = action.replace('button-', '');
        const currentState = uiManager.getState();
        const button = currentState.buttons[buttonId];
        if (button?.action) {
          await sendMessage(`[Action: ${button.action}]`);
        }
      }
    },
    [onUIAction, sendMessage, uiManager],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    messageHistoryRef.current = [];
    uiManager.reset();
  }, [uiManager]);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    cancelRequest,
    isConnected,
    handleUIAction,
  };
}
