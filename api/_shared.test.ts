import { describe, it, expect, vi } from 'vitest';
import {
  isValidHostname,
  normalizeHostname,
  safeHostnameFromUrl,
  validatePersianQuery,
  validateArticle,
  extractCandidateEntitiesFromSummary,
  buildConsistencyWarnings,
  withRetry,
  withRetryAsync,
} from './_shared';

describe('normalizeHostname', () => {
  it('lowercases hostnames', () => {
    expect(normalizeHostname('TASNIMNEWS.COM')).toBe('tasnimnews.com');
    expect(normalizeHostname('TasNimNews.Com')).toBe('tasnimnews.com');
  });

  it('strips www. prefix', () => {
    expect(normalizeHostname('www.tasnimnews.com')).toBe('tasnimnews.com');
    expect(normalizeHostname('WWW.TASNIMNEWS.COM')).toBe('tasnimnews.com');
  });

  it('trims whitespace', () => {
    expect(normalizeHostname('  tasnimnews.com  ')).toBe('tasnimnews.com');
  });

  it('handles domains without www', () => {
    expect(normalizeHostname('farsnews.ir')).toBe('farsnews.ir');
  });
});

describe('isValidHostname', () => {
  describe('valid hostnames', () => {
    it('accepts standard domains', () => {
      expect(isValidHostname('tasnimnews.com')).toBe(true);
      expect(isValidHostname('farsnews.ir')).toBe(true);
      expect(isValidHostname('isna.ir')).toBe(true);
    });

    it('accepts subdomains', () => {
      expect(isValidHostname('en.tasnimnews.com')).toBe(true);
      expect(isValidHostname('news.example.co.uk')).toBe(true);
    });

    it('accepts domains with numbers', () => {
      expect(isValidHostname('news24.com')).toBe(true);
      expect(isValidHostname('123.example.com')).toBe(true);
    });

    it('accepts domains with hyphens in labels', () => {
      expect(isValidHostname('my-news-site.com')).toBe(true);
      expect(isValidHostname('test-123.example.org')).toBe(true);
    });

    it('accepts www prefixed domains (normalized)', () => {
      expect(isValidHostname('www.example.com')).toBe(true);
    });

    it('accepts uppercase (after normalization)', () => {
      expect(isValidHostname('EXAMPLE.COM')).toBe(true);
    });
  });

  describe('invalid hostnames', () => {
    it('rejects empty strings', () => {
      expect(isValidHostname('')).toBe(false);
      expect(isValidHostname('   ')).toBe(false);
    });

    it('rejects hostnames with protocols', () => {
      expect(isValidHostname('http://example.com')).toBe(false);
      expect(isValidHostname('https://example.com')).toBe(false);
      expect(isValidHostname('ftp://files.example.com')).toBe(false);
    });

    it('rejects hostnames with paths', () => {
      expect(isValidHostname('example.com/path')).toBe(false);
      expect(isValidHostname('example.com/path/to/page')).toBe(false);
    });

    it('rejects hostnames with spaces', () => {
      expect(isValidHostname('example .com')).toBe(false);
      expect(isValidHostname('exam ple.com')).toBe(false);
    });

    it('rejects hostnames with trailing dots', () => {
      expect(isValidHostname('example.com.')).toBe(false);
    });

    it('rejects labels starting or ending with hyphens', () => {
      expect(isValidHostname('-example.com')).toBe(false);
      expect(isValidHostname('example-.com')).toBe(false);
      expect(isValidHostname('example.-com')).toBe(false);
    });

    it('rejects labels longer than 63 characters', () => {
      const longLabel = 'a'.repeat(64);
      expect(isValidHostname(`${longLabel}.com`)).toBe(false);
    });

    it('rejects hostnames longer than 253 characters', () => {
      // Create a valid-looking hostname that exceeds 253 chars
      const longHostname = Array(30).fill('abcdefgh').join('.') + '.com';
      expect(longHostname.length).toBeGreaterThan(253);
      expect(isValidHostname(longHostname)).toBe(false);
    });

    it('rejects hostnames with invalid characters', () => {
      expect(isValidHostname('example_site.com')).toBe(false);
      expect(isValidHostname('example@site.com')).toBe(false);
      expect(isValidHostname('example!site.com')).toBe(false);
    });

    it('rejects empty labels', () => {
      expect(isValidHostname('.example.com')).toBe(false);
      expect(isValidHostname('example..com')).toBe(false);
    });
  });

  describe('edge cases for Iranian media domains', () => {
    it('accepts all initial Iranian media domains', () => {
      const iranianDomains = [
        'tasnimnews.com',
        'farsnews.ir',
        'isna.ir',
        'mehrnews.com',
        'irna.ir',
        'presstv.ir',
        'yjc.ir',
        'khabaronline.ir',
        'tabnak.ir',
        'alef.ir',
        'entekhab.ir',
        'asriran.com',
        'donya-e-eqtesad.com',
        'eghtesadonline.com',
        'financialtribune.com',
        'en.mehrnews.com',
        'en.isna.ir',
      ];

      for (const domain of iranianDomains) {
        expect(isValidHostname(domain)).toBe(true);
      }
    });
  });

  describe('IDN/Punycode considerations', () => {
    // Note: Current implementation does NOT support IDN (internationalized domain names)
    // Persian/Arabic domain names would need punycode conversion first
    it('rejects non-ASCII characters (no IDN support)', () => {
      // Persian domain example - would fail without punycode conversion
      expect(isValidHostname('خبرگزاری.ir')).toBe(false);
    });

    it('accepts punycode-encoded domains', () => {
      // xn-- prefix indicates punycode
      expect(isValidHostname('xn--mgba3a4f16a.ir')).toBe(true);
    });
  });
});

