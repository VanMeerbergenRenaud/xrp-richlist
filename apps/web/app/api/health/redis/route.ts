import { pingRedis } from "../../../../lib/kv";

export async function GET() {
  const ok = await pingRedis();
  return new Response(
    JSON.stringify({
      redis: ok ? "up" : "down"
    }),
    {
      status: ok ? 200 : 503,
      headers: { "content-type": "application/json", "cache-control": "no-store" }
    }
  );
}
