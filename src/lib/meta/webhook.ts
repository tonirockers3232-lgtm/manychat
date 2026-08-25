import { createHmac, timingSafeEqual } from "node:crypto";

// Toda requisição de webhook da Meta traz um header X-Hub-Signature-256 com o
// HMAC-SHA256 do corpo cru, assinado com o App Secret. Sem essa checagem
// qualquer um poderia forjar eventos (mensagens, comentários) pro sistema.
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;

  const expected = createHmac("sha256", process.env.META_APP_SECRET!)
    .update(rawBody, "utf8")
    .digest("hex");
  const received = signatureHeader.replace("sha256=", "");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}

// Comparação constant-time do `hub.verify_token` no handshake GET — evita
// vazar por timing quantos caracteres do token configurado batem com o que
// foi enviado (baixo risco aqui, mas sem custo evitar).
export function verifyWebhookToken(received: string | null): boolean {
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!received || !expected) return false;

  const receivedBuf = Buffer.from(received, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (receivedBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(receivedBuf, expectedBuf);
}

// --- Tipos do payload de webhook do Instagram (subset relevante) ---

export interface InstagramWebhookPayload {
  object: "instagram";
  entry: InstagramWebhookEntry[];
}

export interface InstagramWebhookEntry {
  id: string; // instagram_business_id da conta que recebeu o evento
  time: number;
  messaging?: InstagramMessagingEvent[];
  changes?: InstagramChangeEvent[];
}

export interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
    attachments?: Array<{ type: string; payload: { url?: string } }>;
    // Presente quando a mensagem é a resposta a um botão de quick reply que
    // enviamos — `text` já traz o título do botão, então o resto do motor
    // trata como uma resposta de texto normal; `quick_reply.payload` fica
    // disponível caso algum nó futuro precise diferenciar de texto livre.
    quick_reply?: { payload: string };
  };
}

export interface InstagramChangeEvent {
  field: "comments";
  value: {
    id: string; // comment id
    text: string;
    from: { id: string; username: string };
    media: { id: string; media_product_type?: string };
    parent_id?: string;
  };
}
