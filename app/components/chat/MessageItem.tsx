// app/components/MessageItem.tsx
import React, { useState, useRef } from "react";
import { Markdown } from "../Markdown";
import { Check, Copy, Loader, MessageCircle } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

interface MessageItemProps {
  message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";
  const contentBubbleRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (contentBubbleRef.current) {
      const textToCopy = message.content || "";
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  function AssistantIconRow() {
    return (
      <div className="flex items-center gap-3 mb-2 select-none">
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 shadow text-indigo-700">
          <MessageCircle className="w-6 h-6" />
        </div>
        <span className="italic text-base mr-2">Krivi AI</span>
        {message.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Assistant is typing...</span>
          </div>
        ) : null}
      </div>
    );
  }

  if (isAssistant && message.isLoading && !message.content) {
    return (
      <div
        id={`message-${message.id}`}
        className="flex justify-start mb-4"
        data-role={message.role}
      >
        <div className="flex flex-col items-start max-w-[100%]">
          <AssistantIconRow />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${message.id}`}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      data-role={message.role}
    >
      <div
        className={`max-w-[100%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        {isAssistant && <AssistantIconRow />}
        <div
          ref={contentBubbleRef}
          className={
            isUser
              ? "shadow rounded-lg px-3 py-2 bg-primary text-primary-foreground"
              : "prose prose-sm text-foreground p-3"
          }
          style={{
            maxWidth: "100%",
            overflowWrap: "break-word",
            overflowX: "auto",
          }}
        >
          {message.content ? <Markdown>{message.content}</Markdown> : (isUser ? <span> </span> : null)}
        </div>
        {message.content && (
          <div className={`flex mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted flex items-center gap-1 text-xs"
              aria-label={copied ? "Copied!" : "Copy message"}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}