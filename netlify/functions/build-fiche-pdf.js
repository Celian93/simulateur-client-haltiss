// Génère la fiche client complète (les mêmes 7 sections qu'à l'écran) au
// format PDF, pour l'envoyer en pièce jointe au prestataire. Utilise pdfkit
// (pure JS, pas de dépendance native) pour rester compatible avec les
// fonctions Netlify serverless.

const PDFDocument = require('pdfkit');

const GREEN = '#059669';
const DARK = '#0f172a';
const GREY = '#475569';

// Number.toLocaleString('fr-FR') insère une espace insécable (U+00A0) comme
// séparateur de milliers, glyphe absent des polices standard PDF (Helvetica) :
// on le remplace par une espace normale pour un rendu correct.
function formatEuro(n) {
  return Number(n).toLocaleString('fr-FR').replace(/[\u00A0\u202F]/g, ' ');
}

function formatHeures(h) {
  const totalMin = Math.round(h * 60);
  const hh = Math.floor(totalMin / 60), mm = totalMin % 60;
  return mm === 0 ? `${hh}h` : `${hh}h${String(mm).padStart(2, '0')}`;
}

// \u00C9lision correcte ("d'agents" et non "de agents") pour les mots commen\u00E7ant par une voyelle.
function deLabel(word) {
  return /^[aeiouh\u00E9\u00E8\u00EA\u00E0\u00E2\u00EE\u00EF\u00F4\u00FB\u00F9]/i.test(word) ? `d'${word}` : `de ${word}`;
}

function section(doc, number, title) {
  doc.moveDown(0.8);
  doc.fillColor(GREEN).fontSize(12).font('Helvetica-Bold').text(number ? `${number}. ${title}` : title);
  doc.fillColor(DARK).moveDown(0.3);
}

function line(doc, label, value) {
  doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(`${label} : `, { continued: true });
  doc.font('Helvetica').fillColor(GREY).text(String(value));
}

function bullet(doc, text) {
  doc.font('Helvetica').fontSize(10).fillColor(GREY).text(`•  ${text}`, { indent: 10 });
}

function addressBlock(doc, label, addr) {
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(DARK).text(label);
  bullet(doc, `Ville : ${addr.ville}${addr.cp ? ` (${addr.cp})` : ''}`);
  bullet(doc, `Secteur (indicatif) : ${addr.quartier}`);
  bullet(doc, `Étage : ${addr.floor === 0 ? 'Rez-de-chaussée' : addr.floor === 1 ? '1er étage' : `${addr.floor}e étage`}`);
  if (!addr.noElevator) bullet(doc, `Ascenseur : ${addr.elevator ? 'Oui' : 'Non'}`);
  bullet(doc, 'Stationnement : Disponible');
  doc.moveDown(0.4);
}

