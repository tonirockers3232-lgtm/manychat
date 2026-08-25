import { z } from "zod";

// Valida o `flow_definition` antes de persistir. O editor visual sempre
// manda um shape correto, mas a Server Action é uma superfície pública (POST
// autenticado) — sem essa validação, um payload forjado com um nó de
// condição sem `value`, por exemplo, só quebraria depois, dentro do motor de
// automação (`executeCondition`), sem nenhum log de erro do lado do usuário.

const positionSchema = z.object({ x: z.number(), y: z.number() });

const triggerDataSchema = z.object({
  triggerType: z.enum(["dm_keyword", "comment_keyword", "new_contact", "story_reply", "story_mention", "manual"]),
  keywords: z.array(z.string()).optional(),
  matchType: z.enum(["exact", "contains"]).optional(),
});

const sendMessageDataSchema = z.object({
  messageType: z.enum(["text", "image", "quick_reply"]),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  quickReplies: z.array(z.object({ id: z.string().min(1), label: z.string() })).optional(),
});

const conditionDataSchema = z.object({
  field: z.enum(["has_tag", "message_contains", "is_follower", "custom_field"]),
  operator: z.enum(["equals", "contains", "not_equals"]),
  value: z.string(),
  customFieldKey: z.string().optional(),
});

const randomSplitDataSchema = z.object({
  splitPercent: z.number().min(0).max(100),
});

const delayDataSchema = z.object({
  amount: z.number().positive(),
  unit: z.enum(["seconds", "minutes", "hours"]),
});

const tagDataSchema = z.object({
  tagName: z.string(),
});

const aiReplyDataSchema = z.object({
  aiSettingsId: z.string().nullable(),
  fallbackText: z.string().optional(),
});

const askQuestionDataSchema = z.object({
  question: z.string(),
  saveTo: z.string().min(1),
  inputType: z.enum(["text", "number", "email", "phone", "choice"]),
  choices: z.array(z.string()).optional(),
});

const replyCommentDataSchema = z.object({
  text: z.string(),
});

const humanHandoffDataSchema = z.object({});

const flowNodeSchema = z.discriminatedUnion("type", [
  z.object({ id: z.string().min(1), type: z.literal("trigger"), position: positionSchema, data: triggerDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("send_message"), position: positionSchema, data: sendMessageDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("condition"), position: positionSchema, data: conditionDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("random_split"), position: positionSchema, data: randomSplitDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("delay"), position: positionSchema, data: delayDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("add_tag"), position: positionSchema, data: tagDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("remove_tag"), position: positionSchema, data: tagDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("ai_reply"), position: positionSchema, data: aiReplyDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("ask_question"), position: positionSchema, data: askQuestionDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("reply_comment"), position: positionSchema, data: replyCommentDataSchema }),
  z.object({ id: z.string().min(1), type: z.literal("human_handoff"), position: positionSchema, data: humanHandoffDataSchema }),
]);

const flowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
});

export const flowDefinitionSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});
