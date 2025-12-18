/**
 * Webhook utilities for handling Nylas webhooks in Resend format
 */

import type { InboundEmailEvent, NylasWebhookPayload, WebhookEvent } from './types.js';
import {
  isMessageCreatedWebhook,
  transformWebhookToInboundEvent,
} from './transformers.js';

/**
 * Handle an inbound webhook from Nylas and transform it to Resend format
 *
 * @param payload - The raw webhook payload from Nylas
 * @returns The transformed Resend-format event, or null if not a valid message webhook
 *
 * @example
 * ```typescript
 * import { handleInboundWebhook } from 'nylas-resend';
 *
 * app.post('/webhook', (req, res) => {
 *   const event = handleInboundWebhook(req.body);
 *
 *   if (event?.type === 'email.received') {
 *     console.log('From:', event.data.from);
 *     console.log('Subject:', event.data.subject);
 *   }
 *
 *   res.sendStatus(200);
 * });
 * ```
 */
export function handleInboundWebhook(
  payload: unknown
): InboundEmailEvent | null {
  if (!isMessageCreatedWebhook(payload)) {
    return null;
  }

  return transformWebhookToInboundEvent(payload);
}

/**
 * Type guard to check if an event is an inbound email event
 */
export function isInboundEmailEvent(
  event: WebhookEvent | null
): event is InboundEmailEvent {
  return event !== null && event.type === 'email.received';
}

/**
 * Parse and validate a Nylas webhook payload
 * Returns the raw Nylas payload if valid, null otherwise
 */
export function parseNylasWebhook(payload: unknown): NylasWebhookPayload | null {
  if (!isMessageCreatedWebhook(payload)) {
    return null;
  }
  return payload;
}

/**
 * Webhook verification (placeholder for future implementation)
 * Nylas uses a different verification mechanism than Resend
 */
export function verifyWebhookSignature(
  _payload: string,
  _signature: string,
  _secret: string
): boolean {
  // Note: Nylas webhook verification uses HMAC-SHA256
  // This would need the webhook secret from Nylas dashboard
  // For now, return true - implement proper verification when needed
  console.warn(
    'nylas-resend: Webhook signature verification not implemented. ' +
    'Verify webhooks using Nylas SDK or implement HMAC-SHA256 verification.'
  );
  return true;
}
