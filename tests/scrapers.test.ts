import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import { cacheClear } from '@/lib/data/cache';
import {
  AISSTREAM_CHILD_HARD_TIMEOUT_MS,
  runCollector,
  runCollectorOnce,
} from '@/lib/data/aisstream';
import {
  fetchMultipleChannels,
  fetchTelegramChannel,
} from '@/lib/data/telegram';

const translatteMock = vi.fn();
vi.mock('translatte', () => ({
  default: (...args: unknown[]) => translatteMock(...args as [string, object]),
}));

function minimalTgHtml(body: string, postId = 'MyChan/100'): string {
  return `<div class="tgme_widget_message_wrap" data-post="${postId}"><div class="tgme_widget_message_text js-message_text">${body}</div></div><div class="tgme_widget_message_footer"></div>`;
}

function makeMockChild(): ChildProcess & { kill: ReturnType<typeof vi.fn> } {
  const child = new EventEmitter() as ChildProcess & { kill: ReturnType<typeof vi.fn> };
  child.stdout = new EventEmitter() as NodeJS.ReadableStream;
  child.stderr = new EventEmitter() as NodeJS.ReadableStream;
  child.kill = vi.fn(() => true);
  return child;
}

describe('telegram scraper', () => {
  beforeEach(() => {
    cacheClear();
    vi.restoreAllMocks();
    translatteMock.mockReset();
    translatteMock.mockResolvedValue({ text: 'translated-en' });
  });

  afterEach(() => {
    cacheClear();
    vi.useRealTimers();
  });

  it('logs telegram: channel not found and returns [] on HTTP 404', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('<html></html>', { status: 404 })
    );
    const posts = await fetchTelegramChannel('missing_chan_404', false, fetchImpl);
    expect(posts).toEqual([]);
    expect(err).toHaveBeenCalledWith('telegram: channel not found:', 'missing_chan_404');
  });

  it('logs telegram: channel not found when body contains phrase (200)', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('<html>Channel not found</html>', { status: 200 })
    );
    const posts = await fetchTelegramChannel('gone_chan', false, fetchImpl);
    expect(posts).toEqual([]);
    expect(err).toHaveBeenCalledWith('telegram: channel not found:', 'gone_chan');
  });

  it('logs telegram: rate-limited and returns [] on HTTP 429', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const headers = new Headers({ 'Retry-After': '42' });
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 429, headers }));
    const posts = await fetchTelegramChannel('hot_chan', false, fetchImpl);
    expect(posts).toEqual([]);
    expect(err).toHaveBeenCalledWith('telegram: rate-limited:', {
      channel: 'hot_chan',
      retryAfter: 42,
    });
  });

  it('logs telegram: translate failed and keeps original text when translatte throws', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    translatteMock.mockRejectedValue(new Error('upstream-down'));
    const html = minimalTgHtml('Привет мир это тестовый текст для перевода', 'RuBlog/7');
    const fetchImpl = vi.fn().mockResolvedValue(new Response(html, { status: 200 }));
    const posts = await fetchTelegramChannel('RuBlog', true, fetchImpl);
    expect(posts).toHaveLength(1);
    expect(posts[0].text).toContain('Привет');
    expect(posts[0].translatedText).toBe(posts[0].text);
    expect(err).toHaveBeenCalledWith(
      'telegram: translate failed:',
      expect.objectContaining({
        channel: 'RuBlog',
        message_id: 'RuBlog/7',
        error: 'upstream-down',
      })
    );
  });

  it('does not poison sibling channels when one channel fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const okHtml = minimalTgHtml('good channel post body here xx', 'GoodChan/1');
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/bad_chan')) {
        return Promise.resolve(new Response('channel not found', { status: 200 }));
      }
      return Promise.resolve(new Response(okHtml, { status: 200 }));
    });
    const posts = await fetchMultipleChannels(['bad_chan', 'GoodChan'], false, fetchImpl);
    expect(posts.some((p) => p.channel === 'GoodChan')).toBe(true);
    expect(posts.some((p) => p.channel === 'bad_chan')).toBe(false);
    expect(err).toHaveBeenCalled();
  });

  it('happy path: parses posts and caches', async () => {
    const html = minimalTgHtml('happy path telegram body xx', 'DeepStateUA/55');
    const fetchImpl = vi.fn().mockResolvedValue(new Response(html, { status: 200 }));
    const a = await fetchTelegramChannel('DeepStateUA', false, fetchImpl);
    const b = await fetchTelegramChannel('DeepStateUA', false, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(a).toHaveLength(1);
    expect(b).toEqual(a);
    expect(a[0].link).toBe('https://t.me/DeepStateUA/55');
  });
});

