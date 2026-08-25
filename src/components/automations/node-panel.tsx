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
  DelayNodeData,
  TagNodeData,
  TriggerNodeData,
  AskQuestionNodeData,
  ReplyCommentNodeData,
} from "@/types/automation";
import type { CustomField } from "@/types/database";
import { NODE_META } from "./automation-node";

interface NodePanelProps {
  node: FlowNode;
  customFields: CustomField[];
  onChange: (data: FlowNode["data"]) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodePanel({ node, customFields, onChange, onDelete, onClose }: NodePanelProps) {
  const meta = NODE_META[node.type];

  return (
    <aside className="w-80 shrink-0 space-y-4 overflow-y-auto border-l bg-background p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{meta.label}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {node.type === "trigger" && <TriggerFields data={node.data as TriggerNodeData} onChange={onChange} />}
      {node.type === "send_message" && <SendMessageFields data={node.data as SendMessageNodeData} onChange={onChange} />}
      {node.type === "condition" && (
        <ConditionFields data={node.data as ConditionNodeData} customFields={customFields} onChange={onChange} />
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

      {node.type !== "trigger" && (
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Remover nó
        </Button>
      )}
    </aside>
  );
}

function TriggerFields({ data, onChange }: { data: TriggerNodeData; onChange: (d: TriggerNodeData) => void }) {
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
    </div>
  );
}

function SendMessageFields({ data, onChange }: { data: SendMessageNodeData; onChange: (d: SendMessageNodeData) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Texto da mensagem</Label>
      <Textarea
        value={data.text ?? ""}
        onChange={(e) => onChange({ ...data, messageType: "text", text: e.target.value })}
        rows={5}
        placeholder="Olá! Obrigado por chamar 🙌"
      />
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
          </SelectContent>
        </Select>
      </div>
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
