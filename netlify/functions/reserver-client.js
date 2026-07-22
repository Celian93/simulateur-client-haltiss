// Envoie au prestataire un e-mail de réservation, avec un contenu varié et
// adapté à son secteur d'activité (déménagement ou nettoyage), depuis la boîte
// Zoho Mail du réseau Haltiss.
//
// Utilise l'API REST Zoho Mail (OAuth2) plutôt que SMTP : le plan Zoho de ce
// compte bloque l'accès POP/IMAP/SMTP externe (restriction de plan, pas un
// problème d'identifiants), mais l'API REST d'envoi n'est pas soumise à cette
// restriction. Nécessite les variables d'environnement ZOHO_CLIENT_ID,
// ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN (générés via api-console.zoho.eu,
// type "Self Client"), ZOHO_ACCOUNT_ID et ZOHO_EMAIL (adresse d'envoi).

const { OFFRE_FREE_HTML_B64, OFFRE_PARTICIPATION_HTML_B64 } = require('./brochures');

const ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.eu';
const ZOHO_MAIL_API_BASE = 'https://mail.zoho.eu';

const OFFERS = {
  free: {
    label: 'Offre Free',
    filename: 'Haltiss-Offre-Free.html',
    contentB64: OFFRE_FREE_HTML_B64,
    mention: 'Vous trouverez ci-joint le détail de notre Offre Free (premier mois offert).',
  },
  participation: {
    label: 'Offre Participation',
    filename: 'Haltiss-Offre-Participation.html',
    contentB64: OFFRE_PARTICIPATION_HTML_B64,
    mention: 'Vous trouverez ci-joint le détail de notre Offre Participation.',
  },
};

const TEMPLATES_DEMENAGEMENT = [
  {
    subject: 'Un client déménagement vous attend — réponse sous 24h',
    body: (c) => `Bonjour,

Un nouveau client (${c.cat}) recherche un déménageur entre ${c.depart} et ${c.arrivee} (environ ${c.dist} km).

Prestation : ${c.amount} ${c.unit}. Intervention souhaitée ${c.delai}.

Budget estimé par le client : jusqu'à ${c.price} € TTC.

Ce client vous est réservé sous 24h, sous réserve de votre prise en charge. Merci de nous confirmer votre disponibilité dans les meilleurs délais.

L'équipe Haltiss`,
  },
  {
    subject: 'Nouvelle demande de déménagement dans votre secteur',
    body: (c) => `Bonjour,

Une opportunité de mission vient d'être identifiée pour vous : ${c.cat}, trajet ${c.depart} → ${c.arrivee} (${c.dist} km, ${c.amount} ${c.unit}).

Délai souhaité par le client : ${c.delai}.
Le client est prêt à mettre jusqu'à ${c.price} € TTC pour cette prestation.

Vous disposez de 24h pour prendre en charge ce client, sous réserve de disponibilité de votre part.

À bientôt,
L'équipe Haltiss`,
  },
  {
    subject: 'Mise en relation déménagement — à traiter sous 24h',
    body: (c) => `Bonjour,

Nous avons une mise en relation à vous proposer : un client (${c.cat}) souhaite déménager de ${c.depart} vers ${c.arrivee} (~${c.dist} km, ${c.amount} ${c.unit}), ${c.delai}.

Budget client indicatif : jusqu'à ${c.price} € TTC.

Ce client est réservé pour vous pendant 24h, sous réserve de prise en charge. Répondez à cet e-mail pour confirmer.

L'équipe Haltiss`,
  },
];

