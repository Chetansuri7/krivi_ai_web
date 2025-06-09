import { useState, useEffect, useRef } from "react";  
import type { AIModelConfig } from '~/lib/ai-models';  
  
export function usePerChatModelSelection(chatKey: string, defaultModel: AIModelConfig) {  
  const mappingRef = useRef<{ [key: string]: AIModelConfig }>({});  
  const [selectedModel, setSelectedModel] = useState<AIModelConfig>(defaultModel);  
  
  useEffect(() => {  
    setSelectedModel(mappingRef.current[chatKey] ?? defaultModel);  
  }, [chatKey, defaultModel]);  
  
  const handleModelChange = (model: AIModelConfig) => {  
    setSelectedModel(model);  
    mappingRef.current[chatKey] = model;  
  };  
  
  return { selectedModel, handleModelChange };  
}  