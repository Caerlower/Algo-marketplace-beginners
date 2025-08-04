// Polyfills for Node.js globals
import { Buffer } from 'buffer';

// Extend Window interface to include Buffer
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

// Make Buffer available globally
window.Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
