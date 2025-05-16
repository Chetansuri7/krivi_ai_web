import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Ensure window is defined (for SSR safety, though matchMedia is client-only)
    if (typeof window === 'undefined') {
      setIsMobile(false); // Default for server or non-browser env
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    // Add listener
    mql.addEventListener("change", onChange)
    // Set initial state
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    // Clean up listener
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}