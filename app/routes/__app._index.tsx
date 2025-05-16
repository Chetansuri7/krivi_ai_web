// app/routes/__app.page.tsx
// SidebarProvider, AppSidebar, SidebarInset are now in __app.tsx layout
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar"; // Still needed for the header toggle
// Potentially import MetaFunction if this page needs specific meta tags
// import type { MetaFunction } from "@remix-run/node";
// import { useRouteLoaderData } from "@remix-run/react";
// import type { AppLoaderData } from "../__app";

// export const meta: MetaFunction = () => { return [{ title: "My Page" }]};

export default function AppPage() { // Changed name for clarity, can be 'Page'
  // const appData = useRouteLoaderData<AppLoaderData>("routes/__app");
  // Access user data via appData.user if needed here

  return (
    <>
      {/* This header is part of the content for this specific page */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-border" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#" className="text-foreground hover:text-primary">
                  Building Your Application
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block text-muted-foreground" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground">Data Fetching</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      {/* Page-specific content */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-2">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
          <div className="aspect-video rounded-xl bg-muted/50" />
        </div>
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
      </div>
    </>
  );
}