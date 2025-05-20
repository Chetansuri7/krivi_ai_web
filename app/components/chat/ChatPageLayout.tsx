// app/components/chat/ChatPageLayout.tsx  
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
import { useSidebarChatHistory } from '~/components/sidebar-chat-history-context';  
  
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
  // ------------ BEGIN: Model selection state (now per chat) --------------  
  // Use a ref to remember last selected model per-chat during this browser session  
  const lastSelectedModelMapRef = useRef<{ [chatKey: string]: AIModelConfig }>({});  
  // Use urlChatId (or "new-chat" for new) as the key  
  const chatModelKey = urlChatId || 'new-chat';  
  // Local selected model state (for controlled input dropdown)  
  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(defaultModelConfig);  
  
  // When chat changes, restore last used model (or default)  
  useEffect(() => {  
    const last = lastSelectedModelMapRef.current[chatModelKey];  
    setSelectedModel(last ?? defaultModelConfig);  
  }, [chatModelKey]);  
  
  // Store the model in the ref on change  
  const handleModelChange = (model: AIModelConfig) => {  
    setSelectedModel(model);  
    lastSelectedModelMapRef.current[chatModelKey] = model;  
  };  
  // ------------ END: Model selection state (per chat) --------------------  
  
  const [chatPhase, setChatPhase] = useState<ChatLoadingPhase>('INITIALIZING');  
  const [hasInitialized, setHasInitialized] = useState(false);  
  const [isNewChatTransitioning, setIsNewChatTransitioning] = useState(false);  
  
  const {  
    containerRef,  
    endRef,  
    showScrollDownButton,  
    scrollToBottom,  
    scrollToPartialView,  
    resetManualScrollFlag  
  } = useScrollToBottom(streamChat.messages);  
  
  // Effect: Core logic to initialize or update chat context/messages  
  useEffect(() => {  
    if (hasInitialized && remixNavigation.state !== 'idle') {  
      // Don't re-initialize during navigation transitions  
      return;  
    }  
  
    const navState = location.state as { fromNewChatFlow?: boolean; initialMessages?: Message[] } | null;  
  
    if (isNewChatTransitioning && !urlChatId) {  
      return;  
    }  
  
    setChatPhase('INITIALIZING');  
  
    // Case 1: Landed on specific chatId  
    if (urlChatId) {  
      let messagesToUse: Message[] = initialMessagesProp;  
      if (  
        streamChat.activeStreamChatId === urlChatId &&  
        streamChat.messages.length > 0 &&  
        initialMessagesProp.length === 0  
      ) {  
        messagesToUse = [...streamChat.messages]; // Use existing context messages  
      }  
      if (navState?.fromNewChatFlow && streamChat.activeStreamChatId === urlChatId) {  
        messagesToUse = [...streamChat.messages];  
      } else if (navState?.fromNewChatFlow && navState.initialMessages) {  
        messagesToUse = navState.initialMessages;  
      } else if (streamChat.currentUIFocusChatId !== urlChatId) {  
        if (!streamChat.isStreaming || streamChat.activeStreamChatId !== urlChatId) {  
          streamChat.clearStreamState();  
        }  
      }  
      streamChat.setMessagesForContext(messagesToUse, urlChatId);  
  
      if (navState?.fromNewChatFlow) {  
        startReactTransition(() => {  
          const { state, ...restOfLocation } = location;  
          const { fromNewChatFlow: _fNCF, initialMessages: _iM, ...newStateWithoutFlow } = (state as any) || {};  
          navigate(restOfLocation, {  
            replace: true,  
            state: Object.keys(newStateWithoutFlow).length > 0 ? newStateWithoutFlow : undefined,  
          });  
        });  
        setIsNewChatTransitioning(false);  
      }  
      setChatPhase('PREPARING_CONTENT');  
    }  
    // Case 2: New chat page  
    else if (!urlChatId) {  
      if (  
        streamChat.currentUIFocusChatId !== null ||  
        (streamChat.messages.length > 0 && !streamChat.isStreaming)  
      ) {  
        streamChat.clearStreamState();  
      }  
      setChatPhase('READY');  
    }  
    setHasInitialized(true);  
    // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [urlChatId, initialMessagesProp, location.pathname, isNewChatTransitioning]);  
  
  useEffect(() => {  
    return () => {  
      setHasInitialized(false);  
    };  
  }, [location.pathname]);  
  
  // Handle phase change READY for scrolling  
  useEffect(() => {  
    if (  
      chatPhase === 'PREPARING_CONTENT' &&  
      streamChat.currentUIFocusChatId === urlChatId &&  
      urlChatId  
    ) {  
      startReactTransition(() => {  
        setChatPhase('READY');  
        const navState = location.state as { fromNewChatFlow?: boolean } | null;  
        if (!navState?.fromNewChatFlow) {  
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
      // Remember the model selection for this chat (could also be done inside handleModelChange)  
      lastSelectedModelMapRef.current[chatModelKey] = modelConfig;  
  
      const userMessage: Message = {  
        id: crypto.randomUUID(),  
        role: 'user',  
        content: trimmedInput,  
      };  
  
      if (!urlChatId) {  
        const newChatId = uuidv4();  
        try {  
          setIsNewChatTransitioning(true);  
          streamChat.setMessagesForContext([userMessage], newChatId);  
          const streamPromise = streamChat.startStream(trimmedInput, modelConfig, newChatId);  
          setTimeout(() => {  
            const destinationPath = `/chat/${newChatId}`;  
            startReactTransition(() => {  
              navigate(destinationPath, {  
                replace: true,  
                state: { initialMessages: [userMessage], fromNewChatFlow: true },  
              });  
            });  
          }, 50);  
          await streamPromise;  
        } catch (error) {  
          console.error('Error in new chat flow:', error);  
          setIsNewChatTransitioning(false);  
        }  
      } else {  
        try {  
          streamChat.setMessagesForContext([...streamChat.messages, userMessage], urlChatId);  
          await streamChat.startStream(trimmedInput, modelConfig, urlChatId);  
        } catch (error) {  
          console.error('Error in existing chat flow:', error);  
        }  
      }  
    },  
    [streamChat, urlChatId, isReactTransitionPending, chatPhase, navigate, startReactTransition, chatModelKey]  
  );  
  
  useEffect(() => {  
    resetManualScrollFlag();  
  }, [urlChatId, resetManualScrollFlag]);  
  
  // For refreshing sidebar history on new chat  
  const { refreshChatHistory } = useSidebarChatHistory();  
  const prevChatIdRef = useRef<string | null>(null);  
  useEffect(() => {  
    if (  
      prevChatIdRef.current === null && // previously on new chat  
      initialChatIdFromLoader !== null // now on an actual chat  
    ) {  
      refreshChatHistory();  
    }  
    prevChatIdRef.current = initialChatIdFromLoader;  
  }, [initialChatIdFromLoader, refreshChatHistory]);  
  
  // Wire form submit and prompt select  
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {  
    e.preventDefault();  
    if (  
      input.trim() &&  
      chatPhase === 'READY' &&  
      !streamChat.isStreaming &&  
      !isReactTransitionPending  
    ) {  
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
          />  
        </div>  
      </div>  
    </div>  
  );  
}  