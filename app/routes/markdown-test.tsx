// app/routes/markdown-test.tsx  
import * as React from "react";  
import { FiCopy, FiCheck } from "react-icons/fi";  
import ReactMarkdown from "react-markdown";  
import remarkGfm from "remark-gfm";  
import rehypeHighlight from "rehype-highlight";  
import "highlight.js/styles/atom-one-dark.css";  
import { Card, CardContent, CardHeader } from "~/components/ui/card";
  
// --- Markdown Component with Custom Code Renderer ---  
  
type MarkdownProps = {  
  children: string;  
  className?: string;  
};  
  
const CustomCodeRenderer: React.FC<any> = ({  
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
  
  const [copied, setCopied] = React.useState(false);  
  
  // --- LOGGING ---  
  React.useEffect(() => {  
    // Log which renderer mode is being hit for this code  
    if (inline) {  
      // Only <code> for inline code, no <figure>  
      console.log("[CodeRenderer] INLINE:", contentString);  
    } else {  
      console.log("[CodeRenderer] BLOCK:", contentString);  
    }  
  }, [inline, contentString]);  
  
  if (inline) {  
    // Inline code element  
    return (  
      <code  
        className="px-1 py-0.5 rounded bg-muted font-mono text-sm"  
        {...props}  
      >  
        {children}  
      </code>  
    );  
  }  
  
  // Code block  
  return (  
    <figure className="relative rounded-lg overflow-hidden shadow-sm my-4 border border-border bg-card/50 dark:bg-zinc-900/50 w-full">  
      <figcaption className="bg-muted/70 dark:bg-zinc-800/70 text-muted-foreground py-1.5 px-4 font-mono text-xs flex items-center justify-between border-b border-border">  
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
      </figcaption>  
      <pre  
        className="p-4 text-sm font-mono text-foreground overflow-x-auto w-full"  
        style={{  
          margin: 0,  
          tabSize: 2,  
        }}  
      >  
        <code className={className || ""} {...props}>  
          {children}  
        </code>  
      </pre>  
    </figure>  
  );  
};  
  
const markdownComponents = {  
  code: CustomCodeRenderer,  
  // ...add rest of your custom renderers here if you want!  
};  
  
export default function MarkdownTestPage() {  
  // Two test cases  
  const GOOD = `\  
* **Variables:** Nginx uses variables (e.g., \`$uri\`, \`$host\`, \`$args\`, \`$request_method\`).  
`;  
  
  // BAD: looks almost the same but triggers block code due to new lines  
  const BAD = `\  
* **Variables:** Nginx uses variables (e.g.,  
\`\`\`  
\$uri  
\`\`\`  
,  
\`\`\`  
\$host  
\`\`\`  
)  
`;  
  
  const [input, setInput] = React.useState(GOOD);  
  
  return (  
    <div className="container mx-auto py-10">  
      <Card>  
        <CardHeader>  
          <h1 className="text-2xl font-bold mb-2">Markdown Inline/Block Code Test</h1>  
          <p className="text-muted-foreground">  
            Try different markdown here to test how code blocks and inline code are rendered.  
          </p>  
        </CardHeader>  
        <CardContent>  
          <div className="flex flex-col gap-4">  
            <div>  
              <p className="mb-1 font-medium">Markdown Input</p>  
              <textarea  
                className="w-full min-h-[180px] border border-border rounded p-2 font-mono"  
                value={input}  
                onChange={e => setInput(e.target.value)}  
              />  
              <div className="flex gap-2 mt-2">  
                <button  
                  className="px-3 py-1 bg-secondary rounded border"  
                  onClick={() => setInput(GOOD)}  
                >  
                  Load GOOD (should render inline)  
                </button>  
                <button  
                  className="px-3 py-1 bg-secondary rounded border"  
                  onClick={() => setInput(BAD)}  
                >  
                  Load BAD (renders big block for variables)  
                </button>  
              </div>  
            </div>  
            <div>  
              <p className="mb-1 font-medium">Raw Markdown string</p>  
              <pre className="bg-muted rounded p-2 text-sm border">  
                {JSON.stringify(input)}  
              </pre>  
            </div>  
            <div>  
              <p className="mb-1 font-medium">Rendered Output:</p>  
              <div className="border rounded p-4 bg-background">  
                <ReactMarkdown  
                  components={markdownComponents as any}  
                  remarkPlugins={[remarkGfm]}  
                  rehypePlugins={[rehypeHighlight]}  
                  skipHtml={false}  
                >  
                  {input}  
                </ReactMarkdown>  
              </div>  
            </div>  
          </div>  
        </CardContent>  
      </Card>  
    </div>  
  );  
}  