import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return client;
}

export interface GenerateReplyParams {
  systemPrompt: string;
  model: string;
  temperature: number;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userMessage: string;
}

// Gera a resposta de IA usada pelo nó "ai_reply" do fluxo e pela caixa de
// entrada (resposta sugerida/automática). Mantém só as últimas mensagens do
// histórico para controlar custo de tokens.
export async function generateAiReply(params: GenerateReplyParams): Promise<string> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: params.model,
    temperature: params.temperature,
    messages: [
      { role: "system", content: params.systemPrompt },
      ...params.history.slice(-10),
      { role: "user", content: params.userMessage },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}
