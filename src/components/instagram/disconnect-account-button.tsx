"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectInstagramAccount } from "@/lib/actions/instagram";

export function DisconnectAccountButton({ accountId }: { accountId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await disconnectInstagramAccount(accountId);
            toast.success("Conta desconectada");
          } catch {
            toast.error("Não foi possível desconectar a conta");
          }
        })
      }
    >
      {isPending ? "Desconectando..." : "Desconectar"}
    </Button>
  );
}
