"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { testAutomationRun } from "@/lib/actions/automations";
import { FlaskConical, Loader2 } from "lucide-react";

type TestContact = { id: string; username: string | null; name: string | null; igsid: string };

export function TestAutomationDialog({
  automationId,
  instagramAccountId,
  contacts,
}: {
  automationId: string;
  instagramAccountId: string | null;
  contacts: TestContact[];
}) {
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [simulatedText, setSimulatedText] = useState("");
  const [isRunning, startRunning] = useTransition();

  function handleRun() {
    if (!contactId) {
      toast.error("Escolha um contato");
      return;
    }
    startRunning(async () => {
      try {
        await testAutomationRun({ automationId, contactId, simulatedText });
        toast.success("Teste disparado — confira a conversa no Inbox e o resultado em Logs");
        setOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível rodar o teste");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" disabled={!instagramAccountId} onClick={() => setOpen(true)}>
        <FlaskConical className="h-4 w-4" />
        Testar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Testar automação</DialogTitle>
          <DialogDescription>
            Roda a versão salva deste fluxo pra um contato real, sem precisar mandar uma DM ou comentário de
            verdade — mensagens de fato são enviadas pelo Instagram pra esse contato.
          </DialogDescription>
        </DialogHeader>

        {!instagramAccountId ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Selecione uma conta do Instagram para esta automação primeiro.
          </p>
        ) : contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum contato ainda para esta conta — o teste precisa de um contato real que já tenha interagido pelo
            Instagram.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um contato" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.username ? `@${c.username}` : (c.name ?? c.igsid)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem simulada (opcional)</Label>
              <Input
                value={simulatedText}
                onChange={(e) => setSimulatedText(e.target.value)}
                placeholder="Ex: a palavra-chave que testaria uma condição 'mensagem contém...'"
              />
              <p className="text-xs text-muted-foreground">
                Usada por nós de condição/IA que dependem do texto recebido. O teste ignora a palavra-chave do
                gatilho e roda o fluxo direto a partir dele.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleRun} disabled={!instagramAccountId || contacts.length === 0 || isRunning}>
            {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
            Rodar teste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
