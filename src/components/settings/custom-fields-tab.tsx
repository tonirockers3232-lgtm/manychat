"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { createCustomField, deleteCustomField } from "@/lib/actions/custom-fields";
import type { CustomField, CustomFieldType } from "@/types/database";

const TYPE_LABEL: Record<CustomFieldType, string> = {
  text: "Texto",
  number: "Número",
  email: "E-mail",
  phone: "Telefone",
  select: "Múltipla escolha",
  boolean: "Sim/Não",
};

export function CustomFieldsTab({ organizationId, customFields }: { organizationId: string; customFields: CustomField[] }) {
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldType>("text");
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    if (!label.trim()) return;
    startTransition(async () => {
      try {
        await createCustomField({ organizationId, label: label.trim(), fieldType });
        setLabel("");
        toast.success("Campo criado");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível criar o campo");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCustomField(id);
      toast.success("Campo removido");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campos personalizados</CardTitle>
        <CardDescription>
          Usados pelo nó &quot;Pergunta&quot; das automações e nas variáveis {"{{"}nome_do_campo{"}}"}  das mensagens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Nome do campo</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Objetivo" />
          </div>
          <div className="w-40 space-y-1.5">
            <Label>Tipo</Label>
            <Select value={fieldType} onValueChange={(v) => setFieldType(v as CustomFieldType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABEL).map(([value, text]) => (
                  <SelectItem key={value} value={value}>
                    {text}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button disabled={isPending || !label.trim()} onClick={handleCreate}>
            Adicionar
          </Button>
        </div>

        <div className="space-y-1">
          {customFields.length === 0 && <p className="text-sm text-muted-foreground">Nenhum campo criado ainda.</p>}
          {customFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{field.label}</span>
                <Badge variant="secondary">{TYPE_LABEL[field.field_type]}</Badge>
                <code className="text-xs text-muted-foreground">{"{{" + field.key + "}}"}</code>
              </div>
              <Button variant="ghost" size="icon" disabled={isPending} onClick={() => handleDelete(field.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
