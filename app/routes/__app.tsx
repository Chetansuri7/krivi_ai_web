import type { LoaderFunctionArgs } from "@remix-run/node";  
import { json } from "@remix-run/node";  
import { Outlet, useLoaderData } from "@remix-run/react";  
import { requireAuth, type AuthenticatedUserDetails } from "~/lib/auth.server";  
import { AppSidebar } from "~/components/app-sidebar";  
import { SidebarProvider, SidebarInset } from "~/components/ui/sidebar";  
import { Command } from "lucide-react";  
import type { NavItem } from "~/components/sidebar-nav";  
  
// Define the loader return type (optional, for clarity)  
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
    mainNavItems: [], // always provide array, not null or [null]  
  });  
}  
  
export default function AppLayout() {  
  const { user, appName, mainNavItems } = useLoaderData<typeof loader>();  
  
  // Map AuthenticatedUserDetails to SidebarAccount's expected props  
  const sidebarUser = {  
    name: user.name,  
    email: user.email,  
    avatar: user.avatar_url || "/avatars/default.png",  
  };  
  
  return (  
    <SidebarProvider>  
      <AppSidebar  
        user={sidebarUser}  
        appName={appName}  
        mainNav={mainNavItems}  
      />  
      <SidebarInset>  
        {/* Outlet renders matched child route */}  
        <Outlet />  
      </SidebarInset>  
    </SidebarProvider>  
  );  
}  