# InstaFlow — Automação de Instagram (clone ManyChat)

SaaS multi-tenant para automatizar DMs e comentários do Instagram usando a API oficial da Meta,
com um construtor visual de fluxos, IA (OpenAI) e caixa de entrada unificada.

## Stack

| Camada         | Tecnologia                                            |
|----------------|--------------------------------------------------------|
| Frontend       | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| UI             | Componentes estilo shadcn/ui (Radix UI + CVA), `@xyflow/react` para o editor visual |
| Backend        | Next.js Route Handlers + Server Actions                |
| Banco de dados | Supabase (PostgreSQL + Row Level Security)              |
| Auth           | Supabase Auth (e-mail/senha)                            |
| Integração     | Meta Graph API — Instagram API with Instagram Login     |
| IA             | OpenAI (`gpt-4o-mini` por padrão)                        |
| Hospedagem     | Vercel (Route Handlers + Cron Jobs)                      |

## Arquitetura — decisões importantes

- **Multi-tenant via `organizations` + `organization_members`.** Toda tabela de domínio tem
  `organization_id` e uma policy de RLS (`is_org_member`). Isso isola os dados de cada cliente
  no nível do banco, não só na aplicação — mesmo um bug na UI não vaza dados entre organizações.
- **"Instagram API with Instagram Login"**, não o fluxo legado via Facebook Page. É o que a Meta
  recomenda hoje para contas comerciais do Instagram e é o que o app Meta deste projeto usa
  (permissões `instagram_business_basic`, `instagram_business_manage_messages`,
  `instagram_business_manage_comments`). Por isso `instagram_accounts.page_id` é opcional.
- **Delays do fluxo visual não usam `setTimeout`.** Funções serverless não mantêm estado entre
  invocações, então um nó "Aguardar" grava uma linha em `pending_actions` com `run_at`, e um
  Vercel Cron (`/api/cron/process-automations`, a cada minuto) retoma o fluxo quando o prazo vence.
- **Tokens de acesso são criptografados (AES-256-GCM)** antes de gravar em
  `instagram_accounts.access_token`, usando `TOKEN_ENCRYPTION_KEY`. Só o service role consegue
  fazer a troca OAuth e processar webhooks; o client nunca vê o token em texto puro.
- **Webhook e OAuth usam `service_role` (`src/lib/supabase/admin.ts`)** porque não há sessão de
  usuário nesses contextos — a segurança vem da assinatura HMAC do webhook e do `state` assinado
  do OAuth, não de RLS.
- **UI própria estilo shadcn/ui**, copiada em `src/components/ui`, em vez de depender do CLI do
  shadcn (evita uma dependência de rede extra no build e mantém tudo versionado no repo).

## Estrutura de pastas

```
src/
  app/
    (marketing)/page.tsx          → landing page
    login/, cadastro/             → autenticação
    privacidade/, exclusao-de-dados/  → páginas exigidas pelo app review da Meta
    dashboard/
      layout.tsx                  → shell autenticado (sidebar + header)
      page.tsx                    → visão geral
      instagram/                  → conectar/gerenciar contas do Instagram
      inbox/                      → caixa de entrada (conversas + mensagens)
      automations/                → lista + editor visual (React Flow)
      contacts/                   → contatos e tags
      logs/                       → histórico de execução das automações
      settings/                   → organização, IA, exclusão de dados
      subscription/               → planos (estrutura pronta para Stripe)
    api/
      oauth/connect, oauth/callback, oauth/deauthorize  → fluxo OAuth do Instagram
      webhook/                    → recebe mensagens e comentários da Meta
      cron/process-automations/   → processa delays das automações (Vercel Cron)
      cron/refresh-tokens/        → renova tokens de longa duração antes de expirar
  components/
    ui/                           → primitives (Button, Card, Dialog, Select, ...)
    automations/                  → editor visual (nós, painel de edição, paleta)
    inbox/, instagram/, dashboard/, settings/
  lib/
    supabase/                     → clients (browser, server, admin) + middleware
    meta/                         → cliente da Graph API + verificação de webhook
    automation/                   → motor de execução do fluxo (engine, actions, trigger-matcher)
    openai/                       → geração de resposta com IA
    data/                         → leitura de dados (Server Components)
    actions/                      → mutações (Server Actions)
    crypto.ts                     → criptografia de tokens + assinatura de state/signed_request
  types/                          → tipos do banco (database.ts) e do fluxo visual (automation.ts)
supabase/migrations/0001_init.sql → schema completo + RLS + triggers
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

| Variável | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `META_APP_ID`, `META_APP_SECRET` | Meta for Developers → seu app → dentro do caso de uso "Gerenciar mensagens e conteúdo no Instagram" → "ID do app do Instagram" / "Chave secreta do app do Instagram" |
| `META_WEBHOOK_VERIFY_TOKEN` | Você mesmo gera (string aleatória de 48+ caracteres) e cola também no campo "Verificar token" da Seção 3 do app Meta |
| `TOKEN_ENCRYPTION_KEY` | Gere com `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` local; `https://seuprojeto.vercel.app` em produção |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `CRON_SECRET` | Gere uma string aleatória; a Vercel injeta automaticamente `Authorization: Bearer $CRON_SECRET` nas chamadas de Cron Job quando essa variável existe no projeto |
| `STRIPE_*` | Deixe em branco por enquanto — ver seção "Ativando cobrança" |

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para testar OAuth e webhook localmente, exponha a porta 3000 com um
túnel (ex: `ngrok http 3000`) e use a URL pública como `NEXT_PUBLIC_APP_URL` e nas configurações
do app Meta — a Meta não aceita `localhost` nas URLs de callback.

