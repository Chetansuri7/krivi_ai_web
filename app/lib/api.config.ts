// app/lib/api.config.ts

// For client-side access in Remix + Vite, use VITE_ prefix for env vars
// Make sure VITE_API_BASE_URL is defined in your .env file
export const API_BASE_URL = process.env.VITE_API_BASE_URL;

// This check is for build/server time. On the client, it might be undefined initially.
// It's better to check for API_BASE_URL before each use in getApiUrl.
if (!API_BASE_URL && typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // This warning will appear during server-side rendering or build if not set
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
    const errorMessage = `VITE_API_BASE_URL is not configured or not available on the client. Cannot construct API URL for "${String(routeKey)}". Check your .env file and Vite/Remix configuration.`;
    console.error(errorMessage);
    // Throwing an error here will stop the operation, which is usually desired
    // if the base URL is essential for the API call.
    throw new Error(errorMessage);
  }
  const path = API_ROUTES[routeKey];
  if (!path) {
    throw new Error(`API route for key "${String(routeKey)}" not found.`);
  }
  return `${API_BASE_URL}${path}`;
}