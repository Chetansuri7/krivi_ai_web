// app/routes/__app.tsx
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData } from "@remix-run/react";

import { requireAuth, type AuthenticatedUserDetails } from "~/lib/auth.server";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";
import type { NavItem } from "~/components/sidebar-nav";
import { Separator } from "~/components/ui/separator";
import { StreamingChatProvider } from "~/components/chat/streaming-chat-context";
import { SidebarChatHistoryProvider } from "~/components/sidebar-chat-history-context";
// ADD THIS IMPORT

export interface AppLoaderData {
  user: AuthenticatedUserDetails;
  appName: string;
  mainNavItems: NavItem[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return json<AppLoaderData>({
    user: {
      id: "dummy",
      name: "Dummy",
      email: "dummy@example.com",
      avatar_url: "/avatars/default.png",
    },
    appName: "Krivi AI",
    mainNavItems: [],
  });
}

export const meta: MetaFunction = () => [  
  { title: "Krivi AI | Ignite & Flow" }  
];  

export default function AppLayout() {
  const { user, appName, mainNavItems } = useLoaderData<typeof loader>();
  const sidebarUser = {
    name: user.name,
    email: user.email,
    avatar: "/avatars/default.png",
  };

  return (
    // WRAP THE ENTIRE SIDEBAR PROVIDER (OR JUST THE OUTLET PART IF SIDEBAR IS NOT CHAT RELATED)
    // WITH STREAMINGCHATPROVIDER. For chat apps, often the whole app structure is relevant.
    <SidebarChatHistoryProvider>
      <StreamingChatProvider>
        <SidebarProvider>
          <AppSidebar
            user={sidebarUser}
            appName={appName}
            mainNav={mainNavItems}
          />
          <SidebarInset>
            <div className="relative flex flex-col h-[100dvh] min-h-0 w-full">
              <header
                className="  
                sticky top-0 left-0 right-0 z-30 flex  
                h-[41px] md:h-[62px]  
                shrink-0 items-center gap-2 border-b border-border bg-background  
              "
              >
                <div className="flex items-center gap-2 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
                </div>
              </header>
              <main className="relative flex-1 min-h-0 w-full flex flex-col">
                {/* Outlet is where your /chat and /chat/:id routes render */}
                <Outlet />
              </main>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </StreamingChatProvider>
    </SidebarChatHistoryProvider>
  );
}