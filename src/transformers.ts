/**
 * Transformers for converting between Resend and Nylas formats
 */

import type {
  SendEmailRequest,
  SendEmailResponse,
  GetEmailResponse,
  InboundEmailEvent,
  NylasEmailParticipant,
  NylasSendRequest,
  NylasSendResponse,
  NylasDomainSendRequest,
  NylasDomainSendResponse,
  NylasMessage,
  NylasWebhookPayload,
} from './types.js';

// ============================================================================
// Email Parsing Utilities
// ============================================================================

/**
 * Parse an email string into name and email parts
 * Handles formats:
 *   - "email@example.com"
 *   - "Name <email@example.com>"
 *   - "<email@example.com>"
 */
export function parseEmailAddress(input: string): NylasEmailParticipant {
  const trimmed = input.trim();

  // Match "Name <email@example.com>" or "<email@example.com>"
  const match = trimmed.match(/^(?:(.+?)\s*)?<(.+?)>$/);
  if (match) {
    const name = match[1]?.trim();
    const email = match[2].trim();
    return name ? { name, email } : { email };
  }

  // Plain email address
  return { email: trimmed };
}

/**
 * Convert string or string array to NylasEmailParticipant array
 */
export function toParticipants(
  input: string | string[] | undefined
): NylasEmailParticipant[] | undefined {
  if (!input) return undefined;
  const emails = Array.isArray(input) ? input : [input];
  return emails.map(parseEmailAddress);
}

/**
 * Format NylasEmailParticipant back to string
 */
export function formatParticipant(participant: NylasEmailParticipant): string {
  if (participant.name) {
    return `${participant.name} <${participant.email}>`;
  }
  return participant.email;
}

/**
 * Format participant array to string array (emails only)
 */
export function participantsToEmails(
  participants: NylasEmailParticipant[] | undefined
): string[] {
  if (!participants) return [];
  return participants.map((p) => p.email);
}

// ============================================================================
// Request Transformers (Resend → Nylas)
// ============================================================================

/**
 * Transform a Resend SendEmailRequest to Nylas format
 */
export function transformSendRequest(request: SendEmailRequest): NylasSendRequest {
  // Warn about unsupported features
  if (request.headers && Object.keys(request.headers).length > 0) {
    console.warn(
      'nylas-resend: Custom headers are not supported by Nylas JSON API. ' +
      'Headers will be ignored. Use raw MIME format for custom headers.'
    );
  }

  if (request.tags && request.tags.length > 0) {
    console.warn(
      'nylas-resend: Tags are not supported by Nylas API. Tags will be ignored.'
    );
  }

  const nylasRequest: NylasSendRequest = {
    subject: request.subject,
    body: request.html || request.text || '',
    to: toParticipants(request.to)!,
  };

  // From address
  if (request.from) {
    nylasRequest.from = [parseEmailAddress(request.from)];
  }

  // Optional recipients
  const cc = toParticipants(request.cc);
  if (cc?.length) {
    nylasRequest.cc = cc;
  }

  const bcc = toParticipants(request.bcc);
  if (bcc?.length) {
    nylasRequest.bcc = bcc;
  }

  const replyTo = toParticipants(request.replyTo);
  if (replyTo?.length) {
    nylasRequest.reply_to = replyTo;
  }

  // Attachments
  if (request.attachments?.length) {
    nylasRequest.attachments = request.attachments.map((att) => ({
      filename: att.filename,
      content:
        typeof att.content === 'string'
          ? att.content
          : att.content?.toString('base64') || '',
      content_type: att.contentType || 'application/octet-stream',
      ...(att.contentId ? { content_id: att.contentId } : {}),
    }));
  }

  // Scheduled send
  if (request.scheduledAt) {
    const timestamp = new Date(request.scheduledAt).getTime();
    if (!isNaN(timestamp)) {
      nylasRequest.send_at = Math.floor(timestamp / 1000);
    }
  }

  return nylasRequest;
}

// ============================================================================
// Response Transformers (Nylas → Resend)
// ============================================================================

/**
 * Transform Nylas send response to Resend format
 */
export function transformSendResponse(
  response: NylasSendResponse
): SendEmailResponse {
  return {
    id: response.data.id,
  };
}

