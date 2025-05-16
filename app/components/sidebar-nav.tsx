// /app/components/sidebar-nav.tsx

import * as React from "react";
import { ChevronRight, type LucideIcon as LucideIconType } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { cn } from "~/lib/utils";
// import { getApiUrl } from "~/lib/api.config"; // Temporarily commented out for direct URL usage below

type LucideIcon = LucideIconType;

// --- Types ---
interface NavSubItem {
  id: string;
  title: string;
  href: string;
  isActive?: boolean;
}

interface NavItem {
  id: string;
  title: string;
  href?: string;
  icon?: LucideIcon;
  isActive?: boolean;
  subItems?: NavSubItem[];
  isGroupLabel?: boolean;
  chatId?: string;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

interface SidebarNavProps {
  mainNav: NavItem[];
}

interface ApiChatSession {
  chatId: string;
  title: string;
  createdAt: string;
  lastMessageAt: string;
}

// --- Utility ---

const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const processChatHistoryToNavItems = (chatSessions: ApiChatSession[]): NavItem[] => {
  const navItems: NavItem[] = [];
  if (!Array.isArray(chatSessions) || chatSessions.length === 0) return navItems;

  const now = new Date();
  const todayStart = getStartOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const sevenDaysAgoStart = new Date(todayStart);
  sevenDaysAgoStart.setDate(todayStart.getDate() - 7);
  const thirtyDaysAgoStart = new Date(todayStart);
  thirtyDaysAgoStart.setDate(todayStart.getDate() - 30);

  const sections: { [key: string]: ApiChatSession[] } = {
    today: [],
    yesterday: [],
    prev7Days: [],
    prev30Days: [],
  };

  // Ensure sessions are sorted by lastMessageAt descending if not already from API
  // For example: chatSessions.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  chatSessions.forEach(session => {
    const sessionDate = new Date(session.lastMessageAt);
    if (sessionDate >= todayStart)      sections.today.push(session);
    else if (sessionDate >= yesterdayStart) sections.yesterday.push(session);
    else if (sessionDate >= sevenDaysAgoStart) sections.prev7Days.push(session);
    else if (sessionDate >= thirtyDaysAgoStart) sections.prev30Days.push(session);
  });

  const createChatNavItem = (session: ApiChatSession): NavItem => ({
    id: `chat-${session.chatId}`,
    title: session.title.length > 30 ? session.title.substring(0, 27) + "..." : session.title,
    href: `/chat/${session.chatId}`, // This href can be used by Remix's <Link> component
    chatId: session.chatId,
    onClick: (e) => {
      e.preventDefault();
      // For Remix, prefer client-side navigation using <Link to={...}> or useNavigate()
      // to avoid full page reloads.
      // Example: navigate(`/chat/${session.chatId}`);
      // For now, using window.location.href as per existing structure:
      window.location.href = `/chat/${session.chatId}`;
    },
  });

  if (sections.today.length > 0) {
    navItems.push({ id: 'ch-label-today', title: 'Today', isGroupLabel: true });
    sections.today.forEach(s => navItems.push(createChatNavItem(s)));
  }
  if (sections.yesterday.length > 0) {
    navItems.push({ id: 'ch-label-yesterday', title: 'Yesterday', isGroupLabel: true });
    sections.yesterday.forEach(s => navItems.push(createChatNavItem(s)));
  }
  if (sections.prev7Days.length > 0) {
    navItems.push({ id: 'ch-label-prev7', title: 'Previous 7 days', isGroupLabel: true });
    sections.prev7Days.forEach(s => navItems.push(createChatNavItem(s)));
  }
  if (sections.prev30Days.length > 0) {
    navItems.push({ id: 'ch-label-prev30', title: 'Previous 30 days', isGroupLabel: true });
    sections.prev30Days.forEach(s => navItems.push(createChatNavItem(s)));
  }

  return navItems;
};

// --- NavItemDisplay ---

