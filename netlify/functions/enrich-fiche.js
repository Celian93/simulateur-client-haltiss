// Génère un court paragraphe de contexte unique pour une fiche client, via
// l'API OpenAI. Ne touche jamais aux chiffres (déjà calculés côté client) et
// n'invente jamais de nom d'entreprise ou de personne — le prompt l'interdit
// explicitement et impose de réutiliser tel quel le libellé client fourni.
// Nécessite la variable d'environnement OPENAI_API_KEY.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!process.env.OPENAI_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OPENAI_API_KEY manquante' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { sector, cat, depart, arrivee, dist, amount, unit, delai, frequency, joursPassage, itemsSummary, clientLabel } = payload;
  if (!cat || !arrivee) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Données de fiche manquantes' }) };
  }

  const secteurLabel = sector === 'nettoyage' ? 'nettoyage' : 'déménagement';
  // Le nettoyage se déroule sur un seul site (pas de trajet A→B, pas de
  // kilométrage) : depart et dist sont alors absents.
  const lieuDescription = depart ? `trajet ${depart} → ${arrivee} (${dist} km)` : `site à ${arrivee}`;
  const frequenceDescription = frequency ? `, fréquence souhaitée "${frequency}"${joursPassage ? ` (${joursPassage})` : ''}` : '';

  const prompt = `Tu rédiges un court paragraphe (4 à 5 phrases) décrivant, pour un agent de liaison Haltiss, une situation client fictive dans le secteur du ${secteurLabel}.

Contraintes strictes à respecter absolument :
- N'invente AUCUN nom d'entreprise ni de personne. Désigne le client uniquement par : "${clientLabel}".
- Ne modifie et n'invente AUCUN chiffre. Reprends exactement, sans les changer, ces données : ${lieuDescription}, ${amount} ${unit}${frequenceDescription}, délai souhaité "${delai}".
- Ne mentionne aucun prix (déjà affiché ailleurs sur la fiche).
- Catégorie : ${cat}. Principaux éléments concernés : ${itemsSummary}.
- Ton naturel et professionnel, formulation différente à chaque fois : évite les tournures déjà utilisées habituellement.

Réponds uniquement avec le paragraphe, sans titre, sans guillemets, sans markdown.`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
        max_tokens: 220,
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: data.error?.message || 'Erreur OpenAI' }) };
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Réponse vide' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