## Configurando o Supabase

1. Crie o projeto (região São Paulo, plano Free) — veja o guia de infraestrutura da agência para
   o passo a passo de criação da conta.
2. Rode a migração: abra **SQL Editor** no painel do Supabase, cole o conteúdo de
   `supabase/migrations/0001_init.sql` e execute. Isso cria todas as tabelas, RLS e o trigger que
   provisiona organização + assinatura free automaticamente no cadastro.
3. Em **Authentication → URL Configuration**, adicione `NEXT_PUBLIC_APP_URL` como Site URL.
4. Copie `Project URL`, `anon key` e `service_role key` para `.env.local` (ver tabela acima).

## Configurando o app na Meta for Developers

Os campos abaixo mapeiam diretamente para as seções do app Meta (ver o guia de infraestrutura
para o passo a passo completo de criação do app e das permissões):

| Campo no painel da Meta | Valor |
|---|---|
| URL de callback do webhook (Seção 3) | `https://SEU_DOMINIO/api/webhook` |
| Verificar token (Seção 3) | mesmo valor de `META_WEBHOOK_VERIFY_TOKEN` |
| Campos assinados no webhook | `comments` e `messages` |
| URI de redirecionamento OAuth (Seção 4) | `https://SEU_DOMINIO/api/oauth/callback` |
| URI de desautorização (Seção 4) | `https://SEU_DOMINIO/api/oauth/deauthorize` |
| URI de exclusão de dados (Seção 4) | `https://SEU_DOMINIO/exclusao-de-dados` |
| URL Política de Privacidade (Configurações → Básico) | `https://SEU_DOMINIO/privacidade` |
| URL Exclusão de dados (Configurações → Básico) | `https://SEU_DOMINIO/exclusao-de-dados` |

Depois de configurar tudo, adicione os Instagrams de teste em **Funções do app → Funções →
Adicionar pessoas → Testador do Instagram**, e só então publique o app em **Modo Ao Vivo**
(Configurações → Básico precisa estar 100% preenchido, incluindo ícone 1024×1024).

## Publicando na Vercel

1. Suba o código para um repositório no GitHub (privado).
2. Na Vercel: **Add New → Project**, selecione o repositório, mantenha as configurações padrão
   (framework detectado automaticamente como Next.js) e clique em **Deploy**.
3. Em **Settings → Environment Variables**, cole todas as variáveis de `.env.local` (exceto
   `NEXT_PUBLIC_APP_URL`, que deve apontar para o domínio real da Vercel).
4. `vercel.json` já declara o Cron Job de `refresh-tokens` (uma vez por dia — dentro do limite do
   plano Hobby). Ele só fica ativo em produção.
5. Faça um redeploy depois de configurar as variáveis, para que o build as enxergue.

### Processando delays das automações (`/api/cron/process-automations`)

