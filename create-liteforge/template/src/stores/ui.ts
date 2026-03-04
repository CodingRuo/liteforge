import { defineStore } from 'liteforge/store';
import { signal } from 'liteforge';

export const uiStore = defineStore('ui', {
  state: {
    theme: 'light' as 'light' | 'dark',
  },
  getters: state => ({
    isDark: () => state.theme() === 'dark',
  }),
  actions: state => ({
    toggleTheme() {
      state.theme.update(t => (t === 'light' ? 'dark' : 'light'));
    },
    setTheme(theme: 'light' | 'dark') {
      state.theme.set(theme);
    },
  }),
});

// Sync theme with OS preference on init
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (prefersDark) uiStore.setTheme('dark');
