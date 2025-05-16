import * as React from "react";  
import { Link, useNavigate } from "@remix-run/react";  
import { ChevronRight, type LucideIcon as LucideIconType } from "lucide-react";  
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";  
import { Button } from "~/components/ui/button";  
import { Separator } from "~/components/ui/separator";  
import { cn } from "~/lib/utils";  
import { getApiUrl } from "~/lib/api.config";  
  
type LucideIcon = LucideIconType;  
  
export interface NavSubItem {  
  id: string;  
  title: string;  
  href: string;  
  isActive?: boolean;  
}  
  
export interface NavItem {  
  id: string;  
  title: string;  
  href?: string;  
  icon?: LucideIcon;  
  isActive?: boolean;  
  subItems?: NavSubItem[]; // could be NavItem[] but keep as is for simplicity  
  isGroupLabel?: boolean;  
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
  
  chatSessions.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());  
  
  chatSessions.forEach(session => {  
    const sessionDate = new Date(session.lastMessageAt);  
    if (sessionDate >= todayStart)  
      sections.today.push(session);  
    else if (sessionDate >= yesterdayStart)  
      sections.yesterday.push(session);  
    else if (sessionDate >= sevenDaysAgoStart)  
      sections.prev7Days.push(session);  
    else if (sessionDate >= thirtyDaysAgoStart)  
      sections.prev30Days.push(session);  
  });  
  
  const createChatNavItem = (session: ApiChatSession): NavItem => ({  
    id: `chat-${session.chatId}`,  
    title: session.title.length > 30 ? session.title.substring(0, 27) + "..." : session.title,  
    href: `/chat/${session.chatId}`,  
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
/**  
 * For simple links (no sub-items), we disable prefetch for chat history entries (and all simple links by default).  
 * If you have other simple sidebar links you want to keep prefetch="intent", adjust the condition!  
 */  
const NavItemDisplay: React.FC<{ item: NavItem; isSubItem?: boolean }> = ({ item, isSubItem = false }) => {  
  const [isOpen, setIsOpen] = React.useState(item.isActive ?? false);  
  
  if (item.isGroupLabel) {  
    return (  
      <div className="px-3 pt-4 pb-1.5 text-[0.8125rem] font-semibold text-sidebar-foreground">  
        {item.title}  
      </div>  
    );  
  }  
  
  const commonButtonClasses = cn(  
    "w-full justify-start items-center gap-2.5 h-auto px-3 py-1.5 text-[0.8125rem] font-medium",  
    isSubItem && "pl-9 pr-3 py-1.5 text-xs",  
    item.isActive  
      ? "bg-sidebar-accent text-sidebar-accent-foreground"  
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",  
    "transition-colors rounded-md"  
  );  
  
  // --- SIMPLE LINK (no subItems): always prefetch="none" for chat history ---  
  if (!item.subItems || item.subItems.length === 0) {  
    return (  
      <Button  
        variant="ghost"  
        asChild  
        className={commonButtonClasses}  
        title={item.title}  
      >  
        <Link  
          to={item.href || "#"}  
          prefetch="none"  
        >  
          {item.icon && (  
            <item.icon className={cn("size-4 shrink-0", isSubItem && "size-3.5")} />  
          )}  
          <span className="truncate flex-1">{item.title}</span>  
        </Link>  
      </Button>  
    );  
  }  
  
  // ---- COLLAPSIBLE GROUP (could have its head as link) ----  
  return (  
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">  
      <div className="flex items-center">  
        <Button  
          variant="ghost"  
          asChild={!!item.href}  
          className={cn(commonButtonClasses, "flex-1")}  
          title={item.title}  
          onClick={!item.href ? (e) => { e.preventDefault(); setIsOpen(!isOpen); } : undefined}  
        >  
          {item.href ? (  
            <Link  
              to={item.href}  
              prefetch="none" // For collapsible main link, also prevent prefetch  
              onClick={(e) => {  
                if (item.subItems && item.subItems.length > 0) {  
                  e.preventDefault();  
                  setIsOpen(!isOpen);  
                }  
                // else allow navigation  
              }}  
            >  
              {item.icon && <item.icon className="size-4 shrink-0" />}  
              <span className="truncate flex-1">{item.title}</span>  
            </Link>  
          ) : (  
            <>  
              {item.icon && <item.icon className="size-4 shrink-0" />}  
              <span className="truncate flex-1">{item.title}</span>  
            </>  
          )}  
        </Button>  
        <CollapsibleTrigger asChild>  
          <Button variant="ghost" size="icon" className="ml-1 size-7 shrink-0">  
            <ChevronRight className={cn("size-3.5 transition-transform text-sidebar-foreground/60", isOpen && "rotate-90")} />  
            <span className="sr-only">Toggle {item.title}</span>  
          </Button>  
        </CollapsibleTrigger>  
      </div>  
      <CollapsibleContent className="pl-3.5 mt-0.5 space-y-0.5">  
        {/* Apply the same rule recursively to sub-items: prefetch="none" */}  
        {item.subItems.map((subItem) => (  
          <NavItemDisplay  
            key={subItem.id}  
            // If your subItems are not NavItem, but NavSubItem, convert accordingly:  
            item={{ ...subItem, icon: (subItem as any).icon || undefined }}  
            isSubItem  
          />  
        ))}  
      </CollapsibleContent>  
    </Collapsible>  
  );  
};  
// ----------- MAIN SIDEBARNAV COMPONENT -----------  
export function SidebarNav({ mainNav }: SidebarNavProps) {  
  const [chatHistoryNavItems, setChatHistoryNavItems] = React.useState<NavItem[]>([]);  
  const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);  
  const [errorHistory, setErrorHistory] = React.useState<string | null>(null);  
  
  const refreshChatHistory = React.useCallback(async () => {  
    setIsLoadingHistory(true);  
    setErrorHistory(null);  
    try {  
      const apiUrl = getApiUrl("CHAT_SESSION_LIST");  
      const response = await fetch(apiUrl, {  
        credentials: "include",  
        headers: { "Accept": "application/json" }  
      });  
      if (!response.ok) {  
        let errorData = `API Error: ${response.status} ${response.statusText}`;  
        try {  
          if (response.headers.get("content-type")?.includes("application/json")) {  
            const jsonData = await response.json();  
            errorData = jsonData.message || JSON.stringify(jsonData);  
          } else {  
            errorData = await response.text();  
          }  
        } catch (parseErr) { /* ignore, use statusText */ }  
        throw new Error(errorData);  
      }  
      const data: ApiChatSession[] = await response.json();  
      const processedNavItems = processChatHistoryToNavItems(data);  
      setChatHistoryNavItems(processedNavItems);  
    } catch (err) {  
      console.error("[SidebarNav] Failed to fetch/process chat history:", err);  
      setErrorHistory(err instanceof Error ? err.message : "An unknown error occurred.");  
      setChatHistoryNavItems([]);  
    } finally {  
      setIsLoadingHistory(false);  
    }  
  }, []);  
  
  React.useEffect(() => { refreshChatHistory(); }, [refreshChatHistory]);  
  
  return (  
    <div className="flex flex-col h-full p-2 space-y-1">  
      {mainNav.length > 0 && (  
        <nav className="space-y-0.5">  
          {mainNav.map((item) => <NavItemDisplay key={item.id} item={item} />)}  
        </nav>  
      )}  
  
      {(mainNav.length > 0 && (isLoadingHistory || chatHistoryNavItems.length > 0 || errorHistory)) && (  
        <Separator className="my-2 bg-border/60" />  
      )}  
  
      <div className="px-1 pt-1 pb-1 text-base font-semibold text-sidebar-foreground">  
        Chat History  
      </div>  
  
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">  
        {isLoadingHistory ? (  
          <div className="px-3 py-2 text-sm text-sidebar-foreground/70 text-center">  
            Loading history…  
          </div>  
        ) : errorHistory ? (  
          <div className="px-3 py-2 text-sm text-destructive text-center break-words">  
            Error: {errorHistory.substring(0, 150)}{errorHistory.length > 150 && "..."}  
            <Button variant="link" size="sm" onClick={refreshChatHistory} className="mt-1">  
              Try again  
            </Button>  
          </div>  
        ) : chatHistoryNavItems.length > 0 ? (  
          chatHistoryNavItems.map((item) => <NavItemDisplay key={item.id} item={item} />)  
        ) : (  
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 italic">  
            No chat history found.  
          </div>  
        )}  
      </div>  
    </div>  
  );  
}  