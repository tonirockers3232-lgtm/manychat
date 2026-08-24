"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateContactStatus } from "@/lib/actions/contacts";
import type { ContactStatus } from "@/types/database";

export const STATUS_LABEL: Record<ContactStatus, string> = {
  novo: "Novo",
  interessado: "Interessado",
  qualificado: "Qualificado",
  lead_quente: "Lead quente",
  em_atendimento: "Em atendimento",
  cliente: "Cliente",
  perdido: "Perdido",
};

export function ContactStatusSelect({ contactId, status }: { contactId: string; status: ContactStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          try {
            await updateContactStatus(contactId, value as ContactStatus);
          } catch {
            toast.error("Não foi possível atualizar o status");
          }
        })
      }
    >
      <SelectTrigger className="h-7 w-36 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_LABEL).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
