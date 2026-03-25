import type { RouteDefinition } from '@liteforge/router';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: () => import('./pages/Home.js'),
    export: 'Home',
    meta: { title: 'Home' },
  },
  {
    path: '/about',
    component: () => import('./pages/About.js'),
    export: 'About',
    meta: { title: 'About' },
  },
];
