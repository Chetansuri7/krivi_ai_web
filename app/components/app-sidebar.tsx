// components/app-sidebar.tsx
"use client";

import * as React from "react";
import { SidebarHeader as CustomSidebarHeader } from "./sidebar-header";
import { SidebarAccount } from "./sidebar-account";
import { SidebarNav, type NavItem } from "./sidebar-nav"; // Import NavItem
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";
import { Command } from "lucide-react"; // Default app icon
import { getApiUrl } from "~/lib/api.config"; // For logout
import { useNavigate } from "@remix-run/react"; // For navigation

// Define the props AppSidebar expects
interface AppSidebarComponentProps {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  appName: string;
  mainNav: NavItem[]; // Using NavItem type from sidebar-nav
  // Add other props that might be passed to the underlying Sidebar primitive
}

// Combine with the Sidebar primitive's props, excluding ones we manage
type AppSidebarProps = AppSidebarComponentProps & Omit<React.ComponentProps<typeof Sidebar>, keyof AppSidebarComponentProps>;


export function AppSidebar({
  user,
  appName,
  mainNav,
  className, // from React.ComponentProps<typeof Sidebar>
  ...props // other props for Sidebar primitive
}: AppSidebarProps) {
  const navigate = useNavigate();

  const handleNewChat = () => {
    console.log("New Chat clicked");
    // Implement your new chat logic here, e.g., navigate to a new chat route
    // navigate("/chat/new"); // Example
  };

  const handleLogout = async () => {
    // Navigate to the backend logout endpoint.
    // The backend should handle clearing HttpOnly cookies and invalidating the session.
    // After the backend logout, it should redirect the user, perhaps to the login page.
    try {
        const logoutUrl = getApiUrl("AUTH_LOGOUT");
        // We expect the backend to handle the redirect after logout.
        // If it just returns a success/failure, then navigate client-side.
        window.location.href = logoutUrl; // Simplest way to ensure cookies are handled by browser redirect
    } catch (error) {
        console.error("Failed to get logout URL:", error);
        // Fallback or error handling
        navigate("/login?error=logout_failed");
    }
  };


  return (
    <Sidebar
      {...props} // Pass through other props to the Sidebar primitive
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        className // Allow overriding classes
      )}
    >
      <SidebarHeader className="p-0">
        <CustomSidebarHeader
          appName={appName}
          appIcon={Command} // You can make appIcon a prop too if it varies
          onNewChat={handleNewChat}
        />
      </SidebarHeader>

      <SidebarContent className="flex-1 overflow-y-auto p-0">
        <SidebarNav mainNav={mainNav} />
      </SidebarContent>

      <SidebarFooter className="p-0 mt-auto border-t border-sidebar-border">
        <SidebarAccount user={user} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}