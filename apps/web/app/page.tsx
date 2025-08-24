import React from "react";
import BalancesTable from "./_components/BalancesTable";
import {BUCKET_EDGES} from "./BUCKET_EDGES";

export type RangeBucket = {
    min: number;
    max: number;
    accounts: number;
    sumXrp: number;
};

function bucketizeBalances(balances: number[], edges: number[]): RangeBucket[] {
    const buckets: RangeBucket[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
        buckets.push({ min: edges[i], max: edges[i + 1], accounts: 0, sumXrp: 0 });
    }

    for (const bal of balances) {
        const idx = edges.findIndex((edge, i) => bal >= edge && bal < edges[i + 1]);
        if (idx >= 0) {
            buckets[idx].accounts += 1;
            buckets[idx].sumXrp += bal;
        } else if (bal >= edges[edges.length - 1]) {
            const last = buckets[buckets.length - 1];
            last.accounts += 1;
            last.sumXrp += bal;
        }
    }

    return buckets.filter((b) => b.accounts > 0).sort((a, b) => b.min - a.min);
}

async function fetchFirstPage(): Promise<{
    balancesXrp: number[];
    marker: string | null;
}> {
    try {
        // Appel direct au cluster XRPL (JSON-RPC) pour récupérer TOUS les comptes (page 1)
        const body = {
            method: "ledger_data",
            params: [
                {
                    ledger_index: "validated",
                    type: "account",
                    limit: 2000,
                    binary: false
                }
            ]
        };
        const res = await fetch("https://xrplcluster.com", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            // on accepte un cache très court pour la première page
            next: { revalidate: 30 }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: any = await res.json();
        const state: any[] = json?.result?.state ?? [];

        const balancesXrp = state
            .filter((o: any) => (o?.LedgerEntryType ?? o?.type) === "AccountRoot")
            .map((o: any) => Number(o?.Balance) / 1_000_000)
            .filter((n: number) => Number.isFinite(n) && n >= 0);

        const marker: string | null =
            (typeof json?.result?.marker === "string" && json.result.marker) || null;

        return { balancesXrp, marker };
    } catch {
        return { balancesXrp: [], marker: null };
    }
}

export default async function Page() {
    const { balancesXrp, marker } = await fetchFirstPage();
    const initialBuckets = bucketizeBalances(balancesXrp, BUCKET_EDGES);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-semibold">
                Nombre de comptes et somme par tranche de solde
            </h1>

            <BalancesTable
                edges={BUCKET_EDGES}
                initialBuckets={initialBuckets}
                initialMarker={marker}
            />
        </div>
    );
}
