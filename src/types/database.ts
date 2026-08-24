// Tipos manuais espelhando supabase/migrations/0001_init.sql.
// Se preferir gerar automaticamente: `pnpm dlx supabase gen types typescript --project-id <id> > src/types/database.ts`

import type { FlowDefinition } from "./automation";

export type OrgRole = "owner" | "admin" | "member";
export type OrgPlan = "free" | "starter" | "pro" | "scale";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: OrgPlan;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
}

export type InstagramAccountStatus = "connected" | "disconnected" | "error" | "token_expired";

export interface InstagramAccount {
  id: string;
  organization_id: string;
  instagram_business_id: string;
  page_id: string;
  username: string | null;
  name: string | null;
  profile_pic_url: string | null;
  access_token: string;
  token_expires_at: string | null;
  status: InstagramAccountStatus;
  connected_by: string | null;
  connected_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  organization_id: string;
  instagram_account_id: string;
  igsid: string;
  username: string | null;
  name: string | null;
  profile_pic_url: string | null;
  phone: string | null;
  email: string | null;
  is_blocked: boolean;
  last_interaction_at: string;
  created_at: string;
}

export type CustomFieldType = "text" | "number" | "email" | "phone" | "select" | "boolean";

export interface CustomField {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  field_type: CustomFieldType;
  options: string[];
  created_at: string;
}

export interface CustomFieldValue {
  contact_id: string;
  custom_field_id: string;
  value: string | null;
  updated_at: string;
}

export interface Tag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Segment {
  id: string;
  organization_id: string;
  name: string;
  filter_rules: SegmentFilterRules;
  created_at: string;
}

export interface SegmentFilterRules {
  match: "all" | "any";
  conditions: Array<{
    field: "tag" | "last_interaction_at" | "username";
    operator: "equals" | "contains" | "before" | "after" | "has_tag" | "not_has_tag";
    value: string;
  }>;
}

export type ConversationStatus = "open" | "closed" | "snoozed";

export interface Conversation {
  id: string;
  organization_id: string;
  instagram_account_id: string;
  contact_id: string;
  status: ConversationStatus;
  automation_paused: boolean;
  assigned_to: string | null;
  last_message_at: string;
  created_at: string;
}

export type MessageDirection = "inbound" | "outbound";
export type MessageSenderType = "contact" | "agent" | "automation" | "ai";
export type MessageType = "text" | "image" | "video" | "audio" | "file" | "comment_reply" | "quick_reply";
export type MessageStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export interface Message {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: MessageDirection;
  sender_type: MessageSenderType;
  sender_user_id: string | null;
  message_type: MessageType;
  content: string | null;
  media_url: string | null;
  instagram_message_id: string | null;
  status: MessageStatus;
  created_at: string;
}

export type AutomationStatus = "draft" | "active" | "paused";
export type AutomationTriggerType = "dm_keyword" | "comment_keyword" | "new_contact" | "story_reply" | "manual";

export interface AutomationTriggerConfig {
  keywords?: string[];
  match_type?: "exact" | "contains";
}

export interface Automation {
  id: string;
  organization_id: string;
  instagram_account_id: string | null;
  name: string;
  status: AutomationStatus;
  trigger_type: AutomationTriggerType;
  trigger_config: AutomationTriggerConfig;
  flow_definition: FlowDefinition;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AutomationRunStatus = "running" | "waiting" | "completed" | "failed" | "cancelled";

export interface AutomationRun {
  id: string;
  organization_id: string;
  automation_id: string;
  contact_id: string;
  conversation_id: string | null;
  status: AutomationRunStatus;
  current_node_id: string | null;
  context: Record<string, unknown>;
  started_at: string;
  finished_at: string | null;
}

export interface AutomationLog {
  id: string;
  organization_id: string;
  automation_run_id: string;
  node_id: string | null;
  node_type: string | null;
  action: string;
  status: "success" | "error" | "skipped";
  detail: Record<string, unknown>;
  created_at: string;
}

export interface PendingAction {
  id: string;
  organization_id: string;
  automation_run_id: string;
  next_node_id: string;
  run_at: string;
  status: "pending" | "processed" | "failed" | "cancelled";
  created_at: string;
}

export interface AiSettings {
  id: string;
  organization_id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  organization_id: string | null;
  instagram_account_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  plan: OrgPlan;
  status: "active" | "trialing" | "past_due" | "canceled";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

// Re-exportado aqui para manter os tipos de fluxo junto ao restante do domínio.
export type { FlowDefinition };
