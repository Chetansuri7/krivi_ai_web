import type { AIModelConfig } from '../ai-models'; // Import the interface

export const googleModels: AIModelConfig[] = [
  {
    displayName: "Gemini 2.5 flash",
    model: "gemini-2.5-flash-preview-04-17",
    provider: "google",
    isDefault: true,
  },
  {
    displayName: "Gemini 2.0 flash",
    model: "gemini-2.0-flash",
    provider: "google",
    

  },
];