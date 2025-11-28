import '@testing-library/jest-dom';

// Simple Request polyfill for testing
class MockRequest {
  url: string;
  method: string;
  headers: Headers;

  constructor(url: string, init?: RequestInit) {
    this.url = url;
    this.method = init?.method || 'GET';
    this.headers = new Headers(init?.headers);
  }
}

// Simple Headers polyfill
class MockHeaders {
  private map: Map<string, string>;

  constructor(init?: HeadersInit) {
    this.map = new Map();
    if (init) {
      if (init instanceof MockHeaders) {
        init.map.forEach((value, key) => this.map.set(key, value));
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.map.set(key.toLowerCase(), value));
      }
    }
  }

  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.map.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this.map.has(name.toLowerCase());
  }

  forEach(callback: (value: string, key: string) => void): void {
    this.map.forEach(callback);
  }
}

// @ts-ignore
global.Request = MockRequest;
// @ts-ignore
global.Headers = MockHeaders;

// Mock NextResponse class
class MockNextResponse {
  status: number;
  body: any;
  headers: MockHeaders;

  constructor(body?: any, init?: { status?: number; headers?: HeadersInit }) {
    this.body = body;
    this.status = init?.status || 200;
    this.headers = new MockHeaders(init?.headers);
  }

  static next(init?: any): MockNextResponse {
    const headers = init?.request?.headers || new MockHeaders();
    const response = new MockNextResponse(null);
    response.headers = headers;
    return response;
  }

  static rewrite(url: string): MockNextResponse {
    const response = new MockNextResponse(null);
    response.headers = new MockHeaders();
    (response as any).url = url;
    return response;
  }

  async text(): Promise<string> {
    return this.body?.toString() || '';
  }
}

// Mock Next.js server module
jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}));

// Mock global fetch for testing
class MockResponse {
  body: any;
  status: number;
  statusText: string;
  headers: MockHeaders;

  constructor(body: any, init?: { status?: number; statusText?: string; headers?: HeadersInit }) {
    this.body = body;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || 'OK';
    this.headers = new MockHeaders(init?.headers);
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body?.toString() || '';
  }
}

// @ts-ignore
global.Response = MockResponse;

// @ts-ignore
global.fetch = jest.fn().mockImplementation((url: string) => {
  // Default mock implementation - return empty successful response
  const response = new MockResponse('{}', {
    status: 200,
    statusText: 'OK',
    headers: { 'x-middleware-rewrite': url }
  });
  return Promise.resolve(response);
});

// Add any global test setup here
