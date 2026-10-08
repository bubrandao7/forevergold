import React from 'react';
import { createRoot } from 'react-dom/client';
import './fonts/fonts.css';
import './ui/global.css';
import './core/lisboa.js';
import './core/fg-assets.js';
import './core/fg-core.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true })).catch(() => {});
}
