// Cliente para a "Instagram API with Instagram Login" (login direto da conta
// profissional do Instagram, sem depender de uma Facebook Page) — é o fluxo
// descrito na Seção 4 do app Meta ("Configurar o login da empresa no Instagram").
// Docs: https://developers.facebook.com/docs/instagram-platform

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;
const AUTHORIZE_URL = "https://www.instagram.com/oauth/authorize";
const SHORT_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const LONG_TOKEN_URL = "https://graph.instagram.com/access_token";

const SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
].join(",");

export function getOAuthRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback`;
}

// Passo 1: URL para onde o usuário é enviado para autorizar o app.
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: getOAuthRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

interface ShortLivedTokenResponse {
  access_token: string;
  user_id: string;
  permissions: string[];
}

// Passo 2: troca o `code` do callback por um access token de curta duração.
export async function exchangeCodeForShortLivedToken(code: string): Promise<ShortLivedTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: getOAuthRedirectUri(),
    code,
  });

  const res = await fetch(SHORT_TOKEN_URL, { method: "POST", body });
  if (!res.ok) {
    throw new Error(`Falha ao trocar code por token: ${await res.text()}`);
  }
  const data = (await res.json()) as { data?: ShortLivedTokenResponse[] } & ShortLivedTokenResponse;
  return data.data?.[0] ?? data;
}

interface LongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // segundos (~60 dias)
}

// Passo 3: troca o token de curta duração por um de longa duração (~60 dias).
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.META_APP_SECRET!,
    access_token: shortLivedToken,
  });

  const res = await fetch(`${LONG_TOKEN_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Falha ao gerar long-lived token: ${await res.text()}`);
  }
  return res.json();
}

// Deve ser chamado periodicamente (cron) antes do token expirar, para renová-lo.
export async function refreshLongLivedToken(currentToken: string): Promise<LongLivedTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: currentToken,
  });
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Falha ao renovar token: ${await res.text()}`);
  }
  return res.json();
}

export interface InstagramProfile {
  user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

export async function getInstagramProfile(accessToken: string): Promise<InstagramProfile> {
  const params = new URLSearchParams({
    fields: "user_id,username,name,profile_picture_url",
    access_token: accessToken,
  });
  const res = await fetch(`${GRAPH_BASE}/me?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar perfil do Instagram: ${await res.text()}`);
  }
  return res.json();
}

// Envia uma DM de texto para um contato (igsid = Instagram-scoped ID do destinatário).
export async function sendDirectMessage(params: {
  accessToken: string;
  igBusinessId: string;
  recipientIgsid: string;
  text: string;
}): Promise<{ message_id: string }> {
  const res = await fetch(`${GRAPH_BASE}/${params.igBusinessId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: params.recipientIgsid },
      message: { text: params.text },
      access_token: params.accessToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar DM: ${await res.text()}`);
  }
  return res.json();
}

// Responde publicamente a um comentário em um post/reel.
export async function replyToComment(params: {
  accessToken: string;
  commentId: string;
  message: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({ message: params.message, access_token: params.accessToken });
  const res = await fetch(`${GRAPH_BASE}/${params.commentId}/replies`, {
    method: "POST",
    body,
  });
  if (!res.ok) {
    throw new Error(`Falha ao responder comentário: ${await res.text()}`);
  }
  return res.json();
}

// Envia uma DM privada em resposta a um comentário (ManyChat chama isso de
// "Comment to DM") — usa o mesmo endpoint de mensagens com `comment_id` como referência.
export async function privateReplyToComment(params: {
  accessToken: string;
  igBusinessId: string;
  commentId: string;
  text: string;
}): Promise<{ message_id: string }> {
  const res = await fetch(`${GRAPH_BASE}/${params.igBusinessId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { comment_id: params.commentId },
      message: { text: params.text },
      access_token: params.accessToken,
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao enviar resposta privada ao comentário: ${await res.text()}`);
  }
  return res.json();
}
