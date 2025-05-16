// components/sidebar-account.tsx
"use client";

import * as React from "react";
import { LogOut, Settings2, User2, ChevronsUpDown, Palette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"; // Assuming Popover or DropdownMenu
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"; // Assuming Avatar component
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
// import { useTheme } from "next-themes"; // If you implement theme switching

interface User {
  name: string;
  email: string;
  avatar: string;
}

interface SidebarAccountProps {
  user: User;
}

export function SidebarAccount({ user }: SidebarAccountProps) {
  // const { theme, setTheme } = useTheme(); // Example for theme toggle

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="w-full p-3"> {/* Consistent padding */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost" // Use ghost for a less prominent but interactive trigger
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 h-auto text-left",
              "text-sm font-medium rounded-md transition-colors",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar",
              "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            )}
            aria-label="Open user menu"
          >
            <Avatar className="size-8 rounded-md"> {/* Shadcn-like rounded-md avatar */}
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
          align="end" // Align to the end of the trigger
          side="top"    // Position popover above the button
          sideOffset={8}
          className="w-[calc(var(--radix-popover-trigger-width)+20px)] min-w-56 p-1.5 rounded-lg shadow-xl bg-popover text-popover-foreground border border-border"
        >
          {/* User Info in Popover Header */}
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
            {/* Example Theme Toggle */}
            {/*
            <Button
                variant="ghost"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="w-full justify-start gap-2.5 px-2.5 py-2 text-sm h-auto font-normal text-popover-foreground hover:bg-accent hover:text-accent-foreground rounded-md"
            >
                <Palette className="size-4 text-muted-foreground" />
                <span>Switch to {theme === "light" ? "Dark" : "Light"} Mode</span>
            </Button>
            */}
            <Separator className="my-1 bg-border" />
            <Button variant="ghost" className="w-full justify-start gap-2.5 px-2.5 py-2 text-sm h-auto font-normal text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md">
              <LogOut className="size-4" /> Logout
            </Button>
          </nav>
        </PopoverContent>
      </Popover>
    </div>
  );
}