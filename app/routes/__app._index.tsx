// app/routes/__app._index.tsx
import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { ChatPageLayout } from "~/components/chat/ChatPageLayout";
import { requireAuth } from "~/lib/auth.server";
import type { Message } from "~/components/chat/MessageItem";

export const meta: MetaFunction = () => [{ title: "Krivi AI" }];  


export async function loader({ request }: LoaderFunctionArgs) {
  await requireAuth(request);
  return json({
    initialChatId: null,
    initialMessages: [],
  });
}

import { useMemo } from "react";
import { v4 as uuidv4 } from "uuid";

export default function AppRootNewChatPage() {
  // always generate a new unique id for new chat sessions
  const { initialMessages } = useLoaderData<{
    initialChatId: null;
    initialMessages: Message[];
  }>();
  const chatId = useMemo(() => uuidv4(), []);

  return (
    <ChatPageLayout
      key={chatId}
      initialChatIdFromLoader={chatId}
      initialMessagesProp={initialMessages}
    />
  );
}