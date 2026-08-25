"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendBroadcastNow } from "@/lib/actions/broadcasts";
import { Button } from "@/components/ui/button";

export function SendBroadcastButton({ broadcastId }: { broadcastId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!confirm("Enviar esta mensagem agora? Não dá pra desfazer depois de começar.")) return;
    startTransition(async () => {
      try {
        await sendBroadcastNow(broadcastId);
        toast.success("Envio iniciado — os destinatários vão sendo processados aos poucos.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível iniciar o envio");
      }
    });
  }

  return (
    <Button className="w-full" onClick={handleSend} disabled={isPending}>
      {isPending ? "Iniciando envio..." : "Enviar agora"}
    </Button>
  );
}
