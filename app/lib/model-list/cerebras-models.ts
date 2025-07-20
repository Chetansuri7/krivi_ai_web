import type { AIModelConfig } from '../ai-models'; // Import the interface

export const cerebrasModels: AIModelConfig[] = [
  {
    displayName: "llama3.1-8b",
    shortName: "Llama 8b",
    model: "llama3.1-8b",
    provider: "cerebras",
    is_active_model: false,
    requestPayload: {},
  },
  {
    displayName: "qwen-3-32b",
    shortName: "Qwen 32b",
    model: "qwen-3-32b",
    provider: "cerebras",
    is_active_model: false,
    requestPayload: {},
  },
];