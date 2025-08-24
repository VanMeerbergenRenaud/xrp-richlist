import React from "react";

type DistributionBucket = {
  range: string;      // ex: "0-20 XRP", "≥ 1,000,000 XRP", "≤ 20 XRP"
  accounts: number;   // nombre de comptes dans la tranche
  percent: number;    // pourcentage du total (non-escrow)
};

type MetricsResponse = {
  ledger_index: number | null;
  updated_at: string;
  total_xrp_drops: string | null;
  non_escrow_xrp_drops: string | null;
  wallets_count: number | null;
  price_usd: number | null;
  distribution?: DistributionBucket[];
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:4000";

// Convertit des drops (string) en XRP (number)
function xrpFromDrops(drops?: string | null): number {
  if (!drops) return 0;
  try {
    const n = BigInt(drops);
    // 1 XRP = 1_000_000 drops
    return Number(n) / 1_000_000;
  } catch {
    const asNum = Number(drops);
    return Number.isFinite(asNum) ? asNum / 1_000_000 : 0;
  }
}

// Extrait une "borne minimale" pour trier les tranches lisibles (best effort)
function minFromRangeLabel(range: string): number {
  // Quelques formats anticipés:
  // "0-20 XRP", "20-500 XRP", "≥ 1,000,000 XRP", "≤ 20 XRP", "N/A"
  const s = range.replace(/,/g, "").trim();

  // ≥ X
  const ge = s.match(/^≥\s*([0-9]+(\.[0-9]+)?)\s*/i);
  if (ge) return parseFloat(ge[1]);

  // ≤ X  -> min = 0
  if (/^≤\s*[0-9]/.test(s)) return 0;

  // A - B
  const between = s.match(/^([0-9]+(\.[0-9]+)?)\s*-\s*([0-9]+(\.[0-9]+)?)/);
  if (between) return parseFloat(between[1]);

  // Nombre seul
  const single = s.match(/^([0-9]+(\.[0-9]+)?)/);
  if (single) return parseFloat(single[1]);

  return Number.POSITIVE_INFINITY; // met en bas ce que l’on ne sait pas trier
}

function formatInteger(n?: number | null): string {
  if (!Number.isFinite(n || NaN)) return "—";
  return (n as number).toLocaleString("en-US");
}

function formatXrp(n?: number | null): string {
  if (!Number.isFinite(n || NaN)) return "—";
  return (n as number).toLocaleString("en-US", {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}

async function getMetrics(): Promise<MetricsResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/metrics`, {
      // Revalidation ISR côté Next (page server component)
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MetricsResponse;
    return data;
  } catch {
    return null;
  }
}

export default async function StatsPage() {
  const metrics = await getMetrics();

  const nonEscrowXrp =
    xrpFromDrops(metrics?.non_escrow_xrp_drops) ||
    xrpFromDrops(metrics?.total_xrp_drops) ||
    0;

  const rows =
    (metrics?.distribution || [])
      .map((b) => {
        const sumXrp = (nonEscrowXrp * (b.percent || 0)) / 100;
        return {
          ...b,
          sumXrp,
          _minSort: minFromRangeLabel(b.range || ""),
        };
      })
      .sort((a, b) => a._minSort - b._minSort) || [];

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">
        Distribution des soldes — comptes et somme par tranche
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Source: métriques XRPL agrégées. Les “Sum (XRP)” par tranche sont estimées en
        appliquant le pourcentage de distribution à la liquidité (non-escrow).
      </p>

      {!rows.length ? (
        <div className="rounded border bg-white p-6">
          Aucune donnée de distribution disponible pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left w-40"># Accounts</th>
                <th className="px-4 py-3 text-left">Balance range</th>
                <th className="px-4 py-3 text-right w-64">Sum (XRP)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.range}-${idx}`}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2 font-medium">
                    {formatInteger(r.accounts)}
                  </td>
                  <td className="px-4 py-2">{r.range}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatXrp(r.sumXrp)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td className="px-4 py-3 font-semibold">
                  {formatInteger(
                    rows.reduce((acc, r) => acc + (r.accounts || 0), 0)
                  )}
                </td>
                <td className="px-4 py-3 font-semibold">Total non-escrow (approx.)</td>
                <td className="px-4 py-3 text-right font-semibold font-mono">
                  {formatXrp(nonEscrowXrp)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        Ledger index: {metrics?.ledger_index ?? "—"} · MAJ:{" "}
        {metrics?.updated_at
          ? new Date(metrics.updated_at).toLocaleString()
          : "—"}
      </div>
    </div>
  );
}
