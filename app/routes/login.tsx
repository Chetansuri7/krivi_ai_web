// app/routes/login.tsx
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import { FaGoogle } from "react-icons/fa";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  checkAuth,
  refreshTokens,
  isAuthenticated,
  isRefreshable,
  type AuthStatus, // Type import is fine from .server files
} from "~/lib/auth.server";
import { getApiUrl } from "~/lib/api.config"; // Import getApiUrl from client-safe config
import { useIsMobile } from "~/hooks/use-mobile";

export const meta: MetaFunction = () => {
  return [{ title: "Sign In" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const responseHeaders = new Headers();

  let authStatus = await checkAuth(request);

  if (isRefreshable(authStatus)) {
    console.log("[Login Loader] Token refresh required. Attempting refresh...");
    const { ok, setCookieHeaders } = await refreshTokens(request);
    if (ok && setCookieHeaders && Array.isArray(setCookieHeaders)) {
      for (const cookie of setCookieHeaders) {
        responseHeaders.append("Set-Cookie", cookie);
      }
      const destination = url.pathname + url.search;
      console.log(`[Login Loader] Refresh successful. Redirecting to ${destination} to apply new cookies.`);
      throw redirect(destination, { headers: responseHeaders });
    }
    authStatus = await checkAuth(request); // Re-check auth after failed refresh
    console.log("[Login Loader] Refresh failed or no cookies set. New auth status:", authStatus.status);
  }

  if (isAuthenticated(authStatus)) {
    const next = url.searchParams.get("next") || "/"; // Default to app's root
    console.log(`[Login Loader] User already authenticated. Redirecting to: ${next}`);
    throw redirect(next, { headers: responseHeaders });
  }

  return json({ authStatus }, { headers: responseHeaders });
}

export default function LoginPage() {  
  const { authStatus } = useLoaderData<typeof loader>();  
  const [searchParams] = useSearchParams();  
  const isMobile = useIsMobile();  
  
  const googleLoginUrl = getApiUrl("GOOGLE_LOGIN");  
  const nextParam = searchParams.get("next");  
  const finalGoogleLoginUrl = nextParam  
    ? `${googleLoginUrl}?final_redirect_path=${encodeURIComponent(nextParam)}`  
    : googleLoginUrl;  
  
  // Define only the errors we want to show to the user for login-specific issues
  const LOGIN_SPECIFIC_ERROR_MESSAGES: Record<string, string> = {
    session_terminated: "Your session has been terminated. Please sign in again.",
    invalid_or_expired_tokens: "Your session is invalid or has expired. Please sign in again.",
    // Add any other specific login-related errors that should be user-visible here.
    // For example, if your backend can return "invalid_credentials":
    // "invalid_credentials": "The username or password you entered is incorrect.",
  };

  const displayMessage = searchParams.get("message"); // For general messages, not errors
  let determinedErrorKey: string | null | undefined = searchParams.get("error_description") || searchParams.get("error");

  // If no error key from URL params, try to get it from authStatus
  if (!determinedErrorKey && authStatus) {
    // Only consider 'login_required' or 'error' statuses for deriving an error key from authStatus.reason
    if (authStatus.status === "login_required" || authStatus.status === "error") {
      determinedErrorKey = authStatus.reason; // authStatus.reason might be undefined or a non-displayable code
    }
  }

  // Map the determinedErrorKey to a user-friendly message if it's a known login-specific error
  // Otherwise, errorReason will be an empty string, suppressing generic/unknown errors.
  const errorReason = determinedErrorKey ? (LOGIN_SPECIFIC_ERROR_MESSAGES[determinedErrorKey] ?? "") : "";
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-primary/10 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow ring-1 ring-border/10 p-8 flex flex-col items-center gap-8">
          {/* Brand/Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground select-none">AI</span>
            </div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Sign in to AI Chat</h1>
            <p className="text-base text-muted-foreground text-center max-w-xs">Start chatting with the latest AI models. Fast, private, and secure.</p>
          </div>

          {/* Error/Message */}
          {errorReason && (
            <div className="w-full rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive shadow-sm">
              <p>{errorReason}</p>
            </div>
          )}
          {displayMessage && !errorReason && (
            <div className="w-full rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-center text-sm text-primary shadow-sm">
              <p>{displayMessage}</p>
            </div>
          )}

          {/* Login Button */}
          <Button
            asChild
            size="lg"
            className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-5 font-semibold border border-border/30 transition-all duration-200"
          >
            <a href={finalGoogleLoginUrl}>
              <span>Continue with Google</span>
            </a>
          </Button>

          {/* Info/Privacy */}
          <div className="w-full text-center text-xs text-muted-foreground/80">
            By signing in, you agree to our{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Terms</a> and{' '}
            <a href="#" className="underline underline-offset-4 hover:text-primary">Privacy Policy</a>.
          </div>
        </div>
      </div>
    </div>
  );  
}