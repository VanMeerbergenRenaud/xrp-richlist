import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  console.log(`📡 API Stats appelée avec type: ${type}`);

  try {
    const apiUrl = process.env.API_URL || 'http://api:8000';
    let endpoint = '';

    switch (type) {
      case 'balance-distribution':
        endpoint = '/stats/balance-distribution';
        break;
      case 'percentages':
        endpoint = '/stats/percentages';
        break;
      default:
        console.error(`❌ Type non supporté: ${type}`);
        return Response.json({ error: 'Type de statistique non supporté' }, { status: 400 });
    }

    console.log(`🔄 Appel vers ${apiUrl}${endpoint}`);
    const response = await fetch(`${apiUrl}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Timeout de 30 secondes
      signal: AbortSignal.timeout(30000)
    });

    console.log(`📡 Réponse API: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur API (${response.status}):`, errorText);
      return Response.json({ error: `Erreur API: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    console.log(`📊 Données reçues:`, { type: typeof data, isArray: Array.isArray(data), length: data?.length });

    // Vérification de sécurité : s'assurer qu'on retourne toujours un tableau
    if (!Array.isArray(data)) {
      console.error('❌ Données reçues ne sont pas un tableau:', data);
      return Response.json([], { status: 200 }); // Retourner un tableau vide
    }

    console.log(`✅ Retour de ${data.length} éléments`);
    return Response.json(data);

  } catch (error: any) {
    console.error('💥 Erreur lors du fetch API:', error);

    // Retourner un tableau vide en cas d'erreur pour éviter les erreurs côté client
    if (error.name === 'TimeoutError') {
      return Response.json([], { status: 200 });
    }

    return Response.json([], { status: 200 });
  }
}
