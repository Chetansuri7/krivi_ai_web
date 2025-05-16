// app/routes/__app.chat.$chatId.tsx
import { useLoaderData, useLocation } from "@remix-run/react"; // Added useLocation
import { json, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { requireAuth } from "~/lib/auth.server";
import { ChatPageLayout } from "~/components/chat/ChatPageLayout";
import type { Message } from "~/components/chat/MessageItem";
import { API_HISTORY_URL_BASE } from "~/lib/ai-models";

export const meta: MetaFunction = ({ params }) => [{ title: `Chat ${params.chatId ? `- ${params.chatId.substring(0,8)}` : ''} | Krivi AI` }];

interface LoaderData {
  chatId: string;
  initialMessages: Message[];
  error?: string;
  fromNewChatFlow?: boolean; // From navigation state
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<ReturnType<typeof json<LoaderData>>> {
  await requireAuth(request);
  const chatId = params.chatId;

  if (!chatId) {
    throw new Response("Chat ID missing", { status: 400 });
  }

  // Check if this load is due to navigation from a new chat flow (see ChatPageLayout navigate state)
  // In a real app, you might get `location.state` on the client, but loader runs on server.
  // The `fromNewChatFlow` flag is more illustrative for client-side logic post-load.
  // For the loader, we always try to fetch history if a chatId is present.
  // The client can then decide whether to use loader messages or state messages.

  let messagesFromHistory: Message[] = [];
  const historyUrl = `${API_HISTORY_URL_BASE}${chatId}/history?limit=50`;

  try {
    const response = await fetch(historyUrl, {
      method: 'GET',
      headers: { 'Cookie': request.headers.get('Cookie') || '' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.messages && Array.isArray(data.messages)) {
        messagesFromHistory = data.messages.map((msg: any) => ({
          id: msg.id || crypto.randomUUID(), role: msg.role, content: msg.content, createdAt: msg.createdAt,
        }));
      }
    } else {
      // ... (error handling as before)
      console.error(`Failed to fetch chat history for ${chatId}: ${response.status}`);
      return json({ chatId, initialMessages: [], error: `Failed to load history: ${response.status}` });
    }
  } catch (error: any) {
    // ... (error handling as before)
    console.error(`Error fetching chat history for ${chatId}:`, error);
    return json({ chatId, initialMessages: [], error: `Error loading chat: ${error.message}` });
  }
  return json({ chatId, initialMessages: messagesFromHistory });
}

export default function ChatWithIdPage() {
  const loaderData = useLoaderData<LoaderData>();
  const location = useLocation(); // Get location to access state

  // Prefer messages from navigation state if it's from the new chat flow.
  // This provides a smoother UX by showing the already typed messages immediately.
  const messagesFromState = (location.state as { initialMessages?: Message[], fromNewChatFlow?: boolean })?.initialMessages;
  const isFromNewChatFlow = (location.state as { fromNewChatFlow?: boolean })?.fromNewChatFlow;
  
  const finalInitialMessages = (isFromNewChatFlow && messagesFromState && messagesFromState.length > 0) 
                               ? messagesFromState 
                               : loaderData.initialMessages;

  // When navigating between different chat IDs, `loaderData.chatId` will change.
  // This change in prop to `ChatPageLayout` triggers its internal useEffect for cleanup/reset.
  // We also KEY ChatPageLayout by `loaderData.chatId` to ensure a full re-mount
  // when switching between different existing chats. This is a robust way to reset all child state.
  return (
    <ChatPageLayout
      key={loaderData.chatId} // CRITICAL: Re-mounts ChatPageLayout when navigating between different chat IDs
      initialChatId={loaderData.chatId}
      initialMessages={finalInitialMessages}
    />
  );
}