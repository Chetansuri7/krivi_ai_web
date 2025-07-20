// app/components/chat/ChatPageLayout.tsx  
import React, { useState, useRef, useTransition as useReactTransitionHook, useEffect } from 'react';  
import { useNavigate, useLocation, useNavigation as useRemixNavigation, useParams } from '@remix-run/react';  
import { AImodels, defaultModelConfig } from '~/lib/ai-models';  
import { useScrollToBottom } from '~/hooks/useScrollToBottom';  
import { FiArrowDown } from 'react-icons/fi';  
import { useStreamingChat } from '~/components/chat/streaming-chat-context';  
import { InitialGreeting } from './InitialGreeting';  
import { useSidebarChatHistory } from '~/components/sidebar-chat-history-context';  
import { MessageList } from './MessageList';  
import { ChatInputBar } from './ChatInputBar';  
  
import { usePerChatModelSelection } from '~/hooks/usePerChatModelSelection';  
import { useChatSessionMessages } from '~/hooks/useChatSessionMessages';  
import { useSidebarHistoryRefreshOnChatChange } from '~/hooks/useSidebarHistoryRefreshOnChatChange';  
import { useChatSendMessage } from '~/hooks/useChatSendMessage';  
  
type ChatPageLayoutProps = {  
  initialChatIdFromLoader: string | null;  
  initialMessagesProp: any[];  
};  
  
export function ChatPageLayout({ initialChatIdFromLoader, initialMessagesProp }: ChatPageLayoutProps) {  
  const navigate = useNavigate();  
  const location = useLocation();  
  const params = useParams();  
  const urlChatId = params.chatId || null;  
  const remixNavigation = useRemixNavigation();  
  const [isReactTransitionPending, startReactTransition] = useReactTransitionHook();  
  const streamChat = useStreamingChat();  
  
  const [input, setInput] = useState('');  
  const [isNewChatTransitioning, setIsNewChatTransitioning] = useState(false);  
  
  const chatModelKey = urlChatId || 'new-chat';  
  
  // -- get scroll hook FIRST so scrollToBottom variable is ready before calling other hooks  
  const {  
    containerRef,  
    endRef,  
    showScrollDownButton,  
    scrollToBottom,  
    scrollToPartialView,  
    resetManualScrollFlag  
  } = useScrollToBottom(streamChat.messages);  
  
  const { selectedModel, handleModelChange } = usePerChatModelSelection(chatModelKey, defaultModelConfig);  
  
  const { chatPhase, setChatPhase } = useChatSessionMessages({  
    urlChatId,  
    initialMessagesProp,  
    streamChat,  
    location,  
    remixNavigation,  
    navigate,  
    startReactTransition,  
    isNewChatTransitioning,  
    setIsNewChatTransitioning,  
    scrollToBottom,  
  });  
  
  const lastSelectedModelMapRef = useRef<{ [key: string]: any }>({});  
  
  const handleSendMessage = useChatSendMessage({  
    streamChat,  
    urlChatId,  
    lastSelectedModelMapRef,  
    isReactTransitionPending,  
    chatPhase,  
    navigate,  
    startReactTransition,  
    setInput,  
    setIsNewChatTransitioning,  
    chatModelKey,  
  });  
  
  // For sidebar history  
  const { refreshChatHistory } = useSidebarChatHistory();  
  useSidebarHistoryRefreshOnChatChange(initialChatIdFromLoader, refreshChatHistory);  
  
  useEffect(() => {  
    resetManualScrollFlag();  
  }, [urlChatId, resetManualScrollFlag]);

  // Auto-trigger assistant stream if landed on page with only user message and not streaming
  useEffect(() => {
    // Basic guards
    if (
      chatPhase !== 'READY' ||
      !urlChatId ||
      !selectedModel ||
      streamChat.isStreaming ||
      isReactTransitionPending ||
      remixNavigation.state !== 'idle'
    ) {
      return;
    }
    // EXTRA GUARD: Prevent duplicate streams for same chatId during route transitions/remounts
    if (streamChat.activeStreamChatId === urlChatId) {
      // Already streaming for this chatId, don't trigger another
      return;
    }
    // Check if exactly one message and it is from user
    if (
      Array.isArray(streamChat.messages) &&
      streamChat.messages.length === 1 &&
      streamChat.messages[0].role === 'user'
    ) {
      // No assistant message yet, auto trigger the stream
      streamChat.startStream(
        streamChat.messages[0].content,
        selectedModel,
        urlChatId
      );
    }
  }, [
    chatPhase,
    urlChatId,
    selectedModel,
    streamChat.isStreaming,
    streamChat.activeStreamChatId, // <-- depend on this
    streamChat.messages,
    isReactTransitionPending,
    remixNavigation.state,
    streamChat,
  ]);
  
  // UI event handlers
  const handleFormSubmit = (options: { thinkingEnabled?: boolean }) => {
    // e.preventDefault(); // This is now handled in ChatInputBar.tsx
    if (
      input.trim() &&
      chatPhase === 'READY' &&
      !streamChat.isStreaming &&
      !isReactTransitionPending
    ) {
      handleSendMessage(input, selectedModel, options); // Pass options through
    }
  };
  
  const handlePromptSelect = (promptText: string) => {
    if (chatPhase === 'READY' && !streamChat.isStreaming && !isReactTransitionPending) {
      setInput(promptText);
      // For prompts selected from UI, thinking is likely not explicitly toggled,
      // so we might send undefined or a default.
      // Assuming default behavior (no thinking toggle explicitly set for these).
      handleSendMessage(promptText, selectedModel, { thinkingEnabled: undefined });
    }  
  };  
  
  const isRemixNavigating = remixNavigation.state !== 'idle';  
  const isContentReady =  
    (chatPhase === 'READY' && !isRemixNavigating && !isReactTransitionPending) ||  
    (isNewChatTransitioning && streamChat.messages.length > 0);  
  const childKey = urlChatId || 'new-chat-page-active';  
  
  return (  
    <div className="flex flex-col h-full w-full">  
      <div ref={containerRef} className="flex-grow overflow-y-auto overflow-x-hidden relative">  
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
                  streamChat.messages[streamChat.messages.length - 1]?.role === 'assistant' &&  
                  streamChat.messages[streamChat.messages.length - 1]?.isLoading === true  
                }  
                isInitialHistoryLoading={false}  
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
            onModelChange={handleModelChange}
            chatKey={chatModelKey} // Pass chatModelKey as chatKey prop
          />
        </div>
      </div>
    </div>  
  );  
}  