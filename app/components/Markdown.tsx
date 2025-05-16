import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components, ExtraProps } from "react-markdown";
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

// Component Start
interface MarkdownProps {
  children: string;
  className?: string;
}

// Define the props for the custom code component,
// matching react-markdown's expected CodeProps structure.
type CustomCodeRendererProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>, // Includes className, style, etc.
  HTMLElement
> &
  ExtraProps & { // Includes node?: Element (HAST)
    inline?: boolean; // Specific to code components
    // children will be provided by React.FC or as part of props
  };

const CustomCodeRenderer: React.FC<CustomCodeRendererProps> = ({
  node,
  inline,
  className, // This is the className for syntax highlighting (e.g., "language-js")
  children,
  ...props // Other HTML attributes for the <code> element
}) => {
  const match = /language-(\w+)/.exec(className || "");
  let language = match ? match[1] : undefined;
  if (language === "null" || language === "text" || language === "plaintext") language = undefined;

  const isHeuristicInline =
    node?.position?.start?.line === node?.position?.end?.line && !language;

  const contentString = React.Children.toArray(children)
    .map(child => (typeof child === 'string' || typeof child === 'number') ? child.toString() : '')
    .join('');
  const isContentSingleLine = !contentString.includes("\n");

  if (inline === true || (inline !== false && (isHeuristicInline || isContentSingleLine))) {
    return (
      <code
        // For inline code, we might want to merge the incoming className (if any from markdown like ```text my-class)
        // with our styling classes. However, react-markdown usually puts language in className.
        // For simple inline, the syntax highlighting className might not be relevant.
        className={`bg-muted/50 text-foreground px-1.5 py-0.5 rounded font-mono text-sm ${className || ""}`}
        {...props}
      >
        {children}
      </code>
    );
  }

  const rawCodeContent =
    node && node.children
      ? extractText(node.children as ProjectHastElementContent[])
      : contentString;
  const cleanedCodeForCopy = rawCodeContent.trim();

  const [copied, setCopied] = useState(false);

  return (
    <div className="relative rounded-lg overflow-hidden shadow-sm my-4 border border-border bg-card/50 dark:bg-zinc-900/50">
      <div className="bg-muted/70 dark:bg-zinc-800/70 text-muted-foreground py-1.5 px-4 font-mono text-xs flex items-center justify-between border-b border-border">
        {language ? (
          <span className="uppercase tracking-wider">{language}</span>
        ) : (
          <span>code</span>
        )}
        <button
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded px-2 py-0.5 text-xs transition-colors flex items-center gap-1 border border-transparent hover:border-border"
          onClick={() => {
            navigator.clipboard.writeText(cleanedCodeForCopy)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }).catch((err) => {
                console.error("Failed to copy:", err);
                setCopied(false)
              });
          }}
          type="button"
          aria-label="Copy code to clipboard"
        >
          {copied ? <FiCheck size={14} className="text-green-500" /> : <FiCopy size={14} />}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-foreground overflow-x-auto" style={{ margin: 0, backgroundColor: "transparent" }}>
        {/* The `className` (e.g., "language-js") is passed to the inner <code> for rehype-highlight to work */}
        {/* `props` contains any other HTML attributes for the <code> element */}
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    </div>
  );
};

// Props for custom list item component
type ListItemComponentProps = React.LiHTMLAttributes<HTMLLIElement> & ExtraProps & {
  checked?: boolean | null;
  ordered?: boolean;
};

const CustomListItemRenderer: React.FC<ListItemComponentProps> = ({
  children,
  checked,
  ordered,
  ...props
}) => {
  if (typeof checked === "boolean") {
    return (
      <li
        className="flex items-start gap-2 my-1.5 ml-0"
        style={{ listStyle: "none" }}
        {...props}
      >
        <span className="pt-0.5">
          {checked ? (
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" x="2" y="2" rx="4" fill="currentColor" fillOpacity="0.12"/><path d="M8 12.5l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" x="2" y="2" rx="4" fill="currentColor" fillOpacity="0.06"/></svg>
          )}
        </span>
        <span className={checked ? "line-through text-muted-foreground" : ""}>
          {children}
        </span>
      </li>
    );
  }
  return (
    <li
      className={`ml-6 mb-1.5 ${ordered ? "list-decimal" : "list-disc"}`}
      {...props}
    >
      {children}
    </li>
  );
};


const markdownComponents: Components = {
  p: (props) => (
    <p className="my-3 leading-relaxed text-base" {...props} />
  ),
  code: CustomCodeRenderer, // Assign the explicitly typed component
  li: CustomListItemRenderer, // Assign the explicitly typed component for consistency
  h1: (props) => (
    <h1 className="text-3xl font-bold my-4 pb-2 border-b border-border" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-2xl font-semibold my-3 pb-1 border-b border-border" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-xl font-semibold my-2" {...props} />
  ),
  h4: (props) => (
    <h4 className="text-lg font-semibold my-1.5" {...props} />
  ),
  h5: (props) => (
    <h5 className="text-base font-semibold my-1" {...props} />
  ),
  h6: (props) => (
    <h6 className="text-sm font-semibold my-1 text-muted-foreground" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="my-3 pl-4 border-l-4 border-primary/50 italic text-muted-foreground bg-muted/20 py-2" {...props} />
  ),
  table: (props) => (
    <div className="my-4 overflow-x-auto border border-border rounded-md">
      <table className="min-w-full divide-y divide-border" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-muted/50 dark:bg-zinc-800/50" {...props} />,
  tbody: (props) => <tbody className="divide-y divide-border bg-card" {...props} />,
  tr: (props) => <tr className="hover:bg-muted/30 dark:hover:bg-zinc-700/30 transition-colors" {...props} />,
  th: (props) => <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider" {...props} />,
  td: (props) => <td className="px-4 py-2.5 text-sm text-foreground" {...props} />,
  a: (props) => <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
  ul: (props) => <ul className="my-3 ml-6 list-disc space-y-1" {...props} />,
  ol: (props) => <ol className="my-3 ml-6 list-decimal space-y-1" {...props} />,
  hr: (props) => <hr className="my-4 border-border" {...props} />,
};

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
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