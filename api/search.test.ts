import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the environment variable
vi.stubEnv('EXA_API_KEY', 'test-api-key');

// Import after mocking env
import handler from './search';

describe('Search API - Domain Flow Integration', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const createRequest = (body: object) => {
    return new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const mockExaResponse = (results: object[]) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results }),
    });
  };

  describe('dynamic domain handling', () => {
    it('passes user-configured domains to Exa API', async () => {
      mockExaResponse([]);

      const req = createRequest({
        query: 'test query',
        includeDomains: ['custom-news.com', 'my-source.ir'],
        numResults: 5,
      });

      await handler(req);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.exa.ai/search',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('custom-news.com'),
        })
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.includeDomains).toContain('custom-news.com');
      expect(callBody.includeDomains).toContain('my-source.ir');
    });

    it('filters out invalid domains but keeps valid ones', async () => {
      mockExaResponse([]);

      const req = createRequest({
        query: 'test query',
        includeDomains: [
          'valid-domain.com',
          'http://invalid-with-protocol.com', // Invalid: has protocol
          'another-valid.ir',
          'invalid with spaces.com', // Invalid: has spaces
        ],
        numResults: 5,
      });

      await handler(req);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.includeDomains).toContain('valid-domain.com');
      expect(callBody.includeDomains).toContain('another-valid.ir');
      expect(callBody.includeDomains).not.toContain('http://invalid-with-protocol.com');
      expect(callBody.includeDomains).not.toContain('invalid with spaces.com');
    });

    it('normalizes domains (lowercase, strip www)', async () => {
      mockExaResponse([]);

      const req = createRequest({
        query: 'test query',
        includeDomains: ['WWW.EXAMPLE.COM', 'MyNews.IR'],
        numResults: 5,
      });

      await handler(req);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.includeDomains).toContain('example.com');
      expect(callBody.includeDomains).toContain('mynews.ir');
      expect(callBody.includeDomains).not.toContain('WWW.EXAMPLE.COM');
    });

    it('deduplicates domains', async () => {
      mockExaResponse([]);

      const req = createRequest({
        query: 'test query',
        includeDomains: ['example.com', 'EXAMPLE.COM', 'www.example.com'],
        numResults: 5,
      });

      await handler(req);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.includeDomains).toEqual(['example.com']);
    });
  });

  describe('warning messages', () => {
    it('returns warning when no valid domains provided', async () => {
      const req = createRequest({
        query: 'test query',
        includeDomains: ['http://invalid.com', 'also invalid .com'],
        numResults: 5,
      });

      const response = await handler(req);
      const data = await response.json();

      expect(data.results).toEqual([]);
      expect(data.warning).toBe('No valid domains provided. Check your media source list.');
      expect(mockFetch).not.toHaveBeenCalled(); // Should not call Exa
    });

    it('returns warning when domain limit exceeded', async () => {
      mockExaResponse([]);

      // Create 30 unique domains (exceeds 25 limit)
      const manyDomains = Array.from({ length: 30 }, (_, i) => `domain${i}.com`);

      const req = createRequest({
        query: 'test query',
        includeDomains: manyDomains,
        numResults: 5,
      });

      const response = await handler(req);
      const data = await response.json();

      expect(data.warning).toContain('Domain limit reached');
      expect(data.warning).toContain('25');
      expect(data.warning).toContain('30');

      // Verify only 25 domains were sent to Exa
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.includeDomains).toHaveLength(25);
    });
  });

  describe('result filtering', () => {
    it('filters results to only include requested domains', async () => {
      mockExaResponse([
        { title: 'Good', url: 'https://requested-domain.com/article', text: 'content' },
        { title: 'Bad', url: 'https://unwanted-domain.com/article', text: 'content' },
      ]);

      const req = createRequest({
        query: 'test query',
        includeDomains: ['requested-domain.com'],
        numResults: 5,
      });

      const response = await handler(req);
      const data = await response.json();

      expect(data.results).toHaveLength(1);
      expect(data.results[0].title).toBe('Good');
    });

    it('deduplicates results by URL', async () => {
      mockExaResponse([
        { title: 'Article 1', url: 'https://example.com/same-url', text: 'content 1' },
        { title: 'Article 2', url: 'https://example.com/same-url', text: 'content 2' },
        { title: 'Article 3', url: 'https://example.com/different-url', text: 'content 3' },
      ]);

      const req = createRequest({
        query: 'test query',
        includeDomains: ['example.com'],
        numResults: 5,
      });

      const response = await handler(req);
      const data = await response.json();

      expect(data.results).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('returns 400 for missing query', async () => {
      const req = createRequest({
        query: '',
        includeDomains: ['example.com'],
      });

      const response = await handler(req);
      expect(response.status).toBe(400);
    });

    it('returns 502 when Exa API fails', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Exa error details', { status: 500, statusText: 'Internal Server Error' })
      );
      mockFetch.mockResolvedValueOnce(
        new Response('Exa error details', { status: 500, statusText: 'Internal Server Error' })
      );
      mockFetch.mockResolvedValueOnce(
        new Response('Exa error details', { status: 500, statusText: 'Internal Server Error' })
      );

      const req = createRequest({
        query: 'test query',
        includeDomains: ['example.com'],
      });

      const response = await handler(req);
      expect(response.status).toBe(502);

      const data = await response.json();
      expect(data.error).toContain('Exa error');
    });
  });
});
