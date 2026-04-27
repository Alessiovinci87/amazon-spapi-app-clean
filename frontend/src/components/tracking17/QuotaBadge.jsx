import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { fetchJSON } from "../../utils/api";

const QuotaBadge = ({ className = "", refreshKey = 0 }) => {
  const [quota, setQuota] = useState({ total: 0, used: 0, remain: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadQuota = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON("tracking17/quota");
      setQuota({
        total: Number(data?.total ?? 0),
        used: Number(data?.used ?? 0),
        remain: Number(data?.remain ?? 0),
      });
    } catch (err) {
      console.error("Errore quota 17TRACK:", err);
      setError("Errore caricamento quote");
    } finally {
      setLoading(false);
    }
  }, []);

  // Ricarica al mount e ogni volta che il parent incrementa refreshKey
  useEffect(() => { loadQuota(); }, [loadQuota, refreshKey]);

  const { total, remain } = quota;

  // Colorazione secondo soglia
  let colorCls;
  if (remain > 50) {
    colorCls = "bg-emerald-500/10 border-emerald-500/40 text-emerald-300";
  } else if (remain >= 20) {
    colorCls = "bg-amber-500/10 border-amber-500/40 text-amber-300";
  } else {
    colorCls = "bg-rose-500/10 border-rose-500/40 text-rose-300";
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${colorCls} ${className}`}>
      <Zap className="w-4 h-4 flex-shrink-0" />
      <div className="flex flex-col leading-none">
        <span className="text-[10px] uppercase tracking-[0.14em] opacity-70">Quote 17TRACK</span>
        <span className="text-sm font-semibold tabular-nums mt-0.5">
          {error ? "—" : `${remain} / ${total}`}
        </span>
      </div>
      <button
        onClick={loadQuota}
        disabled={loading}
        title="Aggiorna quote"
        className="ml-2 w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
};

export default QuotaBadge;
