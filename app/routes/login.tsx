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
    const { ok, setCookieHeader } = await refreshTokens(request);
    if (ok && setCookieHeader) {
      responseHeaders.append("Set-Cookie", setCookieHeader);
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
  
  // User-friendly error translation  
  const ERROR_MESSAGES: Record<string, string | undefined> = {  
    session_terminated: "Your session has been terminated. Please sign in again.",  
    invalid_or_expired_tokens: "Your session is invalid or has expired. Please sign in again.",  
    auth_check_failed: "Something went wrong. Please try signing in again.",  
    // add other codes as needed  
  };  
  
  let displayMessage = searchParams.get("message");  
  let errorReason = searchParams.get("error_description") || searchParams.get("error");  
  
  if (!displayMessage && !errorReason && authStatus) {  
    if (authStatus.status === "login_required") {  
      errorReason = ERROR_MESSAGES[authStatus.reason] ?? "";  
    } else if (authStatus.status === "error") {  
      errorReason = ERROR_MESSAGES[authStatus.reason ?? ""] ?? "Something went wrong. Please try signing in again.";  
    }  
  }  
  
  // Never show technical/unknown or empty codes to user  
  if (  
    !errorReason ||  
    ["no_tokens_present", "auth_check_failed", "error", "login_required"].includes(errorReason)  
  ) {  
    errorReason = "";  
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
            size={isMobile ? "lg" : "lg"}  
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