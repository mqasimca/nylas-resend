import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NylasClient, NylasRequestError } from './client.js';

describe('NylasClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
  });

  function createClient(options?: { baseUrl?: string }) {
    return new NylasClient({
      apiKey: 'test_api_key',
      grantId: 'test_grant_id',
      baseUrl: options?.baseUrl,
      fetch: mockFetch,
    });
  }

  describe('constructor', () => {
    it('should use default base URL', () => {
      const client = createClient();
      expect(client.getBaseUrl()).toBe('https://api.us.nylas.com');
    });

    it('should use custom base URL', () => {
      const client = createClient({ baseUrl: 'https://api.eu.nylas.com' });
      expect(client.getBaseUrl()).toBe('https://api.eu.nylas.com');
    });

    it('should strip trailing slash from base URL', () => {
      const client = createClient({ baseUrl: 'https://api.us.nylas.com/' });
      expect(client.getBaseUrl()).toBe('https://api.us.nylas.com');
    });

    it('should return grant ID', () => {
      const client = createClient();
      expect(client.getGrantId()).toBe('test_grant_id');
    });
  });

  describe('sendMessage', () => {
    it('should send POST request with correct URL and headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
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
            })
          ),
      });

      const client = createClient();
      await client.sendMessage({
        subject: 'Test',
        body: 'Hello',
        to: [{ email: 'recipient@example.com' }],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.us.nylas.com/v3/grants/test_grant_id/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer test_api_key',
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: 'Test',
            body: 'Hello',
            to: [{ email: 'recipient@example.com' }],
          }),
        }
      );
    });

    it('should return parsed response', async () => {
      const responseData = {
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
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(responseData)),
      });

      const client = createClient();
      const result = await client.sendMessage({
        subject: 'Test',
        body: 'Hello',
        to: [{ email: 'recipient@example.com' }],
      });

      expect(result).toEqual(responseData);
    });

    it('should throw NylasRequestError on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              request_id: 'req_123',
              error: {
                type: 'invalid_request_error',
                message: 'Missing required field: to',
              },
            })
          ),
      });

      const client = createClient();

      await expect(
        client.sendMessage({
          subject: 'Test',
          body: 'Hello',
          to: [],
        })
      ).rejects.toThrow(NylasRequestError);
    });

    it('should include error details in NylasRequestError', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              request_id: 'req_123',
              error: {
                type: 'invalid_request_error',
                message: 'Missing required field: to',
              },
            })
          ),
      });

      const client = createClient();

      try {
        await client.sendMessage({
          subject: 'Test',
          body: 'Hello',
          to: [],
        });
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(NylasRequestError);
        const error = err as NylasRequestError;
        expect(error.message).toBe('Missing required field: to');
        expect(error.statusCode).toBe(400);
        expect(error.errorType).toBe('invalid_request_error');
        expect(error.requestId).toBe('req_123');
      }
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const client = createClient();

      await expect(
        client.sendMessage({
          subject: 'Test',
          body: 'Hello',
          to: [{ email: 'test@example.com' }],
        })
      ).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('getMessage', () => {
    it('should send GET request with correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
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
            })
          ),
      });

      const client = createClient();
      await client.getMessage('msg_456');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.us.nylas.com/v3/grants/test_grant_id/messages/msg_456',
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer test_api_key',
            Accept: 'application/json',
          },
          body: undefined,
        }
      );
    });
  });

  describe('listMessages', () => {
    it('should send GET request without params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              request_id: 'req_123',
              data: [],
            })
          ),
      });

      const client = createClient();
      await client.listMessages();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.us.nylas.com/v3/grants/test_grant_id/messages',
        expect.any(Object)
      );
    });

    it('should include limit parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              request_id: 'req_123',
              data: [],
            })
          ),
      });

      const client = createClient();
      await client.listMessages({ limit: 10 });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.us.nylas.com/v3/grants/test_grant_id/messages?limit=10',
        expect.any(Object)
      );
    });

    it('should include page_token parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            JSON.stringify({
              request_id: 'req_123',
              data: [],
            })
          ),
      });

      const client = createClient();
      await client.listMessages({ page_token: 'abc123' });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.us.nylas.com/v3/grants/test_grant_id/messages?page_token=abc123',
        expect.any(Object)
      );
    });
  });
});

describe('NylasRequestError', () => {
  it('should have correct properties', () => {
    const error = new NylasRequestError(
      'Test error',
      400,
      'invalid_request_error',
      'req_123'
    );

    expect(error.message).toBe('Test error');
    expect(error.name).toBe('NylasRequestError');
    expect(error.statusCode).toBe(400);
    expect(error.errorType).toBe('invalid_request_error');
    expect(error.requestId).toBe('req_123');
  });

  it('should work with optional properties', () => {
    const error = new NylasRequestError('Test error', 500);

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.errorType).toBeUndefined();
    expect(error.requestId).toBeUndefined();
  });
});
