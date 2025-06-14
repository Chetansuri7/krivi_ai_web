// app/lib/user-cookie-keys.ts
// Centralized user-related cookie keys for easy updates
// Naming is now environment-aware.

// Helper to get environment variables, works on client and server.
// Expects VITE_ prefixed keys for client-side access via import.meta.env.
const getEnv = (viteKey: string, defaultValue: string): string => {
  const val = typeof window !== 'undefined'
    ? (import.meta.env as any)[viteKey]    // Client-side (Vite)
    : process.env[viteKey];               // Server-side (Node.js)
  return val || defaultValue;
};

// Define cookie names using environment variables with defaults for production.
// Set these in your .env files (e.g., .env.development, .env.production).
// Example for development (.env.development):
// VITE_AUTH_COOKIE_NAME="dev_krivilak_at"
// VITE_REFRESH_TOKEN_COOKIE_NAME="dev_krivilak_rt"
// VITE_USER_INFO_COOKIE_PREFIX="dev_krivilak_ui_"
//
// Example for production (.env or .env.production):
// VITE_AUTH_COOKIE_NAME="krivilak_at"
// VITE_REFRESH_TOKEN_COOKIE_NAME="krivilak_rt"
// VITE_USER_INFO_COOKIE_PREFIX="krivilak_ui_"

export const KRIVILAK_COOKIE_AT = getEnv("VITE_AUTH_COOKIE_NAME", "krivilak_at");
export const KRIVILAK_COOKIE_RT = getEnv("VITE_REFRESH_TOKEN_COOKIE_NAME", "krivilak_rt");

const USER_INFO_COOKIE_PREFIX = getEnv("VITE_USER_INFO_COOKIE_PREFIX", "krivilak_ui_");

export const KRIVILAK_COOKIE_EMAIL = `${USER_INFO_COOKIE_PREFIX}email`;
export const KRIVILAK_COOKIE_DISPLAYNAME = `${USER_INFO_COOKIE_PREFIX}displayname`;
export const KRIVILAK_COOKIE_FIRSTNAME = `${USER_INFO_COOKIE_PREFIX}firstname`;
export const KRIVILAK_COOKIE_LASTNAME = `${USER_INFO_COOKIE_PREFIX}lastname`;
export const KRIVILAK_COOKIE_PROFILE_PIC_URL = `${USER_INFO_COOKIE_PREFIX}profilepictureurl`;

// For easy iteration/cleanup.
// This array is dynamically populated based on the environment variables.
export const KRIVILAK_USER_COOKIE_NAMES = [
  KRIVILAK_COOKIE_AT,
  KRIVILAK_COOKIE_RT,
  KRIVILAK_COOKIE_EMAIL,
  KRIVILAK_COOKIE_DISPLAYNAME,
  KRIVILAK_COOKIE_FIRSTNAME,
  KRIVILAK_COOKIE_LASTNAME,
  KRIVILAK_COOKIE_PROFILE_PIC_URL,
];