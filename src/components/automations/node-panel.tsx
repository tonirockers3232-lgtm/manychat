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
} from "@/types/automation";
import { NODE_META } from "./automation-node";

interface NodePanelProps {
  node: FlowNode;
  onChange: (data: FlowNode["data"]) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function NodePanel({ node, onChange, onDelete, onClose }: NodePanelProps) {
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
      {node.type === "condition" && <ConditionFields data={node.data as ConditionNodeData} onChange={onChange} />}
      {node.type === "delay" && <DelayFields data={node.data as DelayNodeData} onChange={onChange} />}
      {(node.type === "add_tag" || node.type === "remove_tag") && (
        <TagFields data={node.data as TagNodeData} onChange={onChange} />
      )}
      {node.type === "ai_reply" && (
        <p className="text-xs text-muted-foreground">
          Usa o prompt padrão configurado em Configurações → IA para gerar a resposta.
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

function ConditionFields({ data, onChange }: { data: ConditionNodeData; onChange: (d: ConditionNodeData) => void }) {
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
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Valor</Label>
        <Input value={data.value} onChange={(e) => onChange({ ...data, value: e.target.value })} />
      </div>
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
