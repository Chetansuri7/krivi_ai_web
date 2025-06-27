// app/lib/ai-models.ts
export interface AIModelConfig {
  displayName: string;
  /**
   * For smaller screens, if defined, this will be shown instead of displayName.
   * Should be as unique as possible among available models.
   */
  shortName?: string;
  model: string;
  provider: string;
  requestPayload: Record<string, any>; // Added for model-specific payloads
  isDefault?: boolean; // Optional: useful for selecting default
  uiOptions?: { // For model-specific UI elements
    thinkingToggleSettings?: {
      showToggle: boolean;                // UI should show toggle if model.canDisable is true.
      canDisable: boolean;                // Directly from model's backend config.
      defaultToggleState: boolean;        // Initial on/off state if toggle is shown (based on defaultBudget > 0).
      budgetWhenEnabled: number;          // Budget if toggle is ON (usually model's maxBudget).
      budgetWhenDisabled: number;         // Budget if toggle is OFF (usually 0).
      fixedBudgetIfNotToggleable: number | null; // Budget if showToggle is false (e.g., model's defaultBudget); null otherwise.
      minBudget: number;                  // Model's minBudget from backend config.
      maxBudget: number;                  // Model's maxBudget from backend config.
    };
  };
}

// Import models from their respective files
// import { azureModels } from './model-list/azure-models'; // Old import
// import { googleModels } from './model-list/google-models'; // Old import
import { cerebrasModels } from './model-list/cerebras-models'; // Keeping this as its structure hasn't changed

// New model imports
import { gemini25FlashPreview0520Model } from './model-list/google/gemini-2.5-flash-preview-05-20';
import { gemini20FlashModel } from './model-list/google/gemini-2.0-flash';
import { gpt41Model } from './model-list/azure/gpt-4.1';
import { API_BASE_URL } from '~/lib/api.config'; // Import API_BASE_URL
import { gemini20FlashLiteModel } from './model-list/google/gemini-2.0-flash-lite';
import { gemini25ProPreview0506Model } from './model-list/google/gemini-2.5-pro-preview-05-06';
import { gemini25FlashLitePreview0617Model } from './model-list/google/gemini-2.5-flash-lite-preview-06-17';

// If you add more providers, import them here

// Combine all models into the main AImodels array
export const AImodels: AIModelConfig[] = [
  // ...azureModels, // Old spread
  // ...googleModels, // Old spread
  gpt41Model, // No shortName override here
  gemini25ProPreview0506Model,
  gemini25FlashPreview0520Model,
  gemini25FlashLitePreview0617Model,
  gemini20FlashModel,
  gemini20FlashLiteModel,
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