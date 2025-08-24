import { NextRequest, NextResponse } from 'next/server';
import { fetchDistributionFromLedger } from '@/lib/xrpl/distribution';

export const dynamic = 'force-dynamic';

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL || '';

export async function GET(req: NextRequest) {
  // Si vous avez un backend custom qui expose déjà /stats/balance-distribution, on le proxy
  if (BACKEND_BASE_URL) {
    const url = new URL(req.url);
    const qs = url.search;
    const target = `${BACKEND_BASE_URL.replace(/\/+$/, '')}/stats/balance-distribution${qs}`;
    try {
      const resp = await fetch(target, { method: 'GET', headers: { accept: 'application/json' }, cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        return NextResponse.json(data, { status: 200 });
      }
      // sinon on continue pour calcul local
    } catch {
      // on tombe en calcul local
    }
  }

  // Calcul local via XRPL JSON-RPC ledger_data (échantillonnage)
  try {
    const dist = await fetchDistributionFromLedger();
    return NextResponse.json(dist.rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
