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
  getApiUrl, // AuthStatus also exported from auth.server
  type AuthStatus,
} from "~/lib/auth.server";
import { useIsMobile } from "~/hooks/use-mobile";

export const meta: MetaFunction = () => {
  return [{ title: "Sign In" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const responseHeaders = new Headers();

  let authStatus = await checkAuth(request);

  // 1. Handle refresh if needed
  if (isRefreshable(authStatus)) {
    console.log("[Login Loader] Token refresh required. Attempting refresh...");
    const { ok, setCookieHeader } = await refreshTokens(request);
    if (ok && setCookieHeader) {
      responseHeaders.append("Set-Cookie", setCookieHeader);
      // Important: After refresh, re-check auth. The most reliable way is to redirect
      // to allow the browser to send the new cookies.
      // Redirect to the login page itself (or the intended 'next' page if already known to be safe).
      const destination = url.pathname + url.search; // Preserve current query params
      console.log(`[Login Loader] Refresh successful. Redirecting to ${destination} to apply new cookies.`);
      throw redirect(destination, { headers: responseHeaders });
    }
    // If refresh failed, get the new auth status
    authStatus = await checkAuth(request);
    console.log("[Login Loader] Refresh failed or no cookies set. New auth status:", authStatus.status);
  }

  // 2. If authenticated, redirect away from login page
  if (isAuthenticated(authStatus)) {
    const next = url.searchParams.get("next") || "/"; // Default to homepage
    console.log(`[Login Loader] User already authenticated. Redirecting to: ${next}`);
    // Pass along any Set-Cookie headers if a refresh attempt happened but didn't immediately lead to this block.
    throw redirect(next, { headers: responseHeaders });
  }

  // 3. If not authenticated and not refreshable, user needs to log in.
  //    Pass authStatus to the component for potential error messages.
  return json({ authStatus }, { headers: responseHeaders });
}

export default function LoginPage() {
  const { authStatus } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile(); // Correctly using the hook

  // Your backend at GOOGLE_LOGIN should handle any 'next' or 'redirect_uri' logic
  // to bring the user back to the correct frontend page after Google OAuth.
  // This URL is just to initiate the flow with your backend.
  const googleLoginUrl = getApiUrl("GOOGLE_LOGIN");
  const nextParam = searchParams.get("next");

  // If your backend needs the frontend's 'next' target, append it.
  // Example: `${googleLoginUrl}?frontend_redirect_after_login=${encodeURIComponent(nextParam)}`
  // Adjust query parameter name as per your backend's expectation.
  const finalGoogleLoginUrl = nextParam
    ? `${googleLoginUrl}?final_redirect_path=${encodeURIComponent(nextParam)}`
    : googleLoginUrl;


  let displayMessage = searchParams.get("message"); // General message from redirects
  let errorReason = searchParams.get("error_description") || searchParams.get("error");


  if (!displayMessage && !errorReason && authStatus) {
    if (authStatus.status === "login_required") {
      switch (authStatus.reason) {
        case "session_terminated":
          errorReason = "Your session has been terminated. Please sign in again.";
          break;
        case "invalid_or_expired_tokens":
          errorReason = "Your session is invalid or has expired. Please sign in again.";
          break;
        // "no_tokens_present" is normal for login page, so no specific message unless you want one.
      }
    } else if (authStatus.status === "error" && authStatus.reason) {
      errorReason = authStatus.reason;
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">
            Access Your Account
          </CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Continue with Google to securely sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {errorReason && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
              <p>{errorReason}</p>
            </div>
          )}
          {displayMessage && !errorReason && (
             <div className="rounded-md border border-primary/50 bg-primary/10 p-3 text-center text-sm text-primary">
              <p>{displayMessage}</p>
            </div>
          )}
          <Button
            asChild
            size={isMobile ? "lg" : "lg"} // Using lg for better touch target
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-6"
          >
            <a href={finalGoogleLoginUrl} className="flex items-center justify-center gap-3">
              <FaGoogle className="h-5 w-5" />
              Sign in with Google
            </a>
          </Button>
        </CardContent>
        <CardFooter className="flex-col items-center text-center pt-6">
          <p className="text-xs text-muted-foreground">
            By proceeding, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}