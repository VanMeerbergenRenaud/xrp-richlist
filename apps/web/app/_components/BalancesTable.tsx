"use client";

import React from "react";
import type {RangeBucket} from "../../lib/distributionStore";

type Props = {
    edges: number[];
    initialBuckets: RangeBucket[];
};

const nf = new Intl.NumberFormat("fr-FR");
const xf = new Intl.NumberFormat("fr-FR", {minimumFractionDigits: 6, maximumFractionDigits: 6});

const rangeLabel = (min: number, max: number) =>
    `${nf.format(min)} - ${max === Number.POSITIVE_INFINITY ? "Infini" : nf.format(max)}`;

const makeEmptyBuckets = (edges: number[]): RangeBucket[] =>
    edges.slice(0, -1).map((min, i) => ({min, max: edges[i + 1], accounts: 0, sumXrp: 0}));

const sortAndFilter = (rows: RangeBucket[]) =>
    rows.filter((b) => b.accounts > 0).sort((a, b) => b.min - a.min);

export default function BalancesTable({edges, initialBuckets}: Props) {
    const [rows, setRows] = React.useState<RangeBucket[]>(() => {
        const base = makeEmptyBuckets(edges);
        for (const b of initialBuckets) {
            const idx = base.findIndex((x) => x.min === b.min && x.max === b.max);
            if (idx >= 0) {
                base[idx].accounts += b.accounts;
                base[idx].sumXrp += b.sumXrp;
            }
        }
        return sortAndFilter(base);
    });

    const [loading, setLoading] = React.useState(true);

    const loadedAccounts = React.useMemo(() => rows.reduce((acc, r) => acc + r.accounts, 0), [rows]);
    const totalSum = React.useMemo(() => rows.reduce((acc, r) => acc + r.sumXrp, 0), [rows]);

    React.useEffect(() => {
        let abort = false;

        const request = async (method: "GET" | "POST") => {
            const res = await fetch("/api/distribution/snapshot", {method, cache: "no-store"});
            if (res.status === 429) {
                const retry = Number(res.headers.get("retry-after") || "5");
                await new Promise((r) => setTimeout(r, retry * 1000));
                return null;
            }
            if (!res.ok) throw new Error("snapshot request failed");
            return (await res.json()) as { updating: boolean; buckets: RangeBucket[] };
        };

        const applySnapshot = (buckets: RangeBucket[]) => {
            setRows(
                sortAndFilter(
                    edges.slice(0, -1).map((min, i) => {
                        const found = buckets.find((b) => b.min === min && b.max === edges[i + 1]);
                        return found ?? {min, max: edges[i + 1], accounts: 0, sumXrp: 0};
                    })
                )
            );
        };

        (async () => {
            try {
                const first = await request("GET");
                if (abort || !first) return;
                applySnapshot(first.buckets);
                setLoading(first.updating);

                while (!abort && first.updating) {
                    const upd = (await request("POST")) ?? (await request("GET"));
                    if (abort || !upd) break;
                    applySnapshot(upd.buckets);
                    setLoading(upd.updating);
                    if (upd.updating) await new Promise((r) => setTimeout(r, 2000));
                }
            } catch {
                if (!abort) setLoading(false);
            }
        })();

        return () => {
            abort = true;
        };
    }, [edges]);

    return (
        <div className="space-y-3">
            <div className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs flex items-center gap-2"
                 aria-live="polite"
            >
                {loading ? (
                    <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                        </svg>
                        <span> Agrégation en arrière‑plan… Comptes agrégés: {nf.format(loadedAccounts)} </span>
                    </>
                ) : (
                    <>
                        <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <span>Données consolidées. Comptes agrégés: {nf.format(loadedAccounts)}</span>
                    </>
                )}
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-800">
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
                        <tr key={`${bk.min}-${bk.max}`} className="border-t border-gray-100 dark:border-gray-800">
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
