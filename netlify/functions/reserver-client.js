// Envoie au prestataire un e-mail de réservation, avec un contenu varié et
// adapté à son secteur d'activité (déménagement ou nettoyage), depuis la boîte
// Zoho Mail du réseau Haltiss (support@haltiss.com). Nécessite les variables
// d'environnement ZOHO_EMAIL et ZOHO_APP_PASSWORD (mot de passe d'application
// généré dans Zoho Mail, pas le mot de passe principal du compte).

const nodemailer = require('nodemailer');
const { OFFRE_FREE_HTML_B64, OFFRE_PARTICIPATION_HTML_B64 } = require('./brochures');

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
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_APP_PASSWORD) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ZOHO_EMAIL / ZOHO_APP_PASSWORD manquants' }) };
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

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_APP_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: `Haltiss <${process.env.ZOHO_EMAIL}>`,
      to: email,
      subject: `${tpl.subject} — ${selectedOffer.label}`,
      text: `${tpl.body(context)}\n\n${selectedOffer.mention}`,
      attachments: [
        {
          filename: selectedOffer.filename,
          content: selectedOffer.contentB64,
          encoding: 'base64',
          contentType: 'text/html',
        },
      ],
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
