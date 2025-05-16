// components/sidebar-header.tsx  
"use client";  
import * as React from "react";  
import { Plus, type LucideIcon } from "lucide-react";  
import { Button } from "~/components/ui/button";  
import { cn } from "~/lib/utils";  
  
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
      {/* Logo & App Name */}  
      <a href="#" className="flex items-center gap-3">  
        <span className="flex aspect-square size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground transition-colors">  
          <AppIcon className="size-5" />  
        </span>  
        <span className="font-semibold text-xl tracking-tight text-sidebar-foreground transition-colors">  
          {appName}  
        </span>  
      </a>  
      {/* + New Chat Button */}  
      <Button  
        variant="default"
        size="sm"  
        
        className={cn(  
          "w-full flex items-center justify-start gap-2 py-1.5 px-1",  
          "text-sm font-medium rounded-md transition-colors",  
          "bg-sidebar-primary text-sidebar-primary-foreground",  
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