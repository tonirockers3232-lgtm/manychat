"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, X } from "lucide-react";
import type {
  FlowNode,
  SendMessageNodeData,
  ConditionNodeData,
  RandomSplitNodeData,
  DelayNodeData,
  TagNodeData,
  TriggerNodeData,
  AskQuestionNodeData,
  ReplyCommentNodeData,
  StartAutomationNodeData,
} from "@/types/automation";
import type { CustomField } from "@/types/database";
import { NODE_META } from "./automation-node";
import { PostPickerDialog, PostPreviewCard } from "./post-picker-dialog";
import { DialogTrigger } from "@/components/ui/dialog";

interface NodePanelProps {
  node: FlowNode;
  customFields: CustomField[];
  otherAutomations: Array<{ id: string; name: string }>;
  instagramAccountId: string | null;
  onChange: (data: FlowNode["data"]) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodePanel({ node, customFields, otherAutomations, instagramAccountId, onChange, onDelete, onClose }: NodePanelProps) {
  const meta = NODE_META[node.type];

  return (
    <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l bg-background p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {node.type === "trigger" && (
        <TriggerFields data={node.data as TriggerNodeData} instagramAccountId={instagramAccountId} onChange={onChange} />
      )}
      {node.type === "send_message" && <SendMessageFields data={node.data as SendMessageNodeData} onChange={onChange} />}
      {node.type === "condition" && (
        <ConditionFields data={node.data as ConditionNodeData} customFields={customFields} onChange={onChange} />
      )}
      {node.type === "random_split" && (
        <RandomSplitFields data={node.data as RandomSplitNodeData} onChange={onChange} />
      )}
      {node.type === "delay" && <DelayFields data={node.data as DelayNodeData} onChange={onChange} />}
      {(node.type === "add_tag" || node.type === "remove_tag") && (
        <TagFields data={node.data as TagNodeData} onChange={onChange} />
      )}
      {node.type === "ai_reply" && (
        <p className="text-xs text-muted-foreground">
          Usa o prompt padrão configurado em Configurações → IA para gerar a resposta.
        </p>
      )}
      {node.type === "ask_question" && (
        <AskQuestionFields data={node.data as AskQuestionNodeData} customFields={customFields} onChange={onChange} />
      )}
      {node.type === "reply_comment" && (
        <ReplyCommentFields data={node.data as ReplyCommentNodeData} onChange={onChange} />
      )}
      {node.type === "human_handoff" && (
        <p className="text-xs text-muted-foreground">
          Pausa a automação para essa conversa e avisa o contato que vai falar com um atendente.
          Retomar manualmente pela Caixa de entrada.
        </p>
      )}
      {node.type === "start_automation" && (
        <StartAutomationFields
          data={node.data as StartAutomationNodeData}
          otherAutomations={otherAutomations}
          onChange={onChange}
        />
      )}

      {node.type !== "trigger" && (
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Remover nó
        </Button>
      )}
    </aside>
  );
}

const UNCONDITIONAL_TRIGGERS: TriggerNodeData["triggerType"][] = ["new_contact", "story_reply", "story_mention", "manual"];

function TriggerFields({
  data,
  instagramAccountId,
  onChange,
}: {
  data: TriggerNodeData;
  instagramAccountId: string | null;
  onChange: (d: TriggerNodeData) => void;
}) {
  if (data.triggerType === "manual") {
    return (
      <p className="text-xs text-muted-foreground">
        Essa automação nunca dispara sozinha — só quando um nó &quot;Iniciar automação&quot; de outro fluxo aponta pra
        ela. É a base de uma sequência: monte aqui uma cadeia de Enviar mensagem → Aguardar → Enviar mensagem, e
        inscreva contatos nela a partir de qualquer outra automação.
      </p>
    );
  }
  if (UNCONDITIONAL_TRIGGERS.includes(data.triggerType)) {
    return (
      <p className="text-xs text-muted-foreground">
        Esse gatilho dispara para qualquer evento desse tipo — não precisa de palavra-chave.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Palavras-chave (separadas por vírgula)</Label>
        <Input
          value={(data.keywords ?? []).join(", ")}
          onChange={(e) => onChange({ ...data, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
          placeholder="promo, preço, valor"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de correspondência</Label>
        <Select value={data.matchType ?? "contains"} onValueChange={(v) => onChange({ ...data, matchType: v as "exact" | "contains" })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">Contém a palavra</SelectItem>
            <SelectItem value="exact">Mensagem exatamente igual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.triggerType === "comment_keyword" && (
        <div className="space-y-1.5">
          <Label>Publicação</Label>
          {data.mediaId ? (
            <PostPreviewCard
              thumbnail={data.mediaThumbnail}
              caption={data.mediaCaption}
              permalink={data.mediaPermalink}
              onClear={() => onChange({ ...data, mediaId: undefined, mediaThumbnail: undefined, mediaCaption: undefined, mediaPermalink: undefined })}
              triggerButton={
                <PostPickerDialog
                  instagramAccountId={instagramAccountId}
                  onSelect={(media) =>
                    onChange({
                      ...data,
                      mediaId: media.id,
                      mediaThumbnail: media.thumbnail_url ?? media.media_url,
                      mediaCaption: media.caption,
                      mediaPermalink: media.permalink,
                    })
                  }
                >
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs">
                      Trocar
                    </Button>
                  </DialogTrigger>
                </PostPickerDialog>
              }
            />
          ) : (
            <PostPickerDialog
              instagramAccountId={instagramAccountId}
              onSelect={(media) =>
                onChange({
                  ...data,
                  mediaId: media.id,
                  mediaThumbnail: media.thumbnail_url ?? media.media_url,
                  mediaCaption: media.caption,
                  mediaPermalink: media.permalink,
                })
              }
            >
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full">
                  Escolher uma publicação específica (opcional)
                </Button>
              </DialogTrigger>
            </PostPickerDialog>
          )}
          <p className="text-xs text-muted-foreground">
            Sem escolher uma publicação, o gatilho dispara em comentários de qualquer post ou reel da conta.
          </p>
        </div>
      )}
    </div>
  );
}

function SendMessageFields({ data, onChange }: { data: SendMessageNodeData; onChange: (d: SendMessageNodeData) => void }) {
  const buttons = data.quickReplies ?? [];

  function addButton() {
    if (buttons.length >= 13) return;
    onChange({ ...data, quickReplies: [...buttons, { id: crypto.randomUUID(), label: "" }] });
  }
  function updateButton(id: string, label: string) {
    onChange({ ...data, quickReplies: buttons.map((b) => (b.id === id ? { ...b, label } : b)) });
  }
  function removeButton(id: string) {
    onChange({ ...data, quickReplies: buttons.filter((b) => b.id !== id) });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Texto da mensagem</Label>
        <Textarea
          value={data.text ?? ""}
          onChange={(e) => onChange({ ...data, messageType: "text", text: e.target.value })}
          rows={5}
          placeholder="Olá! Obrigado por chamar 🙌"
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label>Botões (opcional, até 13)</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addButton} disabled={buttons.length >= 13}>
            + Botão
          </Button>
        </div>
        {buttons.map((b) => (
          <div key={b.id} className="flex items-center gap-1.5">
            <Input value={b.label} maxLength={20} onChange={(e) => updateButton(b.id, e.target.value)} placeholder="Ex: Quero saber mais" />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeButton(b.id)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {buttons.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Conecte cada botão a um nó diferente (arraste a partir do ponto abaixo dele no fluxo). Só funcionam em
            automações de DM — em automações de comentário a mensagem sai sem botões e o fluxo segue pela primeira
            ligação cadastrada a partir deste nó.
          </p>
        )}
      </div>
    </div>
  );
}

function ConditionFields({
  data,
  customFields,
  onChange,
}: {
  data: ConditionNodeData;
  customFields: CustomField[];
  onChange: (d: ConditionNodeData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Campo</Label>
        <Select value={data.field} onValueChange={(v) => onChange({ ...data, field: v as ConditionNodeData["field"] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message_contains">Mensagem contém</SelectItem>
            <SelectItem value="has_tag">Contato tem a tag</SelectItem>
            <SelectItem value="is_follower">É seguidor</SelectItem>
            <SelectItem value="custom_field">Campo personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.field === "custom_field" && (
        <div className="space-y-1.5">
          <Label>Qual campo</Label>
          <Select value={data.customFieldKey ?? ""} onValueChange={(v) => onChange({ ...data, customFieldKey: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um campo" />
            </SelectTrigger>
            <SelectContent>
              {customFields.map((field) => (
                <SelectItem key={field.id} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>Valor</Label>
        <Input value={data.value} onChange={(e) => onChange({ ...data, value: e.target.value })} />
      </div>
    </div>
  );
}

function RandomSplitFields({
  data,
  onChange,
}: {
  data: RandomSplitNodeData;
  onChange: (d: RandomSplitNodeData) => void;
}) {
  const splitPercent = data.splitPercent ?? 50;
  return (
    <div className="space-y-1.5">
      <Label>Chance de seguir pelo ramo A</Label>
      <Input
        type="number"
        min={0}
        max={100}
        value={splitPercent}
        onChange={(e) => onChange({ ...data, splitPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
      />
      <p className="text-xs text-muted-foreground">
        {splitPercent}% dos contatos seguem pelo ramo A, {100 - splitPercent}% pelo ramo B — sorteado a cada execução.
        Útil para testar duas versões de uma mensagem (teste A/B).
      </p>
    </div>
  );
}

function AskQuestionFields({
  data,
  customFields,
  onChange,
}: {
  data: AskQuestionNodeData;
  customFields: CustomField[];
  onChange: (d: AskQuestionNodeData) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Pergunta</Label>
        <Textarea
          value={data.question ?? ""}
          onChange={(e) => onChange({ ...data, question: e.target.value })}
          rows={3}
          placeholder="Qual seu objetivo?"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Salvar resposta em</Label>
        <Select value={data.saveTo} onValueChange={(v) => onChange({ ...data, saveTo: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="phone">Telefone</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            {customFields.map((field) => (
              <SelectItem key={field.id} value={field.key}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Tipo de resposta esperada</Label>
        <Select
          value={data.inputType}
          onValueChange={(v) => onChange({ ...data, inputType: v as AskQuestionNodeData["inputType"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Texto livre</SelectItem>
            <SelectItem value="number">Número</SelectItem>
            <SelectItem value="email">E-mail</SelectItem>
            <SelectItem value="phone">Telefone</SelectItem>
            <SelectItem value="choice">Múltipla escolha</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {data.inputType === "choice" && (
        <div className="space-y-1.5">
          <Label>Opções (uma por linha, até 13)</Label>
          <Textarea
            value={(data.choices ?? []).join("\n")}
            onChange={(e) => onChange({ ...data, choices: e.target.value.split("\n").map((c) => c.trim()).filter(Boolean) })}
            rows={3}
            placeholder={"Imóvel\nVeículo\nOutro"}
          />
          <p className="text-xs text-muted-foreground">
            Em automações de DM viram botões reais (a Meta corta em 20 caracteres); em comentário viram uma lista de texto.
          </p>
        </div>
      )}
      {(data.inputType === "phone" || data.inputType === "email") && (
        <p className="text-xs text-muted-foreground">
          Em automações de DM, mostra um botão que preenche direto do perfil do Instagram (se disponível) — o contato ainda
          pode digitar em vez de tocar.
        </p>
      )}
    </div>
  );
}

function ReplyCommentFields({ data, onChange }: { data: ReplyCommentNodeData; onChange: (d: ReplyCommentNodeData) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Texto da resposta pública</Label>
      <Textarea
        value={data.text ?? ""}
        onChange={(e) => onChange({ ...data, text: e.target.value })}
        rows={4}
        placeholder="Te chamei no Direct! 📩"
      />
      <p className="text-xs text-muted-foreground">
        Só funciona em automações com gatilho de comentário — em automações de DM esse nó é ignorado.
      </p>
    </div>
  );
}

function DelayFields({ data, onChange }: { data: DelayNodeData; onChange: (d: DelayNodeData) => void }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1 space-y-1.5">
        <Label>Tempo</Label>
        <Input
          type="number"
          min={1}
          value={data.amount}
          onChange={(e) => onChange({ ...data, amount: Number(e.target.value) })}
        />
      </div>
      <div className="flex-1 space-y-1.5">
        <Label>Unidade</Label>
        <Select value={data.unit} onValueChange={(v) => onChange({ ...data, unit: v as DelayNodeData["unit"] })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="seconds">Segundos</SelectItem>
            <SelectItem value="minutes">Minutos</SelectItem>
            <SelectItem value="hours">Horas</SelectItem>
            <SelectItem value="days">Dias</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function StartAutomationFields({
  data,
  otherAutomations,
  onChange,
}: {
  data: StartAutomationNodeData;
  otherAutomations: Array<{ id: string; name: string }>;
  onChange: (d: StartAutomationNodeData) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Automação de destino</Label>
      <Select
        value={data.targetAutomationId || undefined}
        onValueChange={(v) => onChange({ targetAutomationId: v, targetAutomationName: otherAutomations.find((a) => a.id === v)?.name })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione uma automação" />
        </SelectTrigger>
        <SelectContent>
          {otherAutomations.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Dispara a automação escolhida em paralelo pro mesmo contato — o fluxo atual continua normalmente daqui pra
        frente. É assim que se monta uma sequência: crie uma automação com gatilho &quot;Início manual&quot; contendo
        Enviar mensagem → Aguardar → Enviar mensagem, e aponte pra ela a partir daqui.
      </p>
    </div>
  );
}

function TagFields({ data, onChange }: { data: TagNodeData; onChange: (d: TagNodeData) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Nome da tag</Label>
      <Input value={data.tagName} onChange={(e) => onChange({ ...data, tagName: e.target.value })} placeholder="lead-quente" />
    </div>
  );
}
