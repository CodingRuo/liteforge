import { createApp } from '@liteforge/runtime';
import { createBrowserHistory, createRouter } from '@liteforge/router';
import { ModalProvider } from '@liteforge/modal';
import { routes } from './router.js';
import { App } from './App.js';
import './styles.css';

const history = createBrowserHistory();
const router = createRouter({ routes, history });

document.body.appendChild(ModalProvider());

await createApp({
  root: App,
  target: '#app',
  router,
});

