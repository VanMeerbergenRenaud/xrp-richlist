import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const n = searchParams.get('n') || '10';

  try {
    // Dans Docker Compose, utilisez le nom du service (api) au lieu de localhost
    const apiUrl = process.env.API_URL || 'http://api:8000';
    const response = await fetch(`${apiUrl}/top?n=${n}`);

    if (!response.ok) {
      return Response.json({ error: 'Erreur API' }, { status: response.status });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Erreur lors du fetch API:', error);
    return Response.json({ error: 'Erreur réseau' }, { status: 500 });
  }
}
