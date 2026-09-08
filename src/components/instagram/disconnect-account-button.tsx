"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { disconnectInstagramAccount, deleteInstagramAccount } from "@/lib/actions/instagram";

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

export function DeleteAccountButton({ accountId, username }: { accountId: string; username: string | null }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      className="w-full"
      disabled={isPending}
      onClick={() => {
        const label = username ? `@${username}` : "esta conta";
        if (
          !confirm(
            `Excluir ${label} definitivamente? Isso apaga contatos, conversas, mensagens e automações vinculadas a ela. Não pode ser desfeito.`
          )
        )
          return;
        startTransition(async () => {
          try {
            await deleteInstagramAccount(accountId);
            toast.success("Conta excluída");
          } catch {
            toast.error("Não foi possível excluir a conta");
          }
        });
      }}
    >
      {isPending ? "Excluindo..." : "Excluir"}
    </Button>
  );
}
