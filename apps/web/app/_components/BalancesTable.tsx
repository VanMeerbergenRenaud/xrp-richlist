"use client";

import React from "react";
import type { RangeBucket } from "../../lib/distributionStore";

type Props = {
  edges: number[];
  initialBuckets: RangeBucket[];
  initialMarker: string | null;
};

const nf = new Intl.NumberFormat("fr-FR");
const xf = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 6,
  maximumFractionDigits: 6
});

function rangeLabel(min: number, max: number) {
  const to = max === Number.POSITIVE_INFINITY ? "Infini" : nf.format(max);
  return `${nf.format(min)} - ${to}`;
}

function makeEmptyBuckets(edges: number[]): RangeBucket[] {
  const arr: RangeBucket[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    arr.push({ min: edges[i], max: edges[i + 1], accounts: 0, sumXrp: 0 });
  }
  return arr;
}

export default function BalancesTable({
  edges,
  initialBuckets,
  initialMarker
}: Props) {
  const [rows, setRows] = React.useState<RangeBucket[]>(() => {
    const base = makeEmptyBuckets(edges);
    for (const b of initialBuckets) {
      const idx = base.findIndex((x) => x.min === b.min && x.max === b.max);
      if (idx >= 0) {
        base[idx].accounts += b.accounts;
        base[idx].sumXrp += b.sumXrp;
      }
    }
    return base.filter((b) => b.accounts > 0).sort((a, b) => b.min - a.min);
  });

  const [loading, setLoading] = React.useState<boolean>(true);

  const loadedAccounts = React.useMemo(
    () => rows.reduce((acc, r) => acc + r.accounts, 0),
    [rows]
  );
  const totalSum = React.useMemo(
    () => rows.reduce((acc, r) => acc + r.sumXrp, 0),
    [rows]
  );

  React.useEffect(() => {
    let abort = false;

    async function fetchSnapshot() {
      const res = await fetch("/api/distribution/snapshot", {
        cache: "no-store"
      });
      if (!res.ok) throw new Error("snapshot fetch failed");
      return (await res.json()) as {
        updating: boolean;
        buckets: RangeBucket[];
        marker: string | null;
      };
    }

    async function updateChunk() {
      const res = await fetch("/api/distribution/snapshot", {
        method: "POST",
        cache: "no-store"
      });
      // si rate-limited, on respecte Retry-After
      if (res.status === 429) {
        const retry = Number(res.headers.get("retry-after") || "5");
        await new Promise((r) => setTimeout(r, retry * 1000));
        return null;
      }
      if (!res.ok) throw new Error("update failed");
      return (await res.json()) as {
        updating: boolean;
        buckets: RangeBucket[];
        marker: string | null;
      };
    }

    async function loop() {
      try {
        // 1) snapshot initial
        const snap = await fetchSnapshot();
        if (abort) return;
        setRows(
          snap.buckets
            .map((b) => ({ ...b }))
            .filter((b) => b.accounts > 0)
            .sort((a, b) => b.min - a.min)
        );
        setLoading(snap.updating);

        // 2) si en cours, on poll en arrière-plan
        while (!abort && snap.updating) {
          const upd = await updateChunk();
          if (abort) return;
          // si rate-limited → upd peut être null; on refetch le snapshot après la pause
          const next =
            upd ??
            (await fetchSnapshot().catch(() => ({
              updating: true,
              buckets: snap.buckets,
              marker: snap.marker
            })));
          setRows(
            next.buckets
              .map((b) => ({ ...b }))
              .filter((b) => b.accounts > 0)
              .sort((a, b) => b.min - a.min)
          );
          setLoading(next.updating);
          // petite pause pour ne pas spammer
          if (next.updating) await new Promise((r) => setTimeout(r, 2000));
        }
      } catch {
        // en cas d'erreur, on arrête le loader pour ne pas bloquer l'UI
        if (!abort) setLoading(false);
      }
    }

    loop();
    return () => {
      abort = true;
    };
  }, [edges, initialMarker]);

  return (
    <div className="space-y-3">
      <div
        className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs flex items-center gap-2"
        aria-live="polite"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>
              Agrégation en arrière‑plan (budget ≤ 200 000 comptes/5 min)… Comptes agrégés:{" "}
              {nf.format(loadedAccounts)}
            </span>
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4 text-emerald-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Données consolidées. Comptes agrégés: {nf.format(loadedAccounts)}</span>
          </>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr className="text-left">
              <th className="px-4 py-2 w-32"># Comptes</th>
              <th className="px-4 py-2">Balance de … à</th>
              <th className="px-4 py-2 text-right">Somme (XRP)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bk) => (
              <tr
                key={`${bk.min}-${bk.max}`}
                className="border-t border-gray-100 dark:border-gray-800"
              >
                <td className="px-4 py-2">{nf.format(bk.accounts)}</td>
                <td className="px-4 py-2">{rangeLabel(bk.min, bk.max)}</td>
                <td className="px-4 py-2 text-right">{xf.format(bk.sumXrp)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6" colSpan={3}>
                  Chargement…
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
            <tr>
              <th className="px-4 py-2">{nf.format(loadedAccounts)}</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2 text-right">{xf.format(totalSum)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
