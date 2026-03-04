import { createRouter, createBrowserHistory } from 'liteforge/router';

export function createAppRouter() {
  return createRouter({
    history: createBrowserHistory(),
    routes: [
      {
        path: '/',
        component: () => import('./pages/Home.js'),
        title: 'Home',
      },
      {
        path: '/about',
        component: () => import('./pages/About.js'),
        title: 'About',
      },
    ],
  });
}
