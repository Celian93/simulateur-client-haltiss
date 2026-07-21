// Envoie au prestataire un e-mail de réservation, avec un contenu varié et
// adapté à son secteur d'activité (déménagement ou nettoyage). Nécessite la
// variable d'environnement RESEND_API_KEY (compte gratuit sur resend.com).

const TEMPLATES_DEMENAGEMENT = [
  {
    subject: 'Un client déménagement vous attend — réponse sous 24h',
    body: (c) => `Bonjour,

Un nouveau client (${c.cat}) recherche un déménageur entre ${c.depart} et ${c.arrivee} (environ ${c.dist} km).

Budget estimé par le client : jusqu'à ${c.price} € TTC.

Ce client vous est réservé sous 24h, sous réserve de votre prise en charge. Merci de nous confirmer votre disponibilité dans les meilleurs délais.

L'équipe Haltiss`,
  },
  {
    subject: 'Nouvelle demande de déménagement dans votre secteur',
    body: (c) => `Bonjour,

Une opportunité de mission vient d'être identifiée pour vous : ${c.cat}, trajet ${c.depart} → ${c.arrivee} (${c.dist} km).

Le client est prêt à mettre jusqu'à ${c.price} € TTC pour cette prestation.

Vous disposez de 24h pour prendre en charge ce client, sous réserve de disponibilité de votre part.

À bientôt,
L'équipe Haltiss`,
  },
  {
    subject: 'Mise en relation déménagement — à traiter sous 24h',
    body: (c) => `Bonjour,

Nous avons une mise en relation à vous proposer : un client (${c.cat}) souhaite déménager de ${c.depart} vers ${c.arrivee} (~${c.dist} km).

Budget client indicatif : jusqu'à ${c.price} € TTC.

Ce client est réservé pour vous pendant 24h, sous réserve de prise en charge. Connectez-vous ou répondez à cet e-mail pour confirmer.

L'équipe Haltiss`,
  },
];

const TEMPLATES_NETTOYAGE = [
  {
    subject: 'Un client nettoyage vous attend — réponse sous 24h',
    body: (c) => `Bonjour,

Un nouveau client (${c.cat}) recherche un prestataire de nettoyage entre ${c.depart} et ${c.arrivee} (environ ${c.dist} km).

Budget estimé par le client : jusqu'à ${c.price} € TTC.

Ce client vous est réservé sous 24h, sous réserve de votre prise en charge. Merci de confirmer votre disponibilité rapidement.

L'équipe Haltiss`,
  },
  {
    subject: 'Nouvelle demande de prestation de nettoyage',
    body: (c) => `Bonjour,

Une opportunité de mission de nettoyage vient d'être identifiée pour vous : ${c.cat}, site situé entre ${c.depart} et ${c.arrivee} (${c.dist} km).

Le client est prêt à mettre jusqu'à ${c.price} € TTC pour cette prestation.

Vous disposez de 24h pour prendre en charge ce client, sous réserve de disponibilité de votre part.

À bientôt,
L'équipe Haltiss`,
  },
  {
    subject: 'Mise en relation nettoyage — à traiter sous 24h',
    body: (c) => `Bonjour,

Nous avons une mise en relation à vous proposer : un client (${c.cat}) recherche un service de nettoyage à ${c.arrivee} (déplacement depuis ${c.depart}, ~${c.dist} km).

Budget client indicatif : jusqu'à ${c.price} € TTC.

Ce client est réservé pour vous pendant 24h, sous réserve de prise en charge. Connectez-vous ou répondez à cet e-mail pour confirmer.

L'équipe Haltiss`,
  },
];

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { email, sector, cat, depart, arrivee, dist, price } = payload;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide' }) };
  }
  if (!process.env.RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'RESEND_API_KEY manquante' }) };
  }

  const templates = sector === 'nettoyage' ? TEMPLATES_NETTOYAGE : TEMPLATES_DEMENAGEMENT;
  const tpl = templates[Math.floor(Math.random() * templates.length)];
  const context = {
    cat: cat || 'client',
    depart: depart || '',
    arrivee: arrivee || '',
    dist: dist ?? '',
    price: Number(price || 0).toLocaleString('fr-FR'),
  };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Haltiss <onboarding@resend.dev>',
        to: [email],
        subject: tpl.subject,
        text: tpl.body(context),
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { statusCode: 502, body: JSON.stringify({ error: errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
