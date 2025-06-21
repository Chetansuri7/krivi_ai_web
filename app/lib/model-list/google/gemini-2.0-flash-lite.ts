import type { AIModelConfig } from '../../ai-models';

export const gemini20FlashLiteModel: AIModelConfig = {
  displayName: "Gemini 2.0 flash Lite",
  model: "gemini-2.0-flash-lite-001",
  provider: "google",
  isDefault: false,
  requestPayload: {
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "" // Placeholder for user content
      }
    ]
    // Add model-specific generationConfig if different from the other gemini model
    // For example:
    // generationConfig: {
    //   temperature: 0.8
    // }
  }
};