const TEMPLATES_NETTOYAGE = [
  {
    subject: 'Un client nettoyage vous attend — réponse sous 24h',
    body: (c) => `Bonjour,

Un nouveau client (${c.cat}) recherche un prestataire de nettoyage entre ${c.depart} et ${c.arrivee} (environ ${c.dist} km).

Prestation : ${c.amount} ${c.unit}. Intervention souhaitée ${c.delai}.

Budget estimé par le client : jusqu'à ${c.price} € TTC.

Ce client vous est réservé sous 24h, sous réserve de votre prise en charge. Merci de confirmer votre disponibilité rapidement.

L'équipe Haltiss`,
  },
  {
    subject: 'Nouvelle demande de prestation de nettoyage',
    body: (c) => `Bonjour,

Une opportunité de mission de nettoyage vient d'être identifiée pour vous : ${c.cat}, site situé entre ${c.depart} et ${c.arrivee} (${c.dist} km, ${c.amount} ${c.unit}).

Délai souhaité par le client : ${c.delai}.
Le client est prêt à mettre jusqu'à ${c.price} € TTC pour cette prestation.

Vous disposez de 24h pour prendre en charge ce client, sous réserve de disponibilité de votre part.

À bientôt,
L'équipe Haltiss`,
  },
  {
    subject: 'Mise en relation nettoyage — à traiter sous 24h',
    body: (c) => `Bonjour,

Nous avons une mise en relation à vous proposer : un client (${c.cat}) recherche un service de nettoyage à ${c.arrivee} (déplacement depuis ${c.depart}, ~${c.dist} km, ${c.amount} ${c.unit}), ${c.delai}.

Budget client indicatif : jusqu'à ${c.price} € TTC.

Ce client est réservé pour vous pendant 24h, sous réserve de prise en charge. Répondez à cet e-mail pour confirmer.

L'équipe Haltiss`,
  },
];

async function getAccessToken() {
  const res = await fetch(`${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(data.error || 'Impossible d\'obtenir un jeton d\'accès Zoho');
  }
  return data.access_token;
}

async function uploadAttachment(accountId, accessToken, filename, base64Content) {
  const buffer = Buffer.from(base64Content, 'base64');
  const url = `${ZOHO_MAIL_API_BASE}/api/accounts/${accountId}/messages/attachments?fileName=${encodeURIComponent(filename)}&isInline=false`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.data) {
    throw new Error(data.error?.errorMessage || 'Échec de l\'envoi de la pièce jointe à Zoho');
  }
  return data.data;
}

async function sendMessage(accountId, accessToken, message) {
  const res = await fetch(`${ZOHO_MAIL_API_BASE}/api/accounts/${accountId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.errorMessage || 'Échec de l\'envoi du message via Zoho');
  }
  return data;
}

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

  const { email, sector, cat, depart, arrivee, dist, price, amount, unit, delai, offer } = payload;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide' }) };
  }
  const selectedOffer = OFFERS[offer];
  if (!selectedOffer) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Offre invalide (attendu "free" ou "participation")' }) };
  }
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN || !process.env.ZOHO_ACCOUNT_ID || !process.env.ZOHO_EMAIL) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration Zoho incomplète (ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN / ZOHO_ACCOUNT_ID / ZOHO_EMAIL)' }) };
  }

  const templates = sector === 'nettoyage' ? TEMPLATES_NETTOYAGE : TEMPLATES_DEMENAGEMENT;
  const tpl = templates[Math.floor(Math.random() * templates.length)];
  const context = {
    cat: cat || 'client',
    depart: depart || '',
    arrivee: arrivee || '',
    dist: dist ?? '',
    amount: amount ?? '',
    unit: unit || '',
    delai: delai || 'à convenir',
    price: Number(price || 0).toLocaleString('fr-FR'),
  };

  try {
    const accessToken = await getAccessToken();
    const accountId = process.env.ZOHO_ACCOUNT_ID;

    const attachment = await uploadAttachment(accountId, accessToken, selectedOffer.filename, selectedOffer.contentB64);

    await sendMessage(accountId, accessToken, {
      fromAddress: process.env.ZOHO_EMAIL,
      toAddress: email,
      subject: `${tpl.subject} — ${selectedOffer.label}`,
      content: `${tpl.body(context)}\n\n${selectedOffer.mention}`,
      mailFormat: 'plaintext',
      attachments: [
        {
          storeName: attachment.storeName,
          attachmentName: attachment.attachmentName,
          attachmentPath: attachment.attachmentPath,
        },
      ],
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
