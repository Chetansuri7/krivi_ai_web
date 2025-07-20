import type { AIModelConfig } from '../../ai-models';

export const gemini25FlashPreview0520Model: AIModelConfig = {
  displayName: "Gemini 2.5 flash",
  shortName: "2.5 Flash",
  model: "gemini-2.5-flash-preview-05-20", // Updated model name from example
  provider: "google",
  is_active_model: false,
  isDefault: false,
  requestPayload: {
    messages: [
      // Default messages structure, can be overridden
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "" // Placeholder for user content
      }
    ],
    generationConfig: {
      thinkingConfig: {
        // Initial budget based on default toggle state (true) and it being toggleable
        thinkingBudget: 24576
      }
    }
  },
  uiOptions: {
    thinkingToggleSettings: {
      canDisable: true,
      showToggle: true, // Show toggle as thinking can be disabled
      defaultToggleState: true, // Default to ON as defaultBudget > 0
      budgetWhenEnabled: 24576,   // maxBudget
      budgetWhenDisabled: 0,      // Can be set to 0
      fixedBudgetIfNotToggleable: null, // Toggle is shown
      minBudget: 0,
      maxBudget: 24576
    }
  }
};