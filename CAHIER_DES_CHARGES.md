# Cahier des charges — Simulateur de client Haltiss
*Dernière mise à jour : 20/07/2026*

---

## Contexte

Haltiss est une plateforme de mise en relation entre des prestataires de déménagement et des clients.  
Les agents de liaison appellent les prestataires pour leur proposer des missions.  
Pour rendre les appels plus fluides et réalistes, ils utilisent ce simulateur qui génère des profils clients fictifs mais crédibles.

---

## Ce qui est fait ✅

### Outil principal
- [x] Fichier HTML autonome, zéro installation
- [x] Logo Haltiss intégré
- [x] Design aux couleurs Haltiss (vert)
- [x] Connexion individuelle par agent (Netlify Identity)
- [x] Affichage du nom de l'agent connecté
- [x] Bouton déconnexion

### Générateur
- [x] Saisie ville + département du prestataire
- [x] Sélection type : Aléatoire / Professionnel (B2B) / Particulier (B2C)
- [x] 10 profils B2B (cabinet comptable, médical, agence immo, communication, informatique, commerce, restaurant, notaire, formation, pharmacie)
- [x] 9 profils B2C (studio étudiant, couple, famille, mutation pro, personne âgée, urgent, sans ascenseur, piano, garde-meuble)
- [x] Zones géographiques par département (16 départements couverts)
- [x] Détection automatique du département depuis la ville saisie
- [x] Objets cohérents avec le type de client
- [x] Contraintes réalistes (stationnement, ascenseur, délai, etc.)
- [x] Calcul de budget (min / cible / max) avec coefficients géographiques
- [x] 5 questions à poser au prestataire
- [x] Résumé en langage naturel
- [x] Bouton "Copier le résumé"
- [x] Bouton "Nouveau client" (régénération instantanée)
- [x] Anti-répétition (même profil + zone évité sur les 5 dernières générations)
- [x] Badges urgence / week-end / étage sans ascenseur
- [x] Disponibilité client : 90% sous 24h, 10% sous 48h
- [x] Raccourci clavier : Entrée pour générer

### Hébergement
- [x] Compatible Netlify (drag & drop)
- [x] `netlify.toml` configuré
- [x] Logins individuels via Netlify Identity

---

## Ce qui reste à faire ⏳

### Priorité haute
- [ ] **Déployer sur Netlify** (glisser le dossier sur app.netlify.com)
- [ ] **Activer Netlify Identity** et inviter les agents par email
- [ ] **Tester** avec un vrai agent sur un vrai appel prestataire

### Priorité moyenne
- [ ] Ajouter les départements manquants dans le générateur (actuellement 16 couverts)
- [ ] Ajouter d'autres profils B2B si besoin (cabinet d'avocat, salle de sport, coiffeur…)
- [ ] Ajouter d'autres profils B2C si besoin

### Priorité basse / évolutions futures
- [ ] Brancher Claude API ou OpenAI pour des résumés encore plus naturels (quelques €/mois)
- [ ] Historique des fiches générées par agent
- [ ] Statistiques (nombre de fiches par jour, par agent)
- [ ] Version mobile optimisée
- [ ] Export PDF de la fiche

---

## Règles de génération

| Paramètre | Règle |
|---|---|
| Type B2B / B2C | 55% B2C, 45% B2B en mode aléatoire |
| Disponibilité client | **90% sous 24h**, **10% sous 48h** |
| Urgence | 10% des fiches (délai < 48h) |
| Week-end | 22% des fiches |
| Anti-répétition | Même catégorie + même zone interdits sur les 5 dernières |
| Budget | Calculé sur : volume × distance × déménageurs × durée × options |
| Prix B2B | Affiché HT |
| Prix B2C | Affiché TTC |

---

## Départements couverts

| Dept | Zone principale |
|---|---|
| 06 | Nice, Antibes, Cagnes-sur-Mer |
| 13 | Marseille, Aix-en-Provence, Aubagne |
| 25 | Besançon |
| 31 | Toulouse, Blagnac, Colomiers |
| 33 | Bordeaux, Mérignac, Pessac |
| 34 | Montpellier, Castelnau-le-Lez |
| 35 | Rennes, Cesson-Sévigné |
| 38 | Grenoble, Échirolles |
| 44 | Nantes, Saint-Herblain |
| 57 | Metz |
| 59 | Lille, Roubaix, Tourcoing |
| 67 | Strasbourg, Schiltigheim |
| 69 | Lyon, Villeurbanne, Caluire |
| 75 | Paris (tous arrondissements) |
| 76 | Rouen |
| 83 | Toulon, Hyères |

---

## Architecture technique

```
Simulateur de client Haltiss/
├── index.html        → Application complète (HTML + CSS + JS)
├── logo.png          → Logo Haltiss
├── netlify.toml      → Configuration Netlify
├── RECAP.md          → Résumé rapide
└── CAHIER_DES_CHARGES.md  → Ce fichier
```

**Stack :** HTML / CSS / JavaScript vanilla — aucune dépendance, aucun serveur.  
**Auth :** Netlify Identity (CDN externe, gratuit jusqu'à 1 000 utilisateurs actifs/mois).

---

## Comment déployer (étape par étape)

1. Aller sur **https://app.netlify.com**
2. Se connecter avec le compte Netlify
3. Glisser le dossier **"Simulateur de client Haltiss"** dans la zone de drop
4. Attendre ~30 secondes → un lien est généré (ex: `https://haltiss-gen.netlify.app`)
5. Dans le dashboard → onglet **Identity** → cliquer **Enable Identity**
6. Aller dans **Identity > Invite users**
7. Entrer l'email de chaque agent → ils reçoivent un mail pour créer leur mot de passe
8. Partager le lien Netlify avec les agents

---

## Comment modifier le générateur

Le générateur est entièrement dans `index.html`.  
Ouvrir avec **Notepad++**, **VS Code** ou tout éditeur de texte.

- **Ajouter un département** → chercher `const ZONES` et ajouter une ligne
- **Ajouter un profil B2B** → chercher `const B2B` et ajouter un bloc
- **Ajouter un profil B2C** → chercher `const B2C` et ajouter un bloc
- **Modifier le calcul de prix** → chercher `function computePrice`
- **Modifier la répartition** → chercher `Math.random() > 0.9` pour le 90/10
