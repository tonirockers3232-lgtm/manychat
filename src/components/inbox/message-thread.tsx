"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { sendManualMessage, toggleAutomationPause } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Message } from "@/types/database";
import { format } from "date-fns";

interface MessageThreadProps {
  conversationId: string;
  contactUsername: string;
  automationPaused: boolean;
  initialMessages: Message[];
}

export function MessageThread({ conversationId, contactUsername, automationPaused, initialMessages }: MessageThreadProps) {
  const [text, setText] = useState("");
  const [paused, setPaused] = useState(automationPaused);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    const value = text.trim();
    if (!value) return;
    setText("");
    startTransition(async () => {
      try {
        await sendManualMessage(conversationId, value);
      } catch {
        toast.error("Falha ao enviar mensagem");
      }
    });
  }

  function handleTogglePause(checked: boolean) {
    setPaused(checked);
    startTransition(() => toggleAutomationPause(conversationId, checked));
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <p className="text-sm font-medium">@{contactUsername}</p>
        <div className="flex items-center gap-2">
          <Label htmlFor="pause-automation" className="text-xs text-muted-foreground">
            Pausar automação
          </Label>
          <Switch id="pause-automation" checked={paused} onCheckedChange={handleTogglePause} />
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {initialMessages.map((message) => (
          <div key={message.id} className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[70%] rounded-lg px-3 py-2 text-sm",
                message.direction === "outbound" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <p>{message.content}</p>
              <p className="mt-1 text-[10px] opacity-70">
                {message.sender_type !== "contact" && `${labelForSender(message.sender_type)} · `}
                {format(new Date(message.created_at), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        {initialMessages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
        )}
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma mensagem..."
          className="min-h-10 flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={isPending || !text.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );
}

function labelForSender(senderType: Message["sender_type"]): string {
  switch (senderType) {
    case "agent":
      return "Você";
    case "automation":
      return "Automação";
    case "ai":
      return "IA";
    default:
      return "";
  }
}
