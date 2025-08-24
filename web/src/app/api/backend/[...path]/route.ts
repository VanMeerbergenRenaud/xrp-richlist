import {NextRequest, NextResponse} from "next/server";

export const dynamic = "force-dynamic";

// Envs
const XRPSCAN_BASE =
    process.env.XRPSCAN_BASE_URL || "https://api.xrpscan.com/api/v1";
const XRPL_RPC_URL = process.env.XRPL_RPC_URL || "https://s2.ripple.com:51234/";

// Util: reconstruit l’URL cible en conservant la query string
function buildTargetUrl(base: string, path: string[], reqUrl: string) {
    const url = new URL(reqUrl);
    const qs = url.search ? url.search : "";
    const tail = path.join("/");
    return `${base.replace(/\/+$/, "")}/${tail}${qs}`;
}

async function proxyFetch(req: NextRequest, targetUrl: string) {
    const headers = new Headers(req.headers);
    headers.delete("host");

    let body: BodyInit | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
        const text = await req.text();
        body = text;
    }

    const res = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
        cache: "no-store",
        redirect: "follow",
    });

    const outHeaders = new Headers(res.headers);
    outHeaders.set(
        "content-type",
        outHeaders.get("content-type") || "application/json",
    );

    const data = await res.arrayBuffer();
    return new NextResponse(data, {
        status: res.status,
        statusText: res.statusText,
        headers: outHeaders,
    });
}

export async function GET(
    req: NextRequest,
    {params}: { params: { path: string[] } },
) {
    const path = params?.path || [];
    // Tous les GET (sauf routes spécifiques définies ailleurs) proxy XRPSCAN
    const targetUrl = buildTargetUrl(XRPSCAN_BASE, path, req.url);
    return proxyFetch(req, targetUrl);
}

export async function POST(
    req: NextRequest,
    {params}: { params: { path: string[] } },
) {
    const path = params?.path || [];

    // Cas spécial JSON-RPC XRPL: /api/backend/xrplrpc
    if (path.length === 1 && path[0].toLowerCase() === "xrplrpc") {
        const headers = new Headers(req.headers);
        headers.set("content-type", "application/json");
        headers.set("accept", "application/json");

        const body = await req.text();
        const res = await fetch(XRPL_RPC_URL, {
            method: "POST",
            headers,
            body,
            cache: "no-store",
        });

        const data = await res.arrayBuffer();
        const outHeaders = new Headers(res.headers);
        outHeaders.set("content-type", "application/json");
        return new NextResponse(data, {
            status: res.status,
            statusText: res.statusText,
            headers: outHeaders,
        });
    }

    // Sinon: proxy vers XRPSCAN
    const targetUrl = buildTargetUrl(XRPSCAN_BASE, path, req.url);
    return proxyFetch(req, targetUrl);
}