async function buildFichePdf(fiche) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // En-tête
    doc.fillColor(GREEN).fontSize(18).font('Helvetica-Bold').text(fiche.title);
    doc.fillColor(GREY).fontSize(11).font('Helvetica').text(fiche.type === 'B2B' ? 'Profil : Professionnel' : 'Profil : Particulier');
    doc.moveDown(0.5);
    doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold').text(fiche.cat);
    const routeText = fiche.singleSite ? fiche.arrivee.ville : `${fiche.depart.ville} -> ${fiche.arrivee.ville} · ~${fiche.dist} km`;
    const subLine = fiche.sectorKey !== 'nettoyage'
      ? `${routeText} · ${fiche.amount} ${fiche.unit} · ${fiche.workers} ${fiche.role} · ${fiche.duration}`
      : `${routeText} · ${fiche.amount} ${fiche.unit}`;
    doc.fontSize(10).font('Helvetica').fillColor(GREY).text(subLine);

    // 1. Informations sur le client
    section(doc, 1, 'Informations sur le client');
    if (fiche.type === 'B2B') {
      line(doc, 'Contact', fiche.clientName);
      line(doc, 'Activité', fiche.cat);
      if (fiche.size) line(doc, `Nombre de ${fiche.sizeUnit}s`, fiche.size);
    } else {
      line(doc, 'Client', 'Particulier');
    }

    // 2. Adresses
    section(doc, 2, `Informations sur ${fiche.addressNoun}`);
    if (!fiche.singleSite) addressBlock(doc, 'Adresse de départ', fiche.depart);
    addressBlock(doc, fiche.singleSite ? 'Adresse d\'intervention' : 'Adresse d\'arrivée', fiche.arrivee);
    if (fiche.typeLocaux) line(doc, 'Type de locaux', fiche.typeLocaux);
    if (fiche.niveau) line(doc, 'Niveau de prestation', fiche.niveau + (fiche.niveauNote ? ` — ${fiche.niveauNote}` : ''));
    if (!fiche.singleSite) line(doc, 'Distance entre les deux sites', `${String(fiche.dist).replace('.', ',')} km`);
    line(doc, 'Date souhaitée', fiche.delai);
    line(doc, fiche.amountLabel, `${fiche.amount} ${fiche.unit} (${fiche.unitLabel})`);
    if (fiche.frequency) line(doc, 'Fréquence souhaitée', `${fiche.frequency} — ${fiche.joursPassage}`);
    if (fiche.sectorKey === 'nettoyage' && !fiche.pricingModeM2) line(doc, 'Durée estimée par passage', fiche.duration);
    if (fiche.heureIntervention) line(doc, 'Horaire d\'intervention souhaité', `${fiche.heureIntervention} (fin de journée)`);

    // 3. Matériel / prestations
    section(doc, 3, fiche.itemsTitle);
    if (fiche.sectorKey === 'nettoyage') {
      fiche.chaquePassage.forEach((p) => bullet(doc, p));
    } else {
      fiche.itemGroups.forEach((g) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(DARK).text(g.label);
        g.items.forEach((it) => bullet(doc, it));
        doc.moveDown(0.2);
      });
    }

    // 4. Prestations demandées
    section(doc, 4, 'Prestations demandées');
    fiche.prestationsExtra.forEach((p) => bullet(doc, p));

    // 5. Contraintes
    if (fiche.constraints.length) {
      section(doc, 5, 'Contraintes particulières');
      fiche.constraints.forEach((c) => bullet(doc, c));
    }

    // 6. Infos prestataire (déménagement) ou Exclusions (nettoyage) : côté
    // nettoyage, c'est au prestataire de dimensionner lui-même équipe/matériel/durée.
    if (fiche.sectorKey !== 'nettoyage') {
      section(doc, 6, 'Informations utiles pour le prestataire');
      line(doc, `Nombre ${deLabel(fiche.role)} conseillé`, fiche.workers);
      line(doc, fiche.equipmentLabel, fiche.equipment);
      line(doc, 'Durée estimée de l\'intervention', fiche.duration);
      if (fiche.exclusions && fiche.exclusions.length) {
        section(doc, null, 'Exclusions');
        fiche.exclusions.forEach((e) => bullet(doc, e));
      }
    } else if (fiche.exclusions && fiche.exclusions.length) {
      section(doc, 6, 'Exclusions');
      fiche.exclusions.forEach((e) => bullet(doc, e));
    }

    // 7. Budget
    section(doc, 7, 'Budget du client');
    doc.font('Helvetica-Bold').fontSize(13).fillColor(GREEN).text(
      `${formatEuro(fiche.price)} € ${fiche.priceUnit || 'TTC'}`
    );
    doc.font('Helvetica').fontSize(9).fillColor(GREY).text(
      fiche.recurring ? 'Budget maximum que le client souhaite mettre par mois.' : 'Budget maximum que le client souhaite mettre pour l\'intervention.'
    );
    if (fiche.recurring) {
      doc.fontSize(8.5).fillColor(GREY).text("À l'issue du premier mois, un contrat professionnel pourra vous être proposé.");
    }
    if (fiche.creditImpot) {
      doc.fontSize(8.5).fillColor(GREY).text("Crédit d'impôt de 50 % envisageable si le prestataire est déclaré au titre des services à la personne — à vérifier avant application.");
    }
    doc.fontSize(8.5).fillColor(GREY).text(
      fiche.sectorKey === 'nettoyage'
        ? 'Estimation à confirmer après visite ou échange avec le client.'
        : "Sous réserve d'informations exactes fournies par le client — le tarif définitif sera détaillé avec lui avant intervention.",
      { italics: true }
    );

    doc.end();
  });
}

module.exports = { buildFichePdf };
