import {NextRequest} from "next/server";
import {
    Snapshot,
    emptyBuckets,
    enforceRateWindow,
    isWeeklyExpired,
    readSnapshot,
    resetSnapshot,
    writeSnapshot
} from "../../../../lib/distributionStore";
import {BUCKET_EDGES} from "../../../(site)/stats/lib/BUCKET_EDGES";

// Applique une page ledger_data sur des buckets en mémoire, renvoie comptes traités
async function applyOnePage(
    snap: Snapshot,
    marker: string | null
): Promise<{ nextMarker: string | null; processed: number }> {
    const body = {
        method: "ledger_data",
        params: [
            {
                ledger_index: "validated",
                type: "account",
                binary: false,
                limit: 2000,
                ...(marker ? {marker} : {})
            }
        ]
    };
    const res = await fetch("https://xrplcluster.com", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(body),
        cache: "no-store"
    });
    if (!res.ok) {
        return {nextMarker: marker, processed: 0};
    }
    const json: any = await res.json();
    const state: any[] = json?.result?.state ?? [];
    const nextMarker: string | null =
        (typeof json?.result?.marker === "string" && json.result.marker) || null;

    const e = snap.edges;
    const findIdx = (v: number) => {
        for (let i = 0; i < e.length - 1; i++) {
            if (v >= e[i] && v < e[i + 1]) return i;
        }
        return e.length - 2;
    };

    let processed = 0;
    for (const o of state) {
        if ((o?.LedgerEntryType ?? o?.type) !== "AccountRoot") continue;
        const drops = Number(o?.Balance);
        if (!Number.isFinite(drops) || drops < 0) continue;
        const xrp = drops / 1_000_000;
        const idx = findIdx(xrp);
        snap.buckets[idx].accounts += 1;
        snap.buckets[idx].sumXrp += xrp;
        processed++;
    }
    snap.scannedAccounts += processed;
    snap.updatedAt = Date.now();
    return {nextMarker, processed};
}

async function getOrPrepareSnapshot(): Promise<Snapshot> {
    let snap = await readSnapshot(BUCKET_EDGES);
    // Si le snapshot hebdo est expiré, on repart en rebuild (persistance conservée)
    if (isWeeklyExpired(snap)) {
        snap = await resetSnapshot(BUCKET_EDGES);
    }
    if (snap.buckets.length !== BUCKET_EDGES.length - 1) {
        snap.buckets = emptyBuckets(BUCKET_EDGES);
        await writeSnapshot(snap);
    }
    return snap;
}

export async function GET() {
    const snap = await getOrPrepareSnapshot();
    const payload = {
        updating: snap.mode === "rebuild" && (snap.marker !== null || snap.scannedAccounts === 0),
        marker: snap.marker,
        buckets: snap.buckets,
        scannedAccounts: snap.scannedAccounts,
        updatedAt: snap.updatedAt,
        window: {start: snap.windowStart, processed: snap.windowProcessed}
    };
    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: {"content-type": "application/json", "cache-control": "no-store"}
    });
}

export async function POST(req: NextRequest) {
    const snap = await getOrPrepareSnapshot();

    if (snap.mode !== "rebuild") {
        return new Response(
            JSON.stringify({
                updating: false,
                marker: snap.marker,
                buckets: snap.buckets,
                scannedAccounts: snap.scannedAccounts,
                updatedAt: snap.updatedAt
            }),
            {status: 200, headers: {"content-type": "application/json"}}
        );
    }

    const url = new URL(req.url);
    const maxParam = Number(url.searchParams.get("max")) || 20_000;
    const {allowed, retryAfter} = enforceRateWindow(snap, maxParam);

    if (allowed <= 0) {
        await writeSnapshot(snap);
        return new Response(
            JSON.stringify({
                error: "rate_limited",
                retryAfter,
                updating: true,
                marker: snap.marker,
                scannedAccounts: snap.scannedAccounts
            }),
            {
                status: 429,
                headers: {
                    "content-type": "application/json",
                    "retry-after": String(retryAfter)
                }
            }
        );
    }

    let toProcess = allowed;
    let nextMarker: string | null = snap.marker ?? null;

    if (snap.scannedAccounts === 0 && !nextMarker) {
        snap.buckets = emptyBuckets(snap.edges);
    }

    while (toProcess > 0) {
        const {nextMarker: nm, processed} = await applyOnePage(snap, nextMarker);
        snap.windowProcessed += processed;
        toProcess -= processed;
        nextMarker = nm;
        if (processed === 0 || !nextMarker) break;
    }

    snap.marker = nextMarker;
    if (!snap.marker) snap.mode = "idle";

    await writeSnapshot(snap);

    return new Response(
        JSON.stringify({
            updating: snap.mode === "rebuild",
            marker: snap.marker,
            buckets: snap.buckets,
            scannedAccounts: snap.scannedAccounts,
            updatedAt: snap.updatedAt,
            remainingInWindow: Math.max(0, 200_000 - snap.windowProcessed)
        }),
        {status: 200, headers: {"content-type": "application/json"}}
    );
}
