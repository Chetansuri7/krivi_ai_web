// app/routes/__app._index.tsx
import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ChatPageLayout } from "~/components/chat/ChatPageLayout";
import { requireAuth } from "~/lib/auth.server";
import type { Message } from "~/components/chat/MessageItem";

export const meta: MetaFunction = () => [{ title: "New Chat | Krivi AI" }];

export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return json({
    initialChatId: null,
    initialMessages: [],
  });
}

export default function AppRootNewChatPage() {
  const { initialChatId, initialMessages } = useLoaderData<{
    initialChatId: null;
    initialMessages: Message[];
  }>();

  return (
    <ChatPageLayout
      key="new-chat-page" // Stable key for the new chat page instance
      initialChatIdFromLoader={initialChatId}
      initialMessagesProp={initialMessages}
    />
  );
}