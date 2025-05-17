// app/components/chat/MessageItem.tsx
import React from 'react';
import { Markdown } from '../Markdown';
import { Copy, Loader2 } from 'lucide-react'; // Import Loader2
import { SiBoat } from 'react-icons/si';

// Message interface (ensure isLoading is here from previous step)
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  timestamp?: number; // Keep if you added this previously
}

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const messageRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    if (messageRef.current) {
      const textToCopy = messageRef.current.innerText;
      navigator.clipboard.writeText(textToCopy);
      // Add toast notification here if needed
    }
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[100%] md:max-w-[100%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Header - only for assistant */}
        {!isUser && (
          <div className="flex items-center mb-1 px-3">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center mr-2">
              <SiBoat color="#7c3aed" className="text-2xl" />
            </div>
            <span className="font-semibold text-sm text-violet-600">AI</span>
            {/* START: Updated loading indicator */}
            {message.isLoading && (
              <div className="ml-2 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* END: Updated loading indicator */}
          </div>
        )}

        {/* Message content */}
        <div
          ref={messageRef}
          className={
            isUser
              ? `px-3 py-2 rounded-lg shadow bg-primary text-primary-foreground
                  prose prose-sm md:prose-base dark:prose-invert break-words prose-primary-invert`
              : `px-3 py-2
                  prose prose-sm md:prose-base dark:prose-invert break-words text-foreground`
          }
        >
          {(message.content || !message.isLoading) && <Markdown>{message.content}</Markdown>}
        </div>

        {/* Action buttons row - properly aligned with message width */}
        <div
          className={`flex mt-1 space-x-2 ${isUser ? 'justify-end' : 'justify-start'}`}
          style={{ width: 'fit-content' }}
        >
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
            aria-label="Copy message"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}