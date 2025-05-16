// app/components/MessageList.tsx
import type { RefObject } from 'react';
import type { Message } from './MessageItem'; // Assuming MessageItem exports Message type
import { MessageItem } from './MessageItem';

interface MessageListProps {
messages: Message[];
isLoading: boolean; // For assistant typing indicator
isInitialHistoryLoading?: boolean;
scrollEndRef: RefObject<HTMLDivElement>;
}

export function MessageList({
messages,
isLoading,
isInitialHistoryLoading = false,
scrollEndRef,
}: MessageListProps) {
return (
    <div className="p-4 space-y-4"> {/* Ensure this padding is desired, or remove if MessageItem handles it */}
    {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
    ))}
    {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
        <div className="flex justify-start mb-4"> {/* Assistant typing indicator */}
        <div className="max-w-[70%] p-3 rounded-lg shadow bg-muted">
            <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
            </div>
        </div>
        </div>
    )}
    <div ref={scrollEndRef} style={{ height: '1px' }} />
    </div>
);
}