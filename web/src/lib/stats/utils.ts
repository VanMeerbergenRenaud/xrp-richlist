export interface BalanceRangeData {
    accounts: number;
    range: string;
    sum: string;
}

export const parseRangeBounds = (
    range: string,
): { min: number; max: number } => {
    const [minStr, maxStr] = (range || "").replace(/,/g, "").split(" - ");
    const min = Number(minStr);
    const max = maxStr === "Infinity" ? Infinity : Number(maxStr);
    return {
        min: Number.isFinite(min) ? min : 0,
        max:
            maxStr === "Infinity" ? Infinity : Number.isFinite(max) ? max : Infinity,
    };
};

export const isDistributionValid = (arr: any[]): boolean => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const totalAcc = arr.reduce(
        (s: number, d: any) => s + (Number(d?.accounts) || 0),
        0,
    );
    if (totalAcc <= 0) return false;

    const parsed = arr
        .map((d) => ({ ...d, ...parseRangeBounds(String(d?.range || "")) }))
        .sort((a: any, b: any) => b.min - a.min);

    const top = parsed.slice(0, 4);
    const topAllZero = top.every(
        (d: any) =>
            (Number(d?.accounts) || 0) === 0 &&
            (parseFloat(d?.sum || "0") || 0) === 0,
    );
    const lowerHasData = parsed
        .slice(4)
        .some(
            (d: any) =>
                (Number(d?.accounts) || 0) > 0 || (parseFloat(d?.sum || "0") || 0) > 0,
        );

    if (topAllZero && lowerHasData) return false;
    return true;
};

export const sanitizeAndValidateDistribution = (
    arr: any[],
): BalanceRangeData[] => {
    try {
        if (!isDistributionValid(arr)) {
            return [];
        }
        return arr.map((d: any) => ({
            accounts: Number(d?.accounts) || 0,
            range: String(d?.range || ""),
            sum:
                typeof d?.sum === "number" ? d.sum.toFixed(6) : String(d?.sum || "0"),
        }));
    } catch {
        return [];
    }
};

export const estimateRankFromDistribution = (
    balance: number,
    dist: BalanceRangeData[],
): { rank: number; total_accounts: number } => {
    if (!Array.isArray(dist) || dist.length === 0) {
        return { rank: 0, total_accounts: 0 };
    }
    const parsed = dist.map((d) => {
        const [minStr, maxStr] = String(d.range || "")
            .replace(/,/g, "")
            .split(" - ");
        const min = parseFloat(minStr);
        const max = maxStr === "Infinity" ? Infinity : parseFloat(maxStr);
        return { ...d, min, max };
    });
    const total = parsed.reduce(
        (sum: number, d: any) => sum + (Number(d?.accounts) || 0),
        0,
    );
    if (total <= 0) return { rank: 0, total_accounts: 0 };

    parsed.sort((a: any, b: any) => b.min - a.min);
    let higher = 0;
    for (const r of parsed) {
        const acc = Number(r?.accounts) || 0;
        if (balance < r.min) {
            higher += acc;
            continue;
        }
        if (balance >= r.max) {
            continue;
        }
        const span = (r.max === Infinity ? Math.max(r.min, 1) : r.max - r.min) || 1;
        const position = Math.max(0, Math.min(1, (balance - r.min) / span));
        const estimatedAboveInRange = Math.round((1 - position) * acc);
        higher += estimatedAboveInRange;
        break;
    }
    return { rank: higher + 1, total_accounts: total };
};
