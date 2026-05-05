import './utils/fetchInterceptor'; // JWT token su tutte le fetch — DEVE essere il primo import
import './i18n'; // Inizializza react-i18next prima del render
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AlertBellProvider } from './components/AlertBellContext';
import './custom.css';
import './App.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AlertBellProvider>
            <App />
            <Toaster position="top-right" richColors closeButton />
          </AlertBellProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
