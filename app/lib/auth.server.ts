// app/lib/auth.server.ts
import { redirect } from "@remix-run/node";
import { getApiUrl, API_ROUTES } from "./api.config";

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
    const response = await fetch(getApiUrl("AUTH_CHECK"), {
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
    // Ensure the success response also matches the AuthStatus structure
    if (data && data.status === "authenticated" && data.reason) {
      // 'user' field is optional in AuthStatus, so it's fine if backend doesn't always send it
      // but for requireAuth, we'll expect it.
      return data as AuthStatus;
    }
    console.error("Auth check API response is not in expected AuthStatus format:", data);
    return { status: "error", reason: "" };
  } catch (error) {
    console.error("Error during checkAuth:", error);
    return { status: "error", reason: "Network error or failed to parse auth/check response" };
  }
}

export async function refreshTokens(request: Request): Promise<{ ok: boolean; setCookieHeader?: string | null }> {
  try {
    const response = await fetch(getApiUrl("AUTH_REFRESH"), {
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
    // Assuming backend returns a success status or specific message
    if (data.status === "Success" || data.message?.includes("refreshed") || data.ok === true || response.status === 200) {
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
      throw redirect(destination, {  
        headers: { "Set-Cookie": setCookieHeader },  
      });  
    }  
    authStatus = await checkAuth(request);  
  }  
  
  if (!isAuthenticated(authStatus)) {  
    const currentPath = new URL(request.url).pathname;  
    const currentSearch = new URL(request.url).search;  
    const nextParam =  
      currentPath !== redirectTo && (currentPath !== "/" || currentSearch !== "")  
        ? `?next=${encodeURIComponent(currentPath + currentSearch)}`  
        : "";  
    let reasonParam = "";  
    if (  
      authStatus.status === "login_required" &&  
      authStatus.reason  
    ) {  
      reasonParam = `&error_description=${encodeURIComponent(  
        authStatus.reason  
      )}`;  
    } else if (authStatus.status === "error" && authStatus.reason) {  
      reasonParam = `&error_description=${encodeURIComponent(  
        authStatus.reason  
      )}`;  
    } else if (authStatus.status === "error") {  
      reasonParam = `&error_description=auth_check_failed`;  
    }  
    const finalRedirectTo = `${redirectTo}${nextParam}${nextParam && reasonParam  
      ? reasonParam  
      : !nextParam && reasonParam  
      ? "?" + reasonParam.substring(1)  
      : ""  
      }`;  
  
    throw redirect(finalRedirectTo);  
  }  
  
  // Do NOT check for user presence — just return the auth status  
  return authStatus as Extract<AuthStatus, { status: "authenticated" }>;  
}  