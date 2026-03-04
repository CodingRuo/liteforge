import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createI18n } from '../src/i18n.js';
import type { TranslationTree } from '../src/types.js';

const en: TranslationTree = {
  hello: 'Hello',
  greeting: 'Hello, {name}!',
  items: '{count} item | {count} items',
  messages: 'No messages | {count} message | {count} messages',
  nav: {
    home: 'Home',
    about: 'About',
  },
  missing_in_current: 'only in en',
};

const de: TranslationTree = {
  hello: 'Hallo',
  greeting: 'Hallo, {name}!',
  items: '{count} Artikel | {count} Artikel',
  messages: 'Keine Nachrichten | {count} Nachricht | {count} Nachrichten',
  nav: {
    home: 'Startseite',
    about: 'Über uns',
  },
};

describe('createI18n', () => {
  beforeEach(() => {
    // Reset localStorage mock
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  it('returns initial locale signal', () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en });
    expect(i18n.locale()).toBe('en');
  });

  it('reads persisted locale from localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('de'),
      setItem: vi.fn(),
    });
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en });
    expect(i18n.locale()).toBe('de');
  });

  it('does not read localStorage when persist: false', () => {
    const getItem = vi.fn().mockReturnValue('de');
    vi.stubGlobal('localStorage', { getItem, setItem: vi.fn() });
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    expect(getItem).not.toHaveBeenCalled();
    expect(i18n.locale()).toBe('en');
  });

  it('_load sets locale + translations and saves to localStorage', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem });
    const i18n = createI18n({ defaultLocale: 'en', load: async (l) => (l === 'en' ? en : de) });

    await i18n._load('en');
    expect(i18n.locale()).toBe('en');
    expect(i18n.t('hello')).toBe('Hello');
    expect(setItem).toHaveBeenCalledWith('lf-locale', 'en');
  });

  it('setLocale switches locale and translations', async () => {
    const load = vi.fn().mockImplementation(async (l: string) => (l === 'de' ? de : en));
    const i18n = createI18n({ defaultLocale: 'en', load, persist: false });
    await i18n._load('en');

    await i18n.setLocale('de');
    expect(i18n.locale()).toBe('de');
    expect(i18n.t('hello')).toBe('Hallo');
  });

  it('t: simple key lookup', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('hello')).toBe('Hello');
  });

  it('t: dot-notation key lookup', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('nav.home')).toBe('Home');
    expect(i18n.t('nav.about')).toBe('About');
  });

  it('t: returns key when not found', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('t: interpolation', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('greeting', { name: 'World' })).toBe('Hello, World!');
  });

  it('t: keeps placeholder when param missing', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('greeting')).toBe('Hello, {name}!');
  });

  it('t: 2-part plural — singular', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('items', { count: 1 }, 1)).toBe('1 item');
  });

  it('t: 2-part plural — plural', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('items', { count: 5 }, 5)).toBe('5 items');
  });

  it('t: 3-part plural — zero', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('messages', { count: 0 }, 0)).toBe('No messages');
  });

  it('t: 3-part plural — one', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('messages', { count: 1 }, 1)).toBe('1 message');
  });

  it('t: 3-part plural — many', async () => {
    const i18n = createI18n({ defaultLocale: 'en', load: async () => en, persist: false });
    await i18n._load('en');
    expect(i18n.t('messages', { count: 7 }, 7)).toBe('7 messages');
  });

  it('_loadFallback sets fallback translations', async () => {
    const i18n = createI18n({
      defaultLocale: 'de',
      fallbackLocale: 'en',
      load: async (l) => (l === 'de' ? de : en),
      persist: false,
    });
    await i18n._load('de');
    await i18n._loadFallback('en');

    expect(i18n.t('hello')).toBe('Hallo'); // from de
    expect(i18n.t('missing_in_current')).toBe('only in en'); // from fallback
  });

  it('_loadFallback is non-fatal on error', async () => {
    const i18n = createI18n({
      defaultLocale: 'de',
      fallbackLocale: 'en',
      load: async (l) => {
        if (l === 'en') throw new Error('not found');
        return de;
      },
      persist: false,
    });
    await i18n._load('de');
    await expect(i18n._loadFallback('en')).resolves.toBeUndefined();
  });

  it('uses custom storageKey', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem });
    const i18n = createI18n({
      defaultLocale: 'en',
      load: async () => en,
      storageKey: 'my-app-locale',
    });
    await i18n._load('en');
    expect(setItem).toHaveBeenCalledWith('my-app-locale', 'en');
  });
});
