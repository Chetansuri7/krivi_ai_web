// app/components/chat/streaming-chat-context.tsx
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { Message } from '~/components/chat/MessageItem';
import type { AIModelConfig } from '~/lib/ai-models';
import { API_STREAM_URL, defaultSystemPrompt } from '~/lib/ai-models';

interface StreamData {
  chatId?: string; // Backend might still send this, but we won't use it for session ID determination
  content?: string;
  type?: 'metadata' | 'content_start' | 'stream_end' | 'error' | 'usage_summary' | 'chat_id_update';
  error?: { message: string };
}

export interface StreamingChatContextType {
  messages: Message[];
  isStreaming: boolean;
  streamError: string | null;
  activeStreamChatId: string | null; // ChatId of the stream being processed
  currentUIFocusChatId: string | null; // ChatId the UI is currently focused on
  startStream: (
    prompt: string,
    modelConfig: AIModelConfig,
    chatIdToStream: string, // Authoritative Chat ID for this stream
  ) => Promise<void>; // No longer returns a chatId, as frontend dictates it
  abortStream: (reason?: string) => void;
  setMessagesForContext: (messages: Message[], uiFocusedChatId: string | null) => void;
  clearStreamState: () => void;
}

const StreamingChatContext = createContext<StreamingChatContextType | undefined>(undefined);

