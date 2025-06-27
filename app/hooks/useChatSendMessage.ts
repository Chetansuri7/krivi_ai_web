import { useCallback } from 'react';  
import { v4 as uuidv4 } from 'uuid';
import { Message } from '~/components/chat/MessageItem';
import type { AIModelConfig } from '~/lib/ai-models';
import { primeChatModelSelection } from '~/hooks/usePerChatModelSelection'; // Added import
  
export function useChatSendMessage({
  streamChat,  
  urlChatId,  
  lastSelectedModelMapRef,  
  isReactTransitionPending,  
  chatPhase,  
  navigate,  
  startReactTransition,  
  setInput,  
  setIsNewChatTransitioning,  
  chatModelKey  
}: {  
  streamChat: any,  
  urlChatId: string | null,  
  lastSelectedModelMapRef: React.MutableRefObject<{[key: string]: AIModelConfig}>,  
  isReactTransitionPending: boolean,  
  chatPhase: string,  
  navigate: any,  
  startReactTransition: any,  
  setInput: (v: string) => void,  
  setIsNewChatTransitioning: (v: boolean) => void,  
  chatModelKey: string  
}) {  
  return useCallback(
    async (inputTextValue: string, modelConfig: AIModelConfig, options?: { thinkingEnabled?: boolean }) => {
      const trimmedInput = inputTextValue.trim();
      if (!trimmedInput || streamChat.isStreaming || isReactTransitionPending || chatPhase !== 'READY') {
        return;
      }
      setInput('');
      lastSelectedModelMapRef.current[chatModelKey] = modelConfig;
  
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmedInput,
      };
      
      const thinkingEnabled = options?.thinkingEnabled;
  
      if (!urlChatId) {
        const newChatId = uuidv4();
        // Prime the model selection for the new chat ID
        primeChatModelSelection(newChatId, modelConfig);
        try {
          setIsNewChatTransitioning(true);
          streamChat.setMessagesForContext([userMessage], newChatId);
          const streamPromise = streamChat.startStream(trimmedInput, modelConfig, newChatId, thinkingEnabled);
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
          await streamChat.startStream(trimmedInput, modelConfig, urlChatId, thinkingEnabled);
        } catch (error) {
          console.error('Error in existing chat flow:', error);
        }
      }
    },
    [  
      streamChat,  
      urlChatId,  
      isReactTransitionPending,  
      chatPhase,  
      navigate,  
      startReactTransition,  
      chatModelKey  
    ]  
  );  
}  