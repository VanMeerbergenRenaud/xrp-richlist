import {NextRequest, NextResponse} from "next/server";
import {
    estimateBalanceForTopPercent,
    fetchDistributionFromLedger,
} from "@/lib/xrpl/distribution";

export const dynamic = "force-dynamic";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || "";

const DEFAULT_PCTS = [0.01, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 10];

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    // Optionnel: ?pcts=0.01,0.1,1,5
    const pcts = (url.searchParams.get("pcts") || "")
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);

    // Proxy backend custom si présent
    if (BACKEND_BASE_URL) {
        const qs = url.search;
        const target = `${BACKEND_BASE_URL.replace(/\/+$/, "")}/stats/percentages${qs}`;
        try {
            const resp = await fetch(target, {
                method: "GET",
                headers: {accept: "application/json"},
                cache: "no-store",
            });
            if (resp.ok) {
                const data = await resp.json();
                return NextResponse.json(data, {status: 200});
            }
            // sinon fallback calcul local
        } catch {
            // calcul local
        }
    }

    try {
        const dist = await fetchDistributionFromLedger();
        const total = dist.totals.accounts || 0;
        const entries = (pcts.length ? pcts : DEFAULT_PCTS).map((pct) => {
            const threshold = estimateBalanceForTopPercent(dist, pct);
            const accountsInTop = Math.round((pct / 100) * total);
            const balanceStr =
                threshold != null
                    ? `${threshold.toLocaleString("en-US", {maximumFractionDigits: 6})} XRP`
                    : "N/A";

            return {
                percentage: `${pct} %`,
                accounts: accountsInTop,
                balance: balanceStr,
            };
        });

        return NextResponse.json(entries, {status: 200});
    } catch (e: any) {
        return NextResponse.json(
            {error: e?.message || "Erreur serveur"},
            {status: 500},
        );
    }
}
