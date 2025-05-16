import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node"; // No loader needed here if __app.tsx handles auth

import "./tailwind.css";

export const links: LinksFunction = () => [  
  { rel: "preconnect", href: "https://fonts.googleapis.com" },  
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },  
  {  
    rel: "stylesheet",  
    href:  
      "https://fonts.googleapis.com/css2?" +  
      "family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&" +  
      "family=Source+Serif+4:ital@0;1&" +  
      "family=JetBrains+Mono:wght@400;700&" +  
      "display=swap",  
  },  
];  

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  // This Outlet will render __app.tsx (for protected routes) or login.tsx, etc.
  return <Outlet />;
}