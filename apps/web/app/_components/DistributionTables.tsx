"use client";

import React from "react";
import type { RangeBucket } from "../../lib/distributionStore";

type Props = {
    edges: number[];
};

const nf = new Intl.NumberFormat("fr-FR");
const xf = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 6, maximumFractionDigits: 6 });

const rangeLabel = (min: number, max: number) =>
    `${nf.format(min)} - ${max === Number.POSITIVE_INFINITY ? "Infini" : nf.format(max)}`;

const makeAllBuckets = (edges: number[], buckets: RangeBucket[]): RangeBucket[] =>
    edges.slice(0, -1).map((min, i) => {
        const found = buckets.find((b) => b.min === min && b.max === edges[i + 1]);
        return found ?? { min, max: edges[i + 1], accounts: 0, sumXrp: 0 };
    });

const sortBucketsDesc = (rows: RangeBucket[]) => rows.slice().sort((a, b) => b.min - a.min);

const PERCENTS = [0.01, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 10];

type SnapshotDTO = { updating: boolean; buckets: RangeBucket[] };

export default function DistributionTables({ edges }: Props) {
    const [rows, setRows] = React.useState<RangeBucket[]>([]);
    const [loading, setLoading] = React.useState(true);

    const totalAccounts = React.useMemo(
        () => rows.reduce((acc, r) => acc + r.accounts, 0),
        [rows]
    );
    const totalSum = React.useMemo(
        () => rows.reduce((acc, r) => acc + r.sumXrp, 0),
        [rows]
    );

    // Récupération unique du snapshot + polling en arrière-plan
    React.useEffect(() => {
        let abort = false;

        const request = async (method: "GET" | "POST"): Promise<SnapshotDTO | null> => {
            const res = await fetch("/api/distribution/snapshot", { method, cache: "no-store" });
            if (res.status === 429) {
                const retry = Number(res.headers.get("retry-after") || "5");
                await new Promise((r) => setTimeout(r, retry * 1000));
                return null;
            }
            if (!res.ok) throw new Error("snapshot request failed");
            const data = (await res.json()) as SnapshotDTO;
            return data;
        };

        const apply = (buckets: RangeBucket[]) => {
            const full = makeAllBuckets(edges, buckets);
            setRows(sortBucketsDesc(full));
        };

        (async () => {
            try {
                const first = await request("GET");
                if (abort || !first) return;
                apply(first.buckets);
                setLoading(first.updating);

                while (!abort && first.updating) {
                    const upd = (await request("POST")) ?? (await request("GET"));
                    if (abort || !upd) break;
                    apply(upd.buckets);
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

    // Tableau 2: seuils par pourcentage (top p%)
    const percentRows = React.useMemo(() => {
        if (!rows.length || totalAccounts === 0) return [];
        const sorted = sortBucketsDesc(rows);
        return PERCENTS.map((p) => {
            const target = Math.max(1, Math.round((totalAccounts * p) / 100));
            let cum = 0;
            let threshold = 0;
            for (const b of sorted) {
                if (cum + b.accounts >= target) {
                    threshold = b.min; // approximation prudente: seuil = borne min du bucket d'appartenance
                    break;
                }
                cum += b.accounts;
            }
            return {
                percent: p,
                accounts: target,
                threshold
            };
        });
    }, [rows, totalAccounts]);

    return (
        <div className="space-y-3">
            <div
                className="rounded-md border border-gray-200 dark:border-gray-800 px-3 py-2 text-xs flex items-center gap-2"
                aria-live="polite"
            >
                {loading ? (
                    <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        <span> Agrégation en arrière‑plan… Comptes agrégés: {nf.format(totalAccounts)} </span>
                    </>
                ) : (
                    <>
                        <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Données consolidées. Comptes agrégés: {nf.format(totalAccounts)}</span>
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Tableau 1 — par tranches */}
                <div className="col-span-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white">
                    <div className="px-4 py-3 font-medium text-sm">Nombre de comptes et somme par tranche de solde</div>
                    <table className="w-full text-sm">
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
                                <td className="pl-6 px-4 py-2">{nf.format(bk.accounts)}</td>
                                <td className="px-4 py-2">{rangeLabel(bk.min, bk.max)}</td>
                                <td className="px-4 py-2 text-right">{xf.format(bk.sumXrp)}</td>
                            </tr>
                        ))}
                        {!rows.length && (
                            <tr>
                                <td className="px-4 py-6" colSpan={3}>
                                    Chargement…
                                </td>
                            </tr>
                        )}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="pr-4 pl-0 py-2">{nf.format(totalAccounts)}</th>
                            <th className="px-4 py-2 text-left">Total</th>
                            <th className="px-4 py-2 text-right">{xf.format(totalSum)}</th>
                        </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Tableau 2 — pourcentages (liés aux mêmes données) */}
                <div className="col-span-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white">
                    <div className="px-4 py-3 font-medium text-sm">Pourcentage de comptes avec un solde au moins égal à…</div>
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr className="text-left">
                            <th className="px-4 py-2 w-28">Pourcentage</th>
                            <th className="px-4 py-2 w-40"># Comptes</th>
                            <th className="px-4 py-2 text-right">Solde ≥ (XRP)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {percentRows.map((r) => (
                            <tr key={r.percent} className="border-t border-gray-100 dark:border-gray-800">
                                <td className="px-4 py-2">{r.percent.toLocaleString("fr-FR")} %</td>
                                <td className="px-4 py-2">{nf.format(r.accounts)}</td>
                                <td className="px-4 py-2 text-right">{xf.format(r.threshold)}</td>
                            </tr>
                        ))}
                        {!percentRows.length && (
                            <tr>
                                <td className="px-4 py-6" colSpan={3}>
                                    Chargement…
                                </td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
