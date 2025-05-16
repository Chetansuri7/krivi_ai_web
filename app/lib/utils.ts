import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function isProbablyMobile(): boolean {
  if (typeof window !== "undefined") {
    if (window.matchMedia("(pointer: coarse)").matches) return true;
    // Broader check for mobile devices
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }
  // Fallback for SSR or non-browser environments
  return false;
}