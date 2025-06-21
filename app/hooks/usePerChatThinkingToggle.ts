// app/hooks/usePerChatThinkingToggle.ts
import { useState, useEffect, useCallback } from "react";

// Module-level in-memory store for thinking toggle state
const chatThinkingToggleStore: { [key: string]: boolean } = {};

export function usePerChatThinkingToggle(
  chatKey: string,
  defaultToggleState: boolean
) {
  const getToggleStateForChat = useCallback((): boolean => {
    // If chatKey is not in store, use defaultToggleState
    return chatThinkingToggleStore[chatKey] ?? defaultToggleState;
  }, [chatKey, defaultToggleState]);

  const [thinkingEnabled, setThinkingEnabled] = useState<boolean>(getToggleStateForChat);

  // Effect to update the toggle state if the chatKey or defaultToggleState changes
  useEffect(() => {
    setThinkingEnabled(getToggleStateForChat());
  }, [chatKey, defaultToggleState, getToggleStateForChat]); // Re-run if chatKey or defaultToggleState changes

  const handleThinkingToggleChange = useCallback((newState: boolean) => {
    chatThinkingToggleStore[chatKey] = newState; // Update the in-memory store
    setThinkingEnabled(newState); // Update local state for the current component instance
  }, [chatKey]);

  return { thinkingEnabled, handleThinkingToggleChange };
}