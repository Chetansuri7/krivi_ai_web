// app/components/MessageItem.tsx
import React, { useState, useRef, Fragment } from "react";
import { Markdown } from "../Markdown";
import { Check, Copy, Loader, MessageCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system"; // Added "system"
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

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const parseMessageContent = (content: string) => {
    const parts = [];
    let lastIndex = 0;
    const regex = /<think>([\s\S]*?)<\/think>|<think>([\s\S]*?)<\/think>/gs;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: content.substring(lastIndex, match.index) });
      }
      // Group 1 is for <think>, Group 2 is for <think>
      const thinkContent = match[1] || match[2];
      parts.push({ type: "think", content: thinkContent.trim() });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ type: "text", content: content.substring(lastIndex) });
    }
    return parts;
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
          {message.content ? (
            parseMessageContent(message.content).map((part, index) => {
              if (part.type === "think") {
                return (
                  <ThinkBlock key={index} content={part.content} />
                );
              }
              return (
                <Markdown key={index}>{part.content}</Markdown>
              );
            })
          ) : (isUser ? <span> </span> : null)}
        </div>
        {message.content && !message.isLoading && (
          <div className={`flex mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
            <button
              onClick={() => handleCopy(message.content)}
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

interface ThinkBlockProps {
  content: string;
}

function ThinkBlock({ content }: ThinkBlockProps) {
  const [isOpen, setIsOpen] = useState(true); // Default to expanded

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="my-2">
      {/* Trigger button with its own background (white/dark gray) and shadow, always rounded */}
      <CollapsibleTrigger
        className={`flex items-center gap-2 p-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none w-fit shadow rounded-md`}
      >
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>Thinking...</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
      </CollapsibleTrigger>
      
      {/* Content area with its own background (white/dark gray), border, and shadow, appearing below the trigger */}
      <CollapsibleContent className="mt-1 pt-2 pb-3 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm">
        <div className="pl-3 border-l-2 border-purple-400 dark:border-purple-600 max-h-[300px] overflow-y-auto">
          <div className="prose prose-sm max-w-full text-slate-600 dark:text-slate-400 [&_p]:text-sm">
            <Markdown>{content}</Markdown>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}