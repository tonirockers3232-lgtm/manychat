"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAutomation } from "@/lib/actions/automations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AutomationTriggerType } from "@/types/database";

const TRIGGER_OPTIONS: Array<{ value: AutomationTriggerType; label: string; description: string }> = [
  { value: "dm_keyword", label: "Palavra-chave em DM", description: "Dispara quando o contato envia uma DM com uma palavra específica." },
  { value: "comment_keyword", label: "Palavra-chave em comentário", description: "Dispara quando alguém comenta um post/reel com uma palavra específica." },
  { value: "new_contact", label: "Novo contato", description: "Dispara na primeira mensagem de um novo contato." },
];

export function NewAutomationForm({ accounts }: { accounts: Array<{ id: string; username: string | null }> }) {
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("dm_keyword");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Dê um nome para a automação");
      return;
    }
    startTransition(async () => {
      try {
        await createAutomation({ name, triggerType, instagramAccountId: accountId || null });
      } catch {
        toast.error("Não foi possível criar a automação");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome da automação</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas" />
        </div>

        <div className="space-y-1.5">
          <Label>Conta do Instagram</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma conta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  @{account.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Gatilho</Label>
          <div className="space-y-2">
            {TRIGGER_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col rounded-md border p-3 text-sm ${
                  triggerType === option.value ? "border-primary bg-primary/5" : ""
                }`}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="triggerType"
                    checked={triggerType === option.value}
                    onChange={() => setTriggerType(option.value)}
                  />
                  {option.label}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">{option.description}</span>
              </label>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Criando..." : "Criar e abrir editor"}
        </Button>
      </CardContent>
    </Card>
  );
}
