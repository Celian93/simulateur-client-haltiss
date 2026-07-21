// Reçoit les réponses du questionnaire d'onboarding partenaire et les transmet
// à Web3Forms côté serveur. La clé d'accès Web3Forms et l'e-mail du commercial
// ne sont jamais exposés au navigateur : ils sont résolus ici à partir de
// variables d'environnement, en fonction de l'identifiant "com" transmis dans
// le lien de la brochure (ex : questionnaire_onboarding_haltiss.html?com=adrien).
//
// Variables d'environnement attendues :
//   WEB3FORMS_KEY_DEFAULT      (clé Web3Forms utilisée par défaut)
//   WEB3FORMS_KEY_ADRIEN       (optionnel, clé dédiée si com=adrien)
//   WEB3FORMS_KEY_ROMAIN       (optionnel, clé dédiée si com=romain)
//   WEB3FORMS_KEY_JULIEN       (optionnel, clé dédiée si com=julien)
//   COMMERCIAL_NAME_ADRIEN / _ROMAIN / _JULIEN (optionnel, nom affiché)

const COMMERCIALS = {
  adrien: { keyEnv: 'WEB3FORMS_KEY_ADRIEN', nameEnv: 'COMMERCIAL_NAME_ADRIEN', fallbackName: 'Adrien' },
  romain: { keyEnv: 'WEB3FORMS_KEY_ROMAIN', nameEnv: 'COMMERCIAL_NAME_ROMAIN', fallbackName: 'Romain' },
  julien: { keyEnv: 'WEB3FORMS_KEY_JULIEN', nameEnv: 'COMMERCIAL_NAME_JULIEN', fallbackName: 'Julien' },
};

function resolveCommercial(com) {
  const entry = COMMERCIALS[(com || '').toLowerCase().trim()];
  if (entry && process.env[entry.keyEnv]) {
    return {
      accessKey: process.env[entry.keyEnv],
      name: process.env[entry.nameEnv] || entry.fallbackName,
    };
  }
  return {
    accessKey: process.env.WEB3FORMS_KEY_DEFAULT,
    name: 'Haltiss',
  };
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

  const commercial = resolveCommercial(com);
  if (!commercial.accessKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Clé Web3Forms manquante (WEB3FORMS_KEY_DEFAULT)' }) };
  }

  const body = {
    access_key: commercial.accessKey,
    subject: 'Nouveau questionnaire partenaire Haltiss',
    from_name: 'Questionnaire onboarding Haltiss',
    '00 - Commercial': commercial.name,
    ...fields,
  };

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success !== false) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
    return { statusCode: 502, body: JSON.stringify({ error: json.message || 'Échec Web3Forms' }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
