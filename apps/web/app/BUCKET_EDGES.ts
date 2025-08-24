// Bornes de tranches (en XRP), en ordre croissant.
// Doit rester strictement identique côté API et UI.
export const BUCKET_EDGES: number[] = [
  0,
  20,
  500,
  1_000,
  5_000,
  10_000,
  25_000,
  50_000,
  75_000,
  100_000,
  500_000,
  1_000_000,
  5_000_000,
  10_000_000,
  20_000_000,
  100_000_000,
  500_000_000,
  1_000_000_000,
  Number.POSITIVE_INFINITY
];
