// app/components/chat/streaming-chat-context.tsx
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { Message } from '~/components/chat/MessageItem';
import type { AIModelConfig } from '~/lib/ai-models';
import { API_STREAM_URL, defaultSystemPrompt } from '~/lib/ai-models';
import { fetchWithHeaders } from '~/lib/api.config';

/**
 * Exported so that history loaders can reuse the same normalization logic.
 */
export function normalizeMessagesForUI(messages: any[]): Message[] {
  return messages.map((msg) => {
    let mainContent: string = typeof msg.content === "string" ? msg.content : "";

    // Build the prepend string for thought/query blocks
    let prepend = "";
    if (typeof msg.thought === "string" && msg.thought.trim()) {
      prepend += `<think>${msg.thought.trim()}</think>`;
    }
    if (typeof msg.query === "string" && msg.query.trim()) {
      prepend += `<think>Query: ${msg.query.trim()}</think>`;
    }

    mainContent = prepend + mainContent;

    const { thought, query, ...rest } = msg;
    return { ...rest, content: mainContent };
  });
}

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
    thinkingEnabled?: boolean, // Added thinkingEnabled
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

  /**
   * Exported so that history loaders can reuse the same normalization logic.
   */
  /**
   * Exported so that history loaders can reuse the same normalization logic.
   */
  

  const setMessagesForContext = useCallback((newMessages: Message[], uiFocusedChatId: string | null) => {
    console.log(`Context: setMessagesForContext called. New messages count: ${newMessages.length}, UI Focus: ${uiFocusedChatId}, Current Active Stream: ${activeStreamChatId}`);
    setMessages(normalizeMessagesForUI(newMessages));
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
      thinkingEnabled?: boolean, // Added thinkingEnabled
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
      let thoughtState: string | null = null;
      let currentAccumulatedThought: string = "";
      let contentBeforeCurrentThought: string = "";

      try {
        const response = await fetchWithHeaders(API_STREAM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify((() => {
            const modelId = modelConfig.model; // Use modelId as key, value from modelConfig.model
            const provider = modelConfig.provider;

            // Initialize messages array for the payload
            let messagesForPayload: Array<{role: string, content: string}> = [];

            // Start with messages from modelConfig.requestPayload if they exist, mapping to {role, content}
            // This ensures any pre-defined messages (like a specific system prompt from model config) are included.
            if (modelConfig.requestPayload && Array.isArray(modelConfig.requestPayload.messages)) {
                messagesForPayload = modelConfig.requestPayload.messages.map((m: any) => ({
                    role: m.role,
                    content: m.content
                })).filter((m: any) => typeof m.role === 'string' && typeof m.content === 'string'); // Ensure valid messages
            }

            // Add or Update user message (current input 'prompt')
            // If a 'user' message already exists (e.g. from modelConfig.requestPayload.messages), update its content.
            // Otherwise, add the new user message.
            let userMessageFound = false;
            messagesForPayload = messagesForPayload.map(m => {
                if (m.role === 'user') {
                    userMessageFound = true;
                    return { ...m, content: prompt };
                }
                return m;
            });
            if (!userMessageFound) {
                messagesForPayload.push({ role: 'user', content: prompt });
            }

            // Add or Update system message (using defaultSystemPrompt)
            // If a 'system' message exists (e.g. from modelConfig.requestPayload.messages) and its content is empty,
            // and defaultSystemPrompt is defined, fill the content.
            // If no 'system' message exists and defaultSystemPrompt is defined, add it (typically at the beginning).
            let systemMessageFound = false;
            messagesForPayload = messagesForPayload.map(m => {
                if (m.role === 'system') {
                    systemMessageFound = true;
                    if (!m.content && defaultSystemPrompt) {
                        return { ...m, content: defaultSystemPrompt };
                    }
                }
                return m;
            });
            if (!systemMessageFound && defaultSystemPrompt) {
                messagesForPayload.unshift({ role: 'system', content: defaultSystemPrompt });
            }
            
            // Final filter to ensure all messages in the payload have a role and string content.
            messagesForPayload = messagesForPayload.filter(m => m.role && typeof m.content === 'string');

            const payload: any = {
              chatId: chatIdToStream,
              provider: provider,
              modelId: modelId,
              messages: messagesForPayload,
            };

            // Add thinkingConfig based on model settings and UI toggle state
            const thinkingSettings = modelConfig.uiOptions?.thinkingToggleSettings;
            if (thinkingSettings) {
              let budget;
              if (thinkingSettings.showToggle) {
                budget = thinkingEnabled ? thinkingSettings.budgetWhenEnabled : thinkingSettings.budgetWhenDisabled;
              } else {
                budget = thinkingSettings.fixedBudgetIfNotToggleable;
              }

              if (budget !== null) { // Ensure fixedBudgetIfNotToggleable wasn't null for a toggleable case (shouldn't happen with current logic)
                payload.thinkingConfig = {
                  thinkingBudget: budget,
                  // Only send includeThoughts if budget is non-zero.
                  // UI doesn't have a separate toggle for includeThoughts, so assume true if thinking is active.
                  ...(budget !== 0 && { includeThoughts: true })
                };
              }
            }
            // If no thinkingSettings, no thinkingConfig is added, backend uses its defaults.

            return payload;
          })()),
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

        // Local scope thought buffer/state, safe for current request chunk loop
        // let thoughtBuffer = ""; // Declaration moved up
        // let thoughtState: string | null = null; // Declaration moved up

        while (true) {
          const { done, value } = await reader.read();
          if (abortControllerRef.current?.signal.aborted) {
            console.log("Context: Stream processing loop aborted by signal.");
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
                  const chunk: any = JSON.parse(jsonDataString);

                  // --- THOUGHT-AWARE STREAM HANDLING ---
                  // `thoughtState` values for "thought:true" (Gemini style):
                  //   null: No active "thought:true" processing.
                  //   "gemini-expecting-content": Received "thought:true", next content is for this.
                  //   "gemini-streaming-content": Actively streaming content inside a <think> tag for a "thought:true" block.
                  // `thoughtBuffer` is for non-"thought:true" style thoughts (e.g., OpenAI, type:"think").

                  // Simplified `thoughtState`:
                  //   null: No active thought processing.
                  //   "gemini-active": A Gemini thought (`thought:true`) is streaming, <think> tag is open.
                  // `thoughtBuffer` for non-Gemini thoughts.

                  let isThoughtChunk = false;
                  let incomingThoughtContent = "";

                  if (chunk.thought === true) {
                    isThoughtChunk = true;
                    if (typeof chunk.content === "string") {
                      incomingThoughtContent = chunk.content;
                    }
                  } else if (typeof chunk.thought === "string" && chunk.thought.trim().length > 0) {
                    isThoughtChunk = true;
                    incomingThoughtContent = chunk.thought;
                  } else if ((chunk.type === "think" || chunk.type === "thought") && typeof chunk.content === "string") {
                    isThoughtChunk = true;
                    incomingThoughtContent = chunk.content;
                  }

                  if (isThoughtChunk) {
                    if (thoughtState !== "active-think-block") {
                      // Start of a new thought block
                      const currentMessage = messages.find(m => m.id === assistantMsgId);
                      contentBeforeCurrentThought = currentMessage ? currentMessage.content : "";
                      currentAccumulatedThought = incomingThoughtContent;
                      thoughtState = "active-think-block";
                    } else {
                      // Continuation of an existing thought block
                      currentAccumulatedThought += incomingThoughtContent;
                    }
                    // Always update with a complete <think>...</think> block
                    setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: contentBeforeCurrentThought + `<think>${currentAccumulatedThought}</think>`, isLoading: true } : msg));
                  
                  } else if (typeof chunk.content === "string" && chunk.content.length > 0) {
                    // This is a regular content chunk
                    if (thoughtState === "active-think-block") {
                      // The <think> block is already complete in the message content.
                      // Append regular content after it.
                      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: msg.content + chunk.content, isLoading: true } : msg));
                      // Reset thought state as the thought block is now followed by regular content
                      thoughtState = null;
                      currentAccumulatedThought = "";
                      contentBeforeCurrentThought = "";
                    } else {
                      // No active thought block, just append content
                      setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: msg.content + chunk.content, isLoading: true } : msg));
                    }
                  }

                  if (chunk.type === 'chat_id_update' && chunk.chatId && chunk.chatId !== chatIdToStream) {
                     console.warn(`Context: Backend sent a chatId ${chunk.chatId} different from frontend's ${chatIdToStream}. Ignoring backend's for session ID.`);
                  }
                  
                  // Handle stream termination (end, error, abort)
                  if (chunk.type === 'stream_end' || chunk.type === 'usage_summary' || chunk.type === 'error' || chunk.error) {
                    // The <think> block is already complete in msg.content if it was active.
                    // Just need to reset our internal tracking states.
                    thoughtState = null;
                    currentAccumulatedThought = "";
                    contentBeforeCurrentThought = "";

                    if (chunk.type === 'stream_end' || chunk.type === 'usage_summary') {
                      if (!abortControllerRef.current?.signal.aborted) {
                        // Message content is already up-to-date. Just set isLoading to false.
                        setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, isLoading: false } : msg));
                        setIsStreaming(false);
                        currentAssistantMessageIdRef.current = null;
                      }
                    } else if (chunk.error || chunk.type === 'error') {
                      if (!abortControllerRef.current?.signal.aborted) {
                        setStreamError(chunk.error?.message || "Stream error from backend");
                        // Message content is already up-to-date (including any final <think> block). Append error.
                        setMessages(prev => prev.map(m =>
                          m.id === assistantMsgId
                            ? { ...m, isLoading: false, content: `${m.content || ""}\n[Error: ${chunk.error?.message ?? "Unknown error"}]` }
                            : m
                        ));
                        setIsStreaming(false);
                        currentAssistantMessageIdRef.current = null;
                      }
                      if (chunk.type === 'error' || chunk.error) break;
                    }
                  }

                } catch (e: any) {
                  if (!abortControllerRef.current?.signal.aborted) {
                    console.error("Context: Error parsing stream data JSON:", e, jsonDataString);
                    setStreamError(`Error parsing stream: ${e.message}`);
                    // The <think> block is already complete in msg.content if it was active.
                    // Reset internal tracking states.
                    thoughtState = null;
                    currentAccumulatedThought = "";
                    contentBeforeCurrentThought = "";
                    setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isLoading: false, content: (m.content || "") + `\n[Error parsing stream data]` } : m));
                    setIsStreaming(false);
                    currentAssistantMessageIdRef.current = null;
                  }
                  break;
                }
              }
            }
          }
        }
        // After finishing both loops (while(true) and while(line)),
        // mark as not loading if we exited without error/abort, just like original code.
        if (!abortControllerRef.current?.signal.aborted && isStreaming) { // Stream ended naturally by `done` or outer break
          setIsStreaming(false);
          setMessages(prev => prev.map(msg => msg.id === assistantMsgId && msg.isLoading ? { ...msg, isLoading: false } : msg));
          currentAssistantMessageIdRef.current = null;
        }
      } catch (error: any) {
        // The <think> block is already complete in msg.content if it was active.
        // Reset internal tracking states.
        thoughtState = null;
        currentAccumulatedThought = "";
        contentBeforeCurrentThought = "";

        if (error.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
          console.log(`Context: Stream operation was aborted. Message: ${error.message}`);
          if (isStreaming) setIsStreaming(false);
          setMessages(prev => prev.map(msg => msg.id === assistantMsgId ? { ...msg, content: (msg.content || "") + (!msg.content ? `[Stream aborted]` : ''), isLoading: false } : msg));
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
        // This finally block runs after the try or catch.
        // Ensure streaming state is false if it hasn't been set by normal completion or error handling.
        // Also, ensure any lingering thought states are cleared.
        if (isStreaming) {
            setIsStreaming(false);
        }
        
        // If the message is still marked as loading, ensure it's marked false and clean up thoughts.
        // This is a fallback for unexpected loop exits or states not caught by specific handlers.
        const assistantMessage = messages.find(m => m.id === assistantMsgId);
        if (currentAssistantMessageIdRef.current === assistantMsgId && assistantMessage?.isLoading) {
            // The <think> block is already complete in msg.content if it was active.
            // Just ensure isLoading is false.
            setMessages(prev => prev.map(msg =>
                msg.id === assistantMsgId
                ? { ...msg, isLoading: false }
                : msg
            ));
        }
        
        // Final reset of states, regardless of how the try/catch/finally was reached.
        thoughtState = null;
        currentAccumulatedThought = "";
        contentBeforeCurrentThought = "";
        
        // If currentAssistantMessageIdRef still points to this stream's message,
        // and it's no longer loading (or was just set to not loading), nullify the ref.
        // This is important if the stream ended naturally or was aborted and cleaned up,
        // but this ref wasn't cleared by the specific handler.
        if (currentAssistantMessageIdRef.current === assistantMsgId) {
            const potentiallyUpdatedMsg = messages.find(m => m.id === assistantMsgId);
            if (!potentiallyUpdatedMsg || !potentiallyUpdatedMsg.isLoading) { // Check if it's truly not loading anymore
                 currentAssistantMessageIdRef.current = null;
            }
        }
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