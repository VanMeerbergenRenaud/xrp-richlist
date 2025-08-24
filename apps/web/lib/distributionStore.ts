import fs from "fs/promises";
import path from "path";
import {getJSON, setJSON} from "./kv";

export type RangeBucket = {
    min: number;
    max: number;
    accounts: number;
    sumXrp: number;
};

export type Snapshot = {
    version: number;
    edges: number[];
    edgesHash: string;
    buckets: RangeBucket[];
    // progression de reconstruction hebdomadaire
    mode: "idle" | "rebuild";
    marker: string | null;
    scannedAccounts: number;
    updatedAt: number; // ms epoch
    // rate limit fenêtre glissante 5 min
    windowStart: number; // ms epoch
    windowProcessed: number; // # comptes traités dans la fenêtre
};

const DATA_DIR =
    process.env.DATA_DIR?.trim() || "./.data/xrp-richlist-dist-cache";
const SNAPSHOT_FILE = path.join(DATA_DIR, "distribution.json");
const REDIS_KEY = "dist:snapshot:v1";

export async function ensureDir() {
    await fs.mkdir(DATA_DIR, {recursive: true});
}

function hashEdges(edges: number[]) {
    return edges.join(",");
}

export function emptyBuckets(edges: number[]): RangeBucket[] {
    const out: RangeBucket[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
        out.push({min: edges[i], max: edges[i + 1], accounts: 0, sumXrp: 0});
    }
    return out;
}

async function readFileSnapshot(): Promise<Snapshot | null> {
    try {
        const txt = await fs.readFile(SNAPSHOT_FILE, "utf8");
        return JSON.parse(txt) as Snapshot;
    } catch {
        return null;
    }
}

async function writeFileSnapshot(snap: Snapshot) {
    await ensureDir();
    const tmp = SNAPSHOT_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(snap));
    await fs.rename(tmp, SNAPSHOT_FILE);
}

export async function readSnapshot(edges: number[]): Promise<Snapshot> {
    // 1) Essayer Redis
    const fromRedis = await getJSON<Snapshot>(REDIS_KEY);
    if (fromRedis && fromRedis.edgesHash === hashEdges(edges)) {
        return fromRedis;
    }
    // 2) Sinon fichier local
    const fromFile = await readFileSnapshot();
    if (fromFile && fromFile.edgesHash === hashEdges(edges)) {
        // remettre en Redis pour accélérer les prochains reads
        await setJSON(REDIS_KEY, fromFile);
        return fromFile;
    }
    // 3) Sinon reset
    return await resetSnapshot(edges);
}

export async function writeSnapshot(snap: Snapshot) {
    // Ecrit en Redis et en fichier (double écriture pour robustesse)
    await setJSON(REDIS_KEY, snap);
    await writeFileSnapshot(snap);
}

export async function resetSnapshot(edges: number[]): Promise<Snapshot> {
    const now = Date.now();
    const snap: Snapshot = {
        version: 1,
        edges,
        edgesHash: hashEdges(edges),
        buckets: emptyBuckets(edges),
        mode: "rebuild",
        marker: null,
        scannedAccounts: 0,
        updatedAt: now,
        windowStart: now,
        windowProcessed: 0
    };
    await writeSnapshot(snap);
    return snap;
}

export function isWeeklyExpired(snap: Snapshot): boolean {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - snap.updatedAt > WEEK_MS;
}

export function enforceRateWindow(
    snap: Snapshot,
    maxAccounts: number
): { allowed: number; retryAfter: number } {
    const WINDOW_MS = 5 * 60 * 1000;
    const LIMIT = 200_000;

    const now = Date.now();
    if (now - snap.windowStart >= WINDOW_MS) {
        snap.windowStart = now;
        snap.windowProcessed = 0;
    }
    const remaining = Math.max(0, LIMIT - snap.windowProcessed);
    const allowed = Math.max(0, Math.min(remaining, maxAccounts));
    const retryAfter =
        allowed > 0 ? 0 : Math.ceil((snap.windowStart + WINDOW_MS - now) / 1000);
    return {allowed, retryAfter};
}
