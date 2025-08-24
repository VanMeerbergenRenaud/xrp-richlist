import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { z } from "zod";
import { Client as XrplClient } from "xrpl";
import { Cache } from "./cache.js";
import { MetricsResponse, DistributionBucket } from "@xrp/types";
import fetch from "node-fetch";

const PORT = Number(process.env.PORT || 4000);
const XRPL_ENDPOINTS = (process.env.XRPL_ENDPOINTS || "wss://xrplcluster.com").split(",");
const REDIS_URL = process.env.REDIS_URL;

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(swagger, {
  openapi: {
    info: { title: "XRP Explorer API", version: "0.1.0" }
  }
});
await app.register(swaggerUi, { routePrefix: "/docs" });

const cache = new Cache(REDIS_URL);

app.get("/health", async () => ({ status: "ok" }));

const MetricsQuerySchema = z.object({
  ttl: z.coerce.number().min(10).max(300).default(30),
});

app.get("/api/metrics", async (req, reply) => {
  const parsed = MetricsQuerySchema.safeParse((req as any).query);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.flatten() });
  }
  const ttl = parsed.data.ttl;
  const cacheKey = `metrics:v1`;

  const cached = await cache.get<MetricsResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  let ledger_index: number | null = null;
  let total_xrp_drops: string | null = null;
  let non_escrow_xrp_drops: string | null = null;
  let wallets_count: number | null = null;
  let distribution: DistributionBucket[] | undefined = undefined;
  let price_usd: number | null = null;

  // XRPL: récupérer le ledger validé (ledger_index + total_coins)
  for (const endpoint of XRPL_ENDPOINTS) {
    try {
      const client = new XrplClient(endpoint);
      await client.connect();
      const res = await client.request({ command: "ledger", ledger_index: "validated" });
      // @ts-expect-error types loosely checked
      const ledgerObj = res.result.ledger ?? res.result;
      // @ts-expect-error types loosely checked
      ledger_index = typeof res.result.ledger_index === "number" ? res.result.ledger_index : ledgerObj.ledger_index;
      // total_coins is a string in drops
      if (ledgerObj?.total_coins) {
        total_xrp_drops = String(ledgerObj.total_coins);
      }
      await client.disconnect();
      if (ledger_index != null && total_xrp_drops != null) break;
    } catch (e) {
      app.log.warn({ err: e }, `XRPL endpoint failed: ${endpoint}`);
    }
  }

  // Prix via CoinGecko (public endpoint)
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd", {
      headers: { "accept": "application/json" }
    });
    if (r.ok) {
      const data = (await r.json()) as any;
      price_usd = data?.ripple?.usd ?? null;
    }
  } catch (e) {
    app.log.warn({ err: e }, "CoinGecko fetch failed");
  }

  // Distribution et liquidité via source publique (xrp_distribution)
  // Conversion utilitaire: XRP (string/number, décimal) -> drops (string)
  const xrpToDrops = (val: string | number): string => {
    const s = String(val);
    if (!s.includes(".")) return (BigInt(s) * 1000000n).toString();
    const [i, f] = s.split(".");
    const frac = (f + "000000").slice(0, 6);
    return (BigInt(i || "0") * 1000000n + BigInt(frac || "0")).toString();
  };

  // Secure parse BigInt subtraction in drops
  const subDrops = (a: string, b: string): string => (BigInt(a) - BigInt(b)).toString();

  try {
    // data.ripple.com Data API v2 (souvent encore active) - structure tolérante
    const r = await fetch("https://data.ripple.com/v2/network/xrp_distribution", {
      headers: { accept: "application/json" },
    });
    if (r.ok) {
      const data = (await r.json()) as any;

      // Essayer plusieurs noms de champs possibles
      const totalXrp = data?.total ?? data?.totalXRP ?? data?.supply ?? null;
      const liquidXrp = data?.liquid ?? data?.liquidXRP ?? data?.liquidity ?? null;
      const escrowXrp = data?.escrow ?? data?.in_escrow ?? data?.escrowed ?? null;

      // Calcul non_escrow (liquidité)
      if (liquidXrp != null) {
        non_escrow_xrp_drops = xrpToDrops(liquidXrp);
      } else if (totalXrp != null && escrowXrp != null) {
        // fallback: total - escrow
        non_escrow_xrp_drops = subDrops(xrpToDrops(totalXrp), xrpToDrops(escrowXrp));
      }

      // Buckets de distribution
      const buckets = (data?.buckets ?? data?.distribution ?? data?.components ?? null) as any[] | null;
      if (Array.isArray(buckets) && buckets.length) {
        distribution = buckets
          .map((b) => {
            // Supporte divers schémas: min/max (XRP), or range string, accounts/percent
            const min = b.min ?? b.minimum ?? b.lower ?? null;
            const max = b.max ?? b.maximum ?? b.upper ?? null;
            const range =
              typeof b.range === "string"
                ? b.range
                : min != null && max != null
                ? `${min}-${max} XRP`
                : min != null
                ? `≥ ${min} XRP`
                : max != null
                ? `≤ ${max} XRP`
                : "N/A";
            const accounts = Number(b.accounts ?? b.count ?? 0);
            const percent = Number(b.percent ?? b.percentage ?? 0);
            return { range, accounts, percent } as DistributionBucket;
          })
          .filter((x) => Number.isFinite(x.accounts));
        wallets_count = distribution.reduce((acc, x) => acc + (x.accounts || 0), 0);
      }
    } else {
      app.log.warn({ status: r.status }, "xrp_distribution fetch not ok");
    }
  } catch (e) {
    app.log.warn({ err: e }, "xrp_distribution fetch failed");
  }

  const payload: MetricsResponse = {
    ledger_index,
    updated_at: new Date().toISOString(),
    total_xrp_drops: total_xrp_drops,
    non_escrow_xrp_drops: non_escrow_xrp_drops,
    wallets_count,
    price_usd,
    distribution
  };

  await cache.set(cacheKey, payload, ttl);
  return payload;
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  app.log.info(`API listening on http://localhost:${PORT}`);
  app.log.info(`Swagger UI on http://localhost:${PORT}/docs`);
}).catch((err) => {
  app.log.error(err, "Failed to start server");
  process.exit(1);
});
