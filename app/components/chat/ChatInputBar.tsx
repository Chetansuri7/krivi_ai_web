// app/components/ChatInputBar.tsx
import React, { useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Settings2, ChevronDown as SelectChevronDown } from 'lucide-react'; // Renamed ChevronDown
import type { AIModelConfig } from '~/lib/ai-models';
// Assuming isProbablyMobile exists, if not, you can mock it or remove its usage for this stub
const isProbablyMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;


interface ChatInputBarProps {
input: string;
onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
isLoading: boolean;
availableModels: AIModelConfig[];
selectedModel: AIModelConfig;
onModelChange: (model: AIModelConfig) => void;
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
}: ChatInputBarProps) {
const textareaRef = useRef<HTMLTextAreaElement>(null);

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

const handleModelSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const modelIdentifier = e.target.value;
    const provider = e.target.options[e.target.selectedIndex].dataset.provider;
    const newSelectedModel = availableModels.find(
    (m) => m.model === modelIdentifier && m.provider === provider
    );
    if (newSelectedModel) onModelChange(newSelectedModel);
};

const isSendDisabled = isLoading || !(input || '').trim();

return (
    <div className="w-full flex-shrink-0">
    <form
        onSubmit={onSubmit}
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
            <div className="relative">
            <select
                value={selectedModel?.model || ''}
                onChange={handleModelSelectChange}
                disabled={isLoading || !availableModels || availableModels.length === 0}
                className="appearance-none rounded-lg border border-input bg-background py-1.5 pl-3 pr-7 text-xs font-medium shadow-sm hover:border-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
                aria-label="Select AI Model"
            >
                {(!availableModels || availableModels.length === 0) && (<option value="">Loading...</option>)}
                {availableModels.map((m) => (
                <option key={`${m.provider}-${m.model}`} value={m.model} data-provider={m.provider}>
                    {m.displayName}
                </option>
                ))}
            </select>
            <SelectChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
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