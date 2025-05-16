// app/routes/__app.tsx    
import type { LoaderFunctionArgs } from "@remix-run/node";  
import { json } from "@remix-run/node";  
import { Outlet, useLoaderData } from "@remix-run/react";  
  
import { requireAuth, type AuthenticatedUserDetails } from "~/lib/auth.server";  
import { AppSidebar } from "~/components/app-sidebar";  
import { SidebarProvider, SidebarInset, SidebarTrigger } from "~/components/ui/sidebar";  
import type { NavItem } from "~/components/sidebar-nav";  
import { Separator } from "~/components/ui/separator";  
  
export interface AppLoaderData {  
  user: AuthenticatedUserDetails;  
  appName: string;  
  mainNavItems: NavItem[];  
}  
  
export async function loader({ request }: LoaderFunctionArgs) {  
  await requireAuth(request);  
  // Provide only dummy data, until real user API is available  
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
  
  
export default function AppLayout() {  
  const { user, appName, mainNavItems } = useLoaderData<typeof loader>();  
  const sidebarUser = {  
    name: user.name,  
    email: user.email,  
    avatar: "/avatars/default.png",  
  };  
  
  return (  
    <SidebarProvider>  
      <AppSidebar  
        user={sidebarUser}  
        appName={appName}  
        mainNav={mainNavItems}  
      />  
      {/* This inset is the "main section" right of the sidebar */}  
      <SidebarInset>  
        {/* COLUMN FLEX for main app area */}  
        <div className="relative flex flex-col h-[100dvh] min-h-0 w-full"> {/* The main column, taking whole viewport height */}  
          {/* Fixed topbar: stays always at the top inside the app area */}  
          <header className="sticky top-0 left-0 right-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background">  
            <div className="flex items-center gap-2 px-4">  
              <SidebarTrigger className="-ml-1" />  
              <Separator orientation="vertical" className="mr-2 h-4 bg-border" />  
            </div>  
          </header>  
  
          {/* Main body below topbar, flexes to fill available height */}  
          <main className="relative flex-1 min-h-0 w-full flex flex-col">  
            {/* render whatever the route wants (in your case, ChatPageLayout)  
                 Make sure ChatPageLayout uses the available height!! */}  
            <Outlet />  
          </main>  
        </div>  
      </SidebarInset>  
    </SidebarProvider>  
  );  
}  