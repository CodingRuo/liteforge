import { describe, it, expect, vi, beforeEach } from 'vitest';
import { i18nPlugin } from '../src/plugin.js';
import type { I18nPluginOptions, TranslationTree } from '../src/types.js';

const en: TranslationTree = { hello: 'Hello', greeting: 'Hello, {name}!' };
const de: TranslationTree = { hello: 'Hallo', greeting: 'Hallo, {name}!' };

function makeContext() {
  const provided: Record<string, unknown> = {};
  const resolved: Record<string, unknown> = {};
  return {
    target: {} as Element,
    provide<T>(key: string, value: T) {
      provided[key] = value;
    },
    resolve<T>(key: string): T | undefined {
      return resolved[key] as T | undefined;
    },
    _provided: provided,
  };
}

describe('i18nPlugin', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    });
  });

  it('has name "i18n"', () => {
    const plugin = i18nPlugin({ defaultLocale: 'en', load: async () => en });
    expect(plugin.name).toBe('i18n');
  });

  it('install() is async and resolves', async () => {
    const plugin = i18nPlugin({ defaultLocale: 'en', load: async () => en });
    const ctx = makeContext();
    const cleanup = await plugin.install(ctx);
    expect(typeof cleanup).toBe('function');
  });

  it('provides "i18n" api with locale, setLocale, t', async () => {
    const plugin = i18nPlugin({ defaultLocale: 'en', load: async () => en });
    const ctx = makeContext();
    await plugin.install(ctx);

    const api = ctx._provided['i18n'] as { locale: () => string; t: (k: string) => string; setLocale: (l: string) => Promise<void> };
    expect(typeof api.locale).toBe('function');
    expect(typeof api.t).toBe('function');
    expect(typeof api.setLocale).toBe('function');
  });

  it('translations are loaded before install resolves (no FOUC)', async () => {
    const plugin = i18nPlugin({ defaultLocale: 'en', load: async () => en });
    const ctx = makeContext();
    await plugin.install(ctx);

    const api = ctx._provided['i18n'] as { t: (k: string) => string };
    expect(api.t('hello')).toBe('Hello');
  });

  it('locale() returns defaultLocale after install', async () => {
    const plugin = i18nPlugin({ defaultLocale: 'en', load: async () => en });
    const ctx = makeContext();
    await plugin.install(ctx);

    const api = ctx._provided['i18n'] as { locale: () => string };
    expect(api.locale()).toBe('en');
  });

  it('setLocale switches translations', async () => {
    const load = vi.fn().mockImplementation(async (l: string) => (l === 'de' ? de : en));
    const plugin = i18nPlugin({ defaultLocale: 'en', load });
    const ctx = makeContext();
    await plugin.install(ctx);

    const api = ctx._provided['i18n'] as { setLocale: (l: string) => Promise<void>; t: (k: string) => string };
    await api.setLocale('de');
    expect(api.t('hello')).toBe('Hallo');
  });

  it('loads fallback locale in parallel (non-blocking)', async () => {
    const loadOrder: string[] = [];
    const options: I18nPluginOptions = {
      defaultLocale: 'de',
      fallbackLocale: 'en',
      load: async (l) => {
        loadOrder.push(l);
        return l === 'de' ? de : en;
      },
      persist: false,
    };
    const plugin = i18nPlugin(options);
    const ctx = makeContext();
    await plugin.install(ctx);

    // de must be loaded (await), en may load after install resolves
    expect(loadOrder).toContain('de');
  });

  it('does not load fallback when same as default', async () => {
    const load = vi.fn().mockResolvedValue(en);
    const plugin = i18nPlugin({ defaultLocale: 'en', fallbackLocale: 'en', load });
    const ctx = makeContext();
    await plugin.install(ctx);
    // Only called once (for default locale)
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('cleanup function does not throw', async () => {
    const plugin = i18nPlugin({ defaultLocale: 'en', load: async () => en });
    const ctx = makeContext();
    const cleanup = await plugin.install(ctx);
    expect(() => cleanup?.()).not.toThrow();
  });
});
