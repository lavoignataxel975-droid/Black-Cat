/* Génère cms/apps/cms/scripts/seed-data.ts à partir de assets/js/data.js du site. */
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
global.window = {};
require(path.join(ROOT, 'assets/js/data.js'));

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const CATEGORIES = [];
const PRODUITS = [];
const seen = new Set();

for (const g of window.BC_MENU) {
  for (const c of g.cats) {
    let cle = slug(c.name);
    let n = 2;
    while (seen.has(cle)) cle = slug(c.name) + '-' + n++;
    seen.add(cle);
    CATEGORIES.push({ cle, nom: c.name, groupe: g.id, ...(c.note ? { note: c.note } : {}) });
    for (const it of c.items) {
      PRODUITS.push({
        categorie: cle,
        nom: it.name,
        ...(it.desc ? { description: it.desc } : {}),
        ...(it.price ? { prix: it.price } : {}),
      });
    }
  }
}

// Les événements : jour + mois + heure en texte deviennent une vraie date locale.
const MOIS = { jan: 0, fev: 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, aou: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');

const EVENEMENTS = window.BC_EVENTS.map((ev) => {
  const k = String(ev.month).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const mi = (k.slice(0, 4) in MOIS) ? MOIS[k.slice(0, 4)] : MOIS[k.slice(0, 3)];
  const t = /(\d{1,2})\s*h\s*(\d{0,2})/.exec(ev.time || '');
  const d = new Date(now.getFullYear(), mi, parseInt(ev.day, 10), t ? +t[1] : 20, t && t[2] ? +t[2] : 0);
  if (d - now < -1000 * 60 * 60 * 24 * 180) d.setFullYear(now.getFullYear() + 1);
  const local = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
    + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  return { titre: ev.title, debut: local, ...(ev.desc ? { description: ev.desc } : {}) };
});

const head = [
  '/**',
  ' * Contenu de départ du site The Black Cat : la carte et les événements tels qu\'ils',
  ' * figurent dans assets/js/data.js, dans le même ordre. `cle` relie un produit à sa',
  ' * catégorie le temps du seed (en base, un produit désigne sa catégorie par son identifiant).',
  ' *',
  ' * Fichier généré — pour le régénérer depuis le site :',
  ' *   node scripts/gen-seed.js',
  ' */',
  '',
  '',
].join('\n');

const out = head
  + 'export const CATEGORIES: Record<string, string>[] = ' + JSON.stringify(CATEGORIES, null, 2) + ';\n\n'
  + 'export const PRODUITS: Record<string, string>[] = ' + JSON.stringify(PRODUITS, null, 2) + ';\n\n'
  + 'export const EVENEMENTS: Record<string, string>[] = ' + JSON.stringify(EVENEMENTS, null, 2) + ';\n';

fs.writeFileSync(path.join(ROOT, 'cms/apps/cms/scripts/seed-data.ts'), out);

console.log('Catégories :', CATEGORIES.length, '| Produits :', PRODUITS.length, '| Événements :', EVENEMENTS.length);
console.log('Groupes    :', [...new Set(CATEGORIES.map((c) => c.groupe))].join(', '));
console.log('1er event  :', EVENEMENTS[0].titre, '→', EVENEMENTS[0].debut);
