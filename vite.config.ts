import path from "path";  
import { defineConfig } from "vite";  
import tsconfigPaths from "vite-tsconfig-paths";  
import { vitePlugin as remix } from "@remix-run/dev";  
  
export default defineConfig({  
  plugins: [  
    remix({  
      future: {  
        v3_fetcherPersist: true,  
        v3_relativeSplatPath: true,  
        v3_throwAbortReason: true,  
        v3_singleFetch: true,  
        v3_lazyRouteDiscovery: true,  
      },  
    }),  
    tsconfigPaths(),  
  ],  
  resolve: {  
    alias: {  
      tslib: path.resolve(__dirname, "node_modules", "tslib"),  
    },  
  },  
  server: {  
    port: 5173,  
    host: "0.0.0.0",  
    strictPort: true,  
    hmr: {  
      host: "localhost",  
    },  
    allowedHosts: ["dev-chat.krivilak.com"],
  },  
  preview: {  
    port: 5200,  
  },  
 
});  