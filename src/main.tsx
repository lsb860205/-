import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  console.error("Critical render failure:", error);
  document.body.innerHTML = `<div style="padding: 20px; font-family: sans-serif; color: #444;">
    <h2>System Initialization Recovery</h2>
    <p>The application is experiencing a temporary sync delay. Please try refreshing in a few moments.</p>
    <small style="opacity: 0.5;">Error Code: RENDER_INIT_ERR_v1.6.1</small>
  </div>`;
}
