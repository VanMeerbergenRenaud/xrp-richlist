import { useEffect, useState } from "react";
import api from "../utils/api";
import StatCard from "../components/StatCard";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/stats")
      .then((res) => {
        if (!cancelled) setStats(res.data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">XRP Explorer</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Statistiques globales du réseau</p>

        {loading ? (
          <div className="mt-10 text-gray-600 dark:text-gray-300">Chargement…</div>
        ) : !stats ? (
          <div className="mt-10 text-red-600">Impossible de récupérer les stats</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Ledger index"
              value={stats.ledger_index}
              sub={new Date(stats.last_updated).toLocaleString()}
            />
            <StatCard label="Total XRP" value={Intl.NumberFormat().format(stats.total_xrp)} />
            <StatCard label="XRP en circulation" value={Intl.NumberFormat().format(stats.circulating_xrp)} />
            <StatCard label="Prix (USD)" value={`$${stats.price_usd}`} />
            <StatCard label="Portefeuilles" value={Intl.NumberFormat().format(stats.wallets)} />
          </div>
        )}
      </div>
    </main>
  );
}
