import React from 'react';  
import { Markdown } from '../Markdown';  
  
export interface Message {  
  id: string;  
  role: 'user' | 'assistant';  
  content: string;  
}  
  
interface MessageItemProps {  
  message: Message;  
}  
  
export function MessageItem({ message }: MessageItemProps) {  
  const isUser = message.role === 'user';  
  return (  
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>  
      <div  
        className={`  
          max-w-[100%] md:max-w-[100%]  
          px-3 rounded-lg shadow break-words  
          prose prose-sm md:prose-base dark:prose-invert  
          ${isUser  
            ? 'bg-primary text-primary-foreground'  
            : 'bg-muted text-foreground'  
          }  
          ${isUser ? 'prose-primary-invert' : ''}  
        `}  
      >  
        {/* Use the Markdown component to render content */}  
        <Markdown>{message.content}</Markdown>  
      </div>  
    </div>  
  );  
}  