/**
 * Transform a Resend SendEmailRequest to Nylas domain-based send format
 * Used for Nylas Inbound transactional emails
 */
export function transformDomainSendRequest(request: SendEmailRequest): NylasDomainSendRequest {
  // Warn about unsupported features for domain-based sends
  if (request.headers && Object.keys(request.headers).length > 0) {
    console.warn(
      'nylas-resend: Custom headers are not supported by Nylas domain send API. Headers will be ignored.'
    );
  }

  if (request.tags && request.tags.length > 0) {
    console.warn(
      'nylas-resend: Tags are not supported by Nylas API. Tags will be ignored.'
    );
  }

  if (request.attachments && request.attachments.length > 0) {
    console.warn(
      'nylas-resend: Attachments are not supported by Nylas domain send API. Attachments will be ignored.'
    );
  }

  if (request.scheduledAt) {
    console.warn(
      'nylas-resend: Scheduled send is not supported by Nylas domain send API. scheduledAt will be ignored.'
    );
  }

  if (request.replyTo) {
    console.warn(
      'nylas-resend: Reply-to is not supported by Nylas domain send API. replyTo will be ignored.'
    );
  }

  const nylasRequest: NylasDomainSendRequest = {
    from: parseEmailAddress(request.from),
    to: toParticipants(request.to)!,
    subject: request.subject,
    body: request.html || request.text || '',
    is_plaintext: !request.html && !!request.text,
  };

  // Optional CC
  const cc = toParticipants(request.cc);
  if (cc?.length) {
    nylasRequest.cc = cc;
  }

  // Optional BCC
  const bcc = toParticipants(request.bcc);
  if (bcc?.length) {
    nylasRequest.bcc = bcc;
  }

  return nylasRequest;
}

/**
 * Transform Nylas domain send response to Resend format
 */
export function transformDomainSendResponse(
  response: NylasDomainSendResponse
): SendEmailResponse {
  return {
    id: response.data.id,
  };
}

/**
 * Transform Nylas message to Resend GetEmailResponse format
 */
export function transformMessageToEmail(message: NylasMessage): GetEmailResponse {
  return {
    id: message.id,
    object: 'email',
    from: message.from[0] ? formatParticipant(message.from[0]) : '',
    to: participantsToEmails(message.to),
    cc: participantsToEmails(message.cc),
    bcc: participantsToEmails(message.bcc),
    replyTo: participantsToEmails(message.reply_to),
    subject: message.subject,
    text: message.body,
    html: message.body,
    createdAt: new Date(message.date * 1000).toISOString(),
    lastEvent: 'email.sent',
  };
}

// ============================================================================
// Webhook Transformers (Nylas → Resend)
// ============================================================================

/**
 * Check if a payload is a valid Nylas message.created webhook
 */
export function isNylasMessageWebhook(
  payload: unknown
): payload is NylasWebhookPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;

  // Check required fields
  if (typeof p.type !== 'string') return false;
  if (typeof p.data !== 'object' || p.data === null) return false;

  const data = p.data as Record<string, unknown>;
  if (typeof data.object !== 'object' || data.object === null) return false;

  return true;
}

/**
 * Check if the webhook is specifically a message.created event
 */
export function isMessageCreatedWebhook(
  payload: unknown
): payload is NylasWebhookPayload {
  if (!isNylasMessageWebhook(payload)) return false;
  return payload.type === 'message.created';
}

/**
 * Transform Nylas webhook payload to Resend inbound email event format
 */
export function transformWebhookToInboundEvent(
  payload: NylasWebhookPayload
): InboundEmailEvent {
  const message = payload.data.object;

  return {
    type: 'email.received',
    createdAt: payload.time,
    data: {
      id: message.id,
      from: message.from[0] ? formatParticipant(message.from[0]) : '',
      to: participantsToEmails(message.to),
      cc: participantsToEmails(message.cc),
      bcc: participantsToEmails(message.bcc),
      replyTo: participantsToEmails(message.reply_to),
      subject: message.subject,
      text: message.body,
      html: message.body,
      createdAt: payload.time,
      attachments: message.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.content_type,
        size: att.size,
      })),
    },
  };
}
