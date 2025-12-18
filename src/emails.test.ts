import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Emails } from './emails.js';
import { NylasClient, NylasRequestError } from './client.js';

describe('Emails', () => {
  let mockClient: NylasClient;
  let emails: Emails;

  beforeEach(() => {
    mockClient = {
      sendMessage: vi.fn(),
      getMessage: vi.fn(),
      listMessages: vi.fn(),
      getGrantId: vi.fn(() => 'test_grant_id'),
      getBaseUrl: vi.fn(() => 'https://api.us.nylas.com'),
    } as unknown as NylasClient;

    emails = new Emails(mockClient);
  });

  describe('send', () => {
    it('should send email and return success response', async () => {
      vi.mocked(mockClient.sendMessage).mockResolvedValueOnce({
        request_id: 'req_123',
        data: {
          id: 'msg_456',
          grant_id: 'test_grant_id',
          from: [{ email: 'sender@example.com' }],
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test',
          body: 'Hello',
          date: 1702915200,
        },
      });

      const result = await emails.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toEqual({ id: 'msg_456' });
      expect(result.error).toBeNull();
    });

    it('should return validation error for missing from', async () => {
      const result = await emails.send({
        from: '',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('validation_error');
      expect(result.error?.message).toContain('from');
    });

    it('should return validation error for missing to', async () => {
      const result = await emails.send({
        from: 'sender@example.com',
        to: '',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('validation_error');
      expect(result.error?.message).toContain('to');
    });

    it('should return validation error for empty to array', async () => {
      const result = await emails.send({
        from: 'sender@example.com',
        to: [],
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('validation_error');
    });

    it('should return validation error for missing subject', async () => {
      const result = await emails.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: '',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('validation_error');
      expect(result.error?.message).toContain('subject');
    });

    it('should transform request to Nylas format', async () => {
      vi.mocked(mockClient.sendMessage).mockResolvedValueOnce({
        request_id: 'req_123',
        data: {
          id: 'msg_456',
          grant_id: 'test_grant_id',
          from: [{ email: 'sender@example.com' }],
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test',
          body: '<p>Hello</p>',
          date: 1702915200,
        },
      });

      await emails.send({
        from: 'John Doe <sender@example.com>',
        to: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Subject',
        html: '<p>Hello</p>',
        cc: 'cc@example.com',
      });

      expect(mockClient.sendMessage).toHaveBeenCalledWith({
        from: [{ name: 'John Doe', email: 'sender@example.com' }],
        to: [{ email: 'user1@example.com' }, { email: 'user2@example.com' }],
        subject: 'Test Subject',
        body: '<p>Hello</p>',
        cc: [{ email: 'cc@example.com' }],
      });
    });

    it('should handle API errors', async () => {
      vi.mocked(mockClient.sendMessage).mockRejectedValueOnce(
        new NylasRequestError('API error', 500, 'server_error', 'req_123')
      );

      const result = await emails.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        message: 'API error',
        name: 'server_error',
        statusCode: 500,
      });
    });

    it('should handle generic errors', async () => {
      vi.mocked(mockClient.sendMessage).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await emails.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('Network error');
      expect(result.error?.name).toBe('Error');
    });

    it('should handle unknown error types', async () => {
      // Test with a non-Error thrown value (string, number, object, etc.)
      vi.mocked(mockClient.sendMessage).mockRejectedValueOnce('string error');

      const result = await emails.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toBe('string error');
      expect(result.error?.name).toBe('unknown_error');
    });

    it('should handle object thrown as error', async () => {
      vi.mocked(mockClient.sendMessage).mockRejectedValueOnce({ custom: 'error' });

      const result = await emails.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('unknown_error');
    });
  });

  describe('get', () => {
    it('should get email and return success response', async () => {
      vi.mocked(mockClient.getMessage).mockResolvedValueOnce({
        request_id: 'req_123',
        data: {
          id: 'msg_456',
          grant_id: 'test_grant_id',
          from: [{ name: 'Sender', email: 'sender@example.com' }],
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test Subject',
          body: '<p>Hello World</p>',
          date: 1702915200,
        },
      });

      const result = await emails.get('msg_456');

      expect(result.data).toEqual({
        id: 'msg_456',
        object: 'email',
        from: 'Sender <sender@example.com>',
        to: ['recipient@example.com'],
        cc: [],
        bcc: [],
        reply_to: [],
        subject: 'Test Subject',
        text: '<p>Hello World</p>',
        html: '<p>Hello World</p>',
        created_at: new Date(1702915200 * 1000).toISOString(),
        last_event: 'email.sent',
      });
      expect(result.error).toBeNull();
    });

    it('should return validation error for missing emailId', async () => {
      const result = await emails.get('');

      expect(result.data).toBeNull();
      expect(result.error?.name).toBe('validation_error');
      expect(result.error?.message).toContain('emailId');
    });

    it('should handle API errors', async () => {
      vi.mocked(mockClient.getMessage).mockRejectedValueOnce(
        new NylasRequestError('Not found', 404, 'not_found_error', 'req_123')
      );

      const result = await emails.get('msg_invalid');

      expect(result.data).toBeNull();
      expect(result.error).toEqual({
        message: 'Not found',
        name: 'not_found_error',
        statusCode: 404,
      });
    });
  });

  describe('list', () => {
    it('should list emails and return success response', async () => {
      vi.mocked(mockClient.listMessages).mockResolvedValueOnce({
        request_id: 'req_123',
        data: [
          {
            id: 'msg_1',
            grant_id: 'test_grant_id',
            from: [{ email: 'sender1@example.com' }],
            to: [{ email: 'recipient@example.com' }],
            subject: 'Email 1',
            body: 'Body 1',
            date: 1702915200,
          },
          {
            id: 'msg_2',
            grant_id: 'test_grant_id',
            from: [{ email: 'sender2@example.com' }],
            to: [{ email: 'recipient@example.com' }],
            subject: 'Email 2',
            body: 'Body 2',
            date: 1702915300,
          },
        ],
      });

      const result = await emails.list();

      expect(result.data?.object).toBe('list');
      expect(result.data?.data).toHaveLength(2);
      expect(result.data?.data[0].id).toBe('msg_1');
      expect(result.data?.data[1].id).toBe('msg_2');
      expect(result.error).toBeNull();
    });

    it('should pass limit option', async () => {
      vi.mocked(mockClient.listMessages).mockResolvedValueOnce({
        request_id: 'req_123',
        data: [],
      });

      await emails.list({ limit: 5 });

      expect(mockClient.listMessages).toHaveBeenCalledWith({ limit: 5 });
    });

    it('should handle API errors', async () => {
      vi.mocked(mockClient.listMessages).mockRejectedValueOnce(
        new NylasRequestError('Server error', 500, 'server_error', 'req_123')
      );

      const result = await emails.list();

      expect(result.data).toBeNull();
      expect(result.error?.statusCode).toBe(500);
    });
  });
});
