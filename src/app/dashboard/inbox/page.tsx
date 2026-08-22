import { MessageSquare } from "lucide-react";

export default function InboxEmptyStatePage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
      <MessageSquare className="h-8 w-8" />
      <p className="text-sm">Selecione uma conversa à esquerda</p>
    </div>
  );
}
