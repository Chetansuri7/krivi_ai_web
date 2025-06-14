// app/lib/auth.server.ts
import { redirect } from "@remix-run/node";
import { getApiUrl, API_ROUTES, fetchWithHeaders } from "./api.config";

// --- Auth Status Types & Helpers ---

// Define a structure for authenticated user details
// Adjust this based on what your /auth/check API returns
export type AuthenticatedUserDetails = {
  id: string;
  name: string;
  email: string;
  avatar_url?: string; // Or 'avatar' if that's the field name
  // any other relevant user fields
};

export type AuthStatus =
  | { status: "authenticated"; reason: "valid_access_token_and_session" | "valid_access_token"; user?: AuthenticatedUserDetails }
  | { status: "login_required"; reason: "session_terminated" | "invalid_or_expired_tokens" | "no_tokens_present" }
  | { status: "refresh_required"; reason: "valid_refresh_token" }
  | { status: "error"; reason?: string };

export function isAuthenticated(auth: AuthStatus): auth is Extract<AuthStatus, { status: "authenticated" }> {
  return auth.status === "authenticated";
}

export function isRefreshable(auth: AuthStatus): auth is Extract<AuthStatus, { status: "refresh_required" }> {
  return auth.status === "refresh_required";
}

// --- Core Auth Functions ---

export async function checkAuth(request: Request): Promise<AuthStatus> {
  try {
    const response = await fetchWithHeaders("AUTH_CHECK", {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      credentials: "include",
    });

    if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
      const data = await response.json();
      // Check if the error response matches AuthStatus structure for login_required or error
      if (data && data.status && (data.status === "login_required" || data.status === "error" || data.status === "refresh_required") && data.reason) {
        return data as AuthStatus;
      }
      return { status: "login_required", reason: data.message || `API error: ${response.status}` };
    } else if (!response.ok) {
      const errorText = await response.text();
      console.error("Auth check API request failed:", response.status, errorText);
      return { status: "error", reason: `API error: ${response.status}. ${errorText}` };
    }

    const data = await response.json();
    // Accept any valid AuthStatus with status and reason, not just "authenticated"
    if (data && data.status && data.reason) {
      return data as AuthStatus;
    }
    console.error("Auth check API response is not in expected AuthStatus format:", data);
    return { status: "error", reason: "" };
  } catch (error) {
    console.error("Error during checkAuth:", error);
    return { status: "error", reason: "Network error or failed to parse auth/check response" };
  }
}

export async function refreshTokens(request: Request): Promise<{ ok: boolean; setCookieHeaders?: string[] | null }> {
  try {
    const response = await fetchWithHeaders("AUTH_REFRESH", {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        'X-Client-Platform': 'Web', // As per user feedback, ensure this header if backend expects it
      },
      credentials: "include",
    });

    const setCookieHeaders = response.headers.getSetCookie(); // Correct method for Remix/Node.js

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn("Refresh token request failed:", response.status, errorBody);
      // Still return headers, backend might clear cookies on failure
      return { ok: false, setCookieHeaders: setCookieHeaders.length > 0 ? setCookieHeaders : null };
    }

    const data = await response.json();
    // Assuming backend returns a success status or specific message
    if (data.status === "Success" || data.message?.includes("refreshed") || data.ok === true || response.status === 200) {
      return { ok: true, setCookieHeaders };
    } else {
      console.warn("Refresh token API call was not successful according to response body:", data);
      return { ok: false, setCookieHeaders: setCookieHeaders.length > 0 ? setCookieHeaders : null };
    }
  } catch (error) {
    console.error("Error during refreshTokens:", error);
    return { ok: false, setCookieHeaders: null };
  }
}

export async function requireAuth(
  request: Request,
  redirectTo: string = "/login"
): Promise<Extract<AuthStatus, { status: "authenticated" }>> {
  const isDebug = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
  const responseHeaders = new Headers(); // To accumulate Set-Cookie headers

  let authStatus = await checkAuth(request);

  if (isDebug) {
    console.info('[requireAuth] Initial /auth/check result:', authStatus);
  }

  if (isRefreshable(authStatus)) {
    if (isDebug) {
      console.warn('[requireAuth] status=refresh_required, attempting refresh...');
    }
    const { ok, setCookieHeaders } = await refreshTokens(request);
    if (isDebug) {
      console.info('[requireAuth] /auth/refresh result:', ok, 'Cookies to set:', setCookieHeaders);
    }

    if (ok && setCookieHeaders && setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(cookie => responseHeaders.append("Set-Cookie", cookie));
      if (isDebug) {
        console.info('[requireAuth] Refresh successful. Redirecting to URL:', request.url, 'with new Set-Cookie headers.');
      }
      // CRITICAL STEP: Redirect to the current URL to apply new cookies.
      throw redirect(request.url, { headers: responseHeaders });
    } else {
      // REFRESH FAILED or no cookies returned:
      if (isDebug) {
        console.warn('[requireAuth] Refresh failed or no new cookies set. Re-checking auth status...');
      }
      // If refresh call itself returned cookies (e.g. to clear them), add them.
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        setCookieHeaders.forEach(cookie => responseHeaders.append("Set-Cookie", cookie));
      }
      authStatus = await checkAuth(request); // Re-check with (likely old) cookies
      if (isDebug) {
        console.info('[requireAuth] /auth/check after failed/no-cookie refresh:', authStatus);
      }
    }
  }

  if (!isAuthenticated(authStatus)) {
    if (isDebug) {
      console.warn('[requireAuth] Not authenticated after all checks. Redirecting to login. Status:', authStatus);
    }
    const currentPath = new URL(request.url).pathname;
    const currentSearch = new URL(request.url).search;
    const nextParam =
      currentPath !== redirectTo && (currentPath !== "/" || currentSearch !== "")
        ? `?next=${encodeURIComponent(currentPath + currentSearch)}`
        : "";
    let reasonParam = "";
    if (authStatus.status === "login_required") { // authStatus.reason is guaranteed by type
      reasonParam = `&error_description=${encodeURIComponent(authStatus.reason)}`;
    } else if (authStatus.status === "error") {
      if (authStatus.reason) {
        reasonParam = `&error_description=${encodeURIComponent(authStatus.reason)}`;
      } else {
        reasonParam = `&error_description=auth_check_error_unknown_reason`;
      }
    } else { // Fallback for any other unauthenticated status not explicitly handled above
      reasonParam = `&error_description=auth_failed_unspecified_reason`;
    }
    
    const finalRedirectTo = `${redirectTo}${nextParam}${nextParam && reasonParam ? reasonParam : !nextParam && reasonParam ? "?" + reasonParam.substring(1) : ""}`;
    
    // Pass any accumulated Set-Cookie headers (e.g., from a failed refresh that clears cookies)
    throw redirect(finalRedirectTo, { headers: responseHeaders });
  }

  if (isDebug) {
    console.info('[requireAuth] Authenticated! User:', authStatus.user);
  }
  // If loader needs to return data with headers: return json({ user: authStatus.user }, { headers: responseHeaders });
  // For now, just return authStatus. If responseHeaders has Set-Cookie from a successful refresh
  // that somehow didn't redirect (which shouldn't happen with the logic above),
  // those cookies won't be applied to the client by returning authStatus directly without headers.
  // The redirect is the primary mechanism.
  return authStatus as Extract<AuthStatus, { status: "authenticated" }>;
}