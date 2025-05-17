// MessageItem.tsx  
import React, { useState } from "react";  
import { Markdown } from "../Markdown";  
import { Check, Copy } from "lucide-react"; // Import Copy Icon  
  
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
  const messageRef = React.useRef<HTMLDivElement>(null);  
    const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (messageRef.current) {
      const textToCopy = message.content || "";
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
    }
  }; 
  
  return (  
  <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>  
    <div  
      className={`max-w-[100%] flex flex-col ${isUser ? "items-end" : "items-start"}`}  
    >  
      {/* Message Content */}  
      <div  
        ref={messageRef}  
        className={`shadow rounded-lg p-3 ${  
          isUser  
            ? "bg-primary text-primary-foreground"  
            : "prose prose-sm text-foreground"  
        }`}  
        style={{  
          maxWidth: "100%",  
          overflowWrap: "break-word",  
          overflowX: "auto",  
        }}  
      >  
        {(message.content || !message.isLoading) && <Markdown>{message.content}</Markdown>}  
      </div>  
      {/* Copy Button */}  
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
    </div>  
  </div>  
);  }