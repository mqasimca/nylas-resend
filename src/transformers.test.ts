import { describe, it, expect, vi } from 'vitest';
import {
  parseEmailAddress,
  toParticipants,
  formatParticipant,
  participantsToEmails,
  transformSendRequest,
  transformSendResponse,
  transformMessageToEmail,
  isNylasMessageWebhook,
  isMessageCreatedWebhook,
  transformWebhookToInboundEvent,
} from './transformers.js';
import type {
  SendEmailRequest,
  NylasSendResponse,
  NylasMessage,
  NylasWebhookPayload,
} from './types.js';

// ============================================================================
// Email Parsing Tests
// ============================================================================

describe('parseEmailAddress', () => {
  it('should parse plain email address', () => {
    const result = parseEmailAddress('user@example.com');
    expect(result).toEqual({ email: 'user@example.com' });
  });

  it('should parse email with name in angle brackets', () => {
    const result = parseEmailAddress('John Doe <john@example.com>');
    expect(result).toEqual({ name: 'John Doe', email: 'john@example.com' });
  });

  it('should parse email with only angle brackets', () => {
    const result = parseEmailAddress('<john@example.com>');
    expect(result).toEqual({ email: 'john@example.com' });
  });

  it('should handle whitespace', () => {
    const result = parseEmailAddress('  John Doe  <  john@example.com  >  ');
    expect(result).toEqual({ name: 'John Doe', email: 'john@example.com' });
  });

  it('should handle name with special characters', () => {
    const result = parseEmailAddress('John "Johnny" Doe <john@example.com>');
    expect(result).toEqual({ name: 'John "Johnny" Doe', email: 'john@example.com' });
  });
});

describe('toParticipants', () => {
  it('should return undefined for undefined input', () => {
    expect(toParticipants(undefined)).toBeUndefined();
  });

  it('should convert single string to array', () => {
    const result = toParticipants('user@example.com');
    expect(result).toEqual([{ email: 'user@example.com' }]);
  });

  it('should convert string array', () => {
    const result = toParticipants(['user1@example.com', 'user2@example.com']);
    expect(result).toEqual([
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
    ]);
  });

  it('should parse mixed formats', () => {
    const result = toParticipants([
      'user1@example.com',
      'John Doe <john@example.com>',
    ]);
    expect(result).toEqual([
      { email: 'user1@example.com' },
      { name: 'John Doe', email: 'john@example.com' },
    ]);
  });
});

describe('formatParticipant', () => {
  it('should format email only', () => {
    expect(formatParticipant({ email: 'user@example.com' })).toBe('user@example.com');
  });

  it('should format name and email', () => {
    expect(formatParticipant({ name: 'John Doe', email: 'john@example.com' })).toBe(
      'John Doe <john@example.com>'
    );
  });
});

describe('participantsToEmails', () => {
  it('should return empty array for undefined', () => {
    expect(participantsToEmails(undefined)).toEqual([]);
  });

  it('should extract emails from participants', () => {
    const result = participantsToEmails([
      { name: 'John', email: 'john@example.com' },
      { email: 'jane@example.com' },
    ]);
    expect(result).toEqual(['john@example.com', 'jane@example.com']);
  });
});

// ============================================================================
// Request Transformation Tests
// ============================================================================

