import { useEffect, useRef } from 'react';  
  
export function useSidebarHistoryRefreshOnChatChange(initialChatIdFromLoader: string | null, refreshChatHistory: () => void) {  
  const prevChatIdRef = useRef<string | null>(null);  
  
  useEffect(() => {  
    if (  
      prevChatIdRef.current === null && // previously on new chat  
      initialChatIdFromLoader !== null // now on an actual chat  
    ) {  
      refreshChatHistory();  
    }  
    prevChatIdRef.current = initialChatIdFromLoader;  
  }, [initialChatIdFromLoader, refreshChatHistory]);  
}  