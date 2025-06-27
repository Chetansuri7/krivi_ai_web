import { useState, useEffect, useCallback } from "react";
import type { AIModelConfig } from '~/lib/ai-models';

// Module-level in-memory store
const chatModelSelectionsStore: { [key: string]: AIModelConfig } = {};

export function usePerChatModelSelection(chatKey: string, defaultModel: AIModelConfig) {
  const getModelForChat = useCallback((): AIModelConfig => {
    return chatModelSelectionsStore[chatKey] ?? defaultModel;
  }, [chatKey, defaultModel]);

  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(getModelForChat);

  // Effect to update the selected model if the chatKey changes
  useEffect(() => {
    setSelectedModel(getModelForChat());
  }, [chatKey, getModelForChat]); // Re-run if chatKey or defaultModel (via getModelForChat) changes

  const handleModelChange = useCallback((model: AIModelConfig) => {
    chatModelSelectionsStore[chatKey] = model; // Update the in-memory store
    setSelectedModel(model); // Update local state for the current component instance
  }, [chatKey]);

  return { selectedModel, handleModelChange };
}

// Function to allow pre-setting a model for a specific chat key
export function primeChatModelSelection(chatKey: string, model: AIModelConfig) {
  if (chatKey && model) {
    chatModelSelectionsStore[chatKey] = model;
  }
}