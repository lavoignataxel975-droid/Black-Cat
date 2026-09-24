# CMS The Black Cat

Back-office du bar **The Black Cat** (20 rue de Candolle, Montpellier) : l'équipe du bar
modifie la carte et les événements depuis un espace sécurisé, et le site (`..`) affiche le
contenu publié.

C'est une **copie indépendante** du CMS SGT : sa propre base, ses propres comptes, sa propre
clé. Elle ne partage rien avec le CMS d'Aperture ni avec celui de La Cave.

## Démarrer en local

Prérequis : Node.js 20 ou plus récent. Aucune base de données à installer : sans
`DATABASE_URL`, le CMS utilise PostgreSQL embarqué (PGlite) dans `apps/cms/data/`.

```bash
npm install
npm run seed      # crée le client, les comptes, la clé de lecture et la carte actuelle
npm run dev       # back-office sur http://localhost:3200
```

Le site, dans un second terminal :

```bash
cd ..
node server.cjs   # http://localhost:5174
```

⚠️ Avec la base embarquée, lancez `npm run seed` **avant** `npm run dev` (un seul processus à
la fois peut ouvrir la base). Pour repartir de zéro : arrêtez le serveur, supprimez
`apps/cms/data/` et `apps/cms/storage/`, puis relancez `npm run seed`.

Le port 3200 évite tout conflit avec le CMS SGT (3000) et celui d'Aperture (3100).

Comptes créés par le seed (un nouveau mot de passe est demandé à la première connexion) :

| Rôle | Identifiant | Mot de passe initial |
|---|---|---|
| Éditeur (le bar) | `blackcat` | `blackcat-a-changer` |
| Administrateur agence | `agence` | `agence-a-changer` |

## Ce que le bar peut modifier

- **La Carte**
  - onglet **Produits** : nom, catégorie, description et prix de chaque produit
    (cocktails, bières, vins, tapas, burgers, desserts…). Les onglets de catégories
    filtrent la liste ; les flèches ↑ ↓ règlent l'ordre à l'intérieur d'une catégorie.
  - onglet **Catégories** : ajouter, renommer, réordonner, masquer ou supprimer les
    catégories. Chacune est rangée dans **Pour boire** ou **Pour manger** — les deux grands
    titres de la page. La « précision » (ex. « 25 cl / 50 cl / girafe 2,5 L ») s'affiche en
    pastille or à côté du nom. Une catégorie qui contient encore des produits ne peut pas
    être supprimée.
- **Événements** : titre, date et heure, description. Le site affiche le prochain en grand,
  puis les suivants dans le rail horizontal. **Une date passée disparaît toute seule** du
  site — rien à faire.

Les prix sont du texte, affichés tels quels (« 8,50 € », « 3,20 / 5,90 / 24 € », « 3 € / 27 € »).
Laisser le prix vide n'affiche aucun prix (« Bière du moment », « Les Virgins »).

**Enregistrer le brouillon** ne change rien sur le site ; **Publier sur le site** rend la
modification visible (moins d'une minute, le temps du cache). Historique des publications
avec restauration, corbeille récupérable pendant 30 jours.

## Branchement du site

- `../assets/js/cms-config.js` : adresse du CMS et clé de lecture.
- `../assets/js/cms.js` : récupère le contenu publié et rejoue les rendus de `main.js`
  (`window.BC_RENDER.menu` et `.events`) avec exactement le même balisage : le design ne
  change pas.
- **Si le CMS ne répond pas, est éteint, ou met plus de 5 secondes, le contenu écrit dans
  `../assets/js/data.js` reste affiché.** Le site n'est jamais vide et ne dépend pas du CMS
  pour fonctionner.
- Pour débrancher le CMS : mettre `url: ''` dans `cms-config.js`.

## Contenu de départ

`apps/cms/scripts/seed-data.ts` est **généré depuis le site**, pas écrit à la main :

```bash
node apps/cms/scripts/gen-seed.cjs "$(cd .. && pwd)"
```

Il lit `../assets/js/data.js` et en tire 17 catégories, 124 produits et 6 événements, dans le
même ordre que le site.

## Types de contenu

Déclarés dans `apps/cms/src/content-types/blackcat.ts` (`produit`, `categorie`, `evenement`)
et enregistrés dans `index.ts`. Le formulaire du back-office, la validation et l'API sont
générés à partir de ce fichier : ajouter un champ ne demande aucune migration de base.

L'habillage du back-office (objet `branding`) reprend l'identité du site : or `#c9a468`,
noir, police Anton.

## Vérifications

```bash
npm run typecheck
npm test            # 40 tests, dont apps/cms/tests/blackcat.test.ts
```
