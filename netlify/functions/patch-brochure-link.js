// Réécrit, dans un PDF de brochure déjà généré (voir brochures.js), l'URL du
// lien "Devenir partenaire" pour y ajouter ?com=<identifiant de l'agent>. Ça
// permet de savoir quel agent (Adrien, Julien...) a envoyé l'offre à quel
// prestataire, sans avoir à régénérer visuellement le PDF à chaque envoi
// (pas de navigateur headless nécessaire ici, uniquement de l'édition de
// métadonnées PDF via pdf-lib).

const { PDFDocument, PDFDict, PDFName, PDFArray, PDFString } = require('pdf-lib');

const QUESTIONNAIRE_URL = 'https://haltiss-simulateur.netlify.app/questionnaire_onboarding_haltiss.html';

async function patchBrochureLink(pdfBuffer, comId) {
  if (!comId) return pdfBuffer;

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const newUrl = `${QUESTIONNAIRE_URL}?com=${encodeURIComponent(comId)}`;

  for (const page of pdfDoc.getPages()) {
    const annotsRef = page.node.get(PDFName.of('Annots'));
    if (!annotsRef) continue;
    let annots;
    try {
      annots = pdfDoc.context.lookup(annotsRef, PDFArray);
    } catch {
      continue;
    }

    for (let i = 0; i < annots.size(); i++) {
      try {
        const annot = pdfDoc.context.lookup(annots.get(i), PDFDict);
        if (annot.get(PDFName.of('Subtype'))?.toString() !== '/Link') continue;

        const action = pdfDoc.context.lookup(annot.get(PDFName.of('A')), PDFDict);
        const uriEntry = action.get(PDFName.of('URI'));
        if (!uriEntry) continue;

        const uriStr = uriEntry.decodeText ? uriEntry.decodeText() : uriEntry.toString();
        if (uriStr.includes('questionnaire_onboarding_haltiss.html')) {
          action.set(PDFName.of('URI'), PDFString.of(newUrl));
        }
      } catch {
        // Annotation d'un type inattendu (pas un lien) : on l'ignore.
        continue;
      }
    }
  }

  return Buffer.from(await pdfDoc.save());
}

module.exports = { patchBrochureLink };
