import type { AIModelConfig } from '../../ai-models';

export const gemini25FlashLitePreview0617Model: AIModelConfig = {
  displayName: "Gemini 2.5 Flash Lite",
  model: "gemini-2.5-flash-lite-preview-06-17",
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
    ],
    generationConfig: {
      // Initial budget based on default toggle state (false) and it being toggleable
      thinkingConfig: {
        thinkingBudget: 0
      }
    }
  },
  uiOptions: {
    thinkingToggleSettings: {
      canDisable: true,
      showToggle: true, // Show toggle as thinking can be disabled
      defaultToggleState: true, // Default to OFF as defaultBudget is 0
      budgetWhenEnabled: 24576,   // maxBudget
      budgetWhenDisabled: 0,      // Can be set to 0
      fixedBudgetIfNotToggleable: null, // Toggle is shown
      minBudget: 512, // For positive budgets, 0 is also allowed
      maxBudget: 24576
    }
  }
};