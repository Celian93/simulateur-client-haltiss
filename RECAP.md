# Simulateur de client Haltiss — Récap

## Ce qu'on a construit

Un outil web pour les agents de liaison Haltiss.  
L'agent rentre la ville et le département du prestataire → le générateur crée un profil client réaliste et varié à chaque fois.

---

## Fichiers dans ce dossier

| Fichier | Rôle |
|---|---|
| `index.html` | L'application complète (générateur + login) |
| `logo.png` | Logo Haltiss |
| `netlify.toml` | Config pour Netlify |
| `RECAP.md` | Ce fichier |

---

## Ce que génère l'outil

Pour chaque profil client :
- Type (Professionnel B2B ou Particulier B2C)
- Catégorie (cabinet comptable, famille, agence immo…)
- Zones de départ et d'arrivée dans le bon secteur
- Liste d'objets à déménager avec quantités
- Contraintes (étage, ascenseur, stationnement…)
- Budget estimé (min / cible / max)
- 5 questions à poser au prestataire
- Résumé copiable en 1 clic

Anti-répétition : le même profil + zone ne revient pas dans les 5 dernières générations.

---

## Connexion agents (Netlify Identity)

Chaque agent a son propre login email + mot de passe.

### Déployer sur Netlify

1. Aller sur **app.netlify.com**
2. Glisser ce dossier dans la zone drag & drop
3. Une fois en ligne → onglet **Identity** → **Enable Identity**
4. **Invite users** → entrer l'email de chaque agent
5. L'agent reçoit un email et crée son mot de passe

### Ajouter / supprimer un agent

- Dashboard Netlify → Identity → liste des utilisateurs
- Invite ou Delete

---

## Départements reconnus

| Numéro | Ville principale |
|---|---|
| 06 | Nice |
| 13 | Marseille, Aix, Aubagne |
| 25 | Besançon |
| 31 | Toulouse, Blagnac |
| 33 | Bordeaux, Mérignac |
| 34 | Montpellier |
| 35 | Rennes |
| 38 | Grenoble |
| 44 | Nantes |
| 57 | Metz |
| 59 | Lille, Roubaix |
| 67 | Strasbourg |
| 69 | Lyon, Villeurbanne |
| 75 | Paris (tous arrondissements) |
| 76 | Rouen |
| 83 | Toulon |

> Si le département n'est pas dans la liste, le générateur utilise Marseille par défaut.  
> Pour ajouter d'autres départements, ouvrir `index.html` et compléter l'objet `ZONES`.

---

## Évolutions possibles

- [ ] Brancher Claude API / OpenAI pour des résumés encore plus naturels
- [ ] Ajouter d'autres départements dans `ZONES`
- [ ] Ajouter d'autres secteurs (déménagement international, stockage…)
- [ ] Stats par agent (nombre de fiches générées)

---

## Projet Next.js complet (optionnel)

Un projet Next.js plus complet avec base de données Supabase a aussi été créé dans :
`C:\Users\celia\haltiss`

Il inclut : historique des fiches, gestion prestataires, pages admin.  
Nécessite Supabase pour fonctionner.
