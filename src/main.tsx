import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { OverlayProvider } from './context/OverlayContext.tsx';
import { configureAmplify } from './aws-amplify-config';

try {
  configureAmplify();
} catch (error) {
  console.error('Error configuring Amplify:', error);
  // Continue anyway - app should still work without Amplify configured
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OverlayProvider>
      <App />
    </OverlayProvider>
  </StrictMode>
);
