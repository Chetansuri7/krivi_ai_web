import * as React from 'react';  
  
interface SidebarChatHistoryContextType {  
  refreshChatHistory: () => void;  
  lastRefreshTimestamp: number;  
}  
  
const SidebarChatHistoryContext = React.createContext<SidebarChatHistoryContextType>({  
  refreshChatHistory: () => {},  
  lastRefreshTimestamp: 0,  
});  
  
export function SidebarChatHistoryProvider({ children }: { children: React.ReactNode }) {  
  const [lastRefreshTimestamp, setLastRefreshTimestamp] = React.useState(Date.now());  
  const refreshChatHistory = React.useCallback(() => setLastRefreshTimestamp(Date.now()), []);  
  return (  
    <SidebarChatHistoryContext.Provider value={{ refreshChatHistory, lastRefreshTimestamp }}>  
      {children}  
    </SidebarChatHistoryContext.Provider>  
  );  
}  
  
export function useSidebarChatHistory() {  
  return React.useContext(SidebarChatHistoryContext);  
}  