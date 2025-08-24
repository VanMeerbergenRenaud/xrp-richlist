export interface DistributionBucket {
  range: string;
  accounts: number;
  percent: number;
}

export interface MetricsResponse {
  ledger_index: number | null;
  updated_at: string; // ISO datetime
  total_xrp_drops: string | null;
  non_escrow_xrp_drops: string | null;
  wallets_count: number | null;
  price_usd: number | null;
  distribution?: DistributionBucket[];
}