const NavItemDisplay: React.FC<{ item: NavItem; isSubItem?: boolean }> = ({ item, isSubItem = false }) => {
  const [isOpen, setIsOpen] = React.useState(item.isActive ?? false);

  if (item.isGroupLabel) {
    return <div className="px-3 pt-4 pb-1.5 text-[0.8125rem] font-semibold text-sidebar-foreground">
      {item.title}
    </div>;
  }

  // For simple links (including chat history items)
  // If item.href is a Remix route, consider using <Link to={item.href} prefetch="intent">
  // instead of <a href={...}> for client-side navigation.
  if (!item.subItems || item.subItems.length === 0) {
    return (
      <Button
        variant="ghost"
        asChild
        className={cn(
          "w-full justify-start items-center gap-2.5 h-auto px-3 py-1.5 text-[0.8125rem] font-medium",
          isSubItem && "pl-9 pr-3 py-1.5 text-xs", // Indent sub-items
          item.isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground" // Active state
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground", // Default and hover
          "transition-colors rounded-md"
        )}
        title={item.title} // Show full title on hover
      >
        <a href={item.href || "#"} onClick={item.onClick}>
          {item.icon && <item.icon className={cn("size-4 shrink-0", isSubItem && "size-3.5")} />}
          <span className="truncate flex-1">{item.title}</span>
        </a>
      </Button>
    );
  }

  // For collapsible items
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <div className="flex items-center">
        <Button
          variant="ghost"
          asChild
          className={cn(
            "w-full justify-start items-center gap-2.5 h-auto px-3 py-1.5 text-[0.8125rem] font-medium flex-1",
            item.isActive && !isOpen // Active but closed
              ? "bg-sidebar-accent/70 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            "transition-colors rounded-md"
          )}
          title={item.title}
        >
          <a
            href={item.href || "#"}
            onClick={(e) => {
              if (item.subItems && item.subItems.length > 0) {
                e.preventDefault(); // Prevent navigation if it's a collapsible trigger
                setIsOpen(!isOpen);
              } else if (item.onClick) {
                item.onClick(e); // Call custom onClick if provided (e.g., for chat items)
              }
            }}
          >
            {item.icon && <item.icon className="size-4 shrink-0" />}
            <span className="truncate flex-1">{item.title}</span>
          </a>
        </Button>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="ml-1 size-7 shrink-0">
            <ChevronRight className={cn("size-3.5 transition-transform text-sidebar-foreground/60", isOpen && "rotate-90")} />
            <span className="sr-only">Toggle {item.title}</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pl-3.5 mt-0.5 space-y-0.5"> {/* Indent sub-items */}
        {item.subItems.map((subItem) => (
          <NavItemDisplay
            key={subItem.id}
            item={{ ...subItem, icon: (subItem as any).icon || (() => null) }} // Pass empty icon for subitems if not defined
            isSubItem
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// --- SidebarNav (Main) ---

export function SidebarNav({ mainNav }: SidebarNavProps) {
  const [chatHistoryNavItems, setChatHistoryNavItems] = React.useState<NavItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);
  const [errorHistory, setErrorHistory] = React.useState<string | null>(null);

  const refreshChatHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    setErrorHistory(null);
    console.log("[SidebarNav] Refreshing chat history…");

    try {
      // Using direct URL as requested for now:
      const apiUrl = "https://api-chat.kwikon.club/api/chat/session_list";
      // When ready, switch back to:
      // const apiUrl = getApiUrl("CHAT_SESSION_LIST");
      console.log("[SidebarNav] Fetch URL:", apiUrl);

      const response = await fetch(apiUrl, {
        credentials: "include", // Essential for HttpOnly cookies
        headers: {
          "Accept": "application/json" // Good practice to specify expected response type
        }
      });
      console.log("[SidebarNav] Status:", response.status, response.statusText);

      if (!response.ok) {
        let errorData: string = `Raw response: ${response.status} ${response.statusText}`;
        try {
          if (response.headers.get("content-type")?.includes("application/json")) {
            const jsonData = await response.json();
            errorData = JSON.stringify(jsonData);
          } else {
            errorData = await response.text();
          }
        } catch (parseErr) {
          // console.warn("[SidebarNav] Could not parse error response body:", parseErr);
          // errorData remains the raw status text if parsing fails
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}. Details: ${errorData}`);
      }

      const data: ApiChatSession[] = await response.json();
      // console.log("[SidebarNav] Data received:", data);

      const processedNavItems = processChatHistoryToNavItems(data);
      setChatHistoryNavItems(processedNavItems);
    } catch (err) {
      // console.error("[SidebarNav] Failed to fetch/process chat history:", err);
      setErrorHistory(err instanceof Error ? err.message : "An unknown error occurred fetching history.");
      setChatHistoryNavItems([]); // Clear items on error
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  React.useEffect(() => {
    refreshChatHistory();
  }, [refreshChatHistory]);

  return (
    <div className="flex flex-col h-full p-2 space-y-1"> {/* Main container for sidebar nav content */}
      {/* Main Navigation Section */}
      {mainNav.length > 0 && (
        <nav className="space-y-0.5"> {/* Adjust gap with space-y-* */}
          {mainNav.map((item) => <NavItemDisplay key={item.id} item={item} />)}
        </nav>
      )}

      {/* Separator between main nav and chat history */}
      {mainNav.length > 0 && (isLoadingHistory || chatHistoryNavItems.length > 0 || errorHistory) && (
        <Separator className="my-2 bg-border/60" />
      )}

      {/* Chat History Title */}
      <div className="px-1 pt-1 pb-1 text-base font-semibold text-sidebar-foreground">
        Chat History
      </div>

      {/* Chat History Section (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
        {isLoadingHistory ? (
          <div className="px-3 py-2 text-sm text-sidebar-foreground/70 text-center">
            Loading history…
          </div>
        ) : errorHistory ? (
          <div className="px-3 py-2 text-sm text-destructive text-center break-words">
            Error fetching history.<br />
            <span className="text-xs text-muted-foreground">
              {/* Show a snippet of the error */}
              {errorHistory.substring(0, 200)}
              {errorHistory.length > 200 ? "..." : ""}
            </span>
          </div>
        ) : chatHistoryNavItems.length > 0 ? (
          chatHistoryNavItems.map((item) => (
            <NavItemDisplay key={item.id} item={item} />
          ))
        ) : (
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 italic">
            No chat history found.
          </div>
        )}
      </div>
    </div>
  );
}