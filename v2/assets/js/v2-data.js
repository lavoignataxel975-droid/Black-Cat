/* ==========================================================================
   THE BLACK CAT — V2 · contenu additionnel
   --------------------------------------------------------------------------
   Ce fichier ne remplace PAS `assets/js/data.js` (la V1) : il le complète.
   La V2 charge d'abord data.js (BC_CONFIG / BC_EVENTS / BC_MENU restent la
   source unique pour la carte et les événements), puis ce fichier pour tout
   ce que la V1 ne stockait nulle part : coordonnées, horaires structurés,
   textes éditoriaux, mises en avant.

   → Modifier la carte : toujours dans assets/js/data.js (les deux versions
     du site se mettent à jour ensemble).
   → Modifier les textes / horaires de la V2 : ici.
   ========================================================================== */

window.BC2 = {

  /* ---------- Coordonnées ---------- */
  info: {
    name: 'The Black Cat',
    street: '20 Rue de Candolle',
    city: '34000 Montpellier',
    phone: '+33 4 11 75 19 72',
    phoneHref: '+33411751972',
    maps: 'https://www.google.com/maps/search/?api=1&query=The+Black+Cat+20+Rue+de+Candolle+34000+Montpellier',
    instagram: 'https://www.instagram.com/theblackcat_mtp/',
    instagramHandle: '@theblackcat_mtp',
  },

  /* ---------- Horaires structurés ----------
     Modèle par jour de la semaine (0 = dimanche … 6 = samedi).
     `open` / `close` en minutes depuis minuit ; `close` peut dépasser 1440
     lorsque le service se termine après minuit (ex. 01h00 = 1500).
     C'est ce modèle qui alimente le badge « Ouvert / Fermé » en direct et
     la mise en avant du jour courant.                                       */
  hours: [
    { d: 0, label: 'Dimanche', open: 17 * 60, close: 24 * 60,      text: '17h – 00h' },
    { d: 1, label: 'Lundi',    open: 10 * 60, close: 25 * 60,      text: '10h – 01h', note: 'Restauration le midi' },
    { d: 2, label: 'Mardi',    open: 10 * 60, close: 25 * 60,      text: '10h – 01h', note: 'Restauration le midi' },
    { d: 3, label: 'Mercredi', open: 10 * 60, close: 25 * 60,      text: '10h – 01h', note: 'Restauration le midi' },
    { d: 4, label: 'Jeudi',    open: 10 * 60, close: 25 * 60,      text: '10h – 01h', note: 'Restauration le midi' },
    { d: 5, label: 'Vendredi', open: 10 * 60, close: 25 * 60,      text: '10h – 01h', note: 'Restauration le midi' },
    { d: 6, label: 'Samedi',   open: 17 * 60, close: 24 * 60,      text: '17h – 00h' },
  ],

  /* ---------- Bandeau défilant (accueil) ---------- */
  marquee: [
    'Billard',
    'Beer pong',
    'Cocktails <b>8,50 €</b>',
    'Rhums arrangés maison',
    'Gins infusés maison',
    'Tapas à partager',
    'Burgers',
    'Frites maison',
    'Girafes 2,5 L',
    'Restauration le midi',
  ],

  /* ---------- Sélection mise en avant (accueil) ----------
     Repris mot pour mot de la carte V1, sans rien inventer.                 */
  picks: [
    { cat: 'Cocktail', name: 'Espresso Tiramisu', desc: 'Rhum infusé café, Baileys, amaretto, espresso, cacao', price: '8,50 €' },
    { cat: 'Pression', name: 'Gallia Nouveau Western IPA', desc: "IPA d'une microbrasserie française, notes d'agrumes et de fruits tropicaux", price: 'dès 3,80 €' },
    { cat: 'Tapas',    name: 'Camembert rôti au pesto', desc: 'À partager, au centre de la table', price: '12 €' },
    { cat: 'Burger',   name: "Black Cat's", desc: 'Steak 150 g, lard, burrata, pesto, roquette, oignons rouges', price: '16 €' },
  ],

  /* ---------- Les trois piliers du lieu (page Le Bar + accueil) ---------- */
  pillars: [
    {
      num: '01',
      title: 'Le billard',
      text: "Un tapis rouge au fond de la salle, ouvert à tous du matin à la fermeture. C'est le centre de gravité du Black Cat : on vient pour une partie, on reste pour la suivante.",
    },
    {
      num: '02',
      title: 'Le beer pong',
      text: "La table se monte dès que l'envie prend. Rien à réserver, rien à prévoir : demandez au comptoir, les gobelets arrivent avec la tournée.",
    },
    {
      num: '03',
      title: 'La cuisine',
      text: 'Tapas à partager, burgers et plats servis le midi en semaine. Frites maison, caponata, chipirones à la plancha : de quoi tenir toute une soirée sans quitter la table.',
    },
  ],

  /* ---------- Textes éditoriaux ---------- */
  story: {
    lead: "Un pub sombre au 20 rue de Candolle, à deux pas du centre de Montpellier. Un billard, une table de beer pong, une carte de cocktails à prix unique et une cuisine qui suit jusque tard.",
    bar: [
      "Le Black Cat s'ouvre le matin comme un café et se termine comme un bar de nuit. Entre les deux, il y a le déjeuner, l'afterwork, la partie de billard qu'on n'avait pas prévue et le dernier verre qui s'étire.",
      "La salle est volontairement sombre : bois, feutre rouge, lumières basses. On n'y vient pas pour être vu, on y vient pour s'installer.",
    ],
    drinks: [
      "Tous les cocktails sont à 8,50 €, sans exception. Pas de carte à deux vitesses, pas de calcul à faire en commandant.",
      "À côté, six bières pression dont une IPA de microbrasserie française, servies au 25 cl, au 50 cl ou à la girafe de 2,5 litres. Et une gamme maison : rhums arrangés au shot ou au mètre, gins infusés au romarin, au thym, à la lavande ou au jasmin.",
    ],
    food: [
      "La cuisine tourne le midi en semaine et suit le soir avec les tapas. Une vingtaine d'assiettes à partager, quatre burgers, des plats du jour, et des desserts jusqu'au café gourmand.",
      "Tout est pensé pour la table longue : on commande au fur et à mesure, on partage, on reprend une tournée.",
    ],
    quote: "Un billard, une girafe de 2,5 litres, une table de huit. Le reste s'organise tout seul.",
  },

  /* ---------- Légendes de la galerie ---------- */
  gallery: [
    { src: 'pool.png',         alt: 'Une partie de billard sur le tapis rouge du Black Cat', caption: 'Le billard · tapis rouge' },
    { src: 'plats.png',        alt: 'Brochettes de poulet teriyaki, burger, frites maison et gambas panées', caption: 'Les tapas · à partager' },
    { src: 'beer-pong.png',    alt: 'Table de beer pong et pintes au Black Cat', caption: 'Beer pong · sur demande' },
    { src: 'billard-bleu.png', alt: 'Le billard du Black Cat sous les lumières bleues', caption: 'La salle · lumières basses' },
  ],
};
