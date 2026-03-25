import { defineStore } from '@liteforge/store';

export type Theme = 'light' | 'dark' | 'system';

export const uiStore = defineStore('ui', {
  state: {
    theme: 'system' as Theme,
    sidebarOpen: true,
  },

  getters: (state) => ({
    effectiveTheme: (): 'light' | 'dark' => {
      const theme = state.theme();
      if (theme === 'light' || theme === 'dark') return theme;
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    },
  }),

  actions: (state) => ({
    setTheme(theme: Theme) {
      state.theme.set(theme);
      const effective = theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
      document.documentElement.setAttribute('data-theme', effective);
    },

    toggleSidebar() {
      state.sidebarOpen.update(open => !open);
    },
  }),
});
