// app/routes/__app._index.tsx
import { useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { requireAuth } from "~/lib/auth.server";
import { ChatPageLayout } from "~/components/chat/ChatPageLayout";
import type { Message } from "~/components/chat/MessageItem"; // Adjust path

export const meta: MetaFunction = () => [{ title: "New Chat | Krivi AI" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  // For a new chat at the app root, initialChatId is null.
  // No initial messages unless we implement "restore unsaved new chat" later.
  return json({ initialChatId: null, initialMessages: [] });
}

export default function AppRootNewChatPage() {
  const { initialChatId, initialMessages } = useLoaderData<{ 
    initialChatId: null; 
    initialMessages: Message[]; 
  }>();

  // Crucially, ChatPageLayout itself is NOT keyed here.
  // Its internal logic handles the "new chat" state based on initialChatId being null.
  return <ChatPageLayout initialChatId={initialChatId} initialMessages={initialMessages} />;
}