/**
* SCALABLE AUTH FLOW (fetchWithHeaders)
* =====================================
* On any API call:
*   - If access token is expired (401), fetchWithHeaders calls /auth/check.
*   - If /auth/check returns { status: "refresh_required", reason: "valid_refresh_token" },
*     fetchWithHeaders POSTs to /auth/refresh.
*   - If refresh succeeds, fetchWithHeaders retries the original request ONCE with new tokens.
*   - If refresh fails, or /auth/check returns login_required, fetchWithHeaders returns the 401.
*   - UI code (route loaders or React) should redirect to login only if a request fails with 401 after retry.
*   - All token logic is centralized here; UI never needs to manually call /auth/refresh.
*   - Backend must ensure new tokens are sent as HttpOnly cookies on refresh.
*   - This ensures users are never forced to login again unless both tokens are invalid/expired.
*/
// app/lib/api.config.ts

// For client-side access in Remix + Vite, use VITE_ prefix for env vars
// Make sure VITE_API_BASE_URL is defined in your .env file

// Helper to get environment variables, works on client and server.
// Expects VITE_ prefixed keys for client-side access via import.meta.env.
const getEnv = (viteKey: string, defaultValue: string): string => {
  const val = typeof window !== 'undefined'
    ? (import.meta.env as any)[viteKey]    // Client-side (Vite)
    : process.env[viteKey];               // Server-side (Node.js)
  return val || defaultValue;
};

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

// Environment-specific application settings
// Set these in your .env files (e.g., .env.development, .env.production).
// Example for development (.env.development):
// VITE_SUCCESS_REDIRECT_URI="https://dev-chat.krivilak.com/"
// VITE_COOKIE_DOMAIN=".krivilak.com" (can be same for dev/prod or more specific for dev like "localhost")
// VITE_GOOGLE_AUTH_REDIRECT_URI="https://api-dev-v0.krivilak.com/auth/google/callback"
// VITE_TOKEN_ISSUER_URI="https://api-dev-v0.krivilak.com"
//
// Example for production (.env or .env.production):
// VITE_SUCCESS_REDIRECT_URI="https://chat.krivilak.com/"
// VITE_COOKIE_DOMAIN=".krivilak.com"
// VITE_GOOGLE_AUTH_REDIRECT_URI="https://api.krivilak.com/auth/google/callback"
// VITE_TOKEN_ISSUER_URI="https://api.krivilak.com"

export const SUCCESS_REDIRECT_URI = getEnv("VITE_SUCCESS_REDIRECT_URI", "https://chat.krivilak.com/");
export const COOKIE_DOMAIN = getEnv("VITE_COOKIE_DOMAIN", ".krivilak.com");
export const GOOGLE_AUTH_REDIRECT_URI = getEnv("VITE_GOOGLE_AUTH_REDIRECT_URI", "https://api.krivilak.com/auth/google/callback");
export const TOKEN_ISSUER_URI = getEnv("VITE_TOKEN_ISSUER_URI", "https://api.krivilak.com");

export const API_ROUTES = {
  // Auth
  GOOGLE_LOGIN: "/auth/google/login",
  AUTH_REFRESH: "/auth/refresh",
  AUTH_CHECK: "/auth/check",
  AUTH_LOGOUT: "/auth/logout",

  // Chat - Ensure path starts with '/'
  CHAT_SESSION_LIST: "/api/chat/session_list",
  CHAT_STREAM: "/api/chat/stream",
  CHAT_HISTORY_BASE: "/api/chat", // Base path for history, e.g., /api/chat/{chatId}/history

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
/**
 * A wrapper around the native fetch function that automatically adds
 * the 'X-Client-Platform: Web' header to requests.
 * It also uses getApiUrl to construct the full API URL if a routeKey is provided.
 *
 * @param input The resource that you wish to fetch. This can either be a string, a URL object, or a key from API_ROUTES.
 * @param init An object containing any custom settings that you want to apply to the request.
 * @returns A Promise that resolves to the Response to that request.
 */
export async function fetchWithHeaders(
  input: keyof typeof API_ROUTES | RequestInfo | URL,
  init?: RequestInit,
  _retry?: boolean // Internal flag to prevent infinite retry
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('X-Client-Platform', 'Web');

  const newInit = {
    ...init,
    headers,
    credentials: 'include' as RequestCredentials, // Ensure cookies are sent
  };

  let url: RequestInfo | URL;
  if (typeof input === 'string' && API_ROUTES[input as keyof typeof API_ROUTES]) {
    url = getApiUrl(input as keyof typeof API_ROUTES);
  } else {
    url = input as RequestInfo | URL;
  }

  // Perform the fetch
  let response = await fetch(url, newInit);

  // Handle 401 Unauthorized (reactive refresh)
  if (response.status === 401 && !_retry) {
    const isDebug = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
    try {
      if (isDebug) {
        console.warn('[auth/flow] 401 received for API call. Triggering /auth/check...');
      }
      // Check auth state
      const checkResp = await fetch(getApiUrl('AUTH_CHECK'), {
        method: 'GET',
        credentials: 'include' as RequestCredentials,
        headers: { 'X-Client-Platform': 'Web' },
      });
      const checkData = await checkResp.json();
      if (isDebug) {
        console.info('[auth/flow] /auth/check response:', checkData);
      }

      if (checkData.status === 'refresh_required') {
        if (isDebug) {
          console.warn('[auth/flow] refresh_required received. Triggering /auth/refresh...');
        }
        // Try refresh
        const refreshResp = await fetch(getApiUrl('AUTH_REFRESH'), {
          method: 'POST',
          credentials: 'include' as RequestCredentials,
          headers: { 'X-Client-Platform': 'Web' },
        });
        let refreshJson = null;
        try {
          refreshJson = await refreshResp.clone().json();
        } catch { refreshJson = await refreshResp.clone().text(); }
        if (isDebug) {
          console.info('[auth/flow] /auth/refresh response:', refreshJson, { status: refreshResp.status });
        }
        if (refreshResp.ok && refreshJson && refreshJson.status === "Success") {
          if (isDebug) {
            console.info('[auth/flow] Refresh succeeded. Retrying original request...');
          }
          // Try original request again, only once
          const retryResp = await fetchWithHeaders(input, init, true);
          if (isDebug) {
            console.info('[auth/flow] Retried original request after refresh. Status:', retryResp.status);
          }
          return retryResp;
        } else {
          if (isDebug) {
            console.warn('[auth/flow] Refresh failed or did not return Success. User will be logged out.');
          }
          // Refresh failed, signal to logout
          return response;
        }
      } else if (checkData.status === 'login_required') {
        if (isDebug) {
          console.warn('[auth/flow] login_required received from /auth/check. User will be logged out.');
        }
        // Signal logout
        return response;
      }
      // If status is "authenticated", let original 401 stand (unusual)
      if (isDebug) {
        console.warn('[auth/flow] /auth/check returned authenticated after 401, which is unexpected. Returning original response.');
      }
      return response;
    } catch (err) {
      if (isDebug) {
        console.error('[auth/flow] Error during 401 reactive refresh flow:', err);
      }
      // On error, let original 401 stand
      return response;
    }
  }
  return response;
}