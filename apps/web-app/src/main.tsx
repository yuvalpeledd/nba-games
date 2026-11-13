import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './app/app';
// After the app: the design system's MUI overrides come after the components' and pages' styles.
import '@nba/web-design-system-components';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