describe('safeHostnameFromUrl', () => {
  it('extracts hostname from valid URLs', () => {
    expect(safeHostnameFromUrl('https://tasnimnews.com/fa/news/123')).toBe('tasnimnews.com');
    expect(safeHostnameFromUrl('http://www.farsnews.ir/path')).toBe('farsnews.ir');
  });

  it('returns null for invalid URLs', () => {
    expect(safeHostnameFromUrl('not-a-url')).toBe(null);
    expect(safeHostnameFromUrl('')).toBe(null);
    expect(safeHostnameFromUrl('example.com')).toBe(null); // No protocol
  });

  it('normalizes the extracted hostname', () => {
    expect(safeHostnameFromUrl('https://WWW.EXAMPLE.COM/path')).toBe('example.com');
  });
});

describe('validatePersianQuery', () => {
  it('flags empty queries', () => {
    const result = validatePersianQuery('   ', 'topic');
    expect(result.valid).toBe(false);
    expect(result.shouldRegenerate).toBe(true);
  });

  it('flags non-Persian queries', () => {
    const result = validatePersianQuery('nuclear negotiations', 'topic');
    expect(result.valid).toBe(false);
    expect(result.shouldRegenerate).toBe(true);
    expect(result.warnings.some((w) => w.includes('Persian'))).toBe(true);
  });

  it('truncates overly long queries', () => {
    const longQuery = 'ا'.repeat(250);
    const result = validatePersianQuery(longQuery, 'topic');
    expect(result.valid).toBe(false);
    expect(result.query.length).toBe(200);
    expect(result.shouldRegenerate).toBe(true);
  });

  it('accepts valid Persian query', () => {
    const result = validatePersianQuery('مذاکرات هسته‌ای ایران', 'topic');
    expect(result.valid).toBe(true);
    expect(result.shouldRegenerate).toBe(false);
  });
});

describe('validateArticle', () => {
  it('rejects missing title or URL', () => {
    expect(validateArticle({ url: 'https://example.com', text: 'content' }).valid).toBe(false);
    expect(validateArticle({ title: 'Title', text: 'content' }).valid).toBe(false);
  });

  it('rejects invalid URL hostname', () => {
    const result = validateArticle({ title: 'Title', url: 'not-a-url', text: 'content' });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid URL hostname');
  });

  it('tags short text as short-text', () => {
    const result = validateArticle({
      title: 'Title',
      url: 'https://example.com',
      text: 'short text',
    });
    expect(result.valid).toBe(true);
    expect(result.evidenceQuality).toBe('short-text');
  });

  it('tags empty text as truncated', () => {
    const result = validateArticle({
      title: 'Title',
      url: 'https://example.com',
      text: '',
    });
    expect(result.valid).toBe(true);
    expect(result.evidenceQuality).toBe('truncated');
  });

  it('accepts full text', () => {
    const result = validateArticle({
      title: 'Title',
      url: 'https://example.com',
      text: 'x'.repeat(200),
    });
    expect(result.valid).toBe(true);
    expect(result.evidenceQuality).toBe('full');
  });
});

describe('extractCandidateEntitiesFromSummary', () => {
  it('extracts capitalized entities and acronyms', () => {
    const summary = `
## Executive Summary
Iran announced talks in Tehran with the Majles and IRGC leadership.

## Sources
- Source 1 — Example (example.com) — https://example.com
`;

    const entities = extractCandidateEntitiesFromSummary(summary);
    expect(entities).toContain('Iran');
    expect(entities).toContain('Tehran');
    expect(entities).toContain('Majles');
    expect(entities).toContain('IRGC');
  });

  it('ignores the Sources section', () => {
    const summary = `
## Executive Summary
Iran announced talks in Tehran.

## Sources
- Source 1 — Example (example.com) — https://example.com
`;
    const entities = extractCandidateEntitiesFromSummary(summary);
    expect(entities).toContain('Iran');
    expect(entities).toContain('Tehran');
    expect(entities).not.toContain('Source');
  });
});

describe('buildConsistencyWarnings', () => {
  it('flags entities missing from sources', () => {
    const summary = `
## Executive Summary
Iran announced talks in Tehran with the Majles.
`;
    const articles = [
      { title: 'Tehran meeting', text: 'Officials in Tehran discussed new policies.' },
    ];
    const warnings = buildConsistencyWarnings(summary, articles);
    expect(warnings.some((w) => w.includes('Majles'))).toBe(true);
    expect(warnings.some((w) => w.includes('Tehran'))).toBe(false);
  });

  it('returns empty warnings when no summary or sources', () => {
    expect(buildConsistencyWarnings('', [])).toEqual([]);
  });
});

describe('withRetry', () => {
  it('retries on retryable status and succeeds', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockResolvedValueOnce(new Response('fail', { status: 500, statusText: 'error' }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const promise = withRetry<{ ok: boolean }>(() => op());
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(op).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws on non-retryable status', async () => {
    const op = vi.fn().mockResolvedValueOnce(new Response('bad', { status: 400, statusText: 'bad' }));
    await expect(withRetry(() => op())).rejects.toThrow('Non-retryable');
    expect(op).toHaveBeenCalledTimes(1);
  });
});

describe('withRetryAsync', () => {
  it('retries async operation until success', async () => {
    vi.useFakeTimers();
    const op = vi.fn()
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce('ok');

    const promise = withRetryAsync(() => op());
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBe('ok');
    expect(op).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
