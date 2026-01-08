import type {
  ResendConfig,
  NylasSendRequest,
  NylasSendResponse,
  NylasDomainSendRequest,
  NylasDomainSendResponse,
  NylasMessageResponse,
  NylasMessagesListResponse,
  NylasApiError,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.us.nylas.com';
const API_VERSION = 'v3';

export interface NylasClientOptions {
  apiKey: string;
  grantId: string;
  /** Domain name for sending transactional emails (e.g., "qasim.nylas.email") */
  domain?: string;
  baseUrl?: string;
  /** Custom fetch implementation (useful for testing) */
  fetch?: typeof fetch;
}

export class NylasClient {
  private readonly apiKey: string;
  private readonly grantId: string;
  private readonly domain?: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: NylasClientOptions) {
    this.apiKey = options.apiKey;
    this.grantId = options.grantId;
    this.domain = options.domain;
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.fetchFn = options.fetch || fetch;
  }

  /**
   * Make an authenticated request to the Nylas API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}/${API_VERSION}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseText = await response.text();
    let responseData: T | NylasApiError;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      throw new NylasRequestError(
        `Invalid JSON response: ${responseText.substring(0, 100)}`,
        response.status
      );
    }

    if (!response.ok) {
      const error = responseData as NylasApiError;
      throw new NylasRequestError(
        error.error?.message || `Request failed with status ${response.status}`,
        response.status,
        error.error?.type,
        error.request_id
      );
    }

    return responseData as T;
  }

  /**
   * Get the grant path prefix
   */
  private get grantPath(): string {
    return `/grants/${this.grantId}`;
  }

  /**
   * Send an email message via grant (for OAuth-connected providers)
   */
  async sendMessage(data: NylasSendRequest): Promise<NylasSendResponse> {
    return this.request<NylasSendResponse>(
      'POST',
      `${this.grantPath}/messages/send`,
      data
    );
  }

  /**
   * Send a transactional email via domain (for Nylas Inbound)
   */
  async sendDomainMessage(data: NylasDomainSendRequest): Promise<NylasDomainSendResponse> {
    if (!this.domain) {
      throw new Error('Domain is required for sending transactional emails. Set the domain option in config.');
    }
    return this.request<NylasDomainSendResponse>(
      'POST',
      `/domains/${this.domain}/messages/send`,
      data
    );
  }

  /**
   * Check if domain-based sending is configured
   */
  hasDomain(): boolean {
    return !!this.domain;
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId: string): Promise<NylasMessageResponse> {
    return this.request<NylasMessageResponse>(
      'GET',
      `${this.grantPath}/messages/${messageId}`
    );
  }

  /**
   * List messages
   */
  async listMessages(params?: {
    limit?: number;
    page_token?: string;
  }): Promise<NylasMessagesListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.page_token) searchParams.set('page_token', params.page_token);

    const query = searchParams.toString();
    const path = `${this.grantPath}/messages${query ? `?${query}` : ''}`;

    return this.request<NylasMessagesListResponse>('GET', path);
  }

  /**
   * Get the configured grant ID
   */
  getGrantId(): string {
    return this.grantId;
  }

  /**
   * Get the configured base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Get the configured domain
   */
  getDomain(): string | undefined {
    return this.domain;
  }
}

/**
 * Error class for Nylas API request errors
 */
export class NylasRequestError extends Error {
  readonly statusCode: number;
  readonly errorType?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    statusCode: number,
    errorType?: string,
    requestId?: string
  ) {
    super(message);
    this.name = 'NylasRequestError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.requestId = requestId;
  }
}

/**
 * Create a Nylas client from Resend config
 */
export function createNylasClient(config: ResendConfig): NylasClient {
  return new NylasClient({
    apiKey: config.apiKey,
    grantId: config.grantId,
    domain: config.domain,
    baseUrl: config.baseUrl,
  });
}
