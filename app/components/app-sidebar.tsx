// components/app-sidebar.tsx
"use client"; // If any child components use client-side hooks

import * as React from "react";
import { SidebarHeader as CustomSidebarHeader } from "./sidebar-header";
import { SidebarAccount } from "./sidebar-account";
import { SidebarNav } from "./sidebar-nav";
import {
  Sidebar,
  SidebarContent, // Primitive from your UI kit
  SidebarFooter,   // Primitive from your UI kit
  SidebarHeader,   // Primitive from your UI kit
  // SidebarRail, // Assuming this is still part of your setup if needed
} from "~/components/ui/sidebar"; // Adjusted path
import { cn } from "~/lib/utils"; // Adjusted path
import { Command } from "lucide-react"; // For the logo

// Example data structure inspired by Shadcn's, to be passed down
// You might fetch this or define it more centrally
const sidebarData = {
  appName: "Krivi AI",
  user: {
    name: "User Name", // Replace with actual user data
    email: "user@example.com",
    avatar: "/avatars/default.png", // Provide a default or user-specific avatar
  },
   mainNav: [], // <--- nothing & you already have Chat History heading in SidebarNav  

  projectNav: [
    // Add project-like navigation items here
  ],
  secondaryNav: [
    // Add support/feedback-like items here
  ],
};


export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const handleNewChat = () => {
    console.log("New Chat clicked");
    // Implement your new chat logic here
  };

  return (
    <Sidebar
      // variant="inset" // If your Sidebar primitive supports this like Shadcn's
      {...props}
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        props.className
      )}
    >
      {/* Using UI Kit's SidebarHeader primitive for the top section */}
      <SidebarHeader className="p-0"> {/* Remove primitive's padding if custom component handles it */}
        <CustomSidebarHeader
          appName={sidebarData.appName}
          appIcon={Command}
          onNewChat={handleNewChat}
        />
      </SidebarHeader>

      {/* Using UI Kit's SidebarContent primitive for the scrollable middle section */}
      <SidebarContent className="flex-1 overflow-y-auto p-0"> {/* Remove primitive's padding if custom component handles it */}
        <SidebarNav
          mainNav={sidebarData.mainNav}
          // Pass other nav sections if defined
        />
      </SidebarContent>

      {/* Using UI Kit's SidebarFooter primitive for the ~ section */}
      <SidebarFooter className="p-0 mt-auto border-t border-sidebar-border"> {/* Remove primitive's padding */}
        <SidebarAccount user={sidebarData.user} />
      </SidebarFooter>

      {/* <SidebarRail /> Potentially, if your UI kit uses this for collapsed state */}
    </Sidebar>
  );
}