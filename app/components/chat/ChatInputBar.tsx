// app/components/chat/ChatInputBar.tsx
import React, { useRef, useEffect } from 'react'; // Removed useState
import { ArrowUp, Paperclip, Settings2, Brain } from 'lucide-react'; // Added Brain
import type { AIModelConfig } from '~/lib/ai-models';
import { ModelSelector } from './ModelSelector'; // Import ModelSelector
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { usePerChatThinkingToggle } from '~/hooks/usePerChatThinkingToggle'; // Import the new hook

const isProbablyMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

interface ChatInputBarProps {
  input: string;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (options: { thinkingEnabled?: boolean }) => void; // Modified onSubmit
  isLoading: boolean;
  availableModels: AIModelConfig[];
  selectedModel: AIModelConfig;
  onModelChange: (model: AIModelConfig) => void;
  chatKey: string; // Added chatKey prop
}

const MIN_TEXTAREA_HEIGHT_REM = 1.625;
const TEXTAREA_PADDING_Y_PX = 20; 
const MAX_TEXTAREA_HEIGHT_PX = 144; 

export function ChatInputBar({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  availableModels,
  selectedModel,
  onModelChange,
  chatKey, // Destructure chatKey
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const defaultThinkingToggleState = selectedModel?.uiOptions?.thinkingToggleSettings?.defaultToggleState ?? false;
  const { thinkingEnabled, handleThinkingToggleChange } = usePerChatThinkingToggle(
    chatKey,
    defaultThinkingToggleState
  );

  // Effect to potentially reset thinkingEnabled if the model changes and has a *different* default state
  // and the toggle is shown. This ensures the hook's internal state aligns if the default changes.
  useEffect(() => {
    const newDefaultState = selectedModel?.uiOptions?.thinkingToggleSettings?.defaultToggleState ?? false;
    // This effect primarily ensures that if the default state for a *newly selected model*
    // differs, the hook gets a chance to re-evaluate its initial state based on that new default.
    // The hook itself handles persistence, this is more about reacting to model changes.
    // If the toggle is not shown, thinkingEnabled is effectively managed by the hook based on its last known state or default.
    if (selectedModel?.uiOptions?.thinkingToggleSettings?.showToggle) {
        // If the current thinkingEnabled state in the hook doesn't match the new default for the selected model,
        // and the chatKey hasn't changed (meaning we are on the same chat but model changed),
        // then we might want to update it. However, usePerChatThinkingToggle's own useEffect
        // already listens to defaultToggleState changes. So, this explicit setThinkingEnabled might be redundant
        // if the hook correctly re-initializes or updates based on defaultToggleState prop change.
        // Let's rely on the hook's internal useEffect for defaultToggleState changes.
    }
  }, [selectedModel, chatKey, handleThinkingToggleChange]);


  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; 
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mobile = isProbablyMobile();
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) return; 
    if (mobile && e.key === 'Enter') return; 
    if (e.key === 'Enter' && !mobile) {
      e.preventDefault();
      if (!isLoading && (input || '').trim()) {
        const form = e.currentTarget.form;
        if (form) form.requestSubmit();
      }
    }
  };

  const isSendDisabled = isLoading || !(input || '').trim();

  return (
    <div className="w-full flex-shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isLoading && (input || '').trim()) {
            onSubmit({ thinkingEnabled: selectedModel?.uiOptions?.thinkingToggleSettings ? thinkingEnabled : undefined });
          }
        }}
        className="relative mx-auto flex w-full flex-col rounded-xl bg-card p-2.5 shadow-xl ring-1 ring-border sm:p-3"
      >
        <textarea
          ref={textareaRef}
          value={input || ''}
          onChange={onInputChange}
          onKeyDown={handleTextareaKeyDown}
          placeholder={selectedModel ? `Ask ${selectedModel.displayName}...` : 'Select a model...'}
          rows={1}
          className="w-full resize-none overflow-y-auto rounded-lg border-none bg-transparent px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
          style={{
            minHeight: `calc(${MIN_TEXTAREA_HEIGHT_REM}rem + ${TEXTAREA_PADDING_Y_PX}px)`,
            maxHeight: `${MAX_TEXTAREA_HEIGHT_PX}px`,
          }}
          disabled={isLoading}
          aria-label="Chat message input"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ModelSelector
              models={availableModels}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              disabled={isLoading || !availableModels || availableModels.length === 0}
            />
            {selectedModel?.uiOptions?.thinkingToggleSettings?.showToggle && (
              <div className="flex items-center space-x-2 ml-2">
                <Switch
                  id="thinking-toggle"
                  checked={thinkingEnabled}
                  onCheckedChange={handleThinkingToggleChange} // Use the handler from the hook
                  disabled={isLoading}
                />
                <Label htmlFor="thinking-toggle" className="flex items-center text-sm text-primary cursor-pointer select-none">
                  <Brain className="w-4 h-4 mr-1" />
                  AI Thinking
                </Label>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted sm:p-2 rounded-md disabled:opacity-50" disabled={true} title="Attach file (soon)">
              <Paperclip size={18} strokeWidth={2} />
            </button>
            <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted sm:p-2 rounded-md disabled:opacity-50" disabled={true} title="Model options (soon)">
              <Settings2 size={18} strokeWidth={2} />
            </button>
            <button type="submit" className="flex items-center justify-center rounded-lg bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={isSendDisabled} title="Send message">
              <ArrowUp size={20} strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}