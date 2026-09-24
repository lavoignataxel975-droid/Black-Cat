/* ==========================================================================
   THE BLACK CAT — V2 · interactions
   --------------------------------------------------------------------------
   Aucune dépendance. Chaque bloc est indépendant : il ne s'exécute que si son
   point d'ancrage existe dans la page.
   ========================================================================== */
(function () {
  'use strict';

  var D  = window.BC2 || {};
  var CFG = window.BC_CONFIG || {};
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* Comparaison insensible à la casse ET aux accents (« créme » trouve « crème ») */
  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     1. En-tête : passe en fond opaque dès qu'on quitte le haut de page
     ====================================================================== */
  (function header() {
    var hdr = $('.hdr');
    if (!hdr) return;
    var tick = function () { hdr.classList.toggle('is-stuck', window.scrollY > 24); };
    tick();
    window.addEventListener('scroll', tick, { passive: true });
  })();

  /* ======================================================================
     2. Navigation plein écran (avec piège à focus)
     ====================================================================== */
  (function navPanel() {
    var btn = $('[data-nav-toggle]');
    var nav = $('#nav');
    if (!btn || !nav) return;

    var label = $('[data-nav-label]', btn);
    var open = false;
    var lastFocus = null;

    function setOpen(v) {
      open = v;
      document.body.classList.toggle('is-locked', v);
      btn.setAttribute('aria-expanded', String(v));
      nav.setAttribute('aria-hidden', String(!v));
      nav.inert = !v;
      if (label) label.textContent = v ? 'Fermer' : 'Menu';
      if (v) {
        lastFocus = document.activeElement;
        var first = nav.querySelector('a, button');
        if (first) setTimeout(function () { first.focus(); }, 60);
      } else if (lastFocus) {
        lastFocus.focus();
      }
    }

    setOpen(false);
    btn.addEventListener('click', function () { setOpen(!open); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });

    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      var items = $$('a, button', nav).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  })();

  /* ======================================================================
     3. Horaires : état d'ouverture calculé en direct + tableau du jour
     ====================================================================== */
  function openState(now) {
    var hrs = D.hours || [];
    if (!hrs.length) return null;
    var day = now.getDay();
    var mins = now.getHours() * 60 + now.getMinutes();
    var today = hrs[day];
    var yest = hrs[(day + 6) % 7];

    // Service de la veille qui déborde après minuit (ex. vendredi 10h → 01h)
    if (yest && yest.close > 1440 && mins < yest.close - 1440) {
      return { state: 'open', until: yest.close - 1440, closesSoon: (yest.close - 1440) - mins <= 45 };
    }
    if (today && mins >= today.open && mins < today.close) {
      return { state: 'open', until: today.close, closesSoon: today.close - mins <= 45 };
    }
    if (today && mins < today.open) {
      return { state: 'closed', next: today.open, nextLabel: "aujourd'hui", soon: today.open - mins <= 60 };
    }
    // Fermé pour aujourd'hui : on cherche la prochaine ouverture
    for (var i = 1; i <= 7; i++) {
      var d = hrs[(day + i) % 7];
      if (d) return { state: 'closed', next: d.open, nextLabel: i === 1 ? 'demain' : d.label.toLowerCase() };
    }
    return { state: 'closed' };
  }

  function hhmm(m) {
    var h = Math.floor(m / 60) % 24, mm = m % 60;
    return String(h).padStart(2, '0') + 'h' + (mm ? String(mm).padStart(2, '0') : '');
  }

  (function status() {
    var nodes = $$('[data-status]');
    if (!nodes.length || !D.hours) return;

    function render() {
      var s = openState(new Date());
      if (!s) return;
      nodes.forEach(function (n) {
        var state = s.state === 'open' ? (s.closesSoon ? 'soon' : 'open') : (s.soon ? 'soon' : 'closed');
        var txt = s.state === 'open'
          ? (s.closesSoon ? 'Ferme à ' + hhmm(s.until) : 'Ouvert · jusqu’à ' + hhmm(s.until))
          : 'Fermé · ouvre ' + (s.nextLabel || '') + ' à ' + hhmm(s.next);
        n.setAttribute('data-state', state);
        n.innerHTML = '<span class="status__dot" aria-hidden="true"></span><span>' + esc(txt) + '</span>';
      });
    }
    render();
    setInterval(render, 60000);
  })();

  (function hoursTable() {
    var root = $('[data-hours]');
    if (!root || !D.hours) return;
    var today = new Date().getDay();
    // Semaine affichée du lundi au dimanche
    var order = [1, 2, 3, 4, 5, 6, 0];
    root.innerHTML = order.map(function (d) {
      var h = D.hours[d];
      return '<div class="hours__row' + (d === today ? ' is-today' : '') + '">' +
        '<span class="hours__d">' + esc(h.label) + '</span>' +
        '<span class="hours__h">' + esc(h.text) + '</span>' +
      '</div>';
    }).join('');
  })();

  /* ======================================================================
     4. Blocs de contenu de l'accueil
     ====================================================================== */
  (function marquee() {
    var root = $('[data-marquee]');
    if (!root || !D.marquee) return;
    var group = '<div class="marquee__group">' + D.marquee.map(function (t) {
      return '<span>' + t + '</span><i class="marquee__dot" aria-hidden="true"></i>';
    }).join('') + '</div>';
    // Deux copies : la translation de -50 % boucle sans saut visible
    root.innerHTML = group + group;
  })();

  (function picks() {
    var root = $('[data-picks]');
    if (!root || !D.picks) return;
    root.innerHTML = D.picks.map(function (p, i) {
      return '<article class="pick reveal" style="--i:' + i + '">' +
        '<span class="pick__cat">' + esc(p.cat) + '</span>' +
        '<h3 class="pick__name">' + esc(p.name) + '</h3>' +
        '<p class="pick__desc">' + esc(p.desc) + '</p>' +
        '<span class="pick__price">' + esc(p.price) + '</span>' +
      '</article>';
    }).join('');
  })();

  (function pillars() {
    var root = $('[data-pillars]');
    if (!root || !D.pillars) return;
    root.innerHTML = D.pillars.map(function (p, i) {
      return '<article class="pillar reveal" style="--i:' + i + '">' +
        '<span class="pillar__num">' + esc(p.num) + '</span>' +
        '<h3 class="h3">' + esc(p.title) + '</h3>' +
        '<p>' + esc(p.text) + '</p>' +
      '</article>';
    }).join('');
  })();

  (function gallery() {
    var root = $('[data-gallery]');
    if (!root || !D.gallery) return;
    var slots = ['a', 'b', 'c', 'd'];
    root.innerHTML = D.gallery.map(function (g, i) {
      return '<figure class="shot shot--' + slots[i % 4] + ' reveal" style="--i:' + i + '">' +
        '<img src="../assets/img/' + esc(g.src) + '" alt="' + esc(g.alt) + '" loading="lazy" decoding="async">' +
        '<figcaption>' + esc(g.caption) + '</figcaption>' +
      '</figure>';
    }).join('');
  })();

  /* ======================================================================
     5. Événements — dates réelles, tri, purge du passé
     --------------------------------------------------------------------
     La V1 stockait « 02 / Oct / Jeudi » en texte : impossible à trier, et le
     jour de la semaine devait être saisi à la main (source d'erreur). Ici on
     reconstruit une vraie date à partir du jour et du mois, et le jour de la
     semaine est recalculé — il ne peut plus être faux.
     ====================================================================== */
  var MONTHS = { jan: 0, fev: 1, 'fév': 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, aou: 7, 'aoû': 7, sep: 8, oct: 9, nov: 10, dec: 11, 'déc': 11 };
  var WEEKDAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  function buildEvents() {
    var src = window.BC_EVENTS || [];
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return src.map(function (ev) {
      var mi = MONTHS[fold(ev.month).slice(0, 4)];
      if (mi === undefined) mi = MONTHS[fold(ev.month).slice(0, 3)];
      if (mi === undefined) return null;

      var day = parseInt(ev.day, 10);
      var t = /(\d{1,2})\s*h\s*(\d{0,2})/.exec(ev.time || '');
      var hh = t ? parseInt(t[1], 10) : 20;
      var mm = t && t[2] ? parseInt(t[2], 10) : 0;

      var date = new Date(now.getFullYear(), mi, day, hh, mm);
      // Une date déjà passée de plus de 6 mois désigne l'année suivante
      if (date - now < -1000 * 60 * 60 * 24 * 180) date.setFullYear(now.getFullYear() + 1);

      var d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var diff = Math.round((d0 - today) / 86400000);

      return {
        raw: ev,
        date: date,
        past: diff < 0,
        rel: diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Demain' : null,
        day: String(date.getDate()).padStart(2, '0'),
        month: MONTH_SHORT[date.getMonth()],
        weekday: WEEKDAYS[date.getDay()],
        title: ev.title,
        desc: ev.desc,
        time: ev.time,
      };
    }).filter(Boolean)
      .filter(function (e) { return !e.past; })
      .sort(function (a, b) { return a.date - b.date; });
  }

  function evCard(e, i) {
    return '<article class="ev reveal" style="--i:' + (i % 6) + '">' +
      '<div class="ev__top">' +
        '<div class="ev__date">' +
          '<span class="ev__d">' + esc(e.day) + '</span>' +
          '<span class="ev__m"><b>' + esc(e.month) + '</b><span>' + esc(e.weekday) + '</span></span>' +
        '</div>' +
        (e.rel ? '<span class="ev__badge">' + esc(e.rel) + '</span>' : '') +
      '</div>' +
      '<h3 class="h3">' + esc(e.title) + '</h3>' +
      '<p>' + esc(e.desc) + '</p>' +
      '<span class="ev__time">' + esc(e.time) + '</span>' +
    '</article>';
  }

  (function events() {
    var heroRoot = $('[data-ev-hero]');
    var gridRoot = $('[data-ev-grid]');
    var prevRoot = $('[data-ev-preview]');
    var ritRoot  = $('[data-rituals]');
    if (!heroRoot && !gridRoot && !prevRoot && !ritRoot) return;

    var list = buildEvents();

    if (!list.length) {
      if (heroRoot) heroRoot.innerHTML = '<p class="lead">Aucune date annoncée pour le moment. Les soirées se décident souvent au comptoir : suivez-nous sur Instagram.</p>';
      if (gridRoot) gridRoot.innerHTML = '';
      if (prevRoot) prevRoot.innerHTML = '';
      return;
    }

    if (heroRoot) {
      var e = list[0];
      heroRoot.innerHTML =
        '<div class="ev-hero__date">' +
          '<span class="eyebrow eyebrow--plain">' + esc(e.rel || 'Prochaine date') + '</span>' +
          '<span class="ev-hero__num">' + esc(e.day) + '</span>' +
          '<span class="ev-hero__when">' + esc(e.weekday + ' ' + e.day + ' ' + e.month + ' · ' + e.time) + '</span>' +
        '</div>' +
        '<div class="ev-hero__body">' +
          '<h2 class="h1">' + esc(e.title) + '</h2>' +
          '<p class="lead">' + esc(e.desc) + '</p>' +
          '<div class="btn-row">' +
            '<a class="btn" href="reserver.html">Réserver une table <span class="btn__i" aria-hidden="true">→</span></a>' +
            '<a class="btn btn--ghost" href="' + esc((D.info || {}).instagram || '#') + '" target="_blank" rel="noopener">Suivre sur Instagram</a>' +
          '</div>' +
        '</div>';
    }

    if (gridRoot) gridRoot.innerHTML = list.slice(1).map(evCard).join('');
    if (prevRoot) prevRoot.innerHTML = list.slice(0, 3).map(evCard).join('');

    /* Rail horizontal : l'invite à défiler ne s'affiche que s'il y a vraiment
       quelque chose hors écran, et disparaît dès le premier geste. */
    var rail = $('[data-rail]');
    var hint = $('[data-rail-hint]');
    if (rail && hint) {
      var sync = function () {
        var overflows = rail.scrollWidth - rail.clientWidth > 8;
        hint.hidden = !overflows;
        hint.classList.toggle('is-done', !overflows || rail.scrollLeft > 24);
      };
      sync();
      rail.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync, { passive: true });
    }

    /* « Les rendez-vous » : déduit des titres réellement présents dans la
       programmation — aucune récurrence n'est inventée. */
    if (ritRoot) {
      var counts = {};
      list.forEach(function (e) { counts[e.title] = (counts[e.title] || 0) + 1; });
      var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; });
      ritRoot.innerHTML = names.map(function (n) {
        return '<span class="ritual">' + esc(n) + (counts[n] > 1 ? ' <b>×' + counts[n] + '</b>' : '') + '</span>';
      }).join('');
    }
  })();

  /* ======================================================================
     6. La Carte — rendu, recherche, filtres, scrollspy
     ====================================================================== */
  (function carte() {
    var root = $('[data-menu]');
    if (!root || !window.BC_MENU) return;

    var chipsRoot = $('[data-chips]');
    var input = $('[data-search]');
    var searchWrap = input ? input.closest('.search') : null;
    var clearBtn = $('[data-search-clear]');
    var empty = $('[data-menu-empty]');

    /* --- Rendu : tout est visible d'emblée. La V1 imposait un accordéon
       avec une seule catégorie ouverte : trouver un article demandait de
       deviner sa catégorie puis de scroller. Ici on voit tout, et la
       recherche + les puces remplacent le pliage. --- */
    root.innerHTML = window.BC_MENU.map(function (g, gi) {
      return '<section class="mgroup" id="g-' + esc(g.id) + '">' +
        '<div class="mgroup__head">' +
          '<h2 class="h2">' + esc(g.title) + '</h2>' +
          '<span class="bar" aria-hidden="true"></span>' +
        '</div>' +
        g.cats.map(function (c, ci) {
          var id = 'c-' + gi + '-' + ci;
          return '<div class="mcat" id="' + id + '" data-cat="' + esc(c.name) + '">' +
            '<div class="mcat__head">' +
              '<h3 class="mcat__name">' + esc(c.name) + '</h3>' +
              (c.note ? '<span class="mcat__note">' + esc(c.note) + '</span>' : '') +
            '</div>' +
            '<div class="mlist">' +
              c.items.map(function (it) {
                return '<div class="mitem" data-name="' + esc(it.name) + '" data-desc="' + esc(it.desc || '') + '">' +
                  '<div class="mitem__top">' +
                    '<span class="mitem__name" data-field="name">' + esc(it.name) + '</span>' +
                    '<i class="mitem__dots" aria-hidden="true"></i>' +
                    (it.price ? '<span class="mitem__price">' + esc(it.price) + '</span>' : '') +
                  '</div>' +
                  (it.desc ? '<p class="mitem__desc" data-field="desc">' + esc(it.desc) + '</p>' : '') +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>';
        }).join('') +
      '</section>';
    }).join('');

    var groups = $$('.mgroup', root);
    var cats = $$('.mcat', root);
    var items = $$('.mitem', root);

    /* --- Puces de navigation --- */
    if (chipsRoot) {
      chipsRoot.innerHTML = cats.map(function (c) {
        return '<button class="chip" type="button" data-target="' + c.id + '">' + esc(c.dataset.cat) + '</button>';
      }).join('');
      $$('.chip', chipsRoot).forEach(function (chip) {
        chip.addEventListener('click', function () {
          var el = document.getElementById(chip.dataset.target);
          if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        });
      });
    }

    /* --- Scrollspy : la puce active suit la catégorie affichée --- */
    if (chipsRoot && 'IntersectionObserver' in window) {
      var visible = new Set();
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) visible.add(en.target.id); else visible.delete(en.target.id);
        });
        var first = cats.filter(function (c) { return visible.has(c.id); })[0];
        if (!first) return;
        $$('.chip', chipsRoot).forEach(function (chip) {
          var on = chip.dataset.target === first.id;
          chip.classList.toggle('is-active', on);
          if (on && chip.offsetParent) {
            var cr = chip.getBoundingClientRect(), rr = chipsRoot.getBoundingClientRect();
            if (cr.left < rr.left + 8 || cr.right > rr.right - 8) {
              chipsRoot.scrollTo({ left: chip.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
            }
          }
        });
      }, { rootMargin: '-140px 0px -65% 0px', threshold: 0 });
      cats.forEach(function (c) { spy.observe(c); });
    }

    /* --- Recherche --- */
    function highlight(el, text, q) {
      if (!q) { el.textContent = text; return; }
      var i = fold(text).indexOf(q);
      if (i < 0) { el.textContent = text; return; }
      el.innerHTML = esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
    }

    function filter(raw) {
      var q = fold(raw.trim());
      var hits = 0;

      items.forEach(function (it) {
        var name = it.dataset.name, desc = it.dataset.desc;
        var match = !q || fold(name).indexOf(q) >= 0 || fold(desc).indexOf(q) >= 0;
        it.classList.toggle('is-hidden', !match);
        if (match) hits++;
        var nEl = $('[data-field="name"]', it), dEl = $('[data-field="desc"]', it);
        if (nEl) highlight(nEl, name, match ? q : '');
        if (dEl) highlight(dEl, desc, match ? q : '');
      });

      cats.forEach(function (c) {
        var any = $$('.mitem', c).some(function (i) { return !i.classList.contains('is-hidden'); });
        // Une catégorie dont le NOM correspond reste entière (ex. « bières »)
        if (q && fold(c.dataset.cat).indexOf(q) >= 0) {
          $$('.mitem', c).forEach(function (i) { i.classList.remove('is-hidden'); });
          any = true;
        }
        c.classList.toggle('is-hidden', !any);
      });

      groups.forEach(function (g) {
        g.classList.toggle('is-hidden', !$$('.mcat', g).some(function (c) { return !c.classList.contains('is-hidden'); }));
      });

      if (empty) {
        var none = q && !$$('.mcat', root).some(function (c) { return !c.classList.contains('is-hidden'); });
        empty.hidden = !none;
        if (none) empty.innerHTML = 'Rien ne correspond à <strong>« ' + esc(raw.trim()) + ' »</strong>.<br>Essayez « mojito », « ipa » ou « burger ».';
      }
      if (searchWrap) searchWrap.classList.toggle('has-value', !!raw);
    }

    if (input) {
      var t;
      input.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { filter(input.value); }, 120);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; filter(''); }
      });
    }
    if (clearBtn && input) {
      clearBtn.addEventListener('click', function () { input.value = ''; filter(''); input.focus(); });
    }

    /* La carte est rendue en JS : au chargement, l'ancre de l'URL (#g-boire,
       #g-manger…) pointe vers un élément qui n'existait pas encore. On rejoue
       le saut une fois le rendu terminé. */
    if (location.hash.length > 1) {
      var target = document.getElementById(location.hash.slice(1));
      if (target) {
        requestAnimationFrame(function () {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      }
    }
  })();

  /* ======================================================================
     7. Réserver — lien externe + formulaire mailto enrichi
     ====================================================================== */
  $$('[data-booking-link]').forEach(function (a) {
    if (CFG.bookingUrl && CFG.bookingUrl !== '#') {
      a.href = CFG.bookingUrl;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      // Pas encore de moteur de réservation : on bascule sur le téléphone,
      // qui est de toute façon l'action la plus efficace sur mobile.
      var info = D.info || {};
      if (info.phoneHref) a.href = 'tel:' + info.phoneHref;
    }
  });

  (function bookingForm() {
    var form = $('[data-book-form]');
    if (!form) return;

    // Pas de réservation dans le passé
    var dateInput = form.elements.date;
    if (dateInput) {
      var d = new Date();
      dateInput.min = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (n) { return form.elements[n] ? String(form.elements[n].value).trim() : ''; };
      var lines = [
        v('message'),
        '',
        '— Demande de réservation —',
        'Date : ' + (v('date') || 'à préciser'),
        'Heure : ' + (v('heure') || 'à préciser'),
        'Personnes : ' + (v('couverts') || 'à préciser'),
        '',
        v('prenom') + ' ' + v('nom'),
        v('email'),
        v('tel') ? 'Tél. ' + v('tel') : '',
      ].filter(function (l) { return l !== ''; }).join('\n');

      var subject = v('objet') || ('Réservation ' + (v('couverts') || '') + ' pers. — ' + (v('date') || ''));
      window.location.href = 'mailto:' + (CFG.contactEmail || '') +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines);

      var note = $('[data-form-note]', form);
      if (note) {
        note.textContent = 'Votre logiciel de messagerie vient de s’ouvrir avec le message pré-rempli. Il ne reste qu’à l’envoyer.';
        note.style.color = 'var(--brass)';
      }
    });
  })();

  /* ======================================================================
     8. Révélation au défilement
     ====================================================================== */
  (function reveal() {
    var els = $$('.reveal');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* Les blocs injectés par JS arrivent après le premier passage : on relance */
  window.addEventListener('load', function () {
    var late = $$('.reveal:not(.is-in)');
    if (reduced) { late.forEach(function (el) { el.classList.add('is-in'); }); return; }
    if (!('IntersectionObserver' in window)) { late.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io2.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    late.forEach(function (el) { io2.observe(el); });
  });

  /* ======================================================================
     9. Année courante dans le pied de page
     ====================================================================== */
  $$('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });

})();
