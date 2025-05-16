// app/components/chat/ChatPageLayout.tsx

import { useState, useEffect, useCallback, useRef, useTransition as useReactTransitionHook } from 'react';
import { useNavigate, useLocation, useNavigation } from '@remix-run/react';
import type { Message } from './MessageItem';
import { MessageList } from './MessageList';
import { ChatInputBar } from './ChatInputBar';
import { InitialPrompts } from './InitialPrompts';
import {
  AImodels,
  defaultModelConfig,
  defaultSystemPrompt,
  API_STREAM_URL,
} from '~/lib/ai-models';
import type { AIModelConfig } from '~/lib/ai-models';
import { FourSquare } from 'react-loading-indicators';
// import { ChevronDown } from 'lucide-react'; // SVG is used directly
import { useScrollToBottom } from '~/hooks/useScrollToBottom';
import { FiArrowDown } from 'react-icons/fi';

type ChatLoadingPhase = 'INITIALIZING' | 'PREPARING_CONTENT' | 'READY';

interface ChatPageLayoutProps {
  initialChatId: string | null;
  initialMessages?: Message[];
}

export function ChatPageLayout({
  initialChatId,
  initialMessages = [],
}: ChatPageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const remixNavigation = useNavigation();
  const [isReactTransitionPending, startReactTransition] = useReactTransitionHook();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(defaultModelConfig);
  const [chatPhase, setChatPhase] = useState<ChatLoadingPhase>('READY');

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const activeChatContextIdRef = useRef<string | null | symbol>(Symbol('initial_unprocessed_ref_state'));

  const {
    containerRef,
    endRef,
    showScrollDownButton,
    scrollToBottom,
  } = useScrollToBottom();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ... (rest of your useEffects and handler functions remain the same) ...
  // handleSendMessage, handleStreamData, handleStreamError, etc.

  useEffect(() => {
    const newContextTargetId = initialChatId;
    const navState = location.state as { fromNewChatFlow?: boolean; initialMessages?: Message[] } | null;
    let shouldScrollOnLoad = false;

    if (
      navState?.fromNewChatFlow &&
      navState.initialMessages &&
      initialChatId &&
      initialChatId === activeChatContextIdRef.current
    ) {
      setMessages(navState.initialMessages);
      setChatPhase('READY');
      shouldScrollOnLoad = true;
      startReactTransition(() => {
        const { state, ...restOfLocation } = location;
        // @ts-ignore
        const { fromNewChatFlow, initialMessages: _im, ...newStateWithoutFlow } = state || {};
        navigate(restOfLocation, {
          replace: true,
          state: Object.keys(newStateWithoutFlow).length > 0 ? newStateWithoutFlow : undefined
        });
      });
    } else if (newContextTargetId !== activeChatContextIdRef.current) {
      activeChatContextIdRef.current = newContextTargetId;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("Chat context changed");
        abortControllerRef.current = null;
      }
      setIsStreaming(false);
      setInput('');
      setMessages([]);
      if (newContextTargetId) {
        setChatPhase('INITIALIZING');
        // Scroll will happen in Effect 3 after PREPARING_CONTENT
      } else {
        setMessages(initialMessages || []);
        setChatPhase('READY');
        shouldScrollOnLoad = true;
      }
    }

    if (shouldScrollOnLoad) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId, location.state, navigate]); // scrollToBottom is stable

  useEffect(() => {
    if (
      chatPhase === 'INITIALIZING' &&
      initialChatId &&
      activeChatContextIdRef.current === initialChatId
    ) {
      setMessages(initialMessages || []);
      setChatPhase('PREPARING_CONTENT');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatPhase, initialMessages, initialChatId]);

  useEffect(() => {
    if (
      chatPhase === 'PREPARING_CONTENT' &&
      activeChatContextIdRef.current === initialChatId
    ) {
      startReactTransition(() => {
        setChatPhase('READY');
        requestAnimationFrame(() => scrollToBottom('auto'));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatPhase, initialChatId]); // scrollToBottom is stable

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("Component unmounting");
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleSendMessage = useCallback(
    async (inputText: string, modelConfig: AIModelConfig) => {
      if (isStreaming || isReactTransitionPending || chatPhase !== 'READY') return;
      if (initialChatId && activeChatContextIdRef.current !== initialChatId) return;

      setIsStreaming(true);
      const currentInput = input || inputText;
      setInput('');
      const newUserMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: currentInput.trim(),
      };
      setMessages(prev => [...prev, newUserMessage]);

      const assistantMessageId = crypto.randomUUID();
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        }
      ]);

      const currentAbortController = new AbortController();
      abortControllerRef.current = currentAbortController;
      const chatIdForRequest = initialChatId;
      let receivedChatIdFromStream: string | null = null;

      try {
        const response = await fetch(API_STREAM_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
          body: JSON.stringify({
            chatId: chatIdForRequest,
            message: currentInput.trim(),
            provider: modelConfig.provider,
            model: modelConfig.model,
            systemPrompt: defaultSystemPrompt,
          }),
          signal: currentAbortController.signal,
          credentials: 'include',
        });

        if (currentAbortController.signal.aborted) return;
        if (!response.ok || !response.body) {
          const errorBody = await response.text().catch(() => "Failed to read error body");
          throw new Error(`API Error ${response.status}: ${errorBody.slice(0, 500)}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (currentAbortController.signal.aborted || done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line.startsWith("data: ")) {
              const jsonDataString = line.substring(5);
              if (jsonDataString && !currentAbortController.signal.aborted) {
                try {
                  const chunk = JSON.parse(jsonDataString);
                  if (chunk.type === "session_info" && chunk.chatId && !chatIdForRequest) {
                    receivedChatIdFromStream = chunk.chatId;
                  }
                  handleStreamData(chunk, assistantMessageId);
                } catch (e) {
                  if (!currentAbortController.signal.aborted) console.error("Error parsing stream data JSON:", e, jsonDataString);
                }
              }
            }
          }
        }

        if (!chatIdForRequest && receivedChatIdFromStream) {
          activeChatContextIdRef.current = receivedChatIdFromStream;
          startReactTransition(() => {
            navigate(`/chat/${receivedChatIdFromStream}`, {
              replace: true,
              state: { initialMessages: messagesRef.current, fromNewChatFlow: true }
            });
          });
        } else if (!currentAbortController.signal.aborted) {
          setIsStreaming(false);
        }
      } catch (error: any) {
        if (
          currentAbortController.signal.aborted ||
          error.name === 'AbortError'
        ) {
          if (
            !messagesRef.current.find(m => m.id === assistantMessageId)?.content?.includes("[Stream aborted]")
          ) {
            setMessages(prev =>
              prev.map(
                msg =>
                  msg.id === assistantMessageId && msg.role === 'assistant'
                    ? {
                      ...msg,
                      content: (msg.content || "") + `\n[Stream aborted]`
                    }
                    : msg
              )
            );
          }
        } else {
          console.error(`[handleSendMessage] Send/Stream error:`, error);
          handleStreamError(assistantMessageId, error.message || "Failed to get response.");
        }
        if (
          !receivedChatIdFromStream || error
        ) {
          if (
            !currentAbortController.signal.aborted ||
            (abortControllerRef.current === currentAbortController || !abortControllerRef.current)
          ) {
            setIsStreaming(false);
          }
        }
      } finally {
        if (abortControllerRef.current === currentAbortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [initialChatId, isStreaming, selectedModel, navigate, isReactTransitionPending, chatPhase, startReactTransition, input]
  );

  const handleStreamData = (chunk: any, assistantMessageId: string) => {
    if (abortControllerRef.current?.signal.aborted && !isStreaming) return; // Check isStreaming too
    if (chunk.content) {
      setMessages(prev =>
        prev.map(
          msg =>
            msg.id === assistantMessageId && msg.role === 'assistant'
              ? { ...msg, content: msg.content + chunk.content }
              : msg
        )
      );
    } else if (chunk.type === 'usage_summary' || chunk.type === 'stream_end') {
      if (!abortControllerRef.current || !abortControllerRef.current.signal.aborted) setIsStreaming(false);
    } else if (chunk.error) {
      handleStreamError(assistantMessageId, chunk.error.message || chunk.error);
      if (!abortControllerRef.current || !abortControllerRef.current.signal.aborted) setIsStreaming(false);
    }
  };

  const handleStreamError = (assistantMessageId: string, errorMessage: string) => {
    setMessages(prev =>
      prev.map(
        msg =>
          msg.id === assistantMessageId &&
            msg.role === 'assistant' &&
            !msg.content.includes("[Error:")
            ? {
              ...msg,
              content: (msg.content || "") + `\n[Error: ${errorMessage.slice(0, 100)}...]`
            }
            : msg
      )
    );
    if (!abortControllerRef.current || !abortControllerRef.current.signal.aborted) setIsStreaming(false);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && chatPhase === 'READY' && !isStreaming && !isReactTransitionPending) {
      handleSendMessage(input.trim(), selectedModel);
    }
  };

  const handlePromptSelect = (promptText: string) => {
    if (chatPhase === 'READY' && !isStreaming && !isReactTransitionPending) {
      // setInput(promptText); // Optionally set input field
      handleSendMessage(promptText, selectedModel);
    }
  };

  const isRemixNavigating = remixNavigation.state !== 'idle';
  const showPageLoader =
    chatPhase !== 'READY' || isRemixNavigating || isReactTransitionPending;
  const displayInitialPrompts =
    initialChatId === null &&
    messages.length === 0 &&
    !isStreaming &&
    !input &&
    chatPhase === 'READY';
  const showMessageAreaContent =
    chatPhase === 'READY' && !isRemixNavigating && !isReactTransitionPending;
  const childKey = initialChatId || "new-chat-session";


  return (
    <div className="flex flex-col h-full w-full">
      {/* CHAT MESSAGE AREA */}
      <div ref={containerRef} className="flex-grow overflow-y-auto overflow-x-hidden relative">
        {showPageLoader && (
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/80 backdrop-blur-sm z-20 p-4 text-center">
            <FourSquare color="hsl(var(--primary))" size="medium" />
            <p className="mt-4 text-sm text-foreground">
              {isRemixNavigating
                ? "Navigating..."
                : isReactTransitionPending
                  ? "Processing..."
                  : chatPhase === 'INITIALIZING'
                    ? "Initializing chat..."
                    : chatPhase === 'PREPARING_CONTENT'
                      ? "Loading messages..."
                      : "Loading..."}
            </p>
          </div>
        )}
        <div
          style={{
            opacity: showMessageAreaContent ? 1 : 0,
            pointerEvents: showMessageAreaContent ? 'auto' : 'none',
            transition: 'opacity 0.2s ease-in-out',
            minHeight: '100%', display: 'flex', flexDirection: 'column',
          }}
          className="w-full" // Ensures this div spans the containerRef width
        >
          {displayInitialPrompts ? (
            <div className="max-w-5xl mx-auto w-full h-full flex flex-col justify-center items-center p-4 flex-grow">
              <InitialPrompts onPromptSelect={handlePromptSelect} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col"> {/* Message content column */}
              <MessageList
                key={`ml-${childKey}`}
                messages={messages}
                isLoading={isStreaming && chatPhase === 'READY'}
                isInitialHistoryLoading={chatPhase === 'PREPARING_CONTENT'}
                scrollEndRef={endRef}
              />
            </div>
          )}
        </div>

        {/* Scroll to bottom button - NEW POSITIONING STRUCTURE */}
        {showScrollDownButton && (
          <div className="sticky bottom-4 w-full flex justify-center pointer-events-none z-30">
            <div className="max-w-4xl w-full flex justify-end pointer-events-auto px-4">
              <button
                onClick={() => scrollToBottom('smooth')}
                className="p-2 bg-card border border-border rounded-full shadow-lg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 ease-in-out animate-fade-in"
                aria-label="Scroll to latest messages"
                title="Scroll to latest messages"
                style={{ minWidth: 36, minHeight: 36, width: 36, height: 36 }}
              >
                <FiArrowDown size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}



      </div>

      {/* INPUT BAR */}
      <div className="flex-shrink-0 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto w-full p-2 md:p-3">
          <ChatInputBar
            key={`cib-${childKey}`}
            input={input}
            onInputChange={e => setInput(e.target.value)}
            onSubmit={handleFormSubmit}
            isLoading={
              chatPhase !== 'READY' ||
              isStreaming ||
              isRemixNavigating ||
              isReactTransitionPending
            }
            availableModels={AImodels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>
    </div>
  );
}