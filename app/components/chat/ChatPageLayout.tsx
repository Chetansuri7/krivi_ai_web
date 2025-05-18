import { useState, useEffect, useCallback, useRef, useTransition as useReactTransitionHook } from 'react';
import { useNavigate, useLocation, useNavigation as useRemixNavigation, useParams } from '@remix-run/react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from './MessageItem';
import { MessageList } from './MessageList';
import { ChatInputBar } from './ChatInputBar';
import { AImodels, defaultModelConfig } from '~/lib/ai-models';
import type { AIModelConfig } from '~/lib/ai-models';
import { useScrollToBottom } from '~/hooks/useScrollToBottom';
import { FiArrowDown } from 'react-icons/fi';
import { useStreamingChat } from '~/components/chat/streaming-chat-context';
import { InitialGreeting } from './InitialGreeting';

type ChatLoadingPhase = 'INITIALIZING' | 'PREPARING_CONTENT' | 'READY';

interface ChatPageLayoutProps {
  initialChatIdFromLoader: string | null;
  initialMessagesProp: Message[];
}

export function ChatPageLayout({
  initialChatIdFromLoader,
  initialMessagesProp,
}: ChatPageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const urlChatId = params.chatId || null;

  const remixNavigation = useRemixNavigation();
  const [isReactTransitionPending, startReactTransition] = useReactTransitionHook();

  const streamChat = useStreamingChat();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(defaultModelConfig);
  const [chatPhase, setChatPhase] = useState<ChatLoadingPhase>('INITIALIZING');
  // Add a local state to prevent multiple context clears during navigation
  const [hasInitialized, setHasInitialized] = useState(false);
  // Add new state to track if we're in the new chat creation flow to prevent flickering
  const [isNewChatTransitioning, setIsNewChatTransitioning] = useState(false);

  const {
    containerRef,
    endRef,
    showScrollDownButton,
    scrollToBottom,
    scrollToPartialView,    // <-- add this!  
    resetManualScrollFlag   // <-- add this!  

  } = useScrollToBottom(streamChat.messages);

  // Effect 1: Core logic to initialize or update chat context
  useEffect(() => {
    if (hasInitialized && remixNavigation.state !== 'idle') {
      // Don't re-initialize during navigation transitions
      return;
    }

    const navState = location.state as { fromNewChatFlow?: boolean; initialMessages?: Message[] } | null;

    // Skip state changes if we're in the middle of new chat transition
    // This prevents double flickering
    if (isNewChatTransitioning && !urlChatId) {
      return;
    }

    setChatPhase('INITIALIZING');

    // Scenario 1: Landed on a specific chat URL (e.g., /chat/:id)
    if (urlChatId) {
      let messagesToUse: Message[] = initialMessagesProp;
      if (streamChat.activeStreamChatId === urlChatId &&
        streamChat.messages.length > 0 &&
        initialMessagesProp.length === 0) {
        messagesToUse = [...streamChat.messages]; // Use existing context messages
      }
      // Special handling for navigation from new chat flow
      if (navState?.fromNewChatFlow && streamChat.activeStreamChatId === urlChatId) {
        messagesToUse = [...streamChat.messages]; // Use existing context (which might have streaming content)
      } else if (navState?.fromNewChatFlow && navState.initialMessages) {
        messagesToUse = navState.initialMessages;
      } else if (streamChat.currentUIFocusChatId !== urlChatId) {
        // Only clear and reset if we're switching to a different chat
        // Don't clear during an active stream
        if (!streamChat.isStreaming || streamChat.activeStreamChatId !== urlChatId) {
          streamChat.clearStreamState();
        }
      }

      // Always set messages for the current context
      streamChat.setMessagesForContext(messagesToUse, urlChatId);

      // Clean up navigation state if it was used
      if (navState?.fromNewChatFlow) {
        startReactTransition(() => {
          const { state, ...restOfLocation } = location;
          const { fromNewChatFlow: _fNCF, initialMessages: _iM, ...newStateWithoutFlow } = (state as any) || {};
          navigate(restOfLocation, { replace: true, state: Object.keys(newStateWithoutFlow).length > 0 ? newStateWithoutFlow : undefined });
        });
        // Reset the new chat transition flag since we've completed the transition
        setIsNewChatTransitioning(false);
      }
      setChatPhase('PREPARING_CONTENT');
    }
    // Scenario 2: On a new chat page (urlChatId is null)
    else if (!urlChatId) {
      // Only clear if we're coming from a different chat or if there's stale data
      if (streamChat.currentUIFocusChatId !== null ||
        (streamChat.messages.length > 0 && !streamChat.isStreaming)) {
        streamChat.clearStreamState();
      }
      setChatPhase('READY');
    }

    setHasInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlChatId, initialMessagesProp, location.pathname, isNewChatTransitioning]);

  // Reset initialization flag when URL changes
  useEffect(() => {
    return () => {
      setHasInitialized(false);
    };
  }, [location.pathname]);

  // Effect 2: Handle PREPARING_CONTENT phase
  useEffect(() => {
    if (chatPhase === 'PREPARING_CONTENT' && streamChat.currentUIFocusChatId === urlChatId && urlChatId) {
      startReactTransition(() => {
        setChatPhase('READY');
        const navState = location.state as { fromNewChatFlow?: boolean } | null;
        if (!navState?.fromNewChatFlow) { // Only scroll if not just landed from new chat flow
          requestAnimationFrame(() => scrollToBottom('auto'));
        }
      });
    }
  }, [chatPhase, urlChatId, streamChat.currentUIFocusChatId, scrollToBottom, location.state, startReactTransition]);

  const handleSendMessage = useCallback(
    async (inputTextValue: string, modelConfig: AIModelConfig) => {
      const trimmedInput = inputTextValue.trim();
      if (!trimmedInput || streamChat.isStreaming || isReactTransitionPending || chatPhase !== 'READY') {
        return;
      }
      setInput('');

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
      };

      if (!urlChatId) { // Current page is a "new chat" page
        const newChatId = uuidv4();

        try {
          // Set flag to prevent flickering during the new chat transition
          setIsNewChatTransitioning(true);

          // 1. Set context for the new chat ID with ONLY the user message
          // This keeps the message visible during transition
          streamChat.setMessagesForContext([userMessage], newChatId);

          // 2. Start the stream BEFORE navigation completes
          // This ensures stream initialization isn't disrupted by navigation
          const streamPromise = streamChat.startStream(trimmedInput, modelConfig, newChatId);

          // 3. Navigate to new chat path with minimal visual transition
          // Short delay to allow the UI to stabilize with user message
          setTimeout(() => {
            const destinationPath = `/chat/${newChatId}`;
            startReactTransition(() => {
              navigate(destinationPath, {
                replace: true,
                state: { initialMessages: [userMessage], fromNewChatFlow: true },
              });
            });
          }, 50);

          // 4. Await stream completion (in the background)
          await streamPromise;
        } catch (error) {
          console.error("Error in new chat flow:", error);
          setIsNewChatTransitioning(false); // Reset flag in case of error
        }
      } else { // Current page is an existing chat
        try {
          // Add user message to existing messages in context
          streamChat.setMessagesForContext([...streamChat.messages, userMessage], urlChatId);
          await streamChat.startStream(trimmedInput, modelConfig, urlChatId);
        } catch (error) {
          console.error("Error in existing chat flow:", error);
        }
      }
    },
    [streamChat, urlChatId, isReactTransitionPending, chatPhase, navigate, startReactTransition]
  );

  useEffect(() => {  
  resetManualScrollFlag();  
}, [urlChatId, resetManualScrollFlag]);  

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && chatPhase === 'READY' && !streamChat.isStreaming && !isReactTransitionPending) {
      handleSendMessage(input, selectedModel);
    }
  };

  const handlePromptSelect = (promptText: string) => {
    if (chatPhase === 'READY' && !streamChat.isStreaming && !isReactTransitionPending) {
      setInput(promptText);
      handleSendMessage(promptText, selectedModel);
    }
  };

  const isRemixNavigating = remixNavigation.state !== 'idle';
  // Modify the content ready check to account for new chat transitions
  const isContentReady = (chatPhase === 'READY' && !isRemixNavigating && !isReactTransitionPending) ||
    (isNewChatTransitioning && streamChat.messages.length > 0);

  const childKey = urlChatId || "new-chat-page-active";

  return (
    <div className="flex flex-col h-full w-full">
      <div ref={containerRef} className="flex-grow overflow-y-auto overflow-x-hidden relative">
        {/* No visible loading indicators */}

        <div
          style={{
            opacity: isContentReady ? 1 : 0,
            transition: 'opacity 0.2s ease-in-out',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="w-full"
        >
          <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col">
            {streamChat.messages.length === 0 ? (
              <InitialGreeting />
            ) : (
              <MessageList
                key={`ml-${childKey}`}
                messages={streamChat.messages}
                isLoading={
                  streamChat.isStreaming &&
                  streamChat.messages[streamChat.messages.length - 1]?.role === "assistant" &&
                  streamChat.messages[streamChat.messages.length - 1]?.isLoading === true
                }
                isInitialHistoryLoading={false} // Never show history loading
                scrollEndRef={endRef}
              />
            )}
          </div>
        </div>

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

      <div className="flex-shrink-0 bg-background border-t border-border">
        <div className="max-w-4xl mx-auto w-full p-2 md:p-3">
          <ChatInputBar
            key={`cib-${childKey}`}
            input={input}
            onInputChange={e => setInput(e.target.value)}
            onSubmit={handleFormSubmit}
            isLoading={
              chatPhase !== 'READY' ||
              streamChat.isStreaming ||
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