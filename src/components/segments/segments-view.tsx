"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";
import { createSegment, deleteSegment } from "@/lib/actions/segments";
import { STATUS_LABEL } from "@/lib/contact-status";
import type { ContactWithRelations } from "@/lib/data/segments";
import type { CustomField, Segment, SegmentFilterRules } from "@/types/database";

type Condition = SegmentFilterRules["conditions"][number];

const FIELD_LABEL: Record<Condition["field"], string> = {
  tag: "Tag",
  status: "Status",
  custom_field: "Campo personalizado",
  username: "Username",
  last_interaction_at: "Última interação",
};

function defaultConditionFor(field: Condition["field"]): Condition {
  switch (field) {
    case "tag":
      return { field: "tag", operator: "has_tag", value: "" };
    case "status":
      return { field: "status", operator: "equals", value: "novo" };
    case "custom_field":
      return { field: "custom_field", operator: "contains", value: "", customFieldKey: "" };
    case "username":
      return { field: "username", operator: "contains", value: "" };
    case "last_interaction_at":
      return { field: "last_interaction_at", operator: "after", value: "" };
  }
}

function summarizeCondition(condition: Condition): string {
  const label = FIELD_LABEL[condition.field];
  if (condition.field === "custom_field") return `${condition.customFieldKey || "?"} ${condition.operator} "${condition.value}"`;
  if (condition.field === "tag") return `${condition.operator === "not_has_tag" ? "não tem" : "tem"} a tag "${condition.value}"`;
  return `${label} ${condition.operator} "${condition.value}"`;
}

export function SegmentsView({
  organizationId,
  segmentsWithMatches,
  customFields,
  tagNames,
}: {
  organizationId: string;
  segmentsWithMatches: Array<{ segment: Segment; matches: ContactWithRelations[] }>;
  customFields: CustomField[];
  tagNames: string[];
}) {
  return (
    <div className="space-y-6">
      <NewSegmentForm organizationId={organizationId} customFields={customFields} tagNames={tagNames} />

      <div className="space-y-3">
        {segmentsWithMatches.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum segmento criado ainda.</p>
        )}
        {segmentsWithMatches.map(({ segment, matches }) => (
          <SegmentCard key={segment.id} segment={segment} matches={matches} />
        ))}
      </div>
    </div>
  );
}

function SegmentCard({ segment, matches }: { segment: Segment; matches: ContactWithRelations[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{segment.name}</CardTitle>
          <CardDescription>
            {segment.filter_rules.match === "all" ? "Todas as condições" : "Qualquer condição"}:{" "}
            {segment.filter_rules.conditions.map(summarizeCondition).join(" · ") || "sem condições (todos os contatos)"}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await deleteSegment(segment.id);
              toast.success("Segmento removido");
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {matches.length} {matches.length === 1 ? "contato" : "contatos"}
        </p>
        {matches.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matches.slice(0, 12).map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={c.profile_pic_url ?? undefined} />
                  <AvatarFallback className="text-[10px]">{(c.username ?? "??").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                @{c.username ?? "desconhecido"}
              </div>
            ))}
            {matches.length > 12 && (
              <span className="self-center text-xs text-muted-foreground">+{matches.length - 12}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewSegmentForm({
  organizationId,
  customFields,
  tagNames,
}: {
  organizationId: string;
  customFields: CustomField[];
  tagNames: string[];
}) {
  const [name, setName] = useState("");
  const [match, setMatch] = useState<"all" | "any">("all");
  const [conditions, setConditions] = useState<Condition[]>([defaultConditionFor("tag")]);
  const [isPending, startTransition] = useTransition();

  function updateCondition(index: number, next: Condition) {
    setConditions((prev) => prev.map((c, i) => (i === index ? next : c)));
  }

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createSegment({ organizationId, name: name.trim(), filterRules: { match, conditions } });
        setName("");
        setConditions([defaultConditionFor("tag")]);
        toast.success("Segmento criado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível criar o segmento");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Novo segmento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leads quentes interessados em aula" />
          </div>
          <div className="w-44 space-y-1.5">
            <Label>Combinar condições</Label>
            <Select value={match} onValueChange={(v) => setMatch(v as "all" | "any")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas (E)</SelectItem>
                <SelectItem value="any">Qualquer uma (OU)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Condições</Label>
          {conditions.map((condition, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <Select
                value={condition.field}
                onValueChange={(v) => updateCondition(index, defaultConditionFor(v as Condition["field"]))}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FIELD_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {condition.field === "custom_field" && (
                <Select
                  value={condition.customFieldKey}
                  onValueChange={(v) => updateCondition(index, { ...condition, customFieldKey: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Qual campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {customFields.map((f) => (
                      <SelectItem key={f.id} value={f.key}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {condition.field === "tag" && (
                <Select value={condition.operator} onValueChange={(v) => updateCondition(index, { ...condition, operator: v as Condition["operator"] })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="has_tag">Tem</SelectItem>
                    <SelectItem value="not_has_tag">Não tem</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {(condition.field === "username" || condition.field === "custom_field") && (
                <Select value={condition.operator} onValueChange={(v) => updateCondition(index, { ...condition, operator: v as Condition["operator"] })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">Igual a</SelectItem>
                    <SelectItem value="contains">Contém</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {condition.field === "last_interaction_at" && (
                <Select value={condition.operator} onValueChange={(v) => updateCondition(index, { ...condition, operator: v as Condition["operator"] })}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="after">Depois de</SelectItem>
                    <SelectItem value="before">Antes de</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {condition.field === "tag" && (
                <Select value={condition.value} onValueChange={(v) => updateCondition(index, { ...condition, value: v })}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Qual tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tagNames.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {condition.field === "status" && (
                <Select value={condition.value} onValueChange={(v) => updateCondition(index, { ...condition, value: v })}>
                  <SelectTrigger className="w-40">
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
              )}

              {condition.field === "last_interaction_at" && (
                <Input
                  type="date"
                  className="w-40"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, { ...condition, value: e.target.value })}
                />
              )}

              {(condition.field === "username" || condition.field === "custom_field") && (
                <Input
                  className="w-40"
                  value={condition.value}
                  onChange={(e) => updateCondition(index, { ...condition, value: e.target.value })}
                  placeholder="Valor"
                />
              )}

              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => setConditions((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setConditions((prev) => [...prev, defaultConditionFor("tag")])}>
            <Plus className="h-4 w-4" />
            Adicionar condição
          </Button>
        </div>

        <Button disabled={isPending || !name.trim()} onClick={handleCreate}>
          Criar segmento
        </Button>
      </CardContent>
    </Card>
  );
}
