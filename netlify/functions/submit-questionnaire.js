// Reçoit les réponses du questionnaire d'onboarding partenaire et les
// transmet par e-mail via l'API Zoho Mail (même mécanisme que
// reserver-client.js). L'identifiant "com" (ex : ?com=julien dans le lien
// "Devenir partenaire" de la brochure, voir patch-brochure-link.js) permet de
// renvoyer la réponse à l'agent qui a effectivement envoyé l'offre à ce
// prestataire. Si l'identifiant est absent ou inconnu, la réponse part à
// tous les agents par sécurité, pour ne jamais perdre une demande.

const { getAccessToken, sendMessage, hasZohoConfig } = require('./zoho-mail');

const COMMERCIALS = {
  adrien: 'adrien.maillard@haltiss.com',
  julien: 'julien.bunelle@haltiss.com',
};

const ALL_COMMERCIAL_EMAILS = Object.values(COMMERCIALS).join(',');

function resolveRecipient(com) {
  const email = COMMERCIALS[(com || '').toLowerCase().trim()];
  return email || ALL_COMMERCIAL_EMAILS;
}

function formatFieldsAsText(fields) {
  return Object.entries(fields)
    .map(([key, value]) => `${key} : ${value}`)
    .join('\n');
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

  const { com, fields } = payload;
  if (!fields || typeof fields !== 'object') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Champs manquants' }) };
  }
  if (!hasZohoConfig()) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Configuration Zoho incomplète' }) };
  }

  const toAddress = resolveRecipient(com);

  try {
    const accessToken = await getAccessToken();
    const accountId = process.env.ZOHO_ACCOUNT_ID;

    await sendMessage(accountId, accessToken, {
      fromAddress: process.env.ZOHO_EMAIL,
      toAddress,
      subject: 'Nouveau questionnaire partenaire Haltiss',
      content: formatFieldsAsText(fields),
      mailFormat: 'plaintext',
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
