import { createApp } from 'liteforge';
import { routerPlugin } from 'liteforge/router';
import { modalPlugin } from 'liteforge/modal';
import { App } from './App.js';
import { createAppRouter } from './router.js';
import { uiStore } from './stores/ui.js';
import './styles.css';

await createApp({ root: App, target: '#app', stores: [uiStore] })
  .use(routerPlugin(createAppRouter()))
  .use(modalPlugin())
  .mount();
