// app/components/ChatPageLayout.tsx (or wherever your ChatPageLayout is)
import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
// If you want Remix's useTransition, use:
// import { useTransition } from '@remix-run/react';
import { useNavigate, useLocation } from '@remix-run/react';
import type { Message } from './MessageItem'; // Adjust path if necessary
import { MessageList } from './MessageList'; // Adjust path if necessary
import { ChatInputBar } from './ChatInputBar'; // Adjust path if necessary
import { InitialPrompts } from './InitialGreeting'; // Adjust path if necessary
import {
  AImodels,
  defaultModelConfig,
  defaultSystemPrompt,
  API_STREAM_URL,
} from '~/lib/ai-models'; // Adjust path if necessary
import type { AIModelConfig } from '~/lib/ai-models'; // Adjust path if necessary

interface ChatPageLayoutProps {
  initialChatId: string | null;
  initialMessages?: Message[];
}

export function ChatPageLayout({ initialChatId, initialMessages = [] }: ChatPageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // React 18's useTransition
  const [isPending, startTransition] = useTransition();

  const chatLayoutKey = initialChatId || 'new-chat-session';

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(defaultModelConfig);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // Only reset messages if not streaming and initialMessages truly changed for the current chat
    // This avoids resetting messages if initialMessages from loader is stale due to navigation state
    if (!isStreaming && location.state?.fromNewChatFlow !== true) {
      if (JSON.stringify(initialMessages) !== JSON.stringify(messagesRef.current.slice(0, initialMessages.length))) {
        setMessages(initialMessages || []);
      }
    } else if (location.state?.fromNewChatFlow === true) {
      // If navigated from new chat flow, messages are already set via state, clear the flag
      // This assumes navigate state is cleared on subsequent navigations or reloads
      const { state, ...rest } = location;
      // @ts-ignore
      const { fromNewChatFlow, ...newState } = state;
      navigate(rest, { replace: true, state: Object.keys(newState).length > 0 ? newState : undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessages, chatLayoutKey]); // Removed isStreaming to allow initialMessages to update if chat ID changes


  useEffect(() => {
    // Abort any ongoing stream and reset state when chat context changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort("Chat context changed or component unmounting");
      abortControllerRef.current = null;
    }
    setIsStreaming(false); // Ensure streaming is false
    setInput(''); // Clear input

    // Set messages based on initialMessages from loader for the *current* chat ID
    // This effect runs when initialChatId changes, ensuring correct messages are loaded.
    setMessages(initialMessages || []);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort("Component unmounting or initialChatId changing");
        abortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId]); // Depend only on initialChatId for resetting context

  const handleSendMessage = useCallback(async (inputText: string, modelConfig: AIModelConfig) => {
    if (isStreaming || isPending) return;

    setIsStreaming(true);
    setInput('');

    const newUserMessage: Message = { id: crypto.randomUUID(), role: 'user', content: inputText };
    setMessages(prev => [...prev, newUserMessage]);

    const assistantMessageId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;
    let chatIdForRequest = initialChatId;

    let receivedChatIdFromStream: string | null = null;

    try {
      const response = await fetch(API_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({
          chatId: chatIdForRequest,
          message: inputText,
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
            if (jsonDataString) {
              if (currentAbortController.signal.aborted) break;
              try {
                const chunk = JSON.parse(jsonDataString);
                if (chunk.type === "session_info" && chunk.chatId && !initialChatId) {
                  receivedChatIdFromStream = chunk.chatId;
                }
                handleStreamData(chunk, assistantMessageId);
              } catch (e) {
                if (!currentAbortController.signal.aborted)
                  console.error("Error parsing stream data JSON:", e, jsonDataString);
              }
            }
          }
        }
      }

      if (!initialChatId && receivedChatIdFromStream) {
        // Important: messagesRef.current will have the latest messages *including the streamed response*
        // because setMessages in handleStreamData updates it.
        startTransition(() => {
          navigate(`/chat/${receivedChatIdFromStream}`, {
            replace: true,
            state: { initialMessages: messagesRef.current, fromNewChatFlow: true }
          });
        });
        // setIsStreaming(false) will effectively be handled by the component re-keying or unmounting/remounting
        // due to navigation and change in initialChatId.
      } else {
        // If it's an existing chat or no chatId was received (should not happen for new chat success)
        // ensure streaming state is properly turned off if not already done by stream_end.
        // This check for abort is important here.
        if (!currentAbortController.signal.aborted) {
          setIsStreaming(false);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Only update if the message doesn't already indicate abortion
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId && msg.role === 'assistant' && !msg.content.includes("[Stream aborted]")
              ? { ...msg, content: (msg.content || "") + `\n[Stream aborted]` }
              : msg
          ));
      } else {
        console.error(`Send/Stream error:`, error);
        handleStreamError(assistantMessageId, error.message || "Failed to get response.");
      }
    } finally {
      if (abortControllerRef.current === currentAbortController) {
        abortControllerRef.current = null;
      }
      // If the navigation didn't happen (e.g., existing chat) and stream wasn't aborted,
      // ensure streaming is set to false. This is a fallback.
      // However, if navigation happens, the component might unmount/re-key which resets state.
      if (!receivedChatIdFromStream && !currentAbortController.signal.aborted) {
        setIsStreaming(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatId, isStreaming, selectedModel, navigate, isPending, startTransition]);

  const handleStreamData = (chunk: any, assistantMessageId: string) => {
    // Check if the stream was aborted by a new action or component unmount
    if (abortControllerRef.current?.signal.aborted && !isStreaming) {
      // If isStreaming is false, it means the stream was likely ended or aborted intentionally
      // and we should not process further data for this assistant message.
      return;
    }

    if (chunk.content) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId && msg.role === 'assistant'
            ? { ...msg, content: msg.content + chunk.content }
            : msg
        )
      );
    } else if (chunk.type === 'usage_summary' || chunk.type === 'stream_end') {
      // Only set isStreaming to false if the current abort controller is still active
      // or if there's no active abort controller (implying natural end).
      // This prevents race conditions if a new message was sent quickly.
      if (!abortControllerRef.current || !abortControllerRef.current.signal.aborted) {
        setIsStreaming(false);
      }
    } else if (chunk.error) {
      handleStreamError(assistantMessageId, chunk.error.message || chunk.error);
    }
  };

  const handleStreamError = (assistantMessageId: string, errorMessage: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === assistantMessageId && msg.role === 'assistant' && !msg.content.includes("[Error:")
          ? { ...msg, content: (msg.content || "") + `\n[Error: ${errorMessage}]` }
          : msg
      )
    );
    // Ensure streaming is stopped on error, if not already aborted by a new request
    if (!abortControllerRef.current || !abortControllerRef.current.signal.aborted) {
      setIsStreaming(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isStreaming && !isPending) {
      handleSendMessage(input.trim(), selectedModel);
    }
  };

  const handlePromptSelect = (promptText: string) => {
    if (!isStreaming && !isPending) {
      // Set input for immediate display, then send
      setInput(promptText);
      handleSendMessage(promptText, selectedModel);
    }
  };

  const isNavigating = isPending; // useTransition's pending state
  const displayInitialPrompts =
    initialChatId === null &&
    messages.length === 0 &&
    !isStreaming &&
    !input &&
    !isNavigating;

  // Use initialChatId for keying child components that depend on chat context
  const childKey = initialChatId || "new-chat-internal";

  return (
    // Root div: takes full height and width from parent (AppLayout's main area)
    // flex flex-col ensures children (message area and input bar) are stacked vertically
    <div className="flex flex-col h-full w-full">

      {/* Message List Area:
          - flex-grow: takes up all available vertical space after input bar is accounted for.
          - overflow-y-auto: enables vertical scrolling ONLY for this area.
          - The scrollbar will appear on the right edge of THIS div.
      */}
      <div className="flex-grow overflow-y-auto">
        {displayInitialPrompts ? (
          // Container for InitialPrompts, centered within the scrollable area
          // max-w-4xl mx-auto ensures content is centered horizontally
          // h-full allows vertical centering content using flex
          // p-4 for padding
          <div className="max-w-4xl mx-auto w-full h-full flex flex-col justify-center items-center p-4">
            <InitialPrompts onPromptSelect={handlePromptSelect} />
          </div>
        ) : (
          // Container for MessageList
          // max-w-4xl mx-auto ensures messages are centered horizontally
          // w-full ensures it uses the available width up to max-w-4xl
          // p-4 provides padding around the message list. Consider pb-0 if MessageList handles last item spacing.
          <div className="max-w-4xl mx-auto w-full p-4">
            <MessageList
              key={`ml-${childKey}`} // Keyed to re-render if chat changes
              messages={messages}
              isLoading={isStreaming && !isNavigating} // Show loading indicator if streaming and not navigating away
            />
          </div>
        )}
      </div>

      {/* Chat Input Bar Area:
          - flex-shrink-0: prevents this area from shrinking.
          - bg-background, border-t, border-border: styling.
      */}
      <div className="flex-shrink-0 bg-background border-t border-border">
        {/* Content wrapper for ChatInputBar:
            - max-w-4xl mx-auto: centers the input bar content.
            - w-full: ensures it takes full width up to max-w-4xl.
            - p-2 md:p-3: original padding.
        */}
        <div className="max-w-4xl mx-auto w-full p-2 md:p-3">
          <ChatInputBar
            key={`cib-${childKey}`} // Keyed to re-render if chat changes
            input={input}
            onInputChange={e => setInput(e.target.value)}
            onSubmit={handleFormSubmit}
            isLoading={isStreaming || isNavigating} // Input disabled if streaming or navigating
            availableModels={AImodels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>
    </div>
  );
}