describe('aisstream collector', () => {
  const tmpRoot = path.join(os.tmpdir(), 'auftragstaktik-scraper-tests');
  let tmpCounter = 0;

  beforeEach(() => {
    cacheClear();
    vi.restoreAllMocks();
    fs.mkdirSync(tmpRoot, { recursive: true });
  });

  afterEach(() => {
    cacheClear();
    vi.useRealTimers();
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  function nextTmp(): string {
    tmpCounter += 1;
    return path.join(tmpRoot, `vessels-${tmpCounter}.json`);
  }

  function vesselJson() {
    return [
      {
        mmsi: '123',
        name: 'Test',
        vesselType: 70,
        latitude: 1,
        longitude: 2,
        speed: 0,
        heading: 0,
        timestamp: '2020-01-01T00:00:00.000Z',
      },
    ];
  }

  it('emits aisstream: child timeout log and calls child.kill after 60s', async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tmpFile = nextTmp();
    const child = makeMockChild();
    child.kill = vi.fn(() => {
      child.emit('exit', null, 'SIGKILL');
      return true;
    });
    const spawnFn = vi.fn(() => child);
    const p = runCollectorOnce('key', [[[]]], {
      spawnFn,
      resolveTmpFile: () => tmpFile,
    });
    await vi.advanceTimersByTimeAsync(AISSTREAM_CHILD_HARD_TIMEOUT_MS);
    const { vessels, cleanExit } = await p;
    expect(vessels).toEqual([]);
    expect(cleanExit).toBe(false);
    expect(child.kill).toHaveBeenCalled();
    expect(err).toHaveBeenCalledWith('aisstream: child timeout: 60s exceeded, killing');
  });

  it('retries with exponential backoff then returns merged vessels', async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tmpA = nextTmp();
    const tmpB = nextTmp();
    const tmpC = nextTmp();
    const tmps = [tmpA, tmpB, tmpC];
    let attempt = 0;
    const spawnFn = vi.fn(() => {
      const child = makeMockChild();
      const myTmp = tmps[attempt];
      attempt += 1;
      queueMicrotask(() => {
        if (attempt <= 2) {
          child.emit('exit', 1);
          return;
        }
        fs.writeFileSync(myTmp, JSON.stringify(vesselJson()));
        child.emit('exit', 0);
      });
      return child;
    });

    const p = runCollector('key', [[[]]], {
      spawnFn,
      resolveTmpFile: () => tmps[Math.min(attempt, tmps.length - 1)],
    });

    await vi.runAllTimersAsync();
    const vessels = await p;
    expect(vessels).toHaveLength(1);
    expect(vessels[0].mmsi).toBe('123');
    expect(spawnFn).toHaveBeenCalledTimes(3);
    expect(err.mock.calls.map((c) => c[0])).toEqual([
      'aisstream: disconnect, retrying in 1s (attempt 1/3)',
      'aisstream: disconnect, retrying in 2s (attempt 2/3)',
    ]);
  });

  it('after 3 failures returns empty and stops', async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tmps = [nextTmp(), nextTmp(), nextTmp(), nextTmp()];
    let idx = 0;
    const spawnFn = vi.fn(() => {
      const child = makeMockChild();
      queueMicrotask(() => {
        child.emit('exit', 1);
      });
      return child;
    });
    const p = runCollector('key', [[[]]], {
      spawnFn,
      resolveTmpFile: () => tmps[idx++],
    });
    await vi.runAllTimersAsync();
    const vessels = await p;
    expect(vessels).toEqual([]);
    expect(spawnFn).toHaveBeenCalledTimes(4);
    expect(err.mock.calls.map((c) => c[0])).toEqual([
      'aisstream: disconnect, retrying in 1s (attempt 1/3)',
      'aisstream: disconnect, retrying in 2s (attempt 2/3)',
      'aisstream: disconnect, retrying in 4s (attempt 3/3)',
    ]);
  });

  it('happy path: single clean exit, no retry logs', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const tmpFile = nextTmp();
    const spawnFn = vi.fn(() => {
      const child = makeMockChild();
      queueMicrotask(() => {
        fs.writeFileSync(tmpFile, JSON.stringify(vesselJson()));
        child.emit('exit', 0);
      });
      return child;
    });
    const { vessels, cleanExit } = await runCollectorOnce('key', [[[]]], {
      spawnFn,
      resolveTmpFile: () => tmpFile,
    });
    expect(cleanExit).toBe(true);
    expect(vessels).toHaveLength(1);
    expect(spawnFn).toHaveBeenCalledTimes(1);
    expect(err).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('aisstream: collected 1 vessels');
  });

  it('advances fake timers so backoff sleeps complete between retries', async () => {
    vi.useFakeTimers();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const tmpFile = nextTmp();
    let tries = 0;
    const spawnFn = vi.fn(() => {
      const child = makeMockChild();
      tries += 1;
      queueMicrotask(() => {
        if (tries < 3) {
          child.emit('exit', 1);
          return;
        }
        fs.writeFileSync(tmpFile, JSON.stringify(vesselJson()));
        child.emit('exit', 0);
      });
      return child;
    });
    const p = runCollector('k', [[[]]], {
      spawnFn,
      resolveTmpFile: () => tmpFile,
    });
    await vi.runAllTimersAsync();
    await p;
    expect(spawnFn).toHaveBeenCalledTimes(3);
    expect(err.mock.calls.map((c) => String(c[0]))).toEqual([
      'aisstream: disconnect, retrying in 1s (attempt 1/3)',
      'aisstream: disconnect, retrying in 2s (attempt 2/3)',
    ]);
  });
});
