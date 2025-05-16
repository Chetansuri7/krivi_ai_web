// app/lib/api.config.ts

// For client-side access in Remix + Vite, use VITE_ prefix for env vars
// Make sure VITE_API_BASE_URL is defined in your .env file

// Correctly access environment variables for client and server
export const API_BASE_URL = typeof window !== 'undefined' // Check if running in browser
  ? import.meta.env.VITE_API_BASE_URL // Client-side (Vite)
  : process.env.VITE_API_BASE_URL;   // Server-side (Node.js)

// This check is for build/server time.
if (!API_BASE_URL && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.warn(
    "WARNING: VITE_API_BASE_URL environment variable is not set. Please define it in your .env file (e.g., VITE_API_BASE_URL=https://your-api.com)."
  );
}

export const API_ROUTES = {
  // Auth
  GOOGLE_LOGIN: "/auth/google/login",
  AUTH_REFRESH: "/auth/refresh",
  AUTH_CHECK: "/auth/check",
  AUTH_LOGOUT: "/auth/logout",

  // Chat - Ensure path starts with '/'
  CHAT_SESSION_LIST: "/api/chat/session_list",

  // Other API routes can be added here
  // EXAMPLE_DATA: "/api/example",
};

/**
 * Helper function to construct full API URLs.
 * @param routeKey A key from API_ROUTES
 * @returns The full URL for the API endpoint.
 */
export function getApiUrl(routeKey: keyof typeof API_ROUTES): string {
  if (!API_BASE_URL) {
    const errorMessage = `VITE_API_BASE_URL is not configured or not available. Cannot construct API URL for "${String(routeKey)}". Check your .env file and Vite/Remix configuration. Current URL: ${API_BASE_URL}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  const path = API_ROUTES[routeKey];
  if (!path) {
    throw new Error(`API route for key "${String(routeKey)}" not found.`);
  }
  return `${API_BASE_URL}${path}`;
}