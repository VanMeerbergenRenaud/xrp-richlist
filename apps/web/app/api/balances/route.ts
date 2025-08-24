export async function GET(req: Request) {
  const url = new URL(req.url);
  const marker = url.searchParams.get("marker");

  const upstream = marker
    ? `https://api.xrpscan.com/api/v1/balances?marker=${encodeURIComponent(
        marker
      )}`
    : "https://api.xrpscan.com/api/v1/balances";

  const res = await fetch(upstream, {
    headers: { accept: "application/json" },
    // Petit cache côté serveur pour soulager la source
    next: { revalidate: 600 }
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
      "cache-control": "public, s-maxage=600, stale-while-revalidate=60"
    }
  });
}
