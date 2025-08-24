// Route serveur: agrège une page ledger_data en "deltas" par tranche
// GET /api/distribution?marker=... -> { marker, deltas: [{ i, a, s }] }
// i = index de tranche (basé sur BUCKET_EDGES), a = comptes ajoutés, s = somme XRP ajoutée

function edges(): number[] {
  // Doit rester strictement identique à BUCKET_EDGES côté UI
  return [
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
}

function findBucketIndex(v: number, e: number[]): number {
  for (let i = 0; i < e.length - 1; i++) {
    if (v >= e[i] && v < e[i + 1]) return i;
  }
  return e.length - 2; // dernier (Infini)
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const marker = url.searchParams.get("marker");

  const body = {
    method: "ledger_data",
    params: [
      {
        ledger_index: "validated",
        type: "account",
        binary: false,
        limit: 2000,
        ...(marker ? { marker } : {})
      }
    ]
  };

  const upstream = await fetch("https://xrplcluster.com", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    // Pas de cache pour les pages suivantes; chaque page dépend du marker
    cache: "no-store"
  });

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ marker: marker ?? null, deltas: [] }),
      { status: upstream.status, headers: { "content-type": "application/json" } }
    );
  }

  const data: any = await upstream.json();
  const state: any[] = data?.result?.state ?? [];
  const nextMarker: string | null =
    (typeof data?.result?.marker === "string" && data.result.marker) || null;

  const e = edges();
  // map index -> {a,s}
  const acc = new Map<number, { a: number; s: number }>();

  for (const o of state) {
    if ((o?.LedgerEntryType ?? o?.type) !== "AccountRoot") continue;
    const drops = Number(o?.Balance);
    if (!Number.isFinite(drops) || drops < 0) continue;
    const xrp = drops / 1_000_000;
    const idx = findBucketIndex(xrp, e);
    const cur = acc.get(idx) ?? { a: 0, s: 0 };
    cur.a += 1;
    cur.s += xrp;
    acc.set(idx, cur);
  }

  const deltas = Array.from(acc.entries()).map(([i, v]) => ({
    i,
    a: v.a,
    s: v.s
  }));

  return new Response(JSON.stringify({ marker: nextMarker, deltas }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      // légère directive pour CDN
      "cache-control": "no-store"
    }
  });
}
