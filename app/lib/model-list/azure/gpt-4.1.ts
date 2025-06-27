import type { AIModelConfig } from '../../ai-models';

export const gpt41Model: AIModelConfig = {
  displayName: "GPT-4.1", // Using the model name as display name, can be changed
  shortName: "GPT-4.1",
  model: "gpt-4.1",
  provider: "azure",
  // isDefault: true, // Set if this should be a default model
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
    // executionParameters: {} // As per the user's example, though this might be part of a different config
  }
};