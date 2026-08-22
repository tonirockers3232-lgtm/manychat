import { createClient } from "@/lib/supabase/server";
import { getCurrentOrganization } from "@/lib/data/organizations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import type { OrgPlan } from "@/types/database";

const PLANS: Array<{ id: OrgPlan; name: string; price: string; features: string[] }> = [
  { id: "free", name: "Free", price: "R$ 0", features: ["1 conta do Instagram", "1 automação ativa", "100 contatos"] },
  { id: "starter", name: "Starter", price: "R$ 97/mês", features: ["3 contas do Instagram", "10 automações", "2.000 contatos", "Respostas com IA"] },
  { id: "pro", name: "Pro", price: "R$ 197/mês", features: ["10 contas do Instagram", "Automações ilimitadas", "10.000 contatos", "Prioridade no suporte"] },
  { id: "scale", name: "Scale", price: "Sob consulta", features: ["Contas ilimitadas", "Multiempresa", "SLA dedicado"] },
];

export default async function SubscriptionPage() {
  const organization = await getCurrentOrganization();
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("organization_id", organization!.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Assinatura</h1>
        <p className="text-sm text-muted-foreground">
          Plano atual: <span className="font-medium capitalize">{subscription?.plan ?? "free"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = subscription?.plan === plan.id;
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary" : undefined}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <CardDescription>{plan.price}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={isCurrent ? "outline" : "default"} disabled>
                  {isCurrent ? "Plano atual" : "Em breve (Stripe)"}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        A cobrança via Stripe ainda não está ativada. A estrutura de planos e a tabela{" "}
        <code className="rounded bg-muted px-1">subscriptions</code> já estão prontas — basta integrar o Stripe
        Checkout e o webhook de billing quando for habilitar pagamentos.
      </p>
    </div>
  );
}