export const StreamingChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeStreamChatId, setActiveStreamChatId] = useState<string | null>(null);
  const [currentUIFocusChatId, setCurrentUIFocusChatId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentAssistantMessageIdRef = useRef<string | null>(null);

  const setMessagesForContext = useCallback((newMessages: Message[], uiFocusedChatId: string | null) => {
    console.log(`Context: setMessagesForContext called. New messages count: ${newMessages.length}, UI Focus: ${uiFocusedChatId}, Current Active Stream: ${activeStreamChatId}`);
    setMessages(newMessages);
    setCurrentUIFocusChatId(uiFocusedChatId);

    if (activeStreamChatId && uiFocusedChatId !== activeStreamChatId && isStreaming) {
      console.log(`Context: UI focus changed to ${uiFocusedChatId} from active stream ${activeStreamChatId}. Aborting stream.`);
      abortControllerRef.current?.abort("UI context changed away from active stream");
      // Reset streaming states, message updates handled by abortStream/finally in startStream
      setIsStreaming(false);
      // setActiveStreamChatId(null); // Keep activeStreamChatId until a new stream starts or state is cleared
      if (currentAssistantMessageIdRef.current) {
        setMessages(prev => prev.map(msg => msg.id === currentAssistantMessageIdRef.current && msg.isLoading ? { ...msg, isLoading: false, content: msg.content || "[Stream context changed]" } : msg));
        currentAssistantMessageIdRef.current = null;
      }
    }
  }, [activeStreamChatId, isStreaming]);

  const clearStreamState = useCallback(() => {
    console.log("Context: clearStreamState called.");
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort("Clearing stream state");
    }
    setMessages([]);
    setIsStreaming(false);
    setStreamError(null);
    setActiveStreamChatId(null);
    setCurrentUIFocusChatId(null);
    currentAssistantMessageIdRef.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current = null;
    }
  }, [isStreaming]);

  const abortStream = useCallback((reason: string = "User requested abort") => {
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      console.log(`Context: Aborting stream. Reason: ${reason}`);
      abortControllerRef.current.abort(reason);
    }
    // Ensure state is updated even if abort is called externally / multiple times
    if (isStreaming) {
      setIsStreaming(false);
      if (currentAssistantMessageIdRef.current) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === currentAssistantMessageIdRef.current && msg.isLoading
              ? { ...msg, isLoading: false, content: msg.content || `[Stream aborted: ${reason}]` }
              : msg
          )
        );
        currentAssistantMessageIdRef.current = null;
      }
    }
    // abortControllerRef.current = null; // Will be reset on next startStream
  }, [isStreaming]);

  const startStream = useCallback(
    async (
      prompt: string,
      modelConfig: AIModelConfig,
      chatIdToStream: string, // Authoritative Chat ID (frontend-generated for new)
    ): Promise<void> => {
      if (isStreaming && abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        console.warn("Context: Stream already in progress. Aborting previous to start new one.");
        abortControllerRef.current.abort("New stream started, superceded by new request.");
      }

      console.log(`Context: startStream called for chatId: ${chatIdToStream}`);
      setIsStreaming(true);
      setStreamError(null);
      setActiveStreamChatId(chatIdToStream); // This stream is for this ID

      // The user message should already be in `messages` via `setMessagesForContext`
      // We only add the assistant placeholder here.
      const assistantMsgId = crypto.randomUUID();
      currentAssistantMessageIdRef.current = assistantMsgId;
      const assistantPlaceholder: Message = { id: assistantMsgId, role: 'assistant', content: '', isLoading: true };

      setMessages(prevMessages => [...prevMessages, assistantPlaceholder]);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(API_STREAM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({
            chatId: chatIdToStream, // Send the authoritative chatId
            message: prompt,
            provider: modelConfig.provider,
            model: modelConfig.model,
            systemPrompt: defaultSystemPrompt,
          }),
          signal: abortControllerRef.current.signal,
          credentials: 'include',
        });

        if (abortControllerRef.current.signal.aborted) {
          console.log("Context: Stream fetch aborted before response fully processed.");
          // Message update is handled in finally or if abortStream was called directly
          return;
        }

        if (!response.ok || !response.body) {
          const errorBody = await response.text().catch(() => "Failed to read error body");
          setStreamError(`API Error ${response.status}: ${errorBody}`);
          setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isLoading: false, content: `API Error: ${response.status}` } : m));
          setIsStreaming(false);
          currentAssistantMessageIdRef.current = null;
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (abortControllerRef.current?.signal.aborted) {
            console.log("Context: Stream processing loop aborted by signal.");
            // Message update is handled by abortStream or finally block.  
            break;
          }
          if (done) {
            console.log("Context: Stream finished naturally.");
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line.startsWith("data: ")) {
              const jsonDataString = line.substring(5);
              if (jsonDataString && !abortControllerRef.current?.signal.aborted) {
                try {
                  const chunk: StreamData = JSON.parse(jsonDataString);

                  // ... your chunk handling logic ...  
                  if (chunk.type === 'chat_id_update' && chunk.chatId && chunk.chatId !== chatIdToStream) {
                    console.warn(`Context: Backend sent a chatId ${chunk.chatId} different from frontend's ${chatIdToStream}. Ignoring backend's for session ID.`);
                  }

                  if (chunk.content) {
                    setMessages(prev =>
                      prev.map(msg =>
                        msg.id === assistantMsgId
                          ? { ...msg, content: msg.content + chunk.content, isLoading: true }
                          : msg
                      )
                    );
                  }

                  if (chunk.type === 'stream_end' || chunk.type === 'usage_summary') {
                    // Stream ended from backend's perspective  
                    if (!abortControllerRef.current?.signal.aborted) { // Only if not already handled by an abort  
                      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, isLoading: false } : msg));
                      setIsStreaming(false);
                      currentAssistantMessageIdRef.current = null;
                    }
                  } else if (chunk.error) {
                    if (!abortControllerRef.current?.signal.aborted) {
                      setStreamError(chunk.error?.message || "Stream error from backend"); // <-- FIXED  
                      setMessages(prev => prev.map(m =>
                        m.id === assistantMsgId
                          ? { ...m, isLoading: false, content: `${m.content || ""}\n[Error: ${chunk.error?.message ?? "Unknown error"}]` }
                          : m
                      ));
                      setIsStreaming(false);
                      currentAssistantMessageIdRef.current = null;
                    }
                    break; // Break from while loop on backend error  
                  }

                  // Optional: break out of the while(line) if error type  
                  if (chunk.type === 'error' || chunk.error) break;

                } catch (e: any) {
                  if (!abortControllerRef.current?.signal.aborted) {
                    console.error("Context: Error parsing stream data JSON:", e, jsonDataString);
                    setStreamError(`Error parsing stream: ${e.message}`);
                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isLoading: false, content: `${m.content || ""}\n[Error parsing stream data]` } : m));
                    setIsStreaming(false);
                    currentAssistantMessageIdRef.current = null;
                  }
                  break; // Break from while loop on parsing error  
                }
              }
            }
          }
        }

        if (!abortControllerRef.current?.signal.aborted && isStreaming) { // Stream ended naturally by `done` or outer break
          setIsStreaming(false);
          setMessages(prev => prev.map(msg => msg.id === assistantMsgId && msg.isLoading ? { ...msg, isLoading: false } : msg));
          currentAssistantMessageIdRef.current = null;
        }

      } catch (error: any) {
        if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          console.log(`Context: Stream operation was aborted. Message: ${error.message}`);
          if (isStreaming) setIsStreaming(false);
          setMessages(prev => prev.map(msg => msg.id === assistantMsgId && msg.isLoading ? { ...msg, isLoading: false, content: msg.content || `[Stream aborted]` } : msg));
        } else {
          console.error("Context: Send/Stream error:", error);
          setStreamError(error.message || "An unknown error occurred.");
          setMessages(prev =>
            prev.map(msg =>
              msg.id === assistantMsgId
                ? { ...msg, content: (msg.content || "") + `\n[Error: ${error.message}]`, isLoading: false }
                : msg
            )
          );
          if (isStreaming) setIsStreaming(false);
        }
        if (currentAssistantMessageIdRef.current === assistantMsgId) {
          currentAssistantMessageIdRef.current = null;
        }
      } finally {
        // If stream ended, but not due to abort, and we are still marked as streaming (e.g. loop break), ensure cleanup.
        // This is a safeguard.
        if (isStreaming && (!abortControllerRef.current || !abortControllerRef.current.signal.aborted)) {
          setIsStreaming(false);
          if (currentAssistantMessageIdRef.current === assistantMsgId) {
            setMessages(prev => prev.map(msg => msg.id === assistantMsgId && msg.isLoading ? { ...msg, isLoading: false } : msg));
            currentAssistantMessageIdRef.current = null;
          }
        }
        // The AbortController instance is specific to this call of startStream.
        // It's fine if abortControllerRef.current is overwritten by a subsequent call.
      }
    },
    [isStreaming, abortStream] // Removed currentUIFocusChatId, as chatIdToStream is authoritative
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        console.log("StreamingChatProvider unmounting, aborting any active non-aborted stream.");
        abortControllerRef.current.abort("Provider unmounted");
      }
      abortControllerRef.current = null;
    };
  }, []);

  const contextValue: StreamingChatContextType = {
    messages,
    isStreaming,
    streamError,
    activeStreamChatId,
    currentUIFocusChatId,
    startStream,
    abortStream,
    setMessagesForContext,
    clearStreamState,
  };

  return <StreamingChatContext.Provider value={contextValue}>{children}</StreamingChatContext.Provider>;
};

export const useStreamingChat = (): StreamingChatContextType => {
  const context = useContext(StreamingChatContext);
  if (!context) {
    throw new Error('useStreamingChat must be used within a StreamingChatProvider');
  }
  return context;
};