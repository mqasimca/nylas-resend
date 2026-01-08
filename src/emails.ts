/**
 * Emails API - Resend-compatible interface for sending and managing emails
 */

import type { NylasClient } from './client.js';
import { NylasRequestError } from './client.js';
import type {
  SendEmailRequest,
  SendEmailResponse,
  GetEmailResponse,
  ListEmailsResponse,
  ApiResponse,
  ResendError,
} from './types.js';
import {
  transformSendRequest,
  transformSendResponse,
  transformDomainSendRequest,
  transformDomainSendResponse,
  transformMessageToEmail,
} from './transformers.js';

/**
 * Create a ResendError from various error types
 */
function toResendError(err: unknown): ResendError {
  if (err instanceof NylasRequestError) {
    return {
      message: err.message,
      name: err.errorType || 'api_error',
      statusCode: err.statusCode,
    };
  }

  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
    };
  }

  return {
    message: String(err),
    name: 'unknown_error',
  };
}

export class Emails {
  constructor(private readonly client: NylasClient) {}

  /**
   * Send an email
   *
   * Uses domain-based send for Nylas Inbound (transactional emails),
   * or grant-based send for OAuth-connected providers (Gmail, Outlook, etc.)
   *
   * @example
   * ```typescript
   * const { data, error } = await resend.emails.send({
   *   from: 'you@example.com',
   *   to: 'user@example.com',
   *   subject: 'Hello!',
   *   html: '<p>Hello World</p>'
   * });
   * ```
   */
  async send(request: SendEmailRequest): Promise<ApiResponse<SendEmailResponse>> {
    try {
      // Validate required fields
      if (!request.from) {
        return {
          data: null,
          error: {
            message: 'Missing required field: from',
            name: 'validation_error',
          },
        };
      }

      if (!request.to || (Array.isArray(request.to) && request.to.length === 0)) {
        return {
          data: null,
          error: {
            message: 'Missing required field: to',
            name: 'validation_error',
          },
        };
      }

      if (!request.subject) {
        return {
          data: null,
          error: {
            message: 'Missing required field: subject',
            name: 'validation_error',
          },
        };
      }

      // Use domain-based send for Nylas Inbound, otherwise use grant-based send
      if (this.client.hasDomain()) {
        const nylasRequest = transformDomainSendRequest(request);
        const response = await this.client.sendDomainMessage(nylasRequest);
        const resendResponse = transformDomainSendResponse(response);
        return {
          data: resendResponse,
          error: null,
        };
      } else {
        const nylasRequest = transformSendRequest(request);
        const response = await this.client.sendMessage(nylasRequest);
        const resendResponse = transformSendResponse(response);
        return {
          data: resendResponse,
          error: null,
        };
      }
    } catch (err) {
      return {
        data: null,
        error: toResendError(err),
      };
    }
  }

  /**
   * Get an email by ID
   *
   * @example
   * ```typescript
   * const { data, error } = await resend.emails.get('email_id');
   * ```
   */
  async get(emailId: string): Promise<ApiResponse<GetEmailResponse>> {
    try {
      if (!emailId) {
        return {
          data: null,
          error: {
            message: 'Missing required parameter: emailId',
            name: 'validation_error',
          },
        };
      }

      const response = await this.client.getMessage(emailId);
      const email = transformMessageToEmail(response.data);

      return {
        data: email,
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: toResendError(err),
      };
    }
  }

  /**
   * List emails
   *
   * @example
   * ```typescript
   * const { data, error } = await resend.emails.list();
   * ```
   */
  async list(options?: { limit?: number }): Promise<ApiResponse<ListEmailsResponse>> {
    try {
      const response = await this.client.listMessages({
        limit: options?.limit,
      });

      const emails = response.data.map(transformMessageToEmail);

      return {
        data: {
          object: 'list',
          data: emails,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: toResendError(err),
      };
    }
  }
}
