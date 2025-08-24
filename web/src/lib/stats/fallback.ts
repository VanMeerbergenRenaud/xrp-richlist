export interface BalanceRangeData {
    accounts: number;
    range: string;
    sum: string;
}

export const getFallbackDistributionData = (): BalanceRangeData[] => {
    return [
        { accounts: 5, range: "1,000,000,000 - Infinity", sum: "7332077895.000000" },
        { accounts: 22, range: "500,000,000 - 1,000,000,000", sum: "12217573182.053612" },
        { accounts: 55, range: "100,000,000 - 500,000,000", sum: "11063318327.565231" },
        { accounts: 159, range: "20,000,000 - 100,000,000", sum: "6315556824.359995" },
        { accounts: 277, range: "10,000,000 - 20,000,000", sum: "3763019317.162423" },
        { accounts: 280, range: "5,000,000 - 10,000,000", sum: "2014431448.392299" },
        { accounts: 1884, range: "1,000,000 - 5,000,000", sum: "4750410258.638114" },
        { accounts: 2251, range: "500,000 - 1,000,000", sum: "1524606874.760418" },
        { accounts: 28385, range: "100,000 - 500,000", sum: "5069935603.548301" },
        { accounts: 11131, range: "75,000 - 100,000", sum: "956367587.004178" },
        { accounts: 27689, range: "50,000 - 75,000", sum: "1625522602.935001" },
        { accounts: 67184, range: "25,000 - 50,000", sum: "2315414817.451868" },
        { accounts: 172850, range: "10,000 - 25,000", sum: "2601830599.624250" },
        { accounts: 166849, range: "5,000 - 10,000", sum: "1148408758.153285" },
        { accounts: 564436, range: "1,000 - 5,000", sum: "1272716873.353460" },
        { accounts: 242586, range: "500 - 1,000", sum: "172298730.903990" },
        { accounts: 2533064, range: "20 - 500", sum: "210506254.048082" },
        { accounts: 3062704, range: "0 - 20", sum: "23292632.626958" },
    ];
};

export const getFallbackPercentageData = (): { percentage: string; accounts: number; balance: string }[] => {
    return [
        { percentage: "0.01 %", accounts: 688, balance: "6,600,110.692128 XRP" },
        { percentage: "0.1 %", accounts: 6882, balance: "351,477.908767 XRP" },
        { percentage: "0.2 %", accounts: 13764, balance: "198,788.300005 XRP" },
        { percentage: "0.5 %", accounts: 34409, balance: "97,022.637257 XRP" },
        { percentage: "1 %", accounts: 68818, balance: "50,037.679003 XRP" },
        { percentage: "2 %", accounts: 137636, balance: "25,011.888165 XRP" },
        { percentage: "3 %", accounts: 206454, balance: "15,725.690004 XRP" },
        { percentage: "4 %", accounts: 275272, balance: "10,728.892158 XRP" },
        { percentage: "5 %", accounts: 344091, balance: "8,415.695574 XRP" },
        { percentage: "10 %", accounts: 688181, balance: "2,405.981143 XRP" },
    ];
};

export const parseRangeBounds = (range: string): { min: number; max: number } => {
    const [minStr, maxStr] = (range || "").replace(/,/g, "").split(" - ");
    const min = Number(minStr);
    const max = maxStr === "Infinity" ? Infinity : Number(maxStr);
    return {
        min: Number.isFinite(min) ? min : 0,
        max: maxStr === "Infinity" ? Infinity : Number.isFinite(max) ? max : Infinity,
    };
};

export const isDistributionValid = (arr: any[]): boolean => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    const totalAcc = arr.reduce((s: number, d: any) => s + (Number(d?.accounts) || 0), 0);
    if (totalAcc <= 0) return false;

    const parsed = arr
        .map((d) => ({ ...d, ...parseRangeBounds(String(d?.range || "")) }))
        .sort((a: any, b: any) => b.min - a.min);

    const top = parsed.slice(0, 4);
    const topAllZero = top.every(
        (d: any) => (Number(d?.accounts) || 0) === 0 && ((parseFloat(d?.sum || "0") || 0) === 0),
    );
    const lowerHasData = parsed.slice(4).some((d: any) => (Number(d?.accounts) || 0) > 0 || (parseFloat(d?.sum || "0") || 0) > 0);

    if (topAllZero && lowerHasData) return false;
    return true;
};

export const sanitizeAndValidateDistribution = (arr: any[]): BalanceRangeData[] => {
    try {
        if (!isDistributionValid(arr)) {
            return getFallbackDistributionData();
        }
        return arr.map((d: any) => ({
            accounts: Number(d?.accounts) || 0,
            range: String(d?.range || ""),
            sum: typeof d?.sum === "number" ? d.sum.toFixed(6) : String(d?.sum || "0"),
        }));
    } catch {
        return getFallbackDistributionData();
    }
};

export const estimateRankFromFallback = (balance: number) => {
    const dist = getFallbackDistributionData();
    const parsed = dist.map((d) => {
        const [minStr, maxStr] = d.range.replace(/,/g, "").split(" - ");
        const min = parseFloat(minStr);
        const max = maxStr === "Infinity" ? Infinity : parseFloat(maxStr);
        return { ...d, min, max };
    });
    const total = parsed.reduce((sum: number, d: any) => sum + (d.accounts || 0), 0);
    parsed.sort((a: any, b: any) => b.min - a.min);
    let higher = 0;
    for (const r of parsed) {
        if (balance < r.min) {
            higher += r.accounts || 0;
            continue;
        }
        if (balance >= r.max) {
            continue;
        }
        const span = (r.max === Infinity ? Math.max(r.min, 1) : r.max - r.min) || 1;
        const position = Math.max(0, Math.min(1, (balance - r.min) / span));
        const estimatedAboveInRange = Math.round((1 - position) * (r.accounts || 0));
        higher += estimatedAboveInRange;
        break;
    }
    return { rank: higher + 1, total_accounts: total };
};
