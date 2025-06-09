// app/hooks/useChatSessionMessages.ts  
import { useState, useEffect } from 'react';  
import { Message } from '~/components/chat/MessageItem';  
  
type ChatLoadingPhase = 'INITIALIZING' | 'PREPARING_CONTENT' | 'READY';  
  
export function useChatSessionMessages({  
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
}: {  
  urlChatId: string | null;  
  initialMessagesProp: Message[];  
  streamChat: any;  
  location: any;  
  remixNavigation: any;  
  navigate: any;  
  startReactTransition: any;  
  isNewChatTransitioning: boolean;  
  setIsNewChatTransitioning: (v: boolean) => void;  
  scrollToBottom: (behavior: ScrollBehavior) => void;  
}) {  
  const [chatPhase, setChatPhase] = useState<ChatLoadingPhase>('INITIALIZING');  
  const [hasInitialized, setHasInitialized] = useState(false);  
  
  useEffect(() => {  
    if (hasInitialized && remixNavigation.state !== 'idle') return;  
  
    const navState = location.state as { fromNewChatFlow?: boolean; initialMessages?: Message[] } | null;  
  
    if (isNewChatTransitioning && !urlChatId) return; // Corrected: pass as prop  
  
    setChatPhase('INITIALIZING');  
  
    if (urlChatId) {  
      let messagesToUse: Message[] = initialMessagesProp;  
  
      if (  
        streamChat.activeStreamChatId === urlChatId &&  
        streamChat.messages.length > 0 &&  
        initialMessagesProp.length === 0  
      ) {  
        messagesToUse = [...streamChat.messages];  
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
    } else if (!urlChatId) {  
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
  }, [  
    chatPhase,  
    urlChatId,  
    streamChat.currentUIFocusChatId,  
    scrollToBottom,  
    location.state,  
    startReactTransition,  
  ]);  
  
  return {  
    chatPhase,  
    setChatPhase,  
  };  
}  