import type { MetaFunction } from "@remix-run/node";
import { useState } from "react"; // Need useState for Dialog

// Import required shadcn/ui components
// Adjust import paths if your setup is different
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "~/components/ui/dialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "~/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip"; // Requires TooltipProvider wrapper
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator"; // Good for spacing/visual break
import { Label } from "~/components/ui/label"; // Useful with inputs/forms

// Example icon - install lucide-react if not already
import { Info } from "lucide-react";


export const meta: MetaFunction = () => {
  return [
    { title: "Remix + Shadcn Theme Showcase" },
    { name: "description", content: "Demonstrating shadcn components with a custom theme in Remix." },
  ];
};

export default function ThemeShowcase() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    // Basic container for layout. Applies background/text color from _root.tsx/globals.css
    <main className="container mx-auto py-8 px-4 font-sans"> {/* Using font-sans from your theme */}

      {/* === Title Section === */}
      <h1 className="text-4xl font-bold text-center mb-8">Remix + shadcn/ui Theme Showcase</h1>
      <p className="text-center text-muted-foreground mb-12">
        This page displays various shadcn/ui components using the custom theme defined in your CSS file.
        <br/> (Designed primarily for Light Mode based on the provided CSS root variables)
      </p>

      {/* === Typography & Colors Showcase === */}
      <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Typography & Colors</h2>
          {/* Colors are applied via tailwind classes based on your CSS variables */}
          <div className="grid gap-4 mb-6">
              <p className="text-foreground">Default Foreground text.</p>
              <p className="text-primary">Primary text color.</p>
              <p className="text-secondary-foreground bg-secondary p-2 rounded">Secondary text on Secondary background.</p>
              <p className="text-muted-foreground bg-muted p-2 rounded">Muted text on Muted background.</p>
              <p className="text-accent-foreground bg-accent p-2 rounded">Accent text on Accent background.</p>
              <p className="text-destructive-foreground bg-destructive p-2 rounded">Destructive text on Destructive background.</p>
          </div>
          <h3 className="text-xl font-semibold mb-2">Fonts</h3>
          {/* Font faces are applied via tailwind classes based on your CSS variables */}
          <div className="grid gap-2">
              <p className="font-sans">This is text using the Sans-serif font (Plus Jakarta Sans).</p>
              <p className="font-serif">This is text using the Serif font (Lora).</p>
              <p className="font-mono">This is text using the Monospace font (Roboto Mono).</p>
          </div>
      </section>

      <Separator className="my-8" /> {/* Visual separator */}

      {/* === Buttons Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Primary (Default)</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
          <Button>
            <Info className="mr-2 h-4 w-4" />
            With Icon
          </Button>
        </div>
      </section>

       <Separator className="my-8" />

      {/* === Cards Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Card</h2>
        <Card className="w-[350px]"> {/* Example fixed width */}
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description providing context or summary.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the main content area within the card body.</p>
            <p className="mt-2 text-sm text-muted-foreground">More text, perhaps smaller.</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button>Deploy</Button>
          </CardFooter>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* === Inputs & Selects Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Inputs & Selects</h2>
        <div className="grid w-full max-w-sm items-center gap-4">
            <div className="grid gap-1.5">
                 <Label htmlFor="email">Your Email</Label>
                 <Input type="email" id="email" placeholder="Email" />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="status">Status</Label>
                 <Select>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                 </Select>
             </div>
        </div>
      </section>

      <Separator className="my-8" />

      {/* === Dialog Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Dialog</h2>
        {/* Dialog requires state to control its open/close state */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]"> {/* sm:max-w is a common pattern */}
                <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input id="name" defaultValue="Pedro Duarte" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="username" className="text-right">
                    Username
                    </Label>
                    <Input id="username" defaultValue="@peduarte" className="col-span-3" />
                </div>
                </div>
                <DialogFooter>
                 {/* Close button needs DialogClose or onOpenChange={} */}
                 <DialogClose asChild>
                    <Button type="button" variant="secondary">Close</Button>
                 </DialogClose>
                <Button type="submit">Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </section>

      <Separator className="my-8" />

      {/* === Accordion Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Accordion</h2>
        <Accordion type="single" collapsible className="w-full max-w-md"> {/* Example width */}
             <AccordionItem value="item-1">
                 <AccordionTrigger>Is it accessible?</AccordionTrigger>
                 <AccordionContent>
                     Yes. It adheres to the WAI-ARIA design pattern.
                 </AccordionContent>
             </AccordionItem>
             <AccordionItem value="item-2">
                 <AccordionTrigger>Is it styled?</AccordionTrigger>
                 <AccordionContent>
                     Yes. Comes with default styles that you can override.
                 </AccordionContent>
             </AccordionItem>
             <AccordionItem value="item-3">
                 <AccordionTrigger>Is it animated?</AccordionTrigger>
                 <AccordionContent>
                     Yes. It's animated by default, but you can disable it.
                 </AccordionContent>
             </AccordionItem>
         </Accordion>
      </section>

      <Separator className="my-8" />

       {/* === Tabs Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Tabs</h2>
        <Tabs defaultValue="account" className="w-full max-w-md"> {/* Example width */}
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="account" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <CardDescription>
                        Make changes to your account here. Click save when you're done.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Your form content for account */}
                         <div className="grid gap-1.5">
                             <Label htmlFor="name">Name</Label>
                             <Input id="name" defaultValue="Example User" />
                         </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Save changes</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="password" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Password</CardTitle>
                        <CardDescription>
                        Change your password here. After saving, you'll be logged out.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                       {/* Your form content for password */}
                       <div className="grid gap-1.5">
                             <Label htmlFor="current">Current password</Label>
                             <Input id="current" type="password" />
                         </div>
                         <div className="grid gap-1.5">
                             <Label htmlFor="new">New password</Label>
                             <Input id="new" type="password" />
                         </div>
                    </CardContent>
                    <CardFooter>
                        <Button>Save password</Button>
                    </CardFooter>
                </Card>
            </TabsContent>
        </Tabs>
      </section>

      <Separator className="my-8" />

      {/* === Popover Section === */}
      <section className="mb-12">
         <h2 className="text-2xl font-semibold mb-4">Popover</h2>
         <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline">Open Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80"> {/* Example width */}
                  <div className="grid gap-4">
                      <div className="space-y-2">
                          <h4 className="font-medium leading-none">Dimensions</h4>
                          <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
                      </div>
                      <div className="grid gap-2">
                          <div className="grid grid-cols-3 items-center gap-4">
                              <Label htmlFor="width">Width</Label>
                              <Input id="width" defaultValue="100%" className="col-span-2 h-8" />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                              <Label htmlFor="maxWidth">Max. width</Label>
                              <Input id="maxWidth" defaultValue="300px" className="col-span-2 h-8" />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                              <Label htmlFor="height">Height</Label>
                              <Input id="height" defaultValue="25px" className="col-span-2 h-8" />
                          </div>
                          <div className="grid grid-cols-3 items-center gap-4">
                              <Label htmlFor="maxHeight">Max. height</Label>
                              <Input id="maxHeight" defaultValue="not set" className="col-span-2 h-8" />
                          </div>
                      </div>
                  </div>
              </PopoverContent>
          </Popover>
      </section>

      <Separator className="my-8" />

      {/* === Tooltip Section === */}
      <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Tooltip (Hover over button)</h2>
          {/* Tooltip requires a Provider wrapper */}
          <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="outline">Hover Me</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                      <p>This is a helpful tooltip!</p>
                  </TooltipContent>
              </Tooltip>
          </TooltipProvider>
      </section>

       <Separator className="my-8" />

      {/* === Alert Section === */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Alert</h2>
        <Alert className="max-w-lg"> {/* Example width */}
            <Info className="h-4 w-4" /> {/* Example icon */}
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
                You can add components and dependencies to your app using the shadcn/ui cli.
            </AlertDescription>
        </Alert>
      </section>

      <Separator className="my-8" />

      {/* === Badges Section === */}
       <section className="mb-12">
           <h2 className="text-2xl font-semibold mb-4">Badges</h2>
           <div className="flex flex-wrap gap-2">
               <Badge>Default</Badge>
               <Badge variant="secondary">Secondary</Badge>
               <Badge variant="outline">Outline</Badge>
               <Badge variant="destructive">Destructive</Badge>
               <Badge className="bg-primary text-primary-foreground hover:bg-primary/80">Custom Badge Color</Badge> {/* Example applying theme colors directly */}
           </div>
       </section>

      {/* ... Add more components here as needed ... */}

    </main>
  );
}
