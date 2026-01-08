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
  /** Nylas Grant ID (for reading messages) */
  grantId: string;
  /** Nylas Domain name for sending transactional emails (e.g., "qasim.nylas.email") */
  domain?: string;
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
  replyTo?: string | string[];
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
  scheduledAt?: string;
}

export interface Attachment {
  /** Filename */
  filename: string;
  /** File content (base64 string or Buffer) */
  content?: string | Buffer;
  /** Path to file (alternative to content) */
  path?: string;
  /** MIME type (optional, defaults to application/octet-stream) */
  contentType?: string;
  /** Content ID for inline attachments */
  contentId?: string;
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
  replyTo?: string[];
  subject: string;
  text?: string;
  html?: string;
  createdAt: string;
  scheduledAt?: string;
  lastEvent?: string;
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
  createdAt: string;
  data: WebhookEventData;
}

export interface WebhookEventData {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  text?: string;
  html?: string;
  createdAt?: string;
  attachments?: WebhookAttachment[];
}

export interface WebhookAttachment {
  filename: string;
  contentType: string;
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

// ============================================================================
// Nylas Domain-based Send Types (for Inbound/Transactional emails)
// ============================================================================

export interface NylasDomainSendRequest {
  /** Sender information (must be from a verified domain) */
  from: NylasEmailParticipant;
  /** Recipients */
  to: NylasEmailParticipant[];
  /** CC recipients */
  cc?: NylasEmailParticipant[];
  /** BCC recipients */
  bcc?: NylasEmailParticipant[];
  /** Email subject */
  subject?: string;
  /** HTML body content */
  body?: string;
  /** When true, sends as plain text instead of HTML */
  is_plaintext?: boolean;
  /** Template configuration */
  template?: {
    id: string;
    strict?: boolean;
    variables?: Record<string, string>;
  };
}

export interface NylasDomainSendResponse {
  request_id: string;
  data: {
    id: string;
  };
}
