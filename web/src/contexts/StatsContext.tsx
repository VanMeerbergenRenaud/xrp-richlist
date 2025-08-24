"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    BalanceRangeData,
    getFallbackDistributionData,
    sanitizeAndValidateDistribution,
} from "@/lib/stats/fallback";

type PercentageData = {
    percentage: string;
    accounts: number;
    balance: string;
};

type Status = "idle" | "loading" | "loaded" | "error";

type StatsContextValue = {
    balanceRangeData: BalanceRangeData[];
    percentageData: PercentageData[];
    status: Status;
    error: string | null;
    lastUpdated: number | null;
    loadIfNeeded: () => Promise<void>;
    reload: () => Promise<void>;
};

const StatsContext = createContext<StatsContextValue | undefined>(undefined);

const PERCENTS = [0.01, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 10];
const SS_KEY_DIST = "stats:distribution";
const SS_KEY_UPDATED = "stats:lastUpdated";

const getApiUrl = (path: string) => {
    const base = "/api/backend";
    if (!path) return `${base}/`;
    if (path.startsWith("/")) return `${base}${path}`;
    return `${base}/${path}`;
};

function derivePercentiles(
    balanceRangeData: BalanceRangeData[],
): PercentageData[] {
    if (!Array.isArray(balanceRangeData) || balanceRangeData.length === 0)
        return [];
    const parsed = balanceRangeData
        .map((d) => {
            const [minStr, maxStr] = String(d.range || "")
                .replace(/,/g, "")
                .split(" - ");
            const min = Number(minStr);
            const max = maxStr === "Infinity" ? Infinity : Number(maxStr);
            return {
                accounts: Number(d.accounts) || 0,
                min: Number.isFinite(min) ? min : 0,
                max:
                    maxStr === "Infinity"
                        ? Infinity
                        : Number.isFinite(max)
                            ? max
                            : Infinity,
            };
        })
        .sort((a: { min: number }, b: { min: number }) => b.min - a.min);

    const total = parsed.reduce(
        (s: number, r: { accounts: number }) => s + (r.accounts || 0),
        0,
    );
    if (total <= 0) return [];

    return PERCENTS.map((p) => {
        const target = Math.max(1, Math.round((p / 100) * total));
        let cumulative = 0;
        let threshold = 0;

        for (const r of parsed) {
            const acc = r.accounts || 0;
            if (acc <= 0) continue;
            if (cumulative + acc < target) {
                cumulative += acc;
                continue;
            }
            const indexWithin = target - cumulative;
            const span = r.max === Infinity ? Infinity : Math.max(0, r.max - r.min);
            if (!Number.isFinite(span) || span === 0 || acc <= 0) {
                threshold = r.min;
            } else {
                const fracTop = indexWithin / acc;
                threshold = r.max - fracTop * span;
                threshold = Math.max(r.min, Math.min(r.max, threshold));
            }
            break;
        }

        const balanceStr = `${threshold.toLocaleString("fr-FR", {
            minimumFractionDigits: 6,
            maximumFractionDigits: 6,
        })} XRP`;

        return {
            percentage: `${p} %`,
            accounts: Math.round((p / 100) * total),
            balance: balanceStr,
        };
    });
}

async function fetchDistribution(): Promise<BalanceRangeData[]> {
    const response = await fetch(getApiUrl("/stats/balance-distribution"), {
        method: "GET",
        headers: {Accept: "application/json", "Content-Type": "application/json"},
        cache: "no-store",
    });

    if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
            return sanitizeAndValidateDistribution(data);
        }
    }
    return getFallbackDistributionData();
}

export function StatsProvider({children}: { children: React.ReactNode }) {
    const [balanceRangeData, setBalanceRangeData] = useState<BalanceRangeData[]>(
        [],
    );
    const [percentageData, setPercentageData] = useState<PercentageData[]>([]);
    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);
    const inFlight = useRef<Promise<void> | null>(null);

    // Initialisation depuis sessionStorage
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(SS_KEY_DIST);
            const ts = sessionStorage.getItem(SS_KEY_UPDATED);
            if (raw) {
                const dist: BalanceRangeData[] = JSON.parse(raw);
                if (Array.isArray(dist) && dist.length > 0) {
                    setBalanceRangeData(dist);
                    setPercentageData(derivePercentiles(dist));
                    setStatus("loaded");
                    setLastUpdated(ts ? Number(ts) : Date.now());
                }
            }
        } catch {
            // ignore
        }
    }, []);

    const saveToSession = (dist: BalanceRangeData[]) => {
        try {
            sessionStorage.setItem(SS_KEY_DIST, JSON.stringify(dist));
            const ts = Date.now();
            sessionStorage.setItem(SS_KEY_UPDATED, String(ts));
            setLastUpdated(ts);
        } catch {
            // ignore quota errors
        }
    };

    const runFetch = useCallback(async () => {
        setStatus("loading");
        setError(null);
        try {
            const dist = await fetchDistribution();
            setBalanceRangeData(dist);
            setPercentageData(derivePercentiles(dist));
            saveToSession(dist);
            setStatus("loaded");
        } catch (e: any) {
            setError(e?.message || "Erreur lors du chargement des statistiques");
            setBalanceRangeData(getFallbackDistributionData());
            setPercentageData(derivePercentiles(getFallbackDistributionData()));
            setStatus("error");
        }
    }, []);

    const loadIfNeeded = useCallback(async () => {
        if (balanceRangeData.length > 0 && status === "loaded") {
            return;
        }
        if (!inFlight.current) {
            inFlight.current = runFetch().finally(() => {
                inFlight.current = null;
            });
        }
        await inFlight.current;
    }, [balanceRangeData.length, status, runFetch]);

    const reload = useCallback(async () => {
        if (!inFlight.current) {
            inFlight.current = runFetch().finally(() => {
                inFlight.current = null;
            });
        }
        await inFlight.current;
    }, [runFetch]);

    return (
        <StatsContext.Provider
            value={{
                balanceRangeData,
                percentageData,
                status,
                error,
                lastUpdated,
                loadIfNeeded,
                reload,
            }}
        >
            {children}
        </StatsContext.Provider>
    );
}

export function useStats(): StatsContextValue {
    const ctx = useContext(StatsContext);
    if (!ctx) {
        throw new Error(
            "useStats doit être utilisé à l'intérieur de <StatsProvider>",
        );
    }
    return ctx;
}
