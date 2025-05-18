import React, { useState } from "react";
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
  const messageRef = React.useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (messageRef.current) {
      const textToCopy = message.content || "";
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  // The avatar row is always rendered for assistant—icon only if not loading, otherwise icon + spinner + text  
  function AssistantIconRow() {
    return (
      <div className="flex items-center gap-3 mb-2 select-none">
        {/* Avatar */}
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 shadow text-indigo-700">
          <MessageCircle className="w-6 h-6" />
        </div>
        {/* Assistant name */}
<span className="italic text-base mr-2">Krivi AI</span>          {/* Loader and text (only visible when loading) */}
        {message.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader className="w-5 h-5 animate-spin" />
            <span>Assistant is typing...</span>
          </div>
        ) : null}
      </div>
    );
  }

  // "Waiting..." phase, no content yet  
  if (isAssistant && message.isLoading && !message.content) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex flex-col items-start max-w-[100%]">
          <AssistantIconRow />
        </div>
      </div>
    );
  }

  // Assistant with (possibly loading/finished) content, or user message  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[100%] flex flex-col ${isUser ? "items-end" : "items-start"}`}
      >
        {isAssistant && <AssistantIconRow />}

        {/* Message Content Bubble */}
        <div
          ref={messageRef}
          className={`shadow rounded-lg p-3 ${isUser
              ? "bg-primary text-primary-foreground"
              : "prose prose-sm text-foreground"
            }`}
          style={{
            maxWidth: "100%",
            overflowWrap: "break-word",
            overflowX: "auto",
          }}
        >
          {message.content && <Markdown>{message.content}</Markdown>}
        </div>

        {/* Copy Button */}
        {message.content && (
          <div className={`flex mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted flex items-center gap-1"
              aria-label={copied ? "Copied!" : "Copy message"}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-xs">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}  