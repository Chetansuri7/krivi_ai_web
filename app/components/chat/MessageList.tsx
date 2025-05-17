// app/components/MessageList.tsx
import type { RefObject } from 'react';
import type { Message } from './MessageItem'; // Assuming MessageItem exports Message type
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean; // This prop is now only for isInitialHistoryLoading visual cues if any, or can be removed if not used elsewhere
  isInitialHistoryLoading?: boolean;
  scrollEndRef: RefObject<HTMLDivElement>;
}

export function MessageList({
  messages,
  // isLoading, // This prop is no longer used for the assistant typing indicator here
  isInitialHistoryLoading = false, // Keep if used for other purposes
  scrollEndRef,
}: MessageListProps) {
  return (
    <div className="p-4 space-y-4"> {/* Ensure this padding is desired, or remove if MessageItem handles it */}
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}
      
      <div ref={scrollEndRef} style={{ height: '1px' }} />
    </div>
  );
}