O plano **Hobby da Vercel limita Cron Jobs a 1 execução por dia** — não dá pra rodar
`/api/cron/process-automations` a cada minuto direto pelo `vercel.json` nesse plano (por isso ele
não está mais lá; só o `refresh-tokens`, que já é diário). Sem chamar essa rota com frequência, o
nó "Aguardar" das automações nunca avança. Duas opções, ambas gratuitas:

- **Cron externo (recomendado, grátis, sem trocar de plano):** cadastre em
  [cron-job.org](https://cron-job.org) (ou similar) uma chamada `GET` a cada minuto para
  `https://SEU_DOMINIO/api/cron/process-automations`, com o header
  `Authorization: Bearer <CRON_SECRET>` (mesmo valor da variável de ambiente).
- **Upgrade para o plano Pro da Vercel:** aí `vercel.json` pode voltar a declarar o cron nativo
  com `"schedule": "* * * * *"`.

## Como testar cada funcionalidade

| Funcionalidade | Como testar |
|---|---|
| Cadastro/login | Crie uma conta em `/cadastro` — o trigger do banco cria organização + assinatura free automaticamente |
| Conectar Instagram | Dashboard → Instagram → "Conectar Instagram", autorize com uma conta cadastrada como Testador |
| Webhook de mensagens | Envie uma DM para a conta conectada a partir de outra conta do Instagram; ela deve aparecer em Dashboard → Caixa de entrada |
| Webhook de comentários | Comente em um post/reel da conta conectada com uma palavra-chave configurada em uma automação |
| Automação por palavra-chave | Crie uma automação (gatilho "Palavra-chave em DM"), adicione um nó "Enviar mensagem", ative, e mande a palavra-chave pela DM |
| Delay | Adicione um nó "Aguardar" entre duas mensagens; a segunda só chega depois que `/api/cron/process-automations` rodar (a cada minuto em produção — localmente, chame a rota manualmente com o header `Authorization: Bearer $CRON_SECRET`) |
| Tags/segmentação | Nó "Adicionar tag" numa automação, ou veja as tags aplicadas em Dashboard → Contatos |
| Resposta com IA | Configure o prompt em Configurações → IA, adicione um nó "Resposta com IA" numa automação |
| Logs | Dashboard → Logs mostra cada nó executado, com sucesso/erro |
| Assinatura | Dashboard → Assinatura mostra o plano atual (sempre "free" até o Stripe ser ativado) |

## Ativando cobrança (Stripe)

A tabela `subscriptions` e a página `/dashboard/subscription` já existem. Para ativar:

1. Crie os produtos/preços no Stripe e preencha `STRIPE_PRICE_*` no `.env`.
2. Crie `src/app/api/stripe/checkout/route.ts` (Stripe Checkout Session) e
   `src/app/api/stripe/webhook/route.ts` (trata `checkout.session.completed`,
   `customer.subscription.updated/deleted` para atualizar a tabela `subscriptions`).
3. Troque os botões desabilitados em `subscription/page.tsx` por chamadas ao Checkout.

## Limitações conhecidas / próximos passos

- Segmentos (`segments.filter_rules`) têm o schema pronto, mas ainda não há UI para criar/editar
  segmentos nem um job que os recalcule.
- Não há upload de mídia (imagem/vídeo) nas automações ainda — só texto.
- Multiusuário: `organization_members` e os papéis (`owner`/`admin`/`member`) já existem no banco
  e nas policies de RLS, mas ainda não há UI para convidar/gerenciar outros usuários da mesma
  organização — hoje só o dono (criado no cadastro) tem acesso.
- `src/proxy.ts` (antigo `middleware.ts` — renomeado seguindo a migração do Next.js 16) faz apenas
  o gate de autenticação por cookie; ele não valida se o usuário pertence à organização de cada
  rota — isso é garantido pelas policies de RLS em cada query, não pelo proxy.
- Mensagem em massa (`/dashboard/broadcasts`) só entrega pra contatos dentro da janela de 24h da
  Meta (não existe tag de "marketing" liberada pro Instagram, diferente do Messenger) — quem está
  fora fica registrado como "fora da janela", nunca é tentado. O envio real é processado por
  `/api/cron/process-broadcasts`, que precisa do mesmo cron externo (cron-job.org, `CRON_SECRET`)
  já usado por `/api/cron/process-automations` — a Vercel Hobby só libera 1 cron próprio.
