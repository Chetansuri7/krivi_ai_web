// app/components/chat/InitialGreeting.tsx  
import React from "react";  
  
export function InitialGreeting() {  
  return (  
<div className="flex flex-1 flex-col justify-center items-center min-h-0">  
      <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-neutral-900 dark:text-neutral-100 text-center">  
        How can I help you today?  
      </h1>  
      <div className="h-1 w-24 bg-primary/40 rounded-full my-4" />  
      <p className="text-neutral-500 dark:text-neutral-400 text-center">  
        Start typing below or ask anything.  
      </p>  
    </div>  
  );  
}  