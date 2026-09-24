/* ==========================================================================
   The Black Cat — contenu géré depuis le CMS
   --------------------------------------------------------------------------
   Récupère le contenu publié (catégories, produits, événements) et rejoue les
   rendus de main.js avec. Le balisage produit est exactement le même : le
   design ne change pas.

   Si le CMS ne répond pas, est éteint, ou met trop de temps, le contenu écrit
   dans assets/js/data.js reste affiché. Le site n'est jamais vide.

   À charger APRÈS data.js et main.js.
   ========================================================================== */
(function () {
  'use strict';

  var cfg = window.SGT_CMS;
  if (!cfg || !cfg.url || !cfg.key) return;
  if (!window.BC_RENDER) return;

  var TIMEOUT_MS = 5000;
  var PAGE = 100;               // maximum accepté par l'API
  var base = cfg.url.replace(/\/$/, '');

  var MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  var JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  /* ---------- Accès à l'API ---------- */
  function api(path, params) {
    var query = Object.keys(params || {}).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    }).join('&');

    var controller = 'AbortController' in window ? new AbortController() : null;
    var timer = controller && setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    return fetch(base + '/api/v1/' + path + (query ? '?' + query : ''), {
      headers: { Authorization: 'Bearer ' + cfg.key },
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) throw new Error('CMS : réponse ' + res.status);
      return res.json();
    }).finally(function () { if (timer) clearTimeout(timer); });
  }

  /** Récupère toutes les pages d'un type (l'API plafonne à 100 par appel). */
  function all(type) {
    var items = [];
    function next(offset) {
      return api('content/' + type, { limit: PAGE, offset: offset }).then(function (body) {
        items = items.concat(body.items || []);
        if (items.length < body.total && body.items && body.items.length) return next(items.length);
        return items;
      });
    }
    return next(0);
  }

  /* ---------- Reconstruction de la carte au format attendu par main.js ---------- */
  function buildMenu(categories, produits) {
    var GROUPES = [
      { id: 'boire', title: 'Pour boire' },
      { id: 'manger', title: 'Pour manger' }
    ];

    // Les produits sont déjà triés par position ; on les range par catégorie.
    var parCategorie = {};
    produits.forEach(function (p) {
      var cle = p.data.categorie;
      if (!cle) return;
      (parCategorie[cle] = parCategorie[cle] || []).push({
        name: p.data.nom || '',
        desc: p.data.description || '',
        price: p.data.prix || ''
      });
    });

    return GROUPES.map(function (g) {
      return {
        id: g.id,
        title: g.title,
        cats: categories
          .filter(function (c) { return (c.data.groupe || 'boire') === g.id; })
          .map(function (c) {
            return {
              name: c.data.nom || '',
              note: c.data.note || '',
              items: parCategorie[c.id] || []
            };
          })
      };
    }).filter(function (g) { return g.cats.length; });
  }

  /* ---------- Reconstruction des événements ---------- */
  function buildEvents(evenements) {
    return evenements.map(function (e) {
      var d = new Date(e.data.debut);
      if (isNaN(d)) return null;
      return {
        day: String(d.getDate()).padStart(2, '0'),
        month: MOIS[d.getMonth()],
        weekday: JOURS[d.getDay()],
        title: e.data.titre || '',
        desc: e.data.description || '',
        time: d.getHours() + 'h' + String(d.getMinutes()).padStart(2, '0')
      };
    }).filter(Boolean);
  }

  /* ---------- Application ---------- */
  var onMenuPage = !!document.querySelector('[data-menu-root]');
  var onEventsPage = !!document.querySelector('[data-events-root]');

  if (onMenuPage) {
    Promise.all([all('categorie'), all('produit')])
      .then(function (r) {
        var menu = buildMenu(r[0], r[1]);
        // Une carte vide ne doit jamais remplacer celle qui est déjà affichée.
        if (menu.length) window.BC_RENDER.menu(menu);
      })
      .catch(function (err) {
        console.warn('[CMS] carte non chargée, contenu du site conservé :', err.message);
      });
  }

  if (onEventsPage) {
    all('evenement')
      .then(function (items) {
        var events = buildEvents(items);
        // L'API a déjà retiré les dates passées ; s'il n'en reste aucune, on
        // laisse le calendrier écrit dans la page plutôt qu'une page vide.
        if (events.length) window.BC_RENDER.events(events);
      })
      .catch(function (err) {
        console.warn('[CMS] événements non chargés, contenu du site conservé :', err.message);
      });
  }
})();
