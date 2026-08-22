import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Criptografa access tokens do Instagram antes de gravar no banco (AES-256-GCM).
// TOKEN_ENCRYPTION_KEY: string qualquer de alta entropia (ex: `openssl rand -hex 32`).
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY não configurada");
  return scryptSync(secret, "instagram-automation-saas", 32);
}

export function encryptToken(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(".");
}

export function decryptToken(cipherText: string): string {
  const key = getKey();
  const [ivHex, authTagHex, dataHex] = cipherText.split(".");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Token criptografado em formato inválido");

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// --- Assinatura do `state` usado no fluxo OAuth (evita que alguém forje o
// organization_id de destino ao chamar /api/oauth/callback diretamente) ---

interface OAuthState {
  organizationId: string;
  userId: string;
  nonce: string;
  issuedAt: number;
}

// Chave própria (não o META_APP_SECRET) para assinar o `state`: esse valor é
// invenção nossa, não um protocolo da Meta, então não faz sentido
// compartilhar o segredo do app com a assinatura de webhook/signed_request —
// mantém os domínios de confiança separados.
function getOAuthStateKey(): string {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY não configurada");
  return secret;
}

export function signOAuthState(payload: Omit<OAuthState, "issuedAt">): string {
  const full: OAuthState = { ...payload, issuedAt: Date.now() };
  const json = JSON.stringify(full);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  const signature = createHmac("sha256", getOAuthStateKey()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state: string): OAuthState | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = createHmac("sha256", getOAuthStateKey()).update(encoded).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length || !timingSafeEqual(expectedBuf, signatureBuf)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthState;
  const TEN_MINUTES = 10 * 60 * 1000;
  if (Date.now() - payload.issuedAt > TEN_MINUTES) return null;

  return payload;
}

// --- Parser do `signed_request` que a Meta envia nos callbacks de
// desautorização e exclusão de dados (https://developers.facebook.com/docs/facebook-login/guides/permissions/history) ---

export function parseSignedRequest(signedRequest: string): Record<string, unknown> | null {
  const [encodedSig, payload] = signedRequest.split(".");
  if (!encodedSig || !payload) return null;

  const expectedSig = createHmac("sha256", process.env.META_APP_SECRET!)
    .update(payload)
    .digest("base64url");

  const receivedBuf = Buffer.from(encodedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (receivedBuf.length !== expectedBuf.length || !timingSafeEqual(receivedBuf, expectedBuf)) {
    return null;
  }

  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}
