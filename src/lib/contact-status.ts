import type { ContactStatus } from "@/types/database";

// Separado de contact-status-select.tsx (que é "use client") porque um
// Server Component importando um valor simples de um módulo client não
// atravessa a fronteira do RSC de forma confiável no Next — o objeto chegava
// undefined no server render (funil de status sem nenhum rótulo).
export const STATUS_LABEL: Record<ContactStatus, string> = {
  novo: "Novo",
  interessado: "Interessado",
  qualificado: "Qualificado",
  lead_quente: "Lead quente",
  em_atendimento: "Em atendimento",
  cliente: "Cliente",
  perdido: "Perdido",
};
