// app/routes/__app.chat.$chatId.tsx
import { useLoaderData, useLocation, useParams } from "@remix-run/react";
import { requireAuth } from "~/lib/auth.server";
import { ChatPageLayout } from "~/components/chat/ChatPageLayout";
import type { Message } from "~/components/chat/MessageItem";
import { fetchWithHeaders, getApiUrl } from "~/lib/api.config"; // Import getApiUrl
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { normalizeMessagesForUI } from "~/components/chat/streaming-chat-context";


interface LoaderData {
  chatId: string;
  initialMessages: Message[];
  error?: string;
}

export async function loader({ request, params }: LoaderFunctionArgs): Promise<ReturnType<typeof json<LoaderData>>> {
  await requireAuth(request);
  const chatId = params.chatId;

  if (!chatId) {
    throw new Response("Chat ID missing in params", { status: 404 });
  }

  let messagesFromHistory: Message[] = [];
  // Construct URL using getApiUrl and append dynamic parts
  const baseHistoryUrl = getApiUrl('CHAT_HISTORY_BASE');
  const historyUrl = `${baseHistoryUrl.replace(/\/$/, '')}/${chatId}/history?limit=50`;

  try {
    const response = await fetchWithHeaders(historyUrl, {
      method: 'GET',
      headers: { 'Cookie': request.headers.get('Cookie') || '' },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.messages && Array.isArray(data.messages)) {
        // Preserve all fields including thought, query for normalization
        const rawMessages = data.messages.map((msg: any) => ({
          ...msg,
          id: msg.id || crypto.randomUUID(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt || msg.timestamp ? new Date(msg.createdAt || msg.timestamp).getTime() : undefined,
        }));
        messagesFromHistory = normalizeMessagesForUI(rawMessages);
      }
    } else {
      console.error(`Failed to fetch chat history for ${chatId}: ${response.status} ${response.statusText}`);
      return json({ chatId, initialMessages: [], error: `Failed to load history: ${response.status}` });
    }
  } catch (error: any) {
    console.error(`Error fetching chat history for ${chatId}:`, error);
    return json({ chatId, initialMessages: [], error: `Error loading chat: ${error.message}` });
  }
  return json({ chatId, initialMessages: messagesFromHistory });
}


export default function ChatWithIdPage() {
  const loaderData = useLoaderData<LoaderData>();
  const location = useLocation();
  const params = useParams(); // Use params for the key and current ID

  const navState = location.state as { initialMessages?: Message[], fromNewChatFlow?: boolean } | null;
  
  // Default to loader data. ChatPageLayout will further refine based on context and navState.
  let finalInitialMessages = loaderData.initialMessages;

  // This logic is simplified because ChatPageLayout's Effect 1 now has more robust handling
  // of messages from navState vs. loaderData vs. existing context state.
  if (navState?.fromNewChatFlow && navState.initialMessages && params.chatId === loaderData.chatId) {
      // We can still prefer navState messages if it's an immediate navigation
      // and ChatPageLayout will reconcile with context.
      finalInitialMessages = navState.initialMessages;
  }
  
  if (loaderData.error) {
    console.error("Error in loader for ChatWithIdPage:", loaderData.error);
  }

  return (
    <ChatPageLayout
      key={params.chatId} 
      initialChatIdFromLoader={loaderData.chatId} // Pass loader's chatId
      initialMessagesProp={finalInitialMessages}
    />
  );
}