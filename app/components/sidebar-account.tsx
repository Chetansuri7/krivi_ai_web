// components/sidebar-account.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { LogOut, Settings2, User2, ChevronsUpDown } from "lucide-react";
import Cookies from "js-cookie";
import { useNavigate } from "@remix-run/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
import { getApiUrl } from "~/lib/api.config";

interface User {
  name: string;
  email: string;
  avatar: string; // URL to avatar image
}

// interface SidebarAccountProps {
//   user: User; // User prop removed, will be fetched from cookies
//   onLogout?: () => void; // Optional: For handling logout action - will be handled internally
// }

export function SidebarAccount(/*{ user, onLogout }: SidebarAccountProps*/) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const email = Cookies.get("kwikon_ui_email") || "";
    const displayName = Cookies.get("kwikon_ui_displayname");
    const firstName = Cookies.get("kwikon_ui_firstname");
    const lastName = Cookies.get("kwikon_ui_lastname");
    const profilePictureUrl = Cookies.get("kwikon_ui_profilepictureurl") || "";

    let name = "User";
    if (displayName) {
      name = displayName;
    } else if (firstName && lastName) {
      name = `${firstName} ${lastName}`;
    } else if (firstName) {
      name = firstName;
    }

    if (email) {
      setUser({
        name,
        email,
        avatar: profilePictureUrl,
      });
    }
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleLogout = async () => {
    try {
      const logoutUrl = getApiUrl("AUTH_LOGOUT");
      await fetch(logoutUrl, {
        method: "POST",
        credentials: "include", // Important to send cookies
      });
    } catch (error) {
      console.error("Logout API call failed:", error);
      // Proceed with client-side cleanup even if API call fails
    } finally {
      // Clear all relevant cookies
      const cookieNames = [
        "kwikon_at",
        "kwikon_rt",
        "kwikon_ui_email",
        "kwikon_ui_displayname",
        "kwikon_ui_firstname",
        "kwikon_ui_lastname",
        "kwikon_ui_profilepictureurl",
      ];
      cookieNames.forEach((cookieName) => {
        Cookies.remove(cookieName, { path: "/" }); // Ensure path is correct if cookies were set with a specific path
      });
      // Redirect to login page
      navigate("/login");
    }
  };

  if (!user) {
    // Optionally, render a loading state or nothing if user data isn't available
    // For now, if no user (e.g. no email cookie), don't render the component
    // Or redirect to login if preferred:
    // useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
    return null;
  }

  return (
    <div className="w-full p-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 h-auto text-left",
              "text-sm font-medium rounded-md transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            )}
            aria-label="Open user menu"
          >
            <Avatar className="size-8 rounded-md">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-md bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid leading-tight">
              <span className="font-semibold truncate text-sidebar-foreground">{user.name}</span>
              <span className="text-xs truncate text-sidebar-foreground/70">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-sidebar-foreground/60 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          sideOffset={8}
          className="w-[calc(var(--radix-popover-trigger-width)+20px)] min-w-56 p-1.5 rounded-lg shadow-xl bg-popover text-popover-foreground border border-border"
        >
          <div className="flex items-center gap-3 p-2.5 border-b border-border mb-1">
            <Avatar className="size-9 rounded-md">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-sm">
                 {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 grid leading-tight">
              <p className="text-sm font-semibold text-popover-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <nav className="flex flex-col gap-0.5">
            <Button variant="ghost" className="w-full justify-start gap-2.5 px-2.5 py-2 text-sm h-auto font-normal text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md">
              <User2 className="size-4 text-muted-foreground" /> My Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2.5 px-2.5 py-2 text-sm h-auto font-normal text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md">
              <Settings2 className="size-4 text-muted-foreground" /> Settings
            </Button>
            <Separator className="my-1 bg-border" />
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start gap-2.5 px-2.5 py-2 text-sm h-auto font-normal text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md"
            >
              <LogOut className="size-4" /> Logout
            </Button>
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  );
}