// app/components/chat/ChatPageLayout.tsx
import { useState, useEffect, useCallback, useRef, useTransition as useReactTransitionHook } from 'react';
import { useNavigate, useLocation, useNavigation as useRemixNavigation, useParams } from '@remix-run/react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from './MessageItem';
import { MessageList } from './MessageList';
import { ChatInputBar } from './ChatInputBar';
import { InitialPrompts } from './InitialPrompts';
import { AImodels, defaultModelConfig } from '~/lib/ai-models';
import type { AIModelConfig } from '~/lib/ai-models';
import { FourSquare } from 'react-loading-indicators';
import { useScrollToBottom } from '~/hooks/useScrollToBottom';
import { FiArrowDown } from 'react-icons/fi';
import { useStreamingChat } from '~/components/chat/streaming-chat-context';

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

  const {
    containerRef,
    endRef,
    showScrollDownButton,
    scrollToBottom,
  } = useScrollToBottom(streamChat.messages);

  // Effect 1: Core logic to initialize or update chat context
  useEffect(() => {
    if (hasInitialized && remixNavigation.state !== 'idle') {
      // Don't re-initialize during navigation transitions
      return;
    }

    const navState = location.state as { fromNewChatFlow?: boolean; initialMessages?: Message[] } | null;
    console.log(`ChatPageLayout E1: urlChatId=${urlChatId}, initialChatIdFromLoader=${initialChatIdFromLoader}, contextUIFocus=${streamChat.currentUIFocusChatId}, contextActiveStream=${streamChat.activeStreamChatId}, navState=${JSON.stringify(navState)}, initialMessagesPropCt=${initialMessagesProp.length}`);

    setChatPhase('INITIALIZING');

    // Scenario 1: Landed on a specific chat URL (e.g., /chat/:id)
    if (urlChatId) {
      let messagesToUse: Message[] = initialMessagesProp;
      if (streamChat.activeStreamChatId === urlChatId &&
        streamChat.messages.length > 0 &&
        initialMessagesProp.length === 0) {
        console.log(`ChatPageLayout E1: Using existing messages from context (Stream active for this ID, initialProp empty).`);
        messagesToUse = [...streamChat.messages]; // Use existing context messages
      }
      // Special handling for navigation from new chat flow
      if (navState?.fromNewChatFlow && streamChat.activeStreamChatId === urlChatId) {
        console.log(`ChatPageLayout E1: Landed on ${urlChatId} from new chat flow. Context is active for this ID. Using context messages.`);
        messagesToUse = [...streamChat.messages]; // Use existing context (which might have streaming content)
      } else if (navState?.fromNewChatFlow && navState.initialMessages) {
        console.log(`ChatPageLayout E1: Landed on ${urlChatId} from new chat flow. Context NOT active for this ID. Using navState messages.`);
        messagesToUse = navState.initialMessages;
      } else if (streamChat.currentUIFocusChatId !== urlChatId) {
        // Only clear and reset if we're switching to a different chat
        console.log(`ChatPageLayout E1: Switching to chat ${urlChatId}. Previous focus: ${streamChat.currentUIFocusChatId}`);
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
      }
      setChatPhase('PREPARING_CONTENT');
    }
    // Scenario 2: On a new chat page (urlChatId is null)
    else if (!urlChatId) {
      console.log("ChatPageLayout E1: Initializing for new chat page (urlChatId is null).");

      // Only clear if we're coming from a different chat or if there's stale data
      if (streamChat.currentUIFocusChatId !== null ||
        (streamChat.messages.length > 0 && !streamChat.isStreaming)) {
        console.log("ChatPageLayout E1: Clearing context for new chat page.");
        streamChat.clearStreamState();
      } else {
        console.log("ChatPageLayout E1: Context seems aligned for new/unnamed chat or is pristine. Not clearing.");
      }
      setChatPhase('READY');
    }

    setHasInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlChatId, initialMessagesProp, location.pathname]);

  // Reset initialization flag when URL changes
  useEffect(() => {
    return () => {
      setHasInitialized(false);
    };
  }, [location.pathname]);

  // Effect 2: Handle PREPARING_CONTENT phase
  useEffect(() => {
    if (chatPhase === 'PREPARING_CONTENT' && streamChat.currentUIFocusChatId === urlChatId && urlChatId) {
      console.log(`ChatPageLayout E2: PREPARING_CONTENT for ${urlChatId} -> READY. Scrolling history.`);
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
        console.warn("ChatPageLayout: Send message aborted.", { isStreaming: streamChat.isStreaming, isReactTransitionPending, chatPhase });
        return;
      }
      setInput('');

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
        timestamp: Date.now()
      };

      if (!urlChatId) { // Current page is a "new chat" page
        const newChatId = uuidv4();
        console.log(`ChatPageLayout: New chat. Generated ID: ${newChatId}. Updating context, navigating, then streaming.`);

        try {
          // 1. Set context for the new chat ID with ONLY the user message
          //    This prepares the context before navigation and stream start.
          streamChat.setMessagesForContext([userMessage], newChatId);

          // 2. Navigate to the new chat's URL
          const destinationPath = `/chat/${newChatId}`;

          // 3. Start the stream BEFORE navigation completes
          // This ensures stream initialization isn't disrupted by navigation
          const streamPromise = streamChat.startStream(trimmedInput, modelConfig, newChatId);

          // 4. Navigate to new chat path
          startReactTransition(() => {
            navigate(destinationPath, {
              replace: true,
              state: { initialMessages: [userMessage], fromNewChatFlow: true },
            });
          });

          // 5. Await stream completion (in the background)
          await streamPromise;
        } catch (error) {
          console.error("Error in new chat flow:", error);
          // Handle error (could add error state to UI here)
        }
      } else { // Current page is an existing chat
        console.log(`ChatPageLayout: Existing chat ${urlChatId}. Sending message.`);
        try {
          // Add user message to existing messages in context
          streamChat.setMessagesForContext([...streamChat.messages, userMessage], urlChatId);
          await streamChat.startStream(trimmedInput, modelConfig, urlChatId);
        } catch (error) {
          console.error("Error in existing chat flow:", error);
          // Handle error (could add error state to UI here)
        }
      }
    },
    [streamChat, urlChatId, isReactTransitionPending, chatPhase, navigate, startReactTransition]
  );

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
  const showPageLoader = chatPhase !== 'READY' || isRemixNavigating || isReactTransitionPending;

  const displayInitialPrompts =
    !urlChatId &&
    streamChat.messages.length === 0 &&
    !streamChat.isStreaming &&
    !input &&
    chatPhase === 'READY';

  const showMessageAreaContent = chatPhase === 'READY' && !isRemixNavigating && !isReactTransitionPending;

  const childKey = urlChatId || "new-chat-page-active";

  return (
    <div className="flex flex-col h-full w-full">
      <div ref={containerRef} className="flex-grow overflow-y-auto overflow-x-hidden relative">
        {showPageLoader && (
          <div className="absolute inset-0 flex flex-col justify-center items-center bg-background/80 backdrop-blur-sm z-20 p-4 text-center">
            <FourSquare color="hsl(var(--primary))" size="medium" />
            <p className="mt-4 text-sm text-foreground">
              {isRemixNavigating ? "Navigating..."
                : isReactTransitionPending ? "Processing..."
                  : chatPhase === 'INITIALIZING' ? "Initializing chat..."
                    : chatPhase === 'PREPARING_CONTENT' ? "Loading messages..."
                      : "Loading..."}
            </p>
            {streamChat.streamError && <p className="mt-2 text-destructive text-xs">Error: {streamChat.streamError}</p>}
          </div>
        )}
        <div
          style={{
            opacity: showMessageAreaContent ? 1 : 0,
            pointerEvents: showMessageAreaContent ? 'auto' : 'none',
            transition: 'opacity 0.2s ease-in-out',
            minHeight: '100%', display: 'flex', flexDirection: 'column',
          }}
          className="w-full"
        >
          {displayInitialPrompts ? (
            <div className="max-w-5xl mx-auto w-full h-full flex flex-col justify-center items-center p-4 flex-grow">
              <InitialPrompts onPromptSelect={handlePromptSelect} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full flex-grow flex flex-col">
              <MessageList
                key={`ml-${childKey}`}
                messages={streamChat.messages}
                isLoading={streamChat.isStreaming && streamChat.messages[streamChat.messages.length - 1]?.role === 'assistant' && streamChat.messages[streamChat.messages.length - 1]?.isLoading === true}
                isInitialHistoryLoading={chatPhase === 'PREPARING_CONTENT'}
                scrollEndRef={endRef}
              />
            </div>
          )}
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