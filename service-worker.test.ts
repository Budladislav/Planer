import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

type WorkerHandler = (event: Record<string, unknown>) => void;

const serviceWorkerSource = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8');

const createWorkerHarness = ({
  fetchResponse,
  cachedResponse,
}: {
  fetchResponse?: unknown;
  cachedResponse?: unknown;
} = {}) => {
  const handlers: Record<string, WorkerHandler> = {};
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(cachedResponse),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
    match: vi.fn().mockResolvedValue(cachedResponse),
  };
  const navigate = vi.fn().mockResolvedValue(null);
  const self = {
    addEventListener: (type: string, handler: WorkerHandler) => { handlers[type] = handler; },
    skipWaiting: vi.fn(),
    clients: {
      claim: vi.fn().mockResolvedValue(undefined),
      matchAll: vi.fn().mockResolvedValue([{ url: 'https://example.test/Planer/', navigate }]),
    },
  };
  const fetch = vi.fn().mockResolvedValue(fetchResponse);

  runInNewContext(serviceWorkerSource, {
    self,
    caches,
    fetch,
    location: { origin: 'https://example.test' },
    URL,
    console,
    Promise,
    Set,
    Error,
  });
  return { handlers, cache, caches, fetch, navigate, self };
};

describe('service worker update recovery', () => {
  it('falls back to a cached hashed asset when the deployed URL returns an error response', async () => {
    const network404 = { ok: false, status: 404 };
    const cachedAsset = { ok: true, status: 200 };
    const worker = createWorkerHarness({ fetchResponse: network404, cachedResponse: cachedAsset });
    let responsePromise: Promise<unknown> | undefined;

    worker.handlers.fetch({
      request: {
        method: 'GET',
        url: 'https://example.test/Planer/assets/index-old.js',
        destination: 'script',
        mode: 'cors',
      },
      respondWith: (response: Promise<unknown>) => { responsePromise = response; },
    });

    await expect(responsePromise).resolves.toBe(cachedAsset);
    expect(worker.caches.match).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('index-old.js') }));
  });

  it('uses a fresh document response and stores it as the offline fallback', async () => {
    const clonedDocument = { id: 'cached-document' };
    const networkDocument = { ok: true, status: 200, clone: () => clonedDocument };
    const worker = createWorkerHarness({ fetchResponse: networkDocument });
    let responsePromise: Promise<unknown> | undefined;

    worker.handlers.fetch({
      request: {
        method: 'GET',
        url: 'https://example.test/Planer/',
        destination: 'document',
        mode: 'navigate',
      },
      respondWith: (response: Promise<unknown>) => { responsePromise = response; },
    });

    await expect(responsePromise).resolves.toBe(networkDocument);
    expect(worker.fetch).toHaveBeenCalledWith(expect.anything(), { cache: 'no-cache' });
    await vi.waitFor(() => expect(worker.cache.put).toHaveBeenCalledWith('/Planer/index.html', clonedDocument));
  });

  it('refreshes PWA metadata from the network instead of consulting legacy caches', async () => {
    const clonedIcon = { id: 'current-icon' };
    const networkIcon = { ok: true, status: 200, clone: () => clonedIcon };
    const worker = createWorkerHarness({ fetchResponse: networkIcon, cachedResponse: { id: 'legacy-icon' } });
    let responsePromise: Promise<unknown> | undefined;
    const request = {
      method: 'GET',
      url: 'https://example.test/Planer/takt-icon-192-v5.2.5.png',
      destination: 'image',
      mode: 'cors',
    };

    worker.handlers.fetch({
      request,
      respondWith: (response: Promise<unknown>) => { responsePromise = response; },
    });

    await expect(responsePromise).resolves.toBe(networkIcon);
    expect(worker.fetch).toHaveBeenCalledWith(request, { cache: 'no-cache' });
    expect(worker.caches.match).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(worker.cache.put).toHaveBeenCalledWith(request, clonedIcon));
  });

  it('claims and reloads an open PWA window after the repaired worker activates', async () => {
    const worker = createWorkerHarness();
    let activationPromise: Promise<unknown> | undefined;

    worker.handlers.activate({
      waitUntil: (promise: Promise<unknown>) => { activationPromise = promise; },
    });

    await expect(activationPromise).resolves.toBeDefined();
    expect(worker.self.clients.claim).toHaveBeenCalledOnce();
    expect(worker.navigate).toHaveBeenCalledWith('https://example.test/Planer/');
  });

  it('registers the worker before the hashed application bundle runs', () => {
    const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
    expect(html.indexOf(".register('/Planer/sw.js')")).toBeGreaterThan(-1);
    expect(html.indexOf(".register('/Planer/sw.js')")).toBeLessThan(html.indexOf('src="/index.tsx"'));
  });
});
