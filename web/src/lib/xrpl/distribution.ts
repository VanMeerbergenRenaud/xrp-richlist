// Outils serveur pour calculer une distribution de soldes XRP depuis XRPL (ledger_data)
// ATTENTION: ceci échantillonne un nombre limité de pages pour rester performant (approximation).
// Vous pouvez augmenter MAX_PAGES/limit selon vos besoins et capacité serveur.

type LedgerDataRequest = {
    method: string;
    params: Array<Record<string, any>>;
};

type LedgerDataResponse = {
    result?: {
        state?: Array<any>;
        marker?: string;
        ledger_index?: number;
        ledger_hash?: string;
    };
    error?: any;
};

export type DistributionRow = {
    accounts: number;
    range: string;
    sum: string; // somme en XRP sous forme de chaîne (6 décimales)
};

export type Bucket = { min: number; max: number }; // max = Infinity pour ouverte
const BUCKETS: Bucket[] = [
    {min: 1_000_000_000, max: Infinity},
    {min: 500_000_000, max: 1_000_000_000},
    {min: 100_000_000, max: 500_000_000},
    {min: 20_000_000, max: 100_000_000},
    {min: 10_000_000, max: 20_000_000},
    {min: 5_000_000, max: 10_000_000},
    {min: 1_000_000, max: 5_000_000},
    {min: 500_000, max: 1_000_000},
    {min: 100_000, max: 500_000},
    {min: 75_000, max: 100_000},
    {min: 50_000, max: 75_000},
    {min: 25_000, max: 50_000},
    {min: 10_000, max: 25_000},
    {min: 5_000, max: 10_000},
    {min: 1_000, max: 5_000},
    {min: 500, max: 1_000},
    {min: 20, max: 500},
    {min: 0, max: 20},
];

function formatRange(min: number, max: number) {
    const fmt = (n: number) => n.toLocaleString("en-US");
    return `${fmt(min)} - ${max === Infinity ? "Infinity" : fmt(max)}`;
}

function dropsToXrp(drops: string | number): number {
    const n = typeof drops === "string" ? Number(drops) : drops;
    if (!Number.isFinite(n)) return 0;
    return n / 1_000_000;
}

function toFixed6(n: number): string {
    return n.toFixed(6);
}

function pickBucketIndex(balanceXrp: number): number {
    for (let i = 0; i < BUCKETS.length; i++) {
        const b = BUCKETS[i];
        const within =
            balanceXrp >= b.min &&
            balanceXrp < (b.max === Infinity ? Number.POSITIVE_INFINITY : b.max);
        if (within) return i;
    }
    return BUCKETS.length - 1; // fallback dans le plus petit
}

function buildEmptyCounters() {
    return BUCKETS.map(() => ({accounts: 0, sum: 0}));
}

export type DistributionComputation = {
    rows: DistributionRow[];
    totals: { accounts: number; sumXrp: number };
    buckets: typeof BUCKETS;
};

// Cache mémoire simple (module-level)
let CACHE_DIST: { data: DistributionComputation; ts: number } | null = null;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchDistributionFromLedger(options?: {
    rpcUrl?: string;
    maxPages?: number;
    limitPerPage?: number;
    timeoutMs?: number;
}): Promise<DistributionComputation> {
    const rpcUrl =
        options?.rpcUrl ||
        process.env.XRPL_RPC_URL ||
        "https://s2.ripple.com:51234/";
    const MAX_PAGES = options?.maxPages ?? 20; // ~20*2000 ≈ 40k comptes (échantillon)
    const LIMIT = options?.limitPerPage ?? 2000;
    const timeoutMs = options?.timeoutMs ?? 25_000;

    // Cache
    const now = Date.now();
    if (CACHE_DIST && now - CACHE_DIST.ts < TTL_MS) {
        return CACHE_DIST.data;
    }

    let marker: string | undefined = undefined;
    let page = 0;
    const counters = buildEmptyCounters();
    let totalAccounts = 0;
    let totalXrp = 0;

    // Boucle de pagination ledger_data
    while (page < MAX_PAGES) {
        page++;
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), timeoutMs);

        const body: LedgerDataRequest = {
            method: "ledger_data",
            params: [
                {
                    ledger_index: "validated",
                    binary: false,
                    limit: LIMIT,
                    ...(marker ? {marker} : {}),
                },
            ],
        };

        try {
            const res = await fetch(rpcUrl, {
                method: "POST",
                headers: {
                    accept: "application/json",
                    "content-type": "application/json",
                },
                body: JSON.stringify(body),
                signal: controller.signal,
                cache: "no-store",
            });
            const json = (await res.json()) as LedgerDataResponse;
            const state = json?.result?.state || [];
            marker = json?.result?.marker;

            for (const entry of state) {
                if (entry?.LedgerEntryType !== "AccountRoot") continue;
                const balDrops = entry?.Balance;
                if (balDrops == null) continue;
                const balXrp = dropsToXrp(String(balDrops));
                if (!Number.isFinite(balXrp) || balXrp < 0) continue;

                const idx = pickBucketIndex(balXrp);
                counters[idx].accounts += 1;
                counters[idx].sum += balXrp;

                totalAccounts += 1;
                totalXrp += balXrp;
            }

            if (!marker) break; // fin
        } catch {
            // En cas d'erreur réseau/timeout, on renvoie ce qui est calculé jusque-là
            break;
        } finally {
            clearTimeout(to);
        }
    }

    // Construire les lignes dans l’ordre des BUCKETS (déjà du plus grand au plus petit)
    const rows: DistributionRow[] = counters.map((c, i) => ({
        accounts: c.accounts,
        range: formatRange(BUCKETS[i].min, BUCKETS[i].max),
        sum: toFixed6(c.sum),
    }));

    const result: DistributionComputation = {
        rows,
        totals: {accounts: totalAccounts, sumXrp: totalXrp},
        buckets: BUCKETS,
    };

    CACHE_DIST = {data: result, ts: Date.now()};
    return result;
}

// Utilitaire: dérive une valeur de seuil (balance) pour un top P% depuis la distribution (approx. uniforme dans la tranche)
export function estimateBalanceForTopPercent(
    dist: DistributionComputation,
    percent: number,
): number | null {
    const total = dist.totals.accounts;
    if (!total || total <= 0) return null;
    const targetAbove = Math.max(1, Math.round((percent / 100) * total));

    // Parcours des buckets du plus grand au plus petit
    let above = 0;
    for (let i = 0; i < dist.rows.length; i++) {
        const r = dist.rows[i];
        const b = dist.buckets[i];
        if (r.accounts <= 0) continue;

        if (above + r.accounts < targetAbove) {
            above += r.accounts;
            continue;
        }

        // Le seuil est dans cette tranche
        const withinBucketAbove = targetAbove - above; // nb de comptes au-dessus dans cette tranche
        const fracAbove = withinBucketAbove / r.accounts; // fraction [0..1]
        const span =
            b.max === Infinity ? Math.max(1, b.min) : Math.max(1, b.max - b.min);
        // Approximation uniforme: plus il y a d’"au-dessus", plus on se rapproche de max
        const threshold =
            b.max === Infinity
                ? b.min // pas de borne sup: à défaut on renvoie le min de la tranche
                : b.min + (1 - Math.min(1, Math.max(0, fracAbove))) * span;

        return threshold;
    }

    return null;
}
