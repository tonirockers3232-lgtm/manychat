import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageCircle, Workflow, Sparkles, Inbox } from "lucide-react";

const FEATURES = [
  { icon: MessageCircle, title: "DM e comentários automáticos", description: "Responda comentários e direct messages do Instagram em segundos, 24/7." },
  { icon: Workflow, title: "Fluxos visuais", description: "Monte automações por arrastar e soltar: gatilhos, condições, delays e tags." },
  { icon: Sparkles, title: "Respostas com IA", description: "Configure prompts personalizados e deixe a IA responder pelo seu negócio." },
  { icon: Inbox, title: "Caixa de entrada unificada", description: "Todas as conversas do Instagram em um só lugar, com histórico completo." },
];

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-lg font-semibold">InstaFlow</span>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Button asChild size="sm">
            <Link href="/cadastro">Começar grátis</Link>
          </Button>
        </nav>
      </header>

      <section className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Automação de Instagram para o seu negócio
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Conecte sua conta comercial do Instagram, monte fluxos de automação e responda clientes
          automaticamente com DMs, comentários e inteligência artificial.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild size="lg">
            <Link href="/cadastro">Criar conta grátis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-xl border p-5">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
