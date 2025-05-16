// app/lib/auth.server.ts
import { redirect } from "@remix-run/node";
import { getApiUrl, API_ROUTES } from "./api.config"; // Changed import

// --- Auth Status Types & Helpers ---
export type AuthStatus =
  | { status: "authenticated"; reason: "valid_access_token_and_session" | "valid_access_token" }
  | { status: "login_required"; reason: "session_terminated" | "invalid_or_expired_tokens" | "no_tokens_present" }
  | { status: "refresh_required"; reason: "valid_refresh_token" }
  | { status: "error"; reason?: string };

export function isAuthenticated(auth: AuthStatus): auth is Extract<AuthStatus, { status: "authenticated" }> {
  return auth.status === "authenticated";
}

export function isRefreshable(auth: AuthStatus): auth is Extract<AuthStatus, { status: "refresh_required" }> {
  return auth.status === "refresh_required";
}

// isLoginRequired is not strictly needed if isAuthenticated and isRefreshable are used, but can be kept for clarity
// export function isLoginRequired(auth: AuthStatus) {
//   return auth.status === "login_required";
// }

// --- Core Auth Functions ---

export async function checkAuth(request: Request): Promise<AuthStatus> {
  try {
    const response = await fetch(getApiUrl("AUTH_CHECK"), { // Use getApiUrl
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      credentials: "include",
    });

    if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json();
      if (data && data.status && data.reason) {
        return data as AuthStatus;
      }
      return { status: "login_required", reason: data.message || `API error: ${response.status}` };
    } else if (!response.ok) {
      console.error("Auth check API request failed:", response.status, await response.text());
      return { status: "error", reason: `API error: ${response.status}` };
    }

    const data = await response.json();
    if (data && typeof data.status === 'string') {
      return data as AuthStatus;
    }
    console.error("Auth check API response is not in expected AuthStatus format:", data);
    return { status: "error", reason: "Invalid API response format from auth/check" };
  } catch (error) {
    console.error("Error during checkAuth:", error);
    return { status: "error", reason: "Network error or failed to parse auth/check response" };
  }
}

export async function refreshTokens(request: Request): Promise<{ ok: boolean; setCookieHeader?: string | null }> {
  try {
    const response = await fetch(getApiUrl("AUTH_REFRESH"), { // Use getApiUrl
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      credentials: "include",
    });

    const setCookieHeader = response.headers.get("set-cookie");

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn("Refresh token request failed:", response.status, errorBody);
      return { ok: false, setCookieHeader };
    }

    const data = await response.json();
    if (data.status === "Success" || data.message?.includes("refreshed")) {
      return { ok: true, setCookieHeader };
    } else {
      console.warn("Refresh token API call was not successful according to response body:", data);
      return { ok: false, setCookieHeader };
    }
  } catch (error) {
    console.error("Error during refreshTokens:", error);
    return { ok: false };
  }
}

export async function requireAuth(
  request: Request,
  redirectTo: string = "/login"
): Promise<Extract<AuthStatus, { status: "authenticated" }>> {
  let authStatus = await checkAuth(request);

  if (isRefreshable(authStatus)) {
    const { ok, setCookieHeader } = await refreshTokens(request);
    if (ok && setCookieHeader) {
      const currentUrl = new URL(request.url);
      const destination = currentUrl.pathname + currentUrl.search;
      console.log(`[requireAuth] Refresh successful, redirecting to ${destination} to apply new cookies.`);
      throw redirect(destination, {
        headers: { "Set-Cookie": setCookieHeader },
      });
    }
    console.log("[requireAuth] Token refresh attempt failed or did not set cookies. Re-checking auth status.");
    authStatus = await checkAuth(request);
  }

  if (!isAuthenticated(authStatus)) {
    const currentPath = new URL(request.url).pathname;
    const currentSearch = new URL(request.url).search;
    // Only add 'next' if we are not already trying to go to the redirectTo page
    // and if the current path is not the root (unless root itself needs a specific 'next')
    const nextParam = (currentPath !== redirectTo && (currentPath !== "/" || currentSearch !== ""))
      ? `?next=${encodeURIComponent(currentPath + currentSearch)}`
      : "";
    console.log(`[requireAuth] User not authenticated (status: ${authStatus.status}, reason: ${authStatus.reason}). Redirecting to ${redirectTo}${nextParam}.`);
    throw redirect(`${redirectTo}${nextParam}`);
  }
  return authStatus; // Already narrowed by isAuthenticated
}

export { getApiUrl };
