/**
 * Integration tests for nylas-resend
 *
 * These tests require actual Nylas credentials and make real API calls.
 * Run with: npm run test:integration
 *
 * Required environment variables:
 *   NYLAS_API_KEY - Your Nylas API key
 *   NYLAS_GRANT_ID - Your Nylas grant ID
 *   NYLAS_TEST_EMAIL - Email address for testing (used as both from and to)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { Resend } from './index.js';

// Skip integration tests if credentials not provided
const NYLAS_API_KEY = process.env.NYLAS_API_KEY;
const NYLAS_GRANT_ID = process.env.NYLAS_GRANT_ID;
const NYLAS_TEST_EMAIL = process.env.NYLAS_TEST_EMAIL;

const hasCredentials = NYLAS_API_KEY && NYLAS_GRANT_ID && NYLAS_TEST_EMAIL;

describe.skipIf(!hasCredentials)('Integration Tests', () => {
  let resend: Resend;

  beforeAll(() => {
    resend = new Resend({
      apiKey: NYLAS_API_KEY!,
      grantId: NYLAS_GRANT_ID!,
    });
  });

  describe('emails.send', () => {
    it('should send an email successfully', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_TEST_EMAIL!,
        to: NYLAS_TEST_EMAIL!,
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

      console.log('✅ Sent email ID:', data?.id);
      console.log('   From:', NYLAS_TEST_EMAIL);
      console.log('   To:', NYLAS_TEST_EMAIL);
    });

    it('should send email with CC', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_TEST_EMAIL!,
        to: NYLAS_TEST_EMAIL!,
        cc: NYLAS_TEST_EMAIL!,
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

    it('should send email with reply_to', async () => {
      const { data, error } = await resend.emails.send({
        from: NYLAS_TEST_EMAIL!,
        to: NYLAS_TEST_EMAIL!,
        reply_to: NYLAS_TEST_EMAIL!,
        subject: `Integration Test Reply-To - ${new Date().toISOString()}`,
        html: '<p>Testing <strong>reply_to</strong> functionality.</p>',
      });

      if (error) {
        console.error('Send reply_to error:', error);
      }

      expect(error).toBeNull();
      expect(data?.id).toBeDefined();
      console.log('✅ Sent email with reply_to, ID:', data?.id);
    });

    it('should handle invalid API key', async () => {
      const invalidResend = new Resend({
        apiKey: 'invalid_key',
        grantId: NYLAS_GRANT_ID!,
      });

      const { data, error } = await invalidResend.emails.send({
        from: NYLAS_TEST_EMAIL!,
        to: NYLAS_TEST_EMAIL!,
        subject: 'Should fail',
        text: 'This should not be sent.',
      });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.statusCode).toBe(401);
      console.log('✅ Invalid API key correctly returned 401');
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

      console.log('Listed', data?.data.length, 'emails');
    });
  });

  describe('emails.get', () => {
    it('should get email by ID', async () => {
      // First, list emails to get an ID
      const listResult = await resend.emails.list({ limit: 1 });

      if (!listResult.data?.data.length) {
        console.log('No emails to test get()');
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
    });

    it('should handle non-existent email ID', async () => {
      const { data, error } = await resend.emails.get('non_existent_id_12345');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error?.statusCode).toBe(404);
    });
  });
});

// Placeholder test when credentials are not available
describe.skipIf(hasCredentials)('Integration Tests (Skipped)', () => {
  it('should skip when credentials are not provided', () => {
    console.log(
      'Integration tests skipped. Set NYLAS_API_KEY and NYLAS_GRANT_ID to run.'
    );
    expect(true).toBe(true);
  });
});
