"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateOrganizationName, updateAiSettings, requestAccountDeletion } from "@/lib/actions/settings";
import { CustomFieldsTab } from "./custom-fields-tab";
import type { AiSettings, CustomField, Organization } from "@/types/database";

export function SettingsTabs({
  organization,
  aiSettings,
  customFields,
}: {
  organization: Organization;
  aiSettings: AiSettings | null;
  customFields: CustomField[];
}) {
  return (
    <Tabs defaultValue="organization">
      <TabsList>
        <TabsTrigger value="organization">Organização</TabsTrigger>
        <TabsTrigger value="fields">Campos</TabsTrigger>
        <TabsTrigger value="ai">IA</TabsTrigger>
        <TabsTrigger value="account">Conta</TabsTrigger>
      </TabsList>

      <TabsContent value="organization">
        <OrganizationTab organization={organization} />
      </TabsContent>
      <TabsContent value="fields">
        <CustomFieldsTab organizationId={organization.id} customFields={customFields} />
      </TabsContent>
      <TabsContent value="ai">
        <AiTab aiSettings={aiSettings} />
      </TabsContent>
      <TabsContent value="account">
        <AccountTab organizationId={organization.id} />
      </TabsContent>
    </Tabs>
  );
}

function OrganizationTab({ organization }: { organization: Organization }) {
  const [name, setName] = useState(organization.name);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados da organização</CardTitle>
        <CardDescription>Nome exibido no painel e nos relatórios.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="orgName">Nome</Label>
          <Input id="orgName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await updateOrganizationName(organization.id, name);
                toast.success("Nome atualizado");
              } catch {
                toast.error("Não foi possível salvar");
              }
            })
          }
        >
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

function AiTab({ aiSettings }: { aiSettings: AiSettings | null }) {
  const [prompt, setPrompt] = useState(aiSettings?.system_prompt ?? "");
  const [model, setModel] = useState(aiSettings?.model ?? "gpt-4o-mini");
  const [temperature, setTemperature] = useState(aiSettings?.temperature ?? 0.7);
  const [isPending, startTransition] = useTransition();

  if (!aiSettings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de IA</CardTitle>
        <CardDescription>Usado pelo nó &quot;Resposta com IA&quot; nas automações.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Prompt do sistema</Label>
          <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1 space-y-1.5">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label>Temperatura ({temperature})</Label>
            <Input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>
        </div>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                await updateAiSettings({ id: aiSettings.id, systemPrompt: prompt, model, temperature });
                toast.success("Configuração de IA salva");
              } catch {
                toast.error("Não foi possível salvar");
              }
            })
          }
        >
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

function AccountTab({ organizationId }: { organizationId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Excluir meus dados</CardTitle>
        <CardDescription>
          Desconecta todas as contas do Instagram e sinaliza a organização para exclusão definitiva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Tem certeza? Isso desconecta suas contas do Instagram imediatamente.")) return;
            startTransition(async () => {
              await requestAccountDeletion(organizationId);
              toast.success("Solicitação registrada. Entraremos em contato para concluir a exclusão.");
            });
          }}
        >
          Solicitar exclusão de dados
        </Button>
      </CardContent>
    </Card>
  );
}
