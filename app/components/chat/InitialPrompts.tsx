interface InitialPromptsProps {
  onPromptSelect: (prompt: string) => void;
}

const suggestions = [
  "What are the advantages of using Next.js?",
  "Write code to demonstrate Dijkstra's algorithm",
  "Help me write an essay about Silicon Valley",
  "What is the weather in San Francisco?",
];

export function InitialPrompts({ onPromptSelect }: InitialPromptsProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <h1 className="text-3xl font-semibold mb-2">Hello there!</h1>
      <p className="text-muted-foreground mb-8">How can I help you today?</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-xl">
        {suggestions.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptSelect(prompt)}
            className="p-4 border rounded-lg hover:bg-muted text-left text-sm" // Basic styling
          >
            <p className="font-medium">{prompt.split(' ').slice(0, 5).join(' ')}{prompt.split(' ').length > 5 ? '...' : ''}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {prompt.startsWith("Write code") ? "Code generation" : 
               prompt.startsWith("Help me write") ? "Writing assistance" : 
               "General query"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}