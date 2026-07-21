// Crée directement un compte agent (e-mail pro + code choisi par l'administrateur)
// via l'API admin de Netlify Identity, sans passer par l'invitation classique
// (l'agent n'a pas de mot de passe à choisir lui-même).
//
// Protection : seul un utilisateur déjà connecté dont l'e-mail figure dans la
// variable d'environnement ADMIN_EMAILS (liste séparée par des virgules) peut
// appeler cette fonction. Netlify fournit automatiquement l'identité de
// l'appelant dans context.clientContext quand la requête contient un jeton
// Netlify Identity valide (Authorization: Bearer <jwt>).

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const identity = context.clientContext && context.clientContext.identity;
  const caller = context.clientContext && context.clientContext.user;
  if (!identity || !caller) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentification requise.' }) };
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!adminEmails.includes((caller.email || '').toLowerCase())) {
    return { statusCode: 403, body: JSON.stringify({ error: "Vous n'êtes pas autorisé à créer des comptes agent." }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const { email, code } = payload;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email invalide.' }) };
  }
  if (!code || code.length < 8) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Le code doit faire au moins 8 caractères.' }) };
  }

  try {
    const resp = await fetch(`${identity.url}/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${identity.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: code,
        email_confirm: true,
      }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: data.msg || data.error_description || 'Erreur Netlify Identity.' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
