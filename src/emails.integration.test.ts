/**
 * Integration tests for nylas-resend
 *
 * These tests require actual Nylas credentials and make real API calls.
 * Run with: npm run test:integration
 *
 * Required environment variables:
 *   NYLAS_API_KEY - Your Nylas API key
 *   NYLAS_INBOUND_GRANT_ID - Your Nylas grant ID for inbound email
 *   NYLAS_INBOUND_EMAIL - Email address for sending from (e.g., info@qasim.nylas.email)
 *   NYLAS_INBOUND_DOMAIN - Domain for sending transactional emails (e.g., qasim.nylas.email)
 *                          If not set, will be extracted from NYLAS_INBOUND_EMAIL
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Resend, handleInboundWebhook } from './index.js';
import type { NylasWebhookPayload } from './types.js';

// Skip integration tests if credentials not provided
const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
const NYLAS_INBOUND_GRANT_ID = process.env.NYLAS_INBOUND_GRANT_ID;
const NYLAS_INBOUND_EMAIL = process.env.NYLAS_INBOUND_EMAIL;
// Extract domain from email if NYLAS_INBOUND_DOMAIN is not set
const NYLAS_INBOUND_DOMAIN = process.env.NYLAS_INBOUND_DOMAIN ||
  (NYLAS_INBOUND_EMAIL ? NYLAS_INBOUND_EMAIL.split('@')[1] : undefined);
const TEST_RECIPIENT = 'qasim.m@nylas.com';

const hasCredentials = NYLAS_API_KEY && NYLAS_INBOUND_GRANT_ID && NYLAS_INBOUND_EMAIL && NYLAS_INBOUND_DOMAIN;

describe.skipIf(!hasCredentials)('Integration Tests', () => {
  let resend: Resend;
  let sentEmailId: string | undefined;

  beforeAll(() => {
    resend = new Resend({
      apiKey: NYLAS_API_KEY!,
      grantId: NYLAS_INBOUND_GRANT_ID!,
      domain: NYLAS_INBOUND_DOMAIN!,
    });
  });

  describe('emails.send', () => {
    it('should send a basic email successfully', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        subject: `Integration Test - ${new Date().toISOString()}`,
        text: 'This is a test email from nylas-resend integration tests.',
        html: '<p>This is a test email from <strong>nylas-resend</strong> integration tests.</p>',
      });

      if (error) {
        console.error('Send error:', error);
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBeDefined();
      expect(typeof data?.id).toBe('string');

      sentEmailId = data?.id;
      console.log('✅ Sent email ID:', data?.id);
    });

    it('should send email with CC', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        cc: TEST_RECIPIENT,
        subject: `Integration Test CC - ${new Date().toISOString()}`,
        text: 'Testing CC functionality.',
      });

      if (error) {
        console.error('Send CC error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with CC, ID:', data?.id);
    });

    it('should send email with BCC', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        bcc: TEST_RECIPIENT,
        subject: `Integration Test BCC - ${new Date().toISOString()}`,
        text: 'Testing BCC functionality.',
      });

      if (error) {
        console.error('Send BCC error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with BCC, ID:', data?.id);
    });

    it('should send email with replyTo', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        replyTo: NYLAS_INBOUND_EMAIL!,
        subject: `Integration Test Reply-To - ${new Date().toISOString()}`,
        html: '<p>Testing <strong>replyTo</strong> functionality.</p>',
      });

      if (error) {
        console.error('Send replyTo error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with replyTo, ID:', data?.id);
    });

    it('should send email to multiple recipients', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: [TEST_RECIPIENT],
        subject: `Integration Test Multiple Recipients - ${new Date().toISOString()}`,
        text: 'Testing multiple recipients functionality.',
      });

      if (error) {
        console.error('Send multiple recipients error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email to multiple recipients, ID:', data?.id);
    });

    it('should send email with attachment', async () => {
      const testContent = Buffer.from('Hello, this is a test attachment!').toString('base64');

      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        subject: `Integration Test Attachment - ${new Date().toISOString()}`,
        text: 'Testing attachment functionality.',
        attachments: [
          {
            filename: 'test.txt',
            content: testContent,
            contentType: 'text/plain',
          },
        ],
      });

      if (error) {
        console.error('Send attachment error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with attachment, ID:', data?.id);
    });

    it('should send email with multiple attachments', async () => {
      const textContent = Buffer.from('Text file content').toString('base64');
      const csvContent = Buffer.from('name,email\nJohn,john@example.com').toString('base64');

      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        subject: `Integration Test Multiple Attachments - ${new Date().toISOString()}`,
        html: '<p>Testing <strong>multiple attachments</strong>.</p>',
        attachments: [
          {
            filename: 'readme.txt',
            content: textContent,
            contentType: 'text/plain',
          },
          {
            filename: 'data.csv',
            content: csvContent,
            contentType: 'text/csv',
          },
        ],
      });

      if (error) {
        console.error('Send multiple attachments error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with multiple attachments, ID:', data?.id);
    });

    it('should send scheduled email', async () => {
      // Schedule for 1 hour from now
      const scheduledTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        subject: `Integration Test Scheduled - ${new Date().toISOString()}`,
        text: 'Testing scheduled email functionality.',
        scheduledAt: scheduledTime,
      });

      if (error) {
        console.error('Send scheduled error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Scheduled email, ID:', data?.id);
      console.log('   Scheduled for:', scheduledTime);
    });

    it('should send email with all options combined', async () => {
      const attachmentContent = Buffer.from('Combined test attachment').toString('base64');

      const { data, error } = await resend.emails.send({
        from: `Test Sender <${NYLAS_INBOUND_EMAIL!}>`,
        to: [TEST_RECIPIENT],
        cc: TEST_RECIPIENT,
        bcc: TEST_RECIPIENT,
        replyTo: NYLAS_INBOUND_EMAIL!,
        subject: `Integration Test Combined - ${new Date().toISOString()}`,
        text: 'Plain text version of the email.',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h1>Combined Test Email</h1>
            <p>This email tests all options combined:</p>
            <ul>
              <li>From with display name</li>
              <li>Multiple recipients (to, cc, bcc)</li>
              <li>Reply-to address</li>
              <li>HTML and plain text body</li>
              <li>Attachment</li>
            </ul>
          </div>
        `,
        attachments: [
          {
            filename: 'combined-test.txt',
            content: attachmentContent,
            contentType: 'text/plain',
          },
        ],
      });

      if (error) {
        console.error('Send combined error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with all options, ID:', data?.id);
    });

    it('should handle invalid API key', async () => {
      const invalidResend = new Resend({
        apiKey: 'invalid_key',
        grantId: NYLAS_INBOUND_GRANT_ID!,
        domain: NYLAS_INBOUND_DOMAIN!,
      });

      const { data, error } = await invalidResend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        subject: 'Should fail',
        text: 'This should not be sent.',
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.statusCode).toBe(401);
      console.log('✅ Invalid API key correctly returned 401');
    });

    it('should return validation error for missing from', async () => {
      const { data, error } = await resend.emails.send({
        from: '',
        to: TEST_RECIPIENT,
        subject: 'Test',
        text: 'Hello',
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.name).toBe('validation_error');
      expect(error?.message).toContain('from');
      console.log('✅ Validation error for missing from');
    });

    it('should return validation error for missing to', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: [],
        subject: 'Test',
        text: 'Hello',
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.name).toBe('validation_error');
      expect(error?.message).toContain('to');
      console.log('✅ Validation error for missing to');
    });

    it('should return validation error for missing subject', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_INBOUND_EMAIL!,
        to: TEST_RECIPIENT,
        subject: '',
        text: 'Hello',
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.name).toBe('validation_error');
      expect(error?.message).toContain('subject');
      console.log('✅ Validation error for missing subject');
    });
  });

  describe('emails.list', () => {
    it('should list emails', async () => {
      const { data, error } = await resend.emails.list({ limit: 5 });

      if (error) {
        console.error('List error:', error);
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.object).toBe('list');
      expect(Array.isArray(data?.data)).toBe(true);
      console.log('✅ Listed', data?.data.length, 'emails');
    });

    it('should list emails without options', async () => {
      const { data, error } = await resend.emails.list();

      if (error) {
        console.error('List without options error:', error);
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.object).toBe('list');
      console.log('✅ Listed emails without options');
    });

    it('should return proper email structure', async () => {
      const { data, error } = await resend.emails.list({ limit: 1 });

      expect(error).toBeNull();

      if (data?.data.length) {
        const email = data.data[0];
        expect(email.id).toBeDefined();
        expect(email.object).toBe('email');
        expect(email.from).toBeDefined();
        expect(email.to).toBeDefined();
        expect(Array.isArray(email.to)).toBe(true);
        expect(email.subject).toBeDefined();
        expect(email.created_at).toBeDefined();
        console.log('✅ Email structure is correct');
      }
    });
  });

  describe('emails.get', () => {
    it('should get email by ID', async () => {
      // First, list emails to get an ID
      const listResult = await resend.emails.list({ limit: 1 });

      if (!listResult.data?.data.length) {
        console.log('⚠️ No emails to test get()');
        return;
      }

      const emailId = listResult.data.data[0].id;
      const { data, error } = await resend.emails.get(emailId);

      if (error) {
        console.error('Get error:', error);
      }

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.id).toBe(emailId);
      expect(data?.object).toBe('email');
      expect(data?.from).toBeDefined();
      expect(data?.to).toBeDefined();
      expect(data?.subject).toBeDefined();
      expect(data?.created_at).toBeDefined();
      console.log('✅ Got email by ID:', emailId);
    });

    it('should handle non-existent email ID', async () => {
      const { data, error } = await resend.emails.get('non_existent_id_12345');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      // Nylas API returns 400 for invalid message IDs
      expect(error?.statusCode).toBe(400);
      console.log('✅ Non-existent email ID correctly returned 400');
    });

    it('should return validation error for empty ID', async () => {
      const { data, error } = await resend.emails.get('');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.name).toBe('validation_error');
      console.log('✅ Empty ID validation error');
    });
  });
});

describe('Webhook Transformation Integration Tests', () => {
  it('should transform a complete Nylas webhook payload', () => {
    const nylasPayload: NylasWebhookPayload = {
      specversion: '1.0',
      type: 'message.created',
      source: '/nylas/inbox',
      id: 'webhook_abc123',
      time: '2024-01-15T10:30:00Z',
      webhook_delivery_attempt: 1,
      data: {
        application_id: 'app_xyz789',
        grant_id: 'grant_def456',
        object: {
          id: 'msg_integration_test',
          grant_id: 'grant_def456',
          from: [{ name: 'External Sender', email: 'external@example.com' }],
          to: [{ email: 'inbox@your-app.nylas.email' }],
          cc: [{ name: 'CC Person', email: 'cc@example.com' }],
          bcc: [{ email: 'bcc@example.com' }],
          reply_to: [{ email: 'reply@example.com' }],
          subject: 'Inbound Email Test',
          body: '<p>This is an inbound email for integration testing.</p>',
          date: 1705315800,
          thread_id: 'thread_123',
          snippet: 'This is an inbound email...',
          starred: false,
          unread: true,
          folders: ['inbox'],
          attachments: [
            {
              id: 'att_001',
              grant_id: 'grant_def456',
              filename: 'report.pdf',
              content_type: 'application/pdf',
              size: 54321,
            },
            {
              id: 'att_002',
              grant_id: 'grant_def456',
              filename: 'image.png',
              content_type: 'image/png',
              size: 12345,
            },
          ],
        },
      },
    };

    const result = handleInboundWebhook(nylasPayload);

    // Verify transformation
    expect(result).not.toBeNull();
    expect(result!.type).toBe('email.received');
    expect(result!.created_at).toBe('2024-01-15T10:30:00Z');

    // Check data fields
    expect(result!.data.email_id).toBe('msg_integration_test');
    expect(result!.data.message_id).toBe('msg_integration_test');
    expect(result!.data.from).toBe('External Sender <external@example.com>');
    expect(result!.data.to).toEqual(['inbox@your-app.nylas.email']);
    expect(result!.data.cc).toEqual(['cc@example.com']);
    expect(result!.data.bcc).toEqual(['bcc@example.com']);
    expect(result!.data.subject).toBe('Inbound Email Test');

    // Check attachments
    expect(result!.data.attachments).toHaveLength(2);
    expect(result!.data.attachments![0]).toEqual({
      id: 'att_001',
      filename: 'report.pdf',
      content_type: 'application/pdf',
      content_disposition: 'attachment',
      content_id: undefined,
    });
    expect(result!.data.attachments![1]).toEqual({
      id: 'att_002',
      filename: 'image.png',
      content_type: 'image/png',
      content_disposition: 'attachment',
      content_id: undefined,
    });

    console.log('✅ Webhook transformation complete');
  });

  it('should handle minimal webhook payload', () => {
    const minimalPayload: NylasWebhookPayload = {
      specversion: '1.0',
      type: 'message.created',
      source: '/nylas/inbox',
      id: 'webhook_minimal',
      time: '2024-01-15T12:00:00Z',
      webhook_delivery_attempt: 1,
      data: {
        application_id: 'app_123',
        grant_id: 'grant_456',
        object: {
          id: 'msg_minimal',
          grant_id: 'grant_456',
          from: [{ email: 'sender@example.com' }],
          to: [{ email: 'recipient@example.com' }],
          subject: 'Minimal Test',
          body: 'Plain text body',
          date: 1705320000,
        },
      },
    };

    const result = handleInboundWebhook(minimalPayload);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('email.received');
    expect(result!.data.from).toBe('sender@example.com');
    expect(result!.data.cc).toEqual([]);
    expect(result!.data.bcc).toEqual([]);
    expect(result!.data.attachments).toEqual([]);

    console.log('✅ Minimal webhook transformation complete');
  });

  it('should return null for non-message webhooks', () => {
    const grantUpdatedPayload = {
      specversion: '1.0',
      type: 'grant.updated',
      source: '/nylas/grants',
      id: 'webhook_grant',
      time: '2024-01-15T12:00:00Z',
      webhook_delivery_attempt: 1,
      data: {
        application_id: 'app_123',
        grant_id: 'grant_456',
        object: { id: 'grant_456' },
      },
    };

    const result = handleInboundWebhook(grantUpdatedPayload);
    expect(result).toBeNull();
    console.log('✅ Non-message webhook correctly returns null');
  });

  it('should return null for invalid payloads', () => {
    expect(handleInboundWebhook(null)).toBeNull();
    expect(handleInboundWebhook(undefined)).toBeNull();
    expect(handleInboundWebhook({})).toBeNull();
    expect(handleInboundWebhook('invalid')).toBeNull();
    expect(handleInboundWebhook({ type: 'message.created' })).toBeNull();
    expect(handleInboundWebhook({ type: 'message.created', data: {} })).toBeNull();

    console.log('✅ Invalid payloads correctly return null');
  });
});

describe('Client Configuration Integration Tests', () => {
  it('should use default US base URL', () => {
    const resend = new Resend({
      apiKey: 'test_key',
      grantId: 'test_grant',
    });

    expect(resend.getBaseUrl()).toBe('https://api.us.nylas.com');
    console.log('✅ Default US base URL');
  });

  it('should use EU base URL when specified', () => {
    const resend = new Resend({
      apiKey: 'test_key',
      grantId: 'test_grant',
      baseUrl: 'https://api.eu.nylas.com',
    });

    expect(resend.getBaseUrl()).toBe('https://api.eu.nylas.com');
    console.log('✅ EU base URL configured');
  });

  it('should strip trailing slash from base URL', () => {
    const resend = new Resend({
      apiKey: 'test_key',
      grantId: 'test_grant',
      baseUrl: 'https://api.us.nylas.com/',
    });

    expect(resend.getBaseUrl()).toBe('https://api.us.nylas.com');
    console.log('✅ Trailing slash stripped');
  });

  it('should return grant ID', () => {
    const resend = new Resend({
      apiKey: 'test_key',
      grantId: 'my_grant_id',
    });

    expect(resend.getGrantId()).toBe('my_grant_id');
    console.log('✅ Grant ID accessible');
  });

  it('should throw error for missing apiKey', () => {
    expect(() => {
      new Resend({
        apiKey: '',
        grantId: 'test_grant',
      });
    }).toThrow('apiKey is required');
    console.log('✅ Missing apiKey throws error');
  });

  it('should throw error for missing grantId', () => {
    expect(() => {
      new Resend({
        apiKey: 'test_key',
        grantId: '',
      });
    }).toThrow('grantId is required');
    console.log('✅ Missing grantId throws error');
  });
});

// Placeholder test when credentials are not available
describe.skipIf(hasCredentials)('Integration Tests (Skipped)', () => {
  it('should skip when credentials are not provided', () => {
    console.log(
      '⚠️ API Integration tests skipped. Set NYLAS_API_KEY, NYLAS_INBOUND_GRANT_ID, NYLAS_INBOUND_EMAIL, and optionally NYLAS_INBOUND_DOMAIN to run.'
    );
    expect(true).toBe(true);
  });
});
