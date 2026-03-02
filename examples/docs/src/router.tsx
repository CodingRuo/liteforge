import type { RouteDefinition } from '@liteforge/router';
import { Layout } from './pages/Layout.js';
import { Overview } from './pages/Overview.js';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Layout,
    children: [
      { path: '/', component: Overview, meta: { title: 'LiteForge Docs' } },
      {
        path: '/core',
        component: () => import('./pages/CorePage.js'),
        export: 'CorePage',
        meta: { title: 'core — LiteForge' },
      },
      {
        path: '/runtime',
        component: () => import('./pages/RuntimePage.js'),
        export: 'RuntimePage',
        meta: { title: 'runtime — LiteForge' },
      },
      {
        path: '/control-flow',
        component: () => import('./pages/ControlFlowPage.js'),
        export: 'ControlFlowPage',
        meta: { title: 'control flow — LiteForge' },
      },
      {
        path: '/router',
        component: () => import('./pages/RouterPage.js'),
        export: 'RouterPage',
        meta: { title: 'router — LiteForge' },
      },
      {
        path: '/query',
        component: () => import('./pages/QueryPage.js'),
        export: 'QueryPage',
        meta: { title: 'query — LiteForge' },
      },
      {
        path: '/form',
        component: () => import('./pages/FormPage.js'),
        export: 'FormPage',
        meta: { title: 'form — LiteForge' },
      },
      {
        path: '/table',
        component: () => import('./pages/TablePage.js'),
        export: 'TablePage',
        meta: { title: 'table — LiteForge' },
      },
      {
        path: '/client',
        component: () => import('./pages/ClientPage.js'),
        export: 'ClientPage',
        meta: { title: 'client — LiteForge' },
      },
      {
        path: '/calendar',
        component: () => import('./pages/CalendarPage.js'),
        export: 'CalendarPage',
        meta: { title: 'calendar — LiteForge' },
      },
    ],
  },
  {
    path: '*',
    component: Overview,
  },
];
