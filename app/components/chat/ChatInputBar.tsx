// app/components/chat/ChatInputBar.tsx
import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Paperclip, Settings2, Brain, X, FileImage } from 'lucide-react';
import type { AIModelConfig } from '~/lib/ai-models';
import { ModelSelector } from './ModelSelector';
import { Switch } from '~/components/ui/switch';
import { Label } from '~/components/ui/label';
import { usePerChatThinkingToggle } from '~/hooks/usePerChatThinkingToggle';
import { handleImageUpload } from '~/lib/image-upload.client'; // Import the upload handler
import { Badge } from '~/components/ui/badge'; // For displaying file name
import { toast } from "sonner"; // For showing errors

const isProbablyMobile = () => typeof window !== 'undefined' && window.innerWidth < 768;

interface ChatInputBarProps {
  input: string;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (options: { thinkingEnabled?: boolean; imageObjectKey?: string }) => void; // Modified onSubmit
  isLoading: boolean;
  availableModels: AIModelConfig[];
  selectedModel: AIModelConfig;
  onModelChange: (model: AIModelConfig) => void;
  chatKey: string;
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
  chatKey,
}: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for image upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ key: string; name: string; url: string; } | null>(null);

  const defaultThinkingToggleState = selectedModel?.uiOptions?.thinkingToggleSettings?.defaultToggleState ?? false;
  const { thinkingEnabled, handleThinkingToggleChange } = usePerChatThinkingToggle(
    chatKey,
    defaultThinkingToggleState
  );

  // Reset uploaded file when the chat changes
  useEffect(() => {
    setUploadedFile(null);
  }, [chatKey]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(scrollHeight, MAX_TEXTAREA_HEIGHT_PX);
      textarea.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleFileAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { objectKey, readUrl } = await handleImageUpload(file);
      setUploadedFile({ key: objectKey, name: file.name, url: readUrl });
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error((error as Error).message || "Failed to upload image.");
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
      // Reset file input value to allow re-uploading the same file
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    // Here you might want to call an API to delete the file from the storage if needed
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mobile = isProbablyMobile();
    if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) return;
    if (mobile && e.key === 'Enter') return;
    if (e.key === 'Enter' && !mobile) {
      e.preventDefault();
      if (!isLoading && ((input || '').trim() || uploadedFile)) {
        const form = e.currentTarget.form;
        if (form) form.requestSubmit();
      }
    }
  };

  const isSendDisabled = isLoading || isUploading || !((input || '').trim() || uploadedFile);

  return (
    <div className="w-full flex-shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSendDisabled) {
            onSubmit({
              thinkingEnabled: selectedModel?.uiOptions?.thinkingToggleSettings ? thinkingEnabled : undefined,
              imageObjectKey: uploadedFile?.key,
            });
            // Clear input and reset file after submission
            onInputChange({ target: { value: '' } } as any);
            setUploadedFile(null);
          }
        }}
        className="relative mx-auto flex w-full flex-col rounded-xl bg-card p-2.5 shadow-xl ring-1 ring-border sm:p-3"
      >
        {uploadedFile && (
          <div className="px-3 pt-1">
            <Badge variant="secondary" className="flex items-center gap-2">
              <FileImage size={14} />
              <span className="truncate max-w-xs">{uploadedFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="ml-1 p-0.5 rounded-full hover:bg-muted-foreground/20"
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </Badge>
          </div>
        )}
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
          disabled={isLoading || isUploading}
          aria-label="Chat message input"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ModelSelector
              models={availableModels.filter(m => m.is_active_model)}
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              disabled={isLoading || isUploading || !availableModels || availableModels.filter(m => m.is_active_model).length === 0}
            />
            {selectedModel?.uiOptions?.thinkingToggleSettings?.showToggle && (
              <div className="flex items-center space-x-2 ml-2">
                <Switch
                  id="thinking-toggle"
                  checked={thinkingEnabled}
                  onCheckedChange={handleThinkingToggleChange}
                  disabled={isLoading || isUploading}
                />
                <Label htmlFor="thinking-toggle" className="flex items-center text-sm text-primary cursor-pointer select-none">
                  AI Thinking
                </Label>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            {selectedModel?.uiOptions?.supportsImageInput && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  disabled={isUploading || !!uploadedFile}
                />
                <button
                  type="button"
                  onClick={handleFileAttachClick}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted sm:p-2 rounded-md disabled:opacity-50"
                  disabled={isUploading || !!uploadedFile}
                  title={isUploading ? "Uploading..." : "Attach image"}
                >
                  <Paperclip size={18} strokeWidth={2} />
                </button>
              </>
            )}
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