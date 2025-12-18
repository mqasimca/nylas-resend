/**
 * nylas-resend - Resend-compatible SDK adapter for Nylas Inbound
 *
 * Drop-in replacement for the Resend SDK that uses Nylas under the hood.
 *
 * @example
 * ```typescript
 * import { Resend } from 'nylas-resend';
 *
 * const resend = new Resend({
 *   apiKey: 'nylas_api_key',
 *   grantId: 'nylas_grant_id'
 * });
 *
 * // Same API as Resend SDK
 * const { data, error } = await resend.emails.send({
 *   from: 'you@yourdomain.com',
 *   to: 'user@example.com',
 *   subject: 'Hello!',
 *   html: '<p>Hello World</p>'
 * });
 * ```
 */

import { NylasClient, createNylasClient } from './client.js';
import { Emails } from './emails.js';
import type { ResendConfig } from './types.js';

// Re-export types
export type {
  // Config
  ResendConfig,
  // Email types
  SendEmailRequest,
  SendEmailResponse,
  GetEmailResponse,
  ListEmailsResponse,
  Attachment,
  Tag,
  // Webhook types
  WebhookEvent,
  WebhookEventType,
  WebhookEventData,
  WebhookAttachment,
  InboundEmailEvent,
  // Response types
  ApiResponse,
  ResendError,
  // Nylas types (for advanced usage)
  NylasWebhookPayload,
  NylasMessage,
} from './types.js';

// Re-export webhook utilities
export {
  handleInboundWebhook,
  isInboundEmailEvent,
  parseNylasWebhook,
  verifyWebhookSignature,
} from './webhooks.js';

// Re-export transformers for advanced usage
export {
  parseEmailAddress,
  toParticipants,
  formatParticipant,
  transformSendRequest,
  transformSendResponse,
  transformMessageToEmail,
  transformWebhookToInboundEvent,
  isNylasMessageWebhook,
  isMessageCreatedWebhook,
} from './transformers.js';

// Re-export client error
export { NylasRequestError } from './client.js';

/**
 * Resend-compatible client for Nylas
 *
 * @example
 * ```typescript
 * // With config object
 * const resend = new Resend({
 *   apiKey: 'nylas_api_key',
 *   grantId: 'nylas_grant_id'
 * });
 *
 * // With environment variables (apiKey only, NYLAS_GRANT_ID must be set)
 * const resend = new Resend('nylas_api_key');
 * ```
 */
export class Resend {
  /** Emails API */
  public readonly emails: Emails;

  /** The underlying Nylas client (for advanced usage) */
  private readonly client: NylasClient;

  constructor(config: ResendConfig | string) {
    // Handle string API key (requires NYLAS_GRANT_ID env var)
    if (typeof config === 'string') {
      const grantId = process.env.NYLAS_GRANT_ID;
      if (!grantId) {
        throw new Error(
          'NYLAS_GRANT_ID environment variable is required when using string API key. ' +
          'Either set the environment variable or pass a config object with { apiKey, grantId }.'
        );
      }
      this.client = createNylasClient({
        apiKey: config,
        grantId,
        baseUrl: process.env.NYLAS_API_URL,
      });
    } else {
      if (!config.apiKey) {
        throw new Error('apiKey is required');
      }
      if (!config.grantId) {
        throw new Error('grantId is required');
      }
      this.client = createNylasClient(config);
    }

    // Initialize API namespaces
    this.emails = new Emails(this.client);
  }

  /**
   * Get the configured grant ID
   */
  getGrantId(): string {
    return this.client.getGrantId();
  }

  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return this.client.getBaseUrl();
  }
}

// Default export for CommonJS compatibility
export default Resend;
