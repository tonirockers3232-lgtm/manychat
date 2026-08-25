"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBroadcastDraft } from "@/lib/actions/broadcasts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BroadcastAudienceType, Segment, Tag } from "@/types/database";

export function NewBroadcastForm({
  organizationId,
  accounts,
  tags,
  segments,
}: {
  organizationId: string;
  accounts: Array<{ id: string; username: string | null }>;
  tags: Tag[];
  segments: Segment[];
}) {
  const [name, setName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [audienceType, setAudienceType] = useState<BroadcastAudienceType>("all");
  const [audienceRef, setAudienceRef] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Dê um nome para a mensagem");
      return;
    }
    if (!messageText.trim()) {
      toast.error("Escreva o texto da mensagem");
      return;
    }
    if (!accountId) {
      toast.error("Conecte uma conta do Instagram primeiro");
      return;
    }
    if (audienceType !== "all" && !audienceRef) {
      toast.error(audienceType === "tag" ? "Escolha uma tag" : "Escolha um segmento");
      return;
    }

    startTransition(async () => {
      try {
        const broadcast = await createBroadcastDraft({
          organizationId,
          instagramAccountId: accountId,
          name,
          messageText,
          audienceType,
          audienceRef: audienceType === "all" ? null : audienceRef,
        });
        router.push(`/dashboard/broadcasts/${broadcast.id}`);
      } catch {
        toast.error("Não foi possível criar a mensagem");
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome (só pra você organizar)</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Promoção de agosto" />
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
          <Label htmlFor="message">Mensagem</Label>
          <Textarea
            id="message"
            rows={5}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Pode usar {{name}}, {{username}} ou o key de um campo personalizado"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Público</Label>
          <Select
            value={audienceType}
            onValueChange={(v) => {
              setAudienceType(v as BroadcastAudienceType);
              setAudienceRef("");
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os contatos</SelectItem>
              <SelectItem value="tag">Contatos com uma tag</SelectItem>
              <SelectItem value="segment">Um segmento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {audienceType === "tag" && (
          <div className="space-y-1.5">
            <Label>Qual tag</Label>
            <Select value={audienceRef} onValueChange={setAudienceRef}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma tag" />
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {audienceType === "segment" && (
          <div className="space-y-1.5">
            <Label>Qual segmento</Label>
            <Select value={audienceRef} onValueChange={setAudienceRef}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um segmento" />
              </SelectTrigger>
              <SelectContent>
                {segments.map((segment) => (
                  <SelectItem key={segment.id} value={segment.id}>
                    {segment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Criando..." : "Continuar"}
        </Button>
      </CardContent>
    </Card>
  );
}
