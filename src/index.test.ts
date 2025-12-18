import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Resend } from './index.js';

describe('Resend', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create instance with config object', () => {
      const resend = new Resend({
        apiKey: 'test_api_key',
        grantId: 'test_grant_id',
      });

      expect(resend).toBeInstanceOf(Resend);
      expect(resend.emails).toBeDefined();
      expect(resend.getGrantId()).toBe('test_grant_id');
      expect(resend.getBaseUrl()).toBe('https://api.us.nylas.com');
    });

    it('should create instance with custom base URL', () => {
      const resend = new Resend({
        apiKey: 'test_api_key',
        grantId: 'test_grant_id',
        baseUrl: 'https://api.eu.nylas.com',
      });

      expect(resend.getBaseUrl()).toBe('https://api.eu.nylas.com');
    });

    it('should create instance with string API key and env grant ID', () => {
      process.env.NYLAS_GRANT_ID = 'env_grant_id';

      const resend = new Resend('test_api_key');

      expect(resend.getGrantId()).toBe('env_grant_id');
    });

    it('should use NYLAS_API_URL env var for base URL', () => {
      process.env.NYLAS_GRANT_ID = 'env_grant_id';
      process.env.NYLAS_API_URL = 'https://custom.api.com';

      const resend = new Resend('test_api_key');

      expect(resend.getBaseUrl()).toBe('https://custom.api.com');
    });

    it('should throw error for string API key without NYLAS_GRANT_ID', () => {
      delete process.env.NYLAS_GRANT_ID;

      expect(() => new Resend('test_api_key')).toThrow('NYLAS_GRANT_ID');
    });

    it('should throw error for missing apiKey', () => {
      expect(
        () =>
          new Resend({
            apiKey: '',
            grantId: 'test_grant_id',
          })
      ).toThrow('apiKey is required');
    });

    it('should throw error for missing grantId', () => {
      expect(
        () =>
          new Resend({
            apiKey: 'test_api_key',
            grantId: '',
          })
      ).toThrow('grantId is required');
    });
  });

  describe('emails namespace', () => {
    it('should have send method', () => {
      const resend = new Resend({
        apiKey: 'test_api_key',
        grantId: 'test_grant_id',
      });

      expect(typeof resend.emails.send).toBe('function');
    });

    it('should have get method', () => {
      const resend = new Resend({
        apiKey: 'test_api_key',
        grantId: 'test_grant_id',
      });

      expect(typeof resend.emails.get).toBe('function');
    });

    it('should have list method', () => {
      const resend = new Resend({
        apiKey: 'test_api_key',
        grantId: 'test_grant_id',
      });

      expect(typeof resend.emails.list).toBe('function');
    });
  });
});

describe('exports', () => {
  it('should export Resend as default', async () => {
    const module = await import('./index.js');
    expect(module.default).toBe(module.Resend);
  });

  it('should export handleInboundWebhook', async () => {
    const { handleInboundWebhook } = await import('./index.js');
    expect(typeof handleInboundWebhook).toBe('function');
  });

  it('should export isInboundEmailEvent', async () => {
    const { isInboundEmailEvent } = await import('./index.js');
    expect(typeof isInboundEmailEvent).toBe('function');
  });

  it('should export transformers', async () => {
    const {
      parseEmailAddress,
      toParticipants,
      transformSendRequest,
      transformWebhookToInboundEvent,
    } = await import('./index.js');

    expect(typeof parseEmailAddress).toBe('function');
    expect(typeof toParticipants).toBe('function');
    expect(typeof transformSendRequest).toBe('function');
    expect(typeof transformWebhookToInboundEvent).toBe('function');
  });

  it('should export NylasRequestError', async () => {
    const { NylasRequestError } = await import('./index.js');
    expect(NylasRequestError).toBeDefined();
  });
});
