// Modified useScrollToBottom.ts hook

import { useRef, useState, useEffect, useCallback } from 'react';
import { Message } from '~/components/chat/MessageItem';

const INTERSECTION_THRESHOLD_PX = 30;
const USER_SCROLL_DEBOUNCE_MS = 150;

export function useScrollToBottom(messages: Message[]) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userManuallyScrolled = useRef(false);
  const lastMessageCount = useRef(0);

  // Function to scroll to specific position
  const scrollToPosition = useCallback((position: number, behavior: ScrollBehavior = 'smooth') => {
    const scrollableContainer = containerRef.current;
    if (scrollableContainer) {
      scrollableContainer.scrollTo({
        top: position,
        behavior,
      });
    }
  }, []);

  // Complete scroll to bottom function (unchanged)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scrollableContainer = containerRef.current;
    const bottomMarker = endRef.current;

    if (bottomMarker) {
      bottomMarker.scrollIntoView({ behavior });
    } else if (scrollableContainer) {
      scrollableContainer.scrollTo({
        top: scrollableContainer.scrollHeight,
        behavior,
      });
    }
    setIsAtBottom(true);
    setShowScrollDownButton(false);
  }, []);

  // New function for 30/70 scrolling
  const scrollToPartialView = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scrollableContainer = containerRef.current;
    if (!scrollableContainer || userManuallyScrolled.current) return;

    // Calculate the position that shows 30% previous content, 70% new content
    const containerHeight = scrollableContainer.clientHeight;
    const scrollHeight = scrollableContainer.scrollHeight;
    
    // Position to show 30% of previous content at the top
    // This means we want to position the scroll so that we're 70% down the way
    // from (scrollHeight - containerHeight) which is the maximum scroll position
    const newPosition = Math.max(
      0,
      (scrollHeight - containerHeight) * 0.7
    );
    
    scrollToPosition(newPosition, behavior);
  }, [scrollToPosition]);

  // Track user manual scrolling
  useEffect(() => {
    const scrollableContainer = containerRef.current;
    if (!scrollableContainer) return;

    const handleScroll = () => {
      // Consider any scroll during active interaction as manual
      userManuallyScrolled.current = true;
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollableContainer) {
          const { scrollTop, scrollHeight, clientHeight } = scrollableContainer;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < INTERSECTION_THRESHOLD_PX + 5;

          if (!isNearBottom) {
            if (!showScrollDownButton) setShowScrollDownButton(true);
            if (isAtBottom) setIsAtBottom(false);
          } else {
            if (showScrollDownButton) setShowScrollDownButton(false);
            if (!isAtBottom) setIsAtBottom(true);
            // Reset manual scroll flag when user scrolls back to bottom
            userManuallyScrolled.current = false;
          }
        }
      }, USER_SCROLL_DEBOUNCE_MS);
    };

    scrollableContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollableContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isAtBottom, showScrollDownButton]);

  // Handle new messages logic
  useEffect(() => {
    // Reset manual scroll flag on first render
    if (messages.length === 0) {
      userManuallyScrolled.current = false;
    }
    
    // If new message was added
    if (messages.length > lastMessageCount.current) {
      // If this is a user message, apply the partial view scroll
      const lastMessage = messages[messages.length - 1];
      
      // When a new user message is sent, do partial scroll
      if (lastMessage && lastMessage.role === 'user') {
        // Short delay to allow DOM to update
        setTimeout(() => scrollToPartialView(), 50);
      } 
      // When receiving AI response and user hasn't manually scrolled
      else if (lastMessage && lastMessage.role === 'assistant' && !userManuallyScrolled.current) {
        // If at bottom or was already showing partial view, maintain position
        if (isAtBottom) {
          setTimeout(() => scrollToBottom('auto'), 10);
        }
      }
      
      lastMessageCount.current = messages.length;
    }
  }, [messages, isAtBottom, scrollToBottom, scrollToPartialView]);

  // Observer to track if we're at bottom (unchanged)
  useEffect(() => {
    const scrollableContainer = containerRef.current;
    const bottomMarker = endRef.current;

    if (!scrollableContainer || !bottomMarker) {
      setIsAtBottom(true);
      setShowScrollDownButton(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isCurrentlyIntersecting = entry.isIntersecting;
        setIsAtBottom(isCurrentlyIntersecting);
        setShowScrollDownButton(!isCurrentlyIntersecting);
      },
      {
        root: scrollableContainer,
        rootMargin: `0px 0px ${INTERSECTION_THRESHOLD_PX}px 0px`,
        threshold: 0.01,
      }
    );
    observer.observe(bottomMarker);

    if (
      scrollableContainer.scrollHeight > scrollableContainer.clientHeight &&
      scrollableContainer.scrollTop + scrollableContainer.clientHeight < scrollableContainer.scrollHeight - INTERSECTION_THRESHOLD_PX
    ) {
      setIsAtBottom(false);
      setShowScrollDownButton(true);
    } else {
      setIsAtBottom(true);
      setShowScrollDownButton(false);
    }

    return () => {
      observer.unobserve(bottomMarker);
      observer.disconnect();
    };
  }, [containerRef, endRef]);

  // Reset userManuallyScrolled flag when we navigate to a new chat
  const resetManualScrollFlag = useCallback(() => {
    userManuallyScrolled.current = false;
  }, []);

  return {
    containerRef,
    endRef,
    isAtBottom,
    showScrollDownButton,
    scrollToBottom,
    scrollToPartialView,
    resetManualScrollFlag
  };
}