// components/sidebar-header.tsx  
"use client";  
import * as React from "react";  
import { Plus, type LucideIcon } from "lucide-react";  
import { Button } from "~/components/ui/button";  
import { cn } from "~/lib/utils";  
import { Link } from "@remix-run/react"; // For app logo link
  
interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {  
  appName: string;  
  appIcon: LucideIcon;  
  onNewChat?: () => void;  
}  
  
export function SidebarHeader({  
  className,  
  appName,  
  appIcon: AppIcon,  
  onNewChat,  
}: SidebarHeaderProps) {  
  return (  
    <div className={cn("flex flex-col gap-4 p-4", className)}>  
      <Link to="/" prefetch="intent" className="flex items-center gap-3 focus:outline-none group">  
        <span className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground transition-colors group-hover:bg-sidebar-primary/90 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2  group-focus-visible:ring-offset-sidebar">  
          <AppIcon className="size-5" />  
        </span>  
        <span className="font-semibold text-xl tracking-tight text-sidebar-foreground transition-colors group-hover:text-sidebar-foreground/80">  
          {appName}  
        </span>  
      </Link>  
      <Button  
        variant="default" // Ensure this variant uses sidebar-primary colors or adjust
        size="sm"  
        className={cn(  
          "w-full flex items-center justify-start gap-2 py-1.5 px-1", // Reduced padding slightly for "New Chat" for better look if text is short
          "text-sm font-medium rounded-md transition-colors",  
          // Assuming 'default' variant is styled appropriately for primary action in sidebar
          // If not, explicitly set: "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"  
        )}  
        onClick={onNewChat}  
      >  
        <Plus className="size-4" />  
        <span>New Chat</span>  
      </Button>  
    </div>  
  );  
}