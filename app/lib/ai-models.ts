// app/lib/ai-models.ts
export interface AIModelConfig {
  displayName: string;
  model: string;
  provider: string;
  isDefault?: boolean; // Optional: useful for selecting default
}

export const AImodels: AIModelConfig[] = [
  {
    displayName: "GPT-4o Mini",
    model: "gpt-4o-mini",
    provider: "azure",
    isDefault: true, // Marking this as default as per your previous defaultModelConfig

  },
  {
    displayName: "Gemini 2.5 flash", // Updated display name to match model version (optional, adjust as needed)
    model: "gemini-2.5-flash-preview-04-17", // From your example payload
    provider: "google",
  },
  {
    displayName: "Gemini 2.0 flash", // Updated display name to match model version (optional, adjust as needed)
    model: "gemini-2.0-flash", // From your example payload
    provider: "google",
  },
  {
    displayName: "llama3.1-8b", // Updated display name to match model version (optional, adjust as needed)
    model: "llama3.1-8b", // From your example payload
    provider: "cerebras",
  },
  {
    displayName: "qwen-3-32b", // Updated display name to match model version (optional, adjust as needed)
    model: "qwen-3-32b", // From your example payload
    provider: "cerebras",
  }
  // Add more models here as needed
];

// Select default based on isDefault flag or fallback
export const defaultModelConfig: AIModelConfig = AImodels.find(m => m.isDefault) || AImodels[0];

export const defaultSystemPrompt = "You are a helpful assistant.";
export const API_STREAM_URL = "https://api-chat.kwikon.club/api/chat/stream";
export const API_HISTORY_URL_BASE = "https://api-chat.kwikon.club/api/chat/"; // e.g., append {chatId}/history