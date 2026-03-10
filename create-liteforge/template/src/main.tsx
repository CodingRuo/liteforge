import { createApp } from 'liteforge';
import { createBrowserHistory, createRouter } from 'liteforge/router';
import { modalPlugin } from 'liteforge/modal';
import { App } from './App';
import { routes } from './router';
import './styles.css';

const history = createBrowserHistory();
const router = createRouter({ routes, history });

await createApp({ root: App, target: '#app', router })
  .use(modalPlugin())
  .mount();
