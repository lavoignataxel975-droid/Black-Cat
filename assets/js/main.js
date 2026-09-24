/* ==========================================================================
   The Black Cat — interactions
   ========================================================================== */
(function () {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cfg = window.BC_CONFIG || {};

  /* ---------- Menu overlay ---------- */
  const toggle = document.querySelector('[data-menu-toggle]');
  const overlay = document.getElementById('menu');
  if (toggle && overlay) {
    const label = toggle.querySelector('[data-menu-label]');
    const setOpen = (open) => {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      overlay.setAttribute('aria-hidden', String(!open));
      overlay.inert = !open;
      if (label) label.textContent = open ? 'Fermer' : 'Menu';
    };
    setOpen(false);
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('menu-open')));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    overlay.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }

  /* ---------- Hero : nappes de fumée ---------- */
  const smoke = document.querySelector('[data-smoke]');
  if (smoke) {
    const blobs = [
      { l: 0,  t: 55, s: 60, d: 18, dl: 0,   o: 0.26 },
      { l: 35, t: 40, s: 75, d: 24, dl: -6,  o: 0.2 },
      { l: 62, t: 58, s: 62, d: 20, dl: -3,  o: 0.24 },
      { l: 28, t: 70, s: 70, d: 19, dl: -15, o: 0.22 },
      { l: 48, t: 75, s: 58, d: 21, dl: -10, o: 0.2 },
      { l: 15, t: 20, s: 52, d: 26, dl: -12, o: 0.14 },
      { l: 68, t: 12, s: 48, d: 22, dl: -9,  o: 0.13 },
      { l: 82, t: 40, s: 44, d: 28, dl: -4,  o: 0.16 },
      { l: -5, t: 25, s: 40, d: 30, dl: -18, o: 0.1 },
    ];
    // Les 5 premières nappes (les plus présentes) restent visibles sur mobile.
    smoke.innerHTML = blobs.map((b) =>
      `<i style="left:${b.l}%;top:${b.t}%;width:${b.s}vw;height:${b.s * 0.55}vw;min-width:${b.s * 4}px;min-height:${b.s * 2.2}px;` +
      `background:radial-gradient(closest-side, rgba(232,224,204,${b.o}), rgba(232,224,204,0));--d:${b.d}s;--dl:${b.dl}s"></i>`
    ).join('');
  }

  /* ---------- La Carte : accordéon (une seule catégorie ouverte) ----------
     Le rendu est une fonction : le CMS (assets/js/cms.js) peut le rejouer avec
     le contenu publié. Sans CMS, il tourne une fois avec le contenu de data.js. */
  const menuRoot = document.querySelector('[data-menu-root]');

  function renderMenu(menu) {
    if (!menuRoot || !menu) return;
    menuRoot.innerHTML = menu.map((g, gi) => `
      <section class="menu-group" id="${esc(g.id)}" aria-labelledby="grp-${gi}">
        <h2 class="menu-group__title t-title" id="grp-${gi}"><span>${esc(g.title)}</span><span class="rule" aria-hidden="true"></span></h2>
        ${g.cats.map((c, ci) => {
          const id = `cat-${gi}-${ci}`;
          return `
          <div class="cat">
            <button type="button" class="cat__toggle" aria-expanded="false" aria-controls="${id}">
              <span class="cat__head">
                <span class="cat__name">${esc(c.name)}</span>
                ${c.note ? `<span class="cat__note">${esc(c.note)}</span>` : ''}
              </span>
              <span class="cat__icon" aria-hidden="true">+</span>
            </button>
            <div class="cat__panel" id="${id}" role="region" aria-label="${esc(c.name)}">
              <div class="cat__inner"><div class="cat__list">
                ${c.items.map((it) => `
                  <div class="item">
                    <div class="item__top">
                      <span class="item__name">${esc(it.name)}</span>
                      <i class="item__dots" aria-hidden="true"></i>
                      ${it.price ? `<span class="item__price">${esc(it.price)}</span>` : ''}
                    </div>
                    ${it.desc ? `<p class="item__desc">${esc(it.desc)}</p>` : ''}
                  </div>`).join('')}
              </div></div>
            </div>
          </div>`;
        }).join('')}
      </section>`).join('');

    const cats = [...menuRoot.querySelectorAll('.cat')];
    cats.forEach((cat) => {
      const btn = cat.querySelector('.cat__toggle');
      btn.addEventListener('click', () => {
        const willOpen = !cat.classList.contains('is-open');
        cats.forEach((c) => {
          c.classList.remove('is-open');
          c.querySelector('.cat__toggle').setAttribute('aria-expanded', 'false');
        });
        if (!willOpen) return;
        cat.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        // La fermeture d'une catégorie au-dessus décale la page : on ramène le titre en vue.
        setTimeout(() => {
          const top = btn.getBoundingClientRect().top;
          const hh = document.querySelector('.site-header').offsetHeight;
          if (top < hh || top > window.innerHeight * 0.6) btn.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 360);
      });
    });
  }

  renderMenu(window.BC_MENU);

  /* ---------- Événements ---------- */
  const eventsRoot = document.querySelector('[data-events-root]');

  function renderEvents(events) {
    if (!eventsRoot || !events) return;
    const heroRoot = document.querySelector('[data-event-hero]');
    const labelRoot = document.querySelector('[data-events-label]');

    // Reconstruit une vraie date à partir du jour et du mois saisis en texte,
    // afin de savoir lequel est le prochain à venir.
    const MOIS = { jan: 0, fev: 1, mar: 2, avr: 3, mai: 4, juin: 5, juil: 6, aou: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
    const dateDe = (ev) => {
      const k = String(ev.month || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      const mi = k.slice(0, 4) in MOIS ? MOIS[k.slice(0, 4)] : MOIS[k.slice(0, 3)];
      if (mi === undefined) return null;
      const t = /(\d{1,2})\s*h\s*(\d{0,2})/.exec(ev.time || '');
      const now = new Date();
      const d = new Date(now.getFullYear(), mi, parseInt(ev.day, 10), t ? +t[1] : 20, t && t[2] ? +t[2] : 0);
      // Une date dépassée de plus de six mois désigne l'année suivante.
      if (d - now < -1000 * 60 * 60 * 24 * 180) d.setFullYear(now.getFullYear() + 1);
      return d;
    };

    const minuit = new Date();
    minuit.setHours(0, 0, 0, 0);

    // Index du premier événement encore à venir (sinon aucun : on garde la liste telle quelle).
    const iNext = events.findIndex((ev) => {
      const d = dateDe(ev);
      return d && new Date(d.getFullYear(), d.getMonth(), d.getDate()) >= minuit;
    });

    const carte = (ev) => `
      <article class="event">
        <div class="event__date">
          <span class="event__day">${esc(ev.day)}</span>
          <span class="event__meta">
            <span class="event__month">${esc(ev.month)}</span>
            <span class="event__weekday">${esc(ev.weekday)}</span>
          </span>
        </div>
        <h3 class="event__title t-title">${esc(ev.title)}</h3>
        <p class="event__desc">${esc(ev.desc)}</p>
        <div class="event__time">${esc(ev.time)}</div>
      </article>`;

    if (heroRoot && iNext >= 0) {
      const ev = events[iNext];
      const d = dateDe(ev);
      const jours = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - minuit) / 86400000);
      const accroche = jours === 0 ? "Aujourd'hui" : jours === 1 ? 'Demain' : 'Prochaine date';

      heroRoot.innerHTML = `
        <div class="event-hero__date">
          <span class="event-hero__eyebrow">${esc(accroche)}</span>
          <span class="event-hero__day">${esc(ev.day)}</span>
          <span class="event-hero__when">${esc(`${ev.weekday} ${ev.day} ${ev.month} · ${ev.time}`)}</span>
        </div>
        <div class="event-hero__body">
          <h2 class="event-hero__title t-title">${esc(ev.title)}</h2>
          <p class="event-hero__desc">${esc(ev.desc)}</p>
          <div class="event-hero__cta">
            <a class="btn-cta" href="reserver.html">Réserver une table →</a>
            <a class="btn-outline" href="https://www.instagram.com/theblackcat_mtp/" target="_blank" rel="noopener">Suivre sur Instagram</a>
          </div>
        </div>`;
      heroRoot.hidden = false;
    }

    // Le rail garde toutes les autres dates, dans l'ordre d'origine.
    const reste = events.filter((_, i) => i !== iNext || iNext < 0);
    eventsRoot.innerHTML = reste.map(carte).join('');

    if (labelRoot) labelRoot.hidden = !(heroRoot && iNext >= 0 && reste.length);
    const hint = document.querySelector('.events-hint');
    if (hint) hint.hidden = reste.length < 2;
  }

  renderEvents(window.BC_EVENTS);

  /* Le CMS (assets/js/cms.js) rejoue ces rendus avec le contenu publié.
     S'il ne répond pas, ce qui vient d'être affiché depuis data.js reste en place. */
  window.BC_RENDER = { menu: renderMenu, events: renderEvents };

  /* ---------- Réserver : lien externe + formulaire mailto ---------- */
  document.querySelectorAll('[data-booking-link]').forEach((a) => {
    if (cfg.bookingUrl && cfg.bookingUrl !== '#') {
      a.href = cfg.bookingUrl;
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  const form = document.querySelector('[data-contact-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = (n) => form.elements[n].value.trim();
      const body = `${v('message')}\n\n— ${v('prenom')} ${v('nom')}\n${v('email')}`;
      window.location.href = `mailto:${cfg.contactEmail}?subject=${encodeURIComponent(v('objet'))}&body=${encodeURIComponent(body)}`;
    });
  }
})();
