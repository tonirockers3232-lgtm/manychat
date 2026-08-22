import { notFound } from "next/navigation";
import { getConversationWithMessages } from "@/lib/data/conversations";
import { MessageThread } from "@/components/inbox/message-thread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const result = await getConversationWithMessages(conversationId);
  if (!result) notFound();

  const { conversation, messages } = result;
  const contact = conversation.contacts as unknown as { username: string | null };

  return (
    <MessageThread
      conversationId={conversation.id}
      contactUsername={contact?.username ?? "desconhecido"}
      automationPaused={conversation.automation_paused}
      initialMessages={messages}
    />
  );
}
