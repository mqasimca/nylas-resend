import { describe, it, expect, vi } from 'vitest';
import {
  handleInboundWebhook,
  isInboundEmailEvent,
  parseNylasWebhook,
  verifyWebhookSignature,
} from './webhooks.js';
import type { NylasWebhookPayload, InboundEmailEvent } from './types.js';

describe('webhooks', () => {
  const validPayload: NylasWebhookPayload = {
    specversion: '1.0',
    type: 'message.created',
    source: '/nylas/inbox',
    id: 'webhook_123',
    time: '2024-01-15T10:30:00Z',
    webhook_delivery_attempt: 1,
    data: {
      application_id: 'app_123',
      grant_id: 'grant_456',
      object: {
        id: 'msg_789',
        grant_id: 'grant_456',
        from: [{ name: 'John Doe', email: 'john@example.com' }],
        to: [{ email: 'inbox@app.nylas.email' }],
        cc: [{ email: 'cc@example.com' }],
        subject: 'Test Inbound Email',
        body: '<p>Hello World!</p>',
        date: 1705315800,
        snippet: 'Hello World!',
        attachments: [
          {
            id: 'att_001',
            grant_id: 'grant_456',
            filename: 'document.pdf',
            content_type: 'application/pdf',
            size: 12345,
          },
        ],
      },
    },
  };

  describe('handleInboundWebhook', () => {
    it('should transform valid message.created webhook', () => {
      const result = handleInboundWebhook(validPayload);

      expect(result).not.toBeNull();
      expect(result!.type).toBe('email.received');
      expect(result!.created_at).toBe('2024-01-15T10:30:00Z');
      expect(result!.data.id).toBe('msg_789');
      expect(result!.data.from).toBe('John Doe <john@example.com>');
      expect(result!.data.to).toEqual(['inbox@app.nylas.email']);
      expect(result!.data.cc).toEqual(['cc@example.com']);
      expect(result!.data.subject).toBe('Test Inbound Email');
      expect(result!.data.html).toBe('<p>Hello World!</p>');
    });

    it('should include attachments in transformed event', () => {
      const result = handleInboundWebhook(validPayload);

      expect(result!.data.attachments).toHaveLength(1);
      expect(result!.data.attachments![0]).toEqual({
        filename: 'document.pdf',
        content_type: 'application/pdf',
        size: 12345,
      });
    });

    it('should return null for non-message.created webhooks', () => {
      const grantPayload = {
        ...validPayload,
        type: 'grant.updated',
      };

      const result = handleInboundWebhook(grantPayload);
      expect(result).toBeNull();
    });

    it('should return null for invalid payload', () => {
      expect(handleInboundWebhook(null)).toBeNull();
      expect(handleInboundWebhook(undefined)).toBeNull();
      expect(handleInboundWebhook('string')).toBeNull();
      expect(handleInboundWebhook(123)).toBeNull();
      expect(handleInboundWebhook({})).toBeNull();
    });

    it('should return null for payload missing data', () => {
      const result = handleInboundWebhook({ type: 'message.created' });
      expect(result).toBeNull();
    });

    it('should return null for payload missing object', () => {
      const result = handleInboundWebhook({
        type: 'message.created',
        data: {},
      });
      expect(result).toBeNull();
    });

    it('should handle email without name', () => {
      const payloadWithoutName: NylasWebhookPayload = {
        ...validPayload,
        data: {
          ...validPayload.data,
          object: {
            ...validPayload.data.object,
            from: [{ email: 'john@example.com' }],
          },
        },
      };

      const result = handleInboundWebhook(payloadWithoutName);
      expect(result!.data.from).toBe('john@example.com');
    });

    it('should handle empty from array', () => {
      const payloadWithEmptyFrom: NylasWebhookPayload = {
        ...validPayload,
        data: {
          ...validPayload.data,
          object: {
            ...validPayload.data.object,
            from: [],
          },
        },
      };

      const result = handleInboundWebhook(payloadWithEmptyFrom);
      expect(result!.data.from).toBe('');
    });

    it('should handle missing optional fields', () => {
      const minimalPayload: NylasWebhookPayload = {
        specversion: '1.0',
        type: 'message.created',
        source: '/nylas/inbox',
        id: 'webhook_123',
        time: '2024-01-15T10:30:00Z',
        webhook_delivery_attempt: 1,
        data: {
          application_id: 'app_123',
          grant_id: 'grant_456',
          object: {
            id: 'msg_789',
            grant_id: 'grant_456',
            from: [{ email: 'john@example.com' }],
            to: [{ email: 'inbox@app.nylas.email' }],
            subject: 'Test',
            body: 'Hello',
            date: 1705315800,
          },
        },
      };

      const result = handleInboundWebhook(minimalPayload);

      expect(result).not.toBeNull();
      expect(result!.data.cc).toEqual([]);
      expect(result!.data.bcc).toEqual([]);
      expect(result!.data.attachments).toBeUndefined();
    });
  });

  describe('isInboundEmailEvent', () => {
    it('should return true for email.received events', () => {
      const event: InboundEmailEvent = {
        type: 'email.received',
        created_at: '2024-01-15T10:30:00Z',
        data: {
          id: 'msg_123',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Test',
        },
      };

      expect(isInboundEmailEvent(event)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isInboundEmailEvent(null)).toBe(false);
    });

    it('should return false for other event types', () => {
      const event = {
        type: 'email.sent',
        created_at: '2024-01-15T10:30:00Z',
        data: {},
      };

      expect(isInboundEmailEvent(event as any)).toBe(false);
    });
  });

  describe('parseNylasWebhook', () => {
    it('should return payload for valid message.created webhook', () => {
      const result = parseNylasWebhook(validPayload);
      expect(result).toEqual(validPayload);
    });

    it('should return null for invalid webhook', () => {
      expect(parseNylasWebhook(null)).toBeNull();
      expect(parseNylasWebhook({ type: 'grant.updated' })).toBeNull();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true (placeholder implementation)', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = verifyWebhookSignature(
        '{"test": "payload"}',
        'signature_abc123',
        'webhook_secret'
      );

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Webhook signature verification not implemented')
      );

      consoleSpy.mockRestore();
    });

    it('should warn about missing implementation', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      verifyWebhookSignature('payload', 'sig', 'secret');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
