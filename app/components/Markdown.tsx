import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { FiCopy, FiCheck } from "react-icons/fi";
import "highlight.js/styles/atom-one-dark.css";
import type {
  Element as ProjectHastElement,
  ElementContent as ProjectHastElementContent,
} from "hast";

// Utility to robustly extract text content (for copy)  
const extractText = (nodes?: ProjectHastElementContent[]): string =>
  !nodes
    ? ""
    : nodes
      .map((node) => {
        if (node.type === "text") {
          return node.value || "";
        }
        if (node.type === "element" && node.children) {
          return extractText(node.children as ProjectHastElementContent[]);
        }
        return "";
      })
      .join("");

// Props for the Markdown component  
interface MarkdownProps {
  children: string;
  className?: string;
}

// Define the props for the custom code component  
type CustomCodeRendererProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean;
  node?: ProjectHastElement;
};

const CustomCodeRenderer: React.FC<CustomCodeRendererProps> = ({
  node,
  inline,
  className,
  children,
  ...props
}) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "plaintext";

  const contentString = React.Children.toArray(children)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? child.toString()
        : ""
    )
    .join("");

  const [copied, setCopied] = useState(false);

  // For inline code, use a simpler renderer  
  if (inline) {
    return (
      <code
        className="px-1 py-0.5 rounded bg-muted font-mono text-sm"
        {...props}
      >
        {children}
      </code>
    );
  }

  // Full code block rendering  
  return (
    <div className="relative rounded-lg overflow-hidden shadow-sm my-4 border border-border bg-card/50 dark:bg-zinc-900/50 w-full">
      {/* Code Header */}
      <div className="bg-muted/70 dark:bg-zinc-800/70 text-muted-foreground py-1.5 px-4 font-mono text-xs flex items-center justify-between border-b border-border">
        <span className="uppercase tracking-wider">{language}</span>
        <button
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded px-2 py-0.5 text-xs flex items-center gap-1 border border-transparent hover:border-border"
          onClick={() => {
            navigator.clipboard
              .writeText(contentString.trim())
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              })
              .catch((err) => console.error("Failed to copy:", err));
          }}
          type="button"
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <FiCheck size={14} className="text-green-500" />
          ) : (
            <FiCopy size={14} />
          )}
        </button>
      </div>
      {/* Code Content */}
      <div className="overflow-x-auto w-full">
        <pre
          className="p-4 text-sm font-mono text-foreground"
          style={{
            margin: 0,
            tabSize: 2,
          }}
        >
          <code className={`${className || ""}`} {...props}>
            {children}
          </code>
        </pre>
      </div>
    </div>
  );
};

// Custom markdown components overriding ReactMarkdown defaults  
const markdownComponents: Components = {
  p: (props) => (
    <p
      className="my-3 leading-relaxed text-base w-full break-words"
      {...props}
    />
  ),
  code: CustomCodeRenderer,


  pre: (props) => (
    <pre className="w-full" {...props} />
  ),

  table: (props) => (
    <div className="my-4 overflow-x-auto border border-border rounded-md w-full">
      <table className="min-w-full divide-y divide-border" {...props} />
    </div>
  ),
  tr: (props) => (
    <tr
      className="hover:bg-muted/30 dark:hover:bg-zinc-700/30 transition-colors"
      {...props}
    />
  ),
  th: (props) => (
    <th
      className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="px-4 py-2.5 text-sm text-foreground break-words"
      {...props}
    />
  ),
  img: (props) => (
    <img
      className="max-w-full h-auto rounded-md my-4"
      {...props}
      alt={props.alt || "Image"}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="border-l-4 border-muted pl-4 italic my-4 text-muted-foreground"
      {...props}
    />
  ),
  ul: (props) => (
    <ul className="list-disc pl-6 my-4 space-y-2" {...props} />
  ),
  ol: (props) => (
    <ol className="list-decimal pl-6 my-4 space-y-2" {...props} />
  ),
  li: (props) => <li className="mb-1" {...props} />,
  h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
  h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
  h3: (props) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
  h4: (props) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
  a: (props) => (
    <a
      className="text-primary underline hover:text-primary/80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
};

// Main Markdown Component  
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={`w-full ${className || ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
        skipHtml={false}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}  