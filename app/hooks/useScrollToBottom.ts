// app/hooks/useScrollToBottom.ts

import { useRef, useState, useEffect, useCallback } from 'react';

const INTERSECTION_THRESHOLD_PX = 30; // MODIFIED: Was 50, now 30
const USER_SCROLL_DEBOUNCE_MS = 150;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [containerRef, endRef]); // Removed INTERSECTION_THRESHOLD_PX from deps as it's const now

  useEffect(() => {
    const scrollableContainer = containerRef.current;
    if (!scrollableContainer) return;

    const handleScroll = () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

      scrollTimeoutRef.current = setTimeout(() => {
        if (scrollableContainer) {
          const { scrollTop, scrollHeight, clientHeight } = scrollableContainer;
          const isNearBottom =
            scrollHeight - scrollTop - clientHeight <
            INTERSECTION_THRESHOLD_PX + 5; 

          if (!isNearBottom) {
            if (!showScrollDownButton) setShowScrollDownButton(true);
            if (isAtBottom) setIsAtBottom(false);
          } else {
            if (showScrollDownButton) setShowScrollDownButton(false);
            if (!isAtBottom) setIsAtBottom(true);
          }
        }
      }, USER_SCROLL_DEBOUNCE_MS);
    };

    scrollableContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollableContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [containerRef, showScrollDownButton, isAtBottom]); // Removed INTERSECTION_THRESHOLD_PX from deps

  return {
    containerRef,
    endRef,
    isAtBottom,
    showScrollDownButton,
    scrollToBottom,
  };
}