// app/lib/ai-models.ts
export interface AIModelConfig {
  displayName: string;
  model: string;
  provider: string;
  isDefault?: boolean; // Optional: useful for selecting default
}

// Import models from their respective files
import { azureModels } from './model-list/azure-models';
import { cerebrasModels } from './model-list/cerebras-models';
import { googleModels } from './model-list/google-models';
import { API_BASE_URL } from '~/lib/api.config'; // Import API_BASE_URL

// If you add more providers, import them here

// Combine all models into the main AImodels array
export const AImodels: AIModelConfig[] = [
  ...azureModels,
  ...googleModels,
  ...cerebrasModels,
  // Spread other imported model arrays here
  // Add more models here as needed (if they don't fit a provider category or are one-offs)
];

// Select default based on isDefault flag or fallback
// This logic remains the same and works on the combined AImodels array
export const defaultModelConfig: AIModelConfig = AImodels.find(m => m.isDefault) || AImodels[0];

// These constants remain as they are global to the AI service
export const defaultSystemPrompt = "You are a helpful assistant.";

// Use API_BASE_URL to construct these URLs
export const API_STREAM_URL = API_BASE_URL ? `${API_BASE_URL}/api/chat/stream` : "/api/chat/stream";
export const API_HISTORY_URL_BASE = API_BASE_URL ? `${API_BASE_URL}/api/chat` : "/api/chat"; // Note: path adjusted, specific endpoint like /:chatId/history will be appended by calling code