import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // ✅ IMPORTA ROUTER
import './custom.css';
import './App.css';





import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* ✅ AVVOLGI TUTTO */}
      <App />
    </BrowserRouter>
  </StrictMode>
);