describe('transformSendRequest', () => {
  it('should transform minimal request', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Hello World',
    };

    const result = transformSendRequest(request);

    expect(result).toEqual({
      from: [{ email: 'sender@example.com' }],
      to: [{ email: 'recipient@example.com' }],
      subject: 'Test Subject',
      body: 'Hello World',
    });
  });

  it('should prefer HTML over text', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Plain text',
      html: '<p>HTML content</p>',
    };

    const result = transformSendRequest(request);
    expect(result.body).toBe('<p>HTML content</p>');
  });

  it('should transform multiple recipients', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Test',
      text: 'Hello',
    };

    const result = transformSendRequest(request);
    expect(result.to).toEqual([
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
    ]);
  });

  it('should transform CC and BCC', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
      cc: 'cc@example.com',
      bcc: ['bcc1@example.com', 'bcc2@example.com'],
    };

    const result = transformSendRequest(request);
    expect(result.cc).toEqual([{ email: 'cc@example.com' }]);
    expect(result.bcc).toEqual([
      { email: 'bcc1@example.com' },
      { email: 'bcc2@example.com' },
    ]);
  });

  it('should transform replyTo', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
      replyTo: 'Reply Person <reply@example.com>',
    };

    const result = transformSendRequest(request);
    expect(result.reply_to).toEqual([
      { name: 'Reply Person', email: 'reply@example.com' },
    ]);
  });

  it('should transform attachments with string content', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'See attachment',
      attachments: [
        {
          filename: 'test.txt',
          content: 'SGVsbG8gV29ybGQ=', // base64
          contentType: 'text/plain',
        },
      ],
    };

    const result = transformSendRequest(request);
    expect(result.attachments).toEqual([
      {
        filename: 'test.txt',
        content: 'SGVsbG8gV29ybGQ=',
        content_type: 'text/plain',
      },
    ]);
  });

  it('should transform attachments with Buffer content', () => {
    const buffer = Buffer.from('Hello World');
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'See attachment',
      attachments: [
        {
          filename: 'test.txt',
          content: buffer,
        },
      ],
    };

    const result = transformSendRequest(request);
    expect(result.attachments?.[0].content).toBe(buffer.toString('base64'));
    expect(result.attachments?.[0].content_type).toBe('application/octet-stream');
  });

  it('should transform scheduledAt to send_at timestamp', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
      scheduledAt: '2024-12-25T10:00:00Z',
    };

    const result = transformSendRequest(request);
    expect(result.send_at).toBe(Math.floor(new Date('2024-12-25T10:00:00Z').getTime() / 1000));
  });

  it('should not include empty CC/BCC arrays', () => {
    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
    };

    const result = transformSendRequest(request);
    expect(result.cc).toBeUndefined();
    expect(result.bcc).toBeUndefined();
  });

  it('should warn when headers are provided', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
      headers: { 'X-Custom-Header': 'value' },
    };

    transformSendRequest(request);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Custom headers are not supported')
    );

    consoleSpy.mockRestore();
  });

  it('should warn when tags are provided', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
      tags: [{ name: 'category', value: 'newsletter' }],
    };

    transformSendRequest(request);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Tags are not supported')
    );

    consoleSpy.mockRestore();
  });

  it('should not warn when headers object is empty', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const request: SendEmailRequest = {
      from: 'sender@example.com',
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Hello',
      headers: {},
    };

    transformSendRequest(request);

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// Response Transformation Tests
// ============================================================================

describe('transformSendResponse', () => {
  it('should extract message ID', () => {
    const response: NylasSendResponse = {
      request_id: 'req_123',
      data: {
        id: 'msg_456',
        grant_id: 'grant_789',
        from: [{ email: 'sender@example.com' }],
        to: [{ email: 'recipient@example.com' }],
        subject: 'Test',
        body: 'Hello',
        date: 1702915200,
      },
    };

    const result = transformSendResponse(response);
    expect(result).toEqual({ id: 'msg_456' });
  });
});

describe('transformMessageToEmail', () => {
  it('should transform Nylas message to Resend format', () => {
    const message: NylasMessage = {
      id: 'msg_123',
      grant_id: 'grant_456',
      from: [{ name: 'John Doe', email: 'john@example.com' }],
      to: [{ email: 'jane@example.com' }],
      cc: [{ email: 'cc@example.com' }],
      subject: 'Test Subject',
      body: '<p>Hello World</p>',
      date: 1702915200,
    };

    const result = transformMessageToEmail(message);

    expect(result).toEqual({
      id: 'msg_123',
      object: 'email',
      from: 'John Doe <john@example.com>',
      to: ['jane@example.com'],
      cc: ['cc@example.com'],
      bcc: null,
      reply_to: null,
      subject: 'Test Subject',
      text: '<p>Hello World</p>',
      html: '<p>Hello World</p>',
      created_at: new Date(1702915200 * 1000).toISOString(),
      scheduled_at: null,
      last_event: 'sent',
    });
  });

  it('should handle missing from address', () => {
    const message: NylasMessage = {
      id: 'msg_123',
      grant_id: 'grant_456',
      from: [],
      to: [{ email: 'jane@example.com' }],
      subject: 'Test',
      body: 'Hello',
      date: 1702915200,
    };

    const result = transformMessageToEmail(message);
    expect(result.from).toBe('');
  });
});

// ============================================================================
// Webhook Transformation Tests
// ============================================================================

describe('isNylasMessageWebhook', () => {
  it('should return false for null', () => {
    expect(isNylasMessageWebhook(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isNylasMessageWebhook('string')).toBe(false);
    expect(isNylasMessageWebhook(123)).toBe(false);
  });

  it('should return false for missing type', () => {
    expect(isNylasMessageWebhook({ data: { object: {} } })).toBe(false);
  });

  it('should return false for missing data', () => {
    expect(isNylasMessageWebhook({ type: 'message.created' })).toBe(false);
  });

  it('should return false for missing object', () => {
    expect(isNylasMessageWebhook({ type: 'message.created', data: {} })).toBe(false);
  });

  it('should return true for valid payload', () => {
    const payload = {
      type: 'message.created',
      data: {
        object: { id: 'msg_123' },
      },
    };
    expect(isNylasMessageWebhook(payload)).toBe(true);
  });
});

describe('isMessageCreatedWebhook', () => {
  it('should return false for other event types', () => {
    const payload = {
      type: 'grant.updated',
      data: {
        object: { id: 'grant_123' },
      },
    };
    expect(isMessageCreatedWebhook(payload)).toBe(false);
  });

  it('should return true for message.created', () => {
    const payload = {
      type: 'message.created',
      data: {
        object: { id: 'msg_123' },
      },
    };
    expect(isMessageCreatedWebhook(payload)).toBe(true);
  });
});

describe('transformWebhookToInboundEvent', () => {
  const mockPayload: NylasWebhookPayload = {
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
        body: '<p>Hello from outside!</p>',
        date: 1705315800,
        snippet: 'Hello from outside!',
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

  it('should transform to Resend inbound event format', () => {
    const result = transformWebhookToInboundEvent(mockPayload);

    expect(result.type).toBe('email.received');
    expect(result.created_at).toBe('2024-01-15T10:30:00Z');
    expect(result.data.email_id).toBe('msg_789');
    expect(result.data.from).toBe('John Doe <john@example.com>');
    expect(result.data.to).toEqual(['inbox@app.nylas.email']);
    expect(result.data.cc).toEqual(['cc@example.com']);
    expect(result.data.subject).toBe('Test Inbound Email');
    expect(result.data.message_id).toBe('msg_789');
  });

  it('should transform attachments', () => {
    const result = transformWebhookToInboundEvent(mockPayload);

    expect(result.data.attachments).toHaveLength(1);
    expect(result.data.attachments?.[0]).toEqual({
      id: 'att_001',
      filename: 'document.pdf',
      content_type: 'application/pdf',
      content_disposition: 'attachment',
      content_id: undefined,
    });
  });

  it('should handle missing attachments', () => {
    const payloadWithoutAttachments: NylasWebhookPayload = {
      ...mockPayload,
      data: {
        ...mockPayload.data,
        object: {
          ...mockPayload.data.object,
          attachments: undefined,
        },
      },
    };

    const result = transformWebhookToInboundEvent(payloadWithoutAttachments);
    expect(result.data.attachments).toEqual([]);
  });

  it('should handle empty from array', () => {
    const payloadWithEmptyFrom: NylasWebhookPayload = {
      ...mockPayload,
      data: {
        ...mockPayload.data,
        object: {
          ...mockPayload.data.object,
          from: [],
        },
      },
    };

    const result = transformWebhookToInboundEvent(payloadWithEmptyFrom);
    expect(result.data.from).toBe('');
  });
});
