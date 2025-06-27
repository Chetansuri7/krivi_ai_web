import type { AIModelConfig } from '../../ai-models';

export const gemini25ProPreview0506Model: AIModelConfig = {
  displayName: "Gemini 2.5 Pro",
  shortName: "2.5 Pro",
  model: "gemini-2.5-pro-preview-05-06",
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
      thinkingConfig: {
        // Budget is fixed as thinking cannot be disabled for this model
        thinkingBudget: 32768
      }
    }
  },
  uiOptions: {
    thinkingToggleSettings: {
      canDisable: false,
      showToggle: false, // Do not show toggle as thinking cannot be disabled
      defaultToggleState: true, // Based on defaultBudget > 0 (less relevant here)
      budgetWhenEnabled: 32768,   // maxBudget (less relevant here)
      budgetWhenDisabled: 0,      // (less relevant here)
      fixedBudgetIfNotToggleable: 32768, // Use defaultBudget as it's fixed
      minBudget: 128,
      maxBudget: 32768
    }
  }
};