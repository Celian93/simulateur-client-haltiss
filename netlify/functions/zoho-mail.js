// Fonctions partagées pour envoyer des e-mails via l'API REST Zoho Mail
// (OAuth2), utilisées par reserver-client.js et submit-questionnaire.js.
// Nécessite les variables d'environnement ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET,
// ZOHO_REFRESH_TOKEN (générés via api-console.zoho.eu, type "Self Client")
// et ZOHO_ACCOUNT_ID.

const ZOHO_ACCOUNTS_BASE = 'https://accounts.zoho.eu';
const ZOHO_MAIL_API_BASE = 'https://mail.zoho.eu';

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

async function uploadAttachment(accountId, accessToken, filename, buffer) {
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

function hasZohoConfig() {
  return Boolean(
    process.env.ZOHO_CLIENT_ID &&
    process.env.ZOHO_CLIENT_SECRET &&
    process.env.ZOHO_REFRESH_TOKEN &&
    process.env.ZOHO_ACCOUNT_ID &&
    process.env.ZOHO_EMAIL
  );
}

module.exports = { getAccessToken, uploadAttachment, sendMessage, hasZohoConfig };
