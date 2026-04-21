import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-xl bg-rose-500/10 border border-rose-500/40 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white mb-2">Qualcosa è andato storto</h1>
            <p className="text-sm text-slate-400">
              Si è verificato un errore imprevisto. Prova a ricaricare la pagina.
            </p>
          </div>
          {this.state.error && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Dettaglio errore</p>
              <p className="text-xs font-mono text-rose-300 break-all">
                {this.state.error.message || String(this.state.error)}
              </p>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Ricarica pagina
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/40 text-slate-300 hover:text-slate-200 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Torna alla home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
