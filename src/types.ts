/**
 * Resend-compatible type definitions
 * These types match the Resend SDK API surface for drop-in compatibility
 */

// ============================================================================
// Configuration
// ============================================================================

export interface ResendConfig {
  /** Nylas API key */
  apiKey: string;
  /** Nylas Grant ID */
  grantId: string;
  /** Base URL for Nylas API (default: https://api.us.nylas.com) */
  baseUrl?: string;
}

// ============================================================================
// Email Types (Resend-compatible)
// ============================================================================

export interface SendEmailRequest {
  /** Sender email address (e.g., "you@example.com" or "Name <you@example.com>") */
  from: string;
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject */
  subject: string;
  /** Plain text body */
  text?: string;
  /** HTML body */
  html?: string;
  /** Reply-to address(es) */
  reply_to?: string | string[];
  /** CC recipients */
  cc?: string | string[];
  /** BCC recipients */
  bcc?: string | string[];
  /** Custom headers */
  headers?: Record<string, string>;
  /** File attachments */
  attachments?: Attachment[];
  /** Tags for categorization */
  tags?: Tag[];
  /** Scheduled send time (ISO 8601) */
  scheduled_at?: string;
}

export interface Attachment {
  /** Filename */
  filename: string;
  /** File content (base64 string or Buffer) */
  content: string | Buffer;
  /** MIME type (optional, defaults to application/octet-stream) */
  content_type?: string;
  /** Content-Disposition (optional) */
  disposition?: 'attachment' | 'inline';
}

export interface Tag {
  name: string;
  value: string;
}

export interface SendEmailResponse {
  /** The ID of the sent email */
  id: string;
}

export interface GetEmailResponse {
  id: string;
  object: 'email';
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string;
  text?: string;
  html?: string;
  created_at: string;
  scheduled_at?: string;
  last_event?: string;
}

export interface ListEmailsResponse {
  object: 'list';
  data: GetEmailResponse[];
}

// ============================================================================
// Webhook Types (Resend-compatible)
// ============================================================================

export type WebhookEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.complained'
  | 'email.bounced'
  | 'email.opened'
  | 'email.clicked'
  | 'email.received';

export interface WebhookEvent<T extends WebhookEventType = WebhookEventType> {
  type: T;
  created_at: string;
  data: WebhookEventData;
}

export interface WebhookEventData {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string;
  text?: string;
  html?: string;
  created_at?: string;
  attachments?: WebhookAttachment[];
}

export interface WebhookAttachment {
  filename: string;
  content_type: string;
  size?: number;
}

export interface InboundEmailEvent extends WebhookEvent<'email.received'> {
  type: 'email.received';
  data: WebhookEventData;
}

// ============================================================================
// API Response Wrapper (Resend-compatible)
// ============================================================================

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ResendError };

export interface ResendError {
  message: string;
  name: string;
  statusCode?: number;
}

// ============================================================================
// Nylas Internal Types (not exported to users)
// ============================================================================

export interface NylasEmailParticipant {
  name?: string;
  email: string;
}

export interface NylasSendRequest {
  subject: string;
  body: string;
  from?: NylasEmailParticipant[];
  to: NylasEmailParticipant[];
  cc?: NylasEmailParticipant[];
  bcc?: NylasEmailParticipant[];
  reply_to?: NylasEmailParticipant[];
  reply_to_message_id?: string;
  attachments?: NylasAttachment[];
  tracking_options?: {
    opens?: boolean;
    links?: boolean;
    thread_replies?: boolean;
    label?: string;
  };
  send_at?: number;
}

export interface NylasAttachment {
  filename: string;
  content: string;
  content_type: string;
  content_id?: string;
}

export interface NylasSendResponse {
  request_id: string;
  data: NylasMessage;
}

export interface NylasMessage {
  id: string;
  grant_id: string;
  from: NylasEmailParticipant[];
  to: NylasEmailParticipant[];
  cc?: NylasEmailParticipant[];
  bcc?: NylasEmailParticipant[];
  reply_to?: NylasEmailParticipant[];
  subject: string;
  body: string;
  date: number;
  thread_id?: string;
  snippet?: string;
  starred?: boolean;
  unread?: boolean;
  folders?: string[];
  attachments?: NylasMessageAttachment[];
}

export interface NylasMessageAttachment {
  id: string;
  grant_id: string;
  filename: string;
  content_type: string;
  size: number;
  content_id?: string;
  is_inline?: boolean;
}

export interface NylasMessageResponse {
  request_id: string;
  data: NylasMessage;
}

export interface NylasMessagesListResponse {
  request_id: string;
  data: NylasMessage[];
  next_cursor?: string;
}

export interface NylasWebhookPayload {
  specversion: string;
  type: string;
  source: string;
  id: string;
  time: string;
  webhook_delivery_attempt: number;
  data: {
    application_id: string;
    grant_id: string;
    object: NylasMessage;
  };
}

export interface NylasApiError {
  request_id: string;
  error: {
    type: string;
    message: string;
  };
}
