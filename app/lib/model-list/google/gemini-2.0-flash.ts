import type { AIModelConfig } from '../../ai-models';

export const gemini20FlashModel: AIModelConfig = {
  displayName: "Gemini 2.0 flash",
  shortName: "2.0 Flash",
  model: "gemini-2.0-flash",
  provider: "google",
  // isDefault: false, // Assuming the other one is default
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