/* Марина Азизян — поведение страницы
   карусели избранных работ, сетки галерей, лайтбокс,
   «читать полностью» и появление секций при скролле. */
(function () {
  'use strict';

  var DATA = window.AZ_DATA || { sections: [] };

  // ?static=1 shows everything at once (used for screenshots and print); no animation, images load eagerly.
  var STATIC = /[?&]static=1/.test(location.search);

  /* ─── helpers ─── */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function imgFor(item, size) {
    // все картинки в WebP, запасной jpg не нужен
    var img = el('img');
    img.src = (size === 'thumb' && item.thumb) ? item.thumb : item.src;
    img.alt = item.caption || 'Работа Марины Азизян';
    img.loading = STATIC ? 'eager' : 'lazy';
    img.decoding = 'async';
    // размеры из манифеста — браузер резервирует место без прыжков
    if (item.w && item.h) { img.width = item.w; img.height = item.h; }
    return img;
  }

  function makeCard(item, full) {
    var card = el('figure', 'card');
    card.appendChild(imgFor(item, full ? 'src' : 'thumb'));
    var cap = el('figcaption');
    cap.appendChild(el('span', 'card-title', item.caption || ''));
    if (item.credit) cap.appendChild(el('span', 'card-credit', item.credit));
    card.appendChild(cap);
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    return card;
  }

  // Opens the whole set, starting from this item, so ← → move inside a series.
  function wireCard(card, items, index) {
    card.addEventListener('click', function () { openLightbox(items, index); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(items, index); }
    });
  }

  /* ─── galleries: монтажный лист, 12 колонок ───
     Ритм задан паттерном: крупная feature + меньшие со смещением.
     Слот {c} — колонка начала, {s} — ширина, off — «лесенка» вниз. */
  var PATTERN = [
    [ { c: 1, s: 7 },            { c: 9, s: 4, off: 1 } ],
    [ { c: 1, s: 5, off: 1 },    { c: 7, s: 5 } ],
    [ { c: 2, s: 4 },            { c: 7, s: 5, off: 1 } ]
  ];
  var MT = 'clamp(28px, 5vw, 88px)';
  // свёрнуто показываем одну feature-картинку, остальное — лайтбокс / «показать все»
  var COLLAPSED = 1;

  function slots() {
    var out = [];
    PATTERN.forEach(function (row) { row.forEach(function (sl) { out.push(sl); }); });
    return out;
  }

  function buildGalleries() {
    DATA.sections.forEach(function (sec) {
      var host = document.querySelector('[data-gallery="' + sec.id + '"]');
      if (!host || !sec.items || !sec.items.length) return;

      var grid = el('div', 'grid');
      host.appendChild(grid);

      var pattern = slots();
      var limit = Math.min(COLLAPSED, sec.items.length);

      var btn = null;
      if (sec.items.length > limit) {
        btn = el('button', 'grid-cta', 'показать все ' + sec.items.length);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          limit = sec.items.length;
          btn.remove();
          render();
        });
        host.appendChild(btn);
      }

      function render() {
        grid.innerHTML = '';
        for (var i = 0; i < limit; i++) {
          var sl = pattern[i % pattern.length];
          var card = makeCard(sec.items[i], sl.s >= 6);
          card.style.setProperty('--c', sl.c);
          card.style.setProperty('--s', sl.s);
          if (sl.off) card.style.setProperty('--mt', MT);
          wireCard(card, sec.items, i);
          grid.appendChild(card);
        }
      }
      render();
    });
  }

  /* ─── lightbox ─── */
  var lb = document.querySelector('[data-lightbox]');
  var lbImg = lb.querySelector('[data-lb-img]');
  var lbCap = lb.querySelector('[data-lb-caption]');
  var lbCredit = lb.querySelector('[data-lb-credit]');
  var lbCount = lb.querySelector('[data-lb-count]');
  var set = [], pos = 0, lastFocus = null;

  function paint() {
    var item = set[pos];
    if (!item) return;
    lbImg.src = item.src;
    if (item.w && item.h) { lbImg.width = item.w; lbImg.height = item.h; }
    lbImg.alt = item.caption || '';
    lbCap.textContent = item.caption || '';
    lbCredit.textContent = item.credit || '';
    lbCount.textContent = (pos + 1) + ' / ' + set.length;
  }

  function openLightbox(items, index) {
    if (!items || !items.length) return;
    set = items; pos = index || 0;
    lastFocus = document.activeElement;
    lb.hidden = false;
    paint();
    requestAnimationFrame(function () { lb.classList.add('show'); });
    document.body.style.overflow = 'hidden';
    lb.querySelector('[data-lb-close]').focus();
  }

  function closeLightbox() {
    lb.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(function () { lb.hidden = true; lbImg.removeAttribute('src'); }, 240);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function step(dir) {
    pos = (pos + dir + set.length) % set.length;
    paint();
  }

  lb.querySelector('[data-lb-close]').addEventListener('click', closeLightbox);
  lb.querySelector('[data-lb-prev]').addEventListener('click', function () { step(-1); });
  lb.querySelector('[data-lb-next]').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });

  /* ─── тач: свайп влево/вправо листает серию ───
     после свайпа гасим следующий click, иначе фон закроет лайтбокс */
  var touchX = null, touchY = null, swipeAt = 0;
  lb.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touchX = null; return; }
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (touchX == null) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX, dy = t.clientY - touchY;
    touchX = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      swipeAt = Date.now();
      step(dx < 0 ? 1 : -1);
    }
  }, { passive: true });
  lb.addEventListener('click', function (e) {
    if (Date.now() - swipeAt < 400) { e.stopPropagation(); }
  }, true);

  /* ─── read more ─── */
  var more = document.querySelector('[data-more]');
  var moreBtn = document.querySelector('[data-more-btn]');
  if (more && moreBtn) {
    moreBtn.addEventListener('click', function () {
      var open = more.classList.toggle('open');
      moreBtn.textContent = open ? 'свернуть' : 'читать полностью';
    });
  }

  /* ─── reveal on scroll (progressive: контент виден по умолчанию) ─── */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (STATIC || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (n) { n.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });
    revealEls.forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.9) { n.classList.add('in'); return; }
      n.classList.add('pre');
      io.observe(n);
    });
  }

  /* ─── портрет в «О себе»: тот же лайтбокс, та же серия ─── */
  function wirePortrait() {
    var fig = document.querySelector('[data-portrait]');
    if (!fig) return;
    var want = fig.getAttribute('data-portrait');
    var items = null, index = -1;
    DATA.sections.forEach(function (sec) {
      if (items) return;
      var i = sec.items.findIndex(function (it) { return it.id === want; });
      if (i >= 0) { items = sec.items; index = i; }
    });
    if (!items) return;

    fig.setAttribute('tabindex', '0');
    fig.setAttribute('role', 'button');
    fig.setAttribute('aria-label', 'Открыть фото мастерской на весь экран');
    var open = function () { openLightbox(items, index); };
    fig.addEventListener('click', open);
    fig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  }

  /* ─── обложки альбомов: клик открывает весь альбом в лайтбоксе ─── */
  function wireAlbums() {
    document.querySelectorAll('.album[data-album]').forEach(function (fig) {
      var sec = DATA.sections.find(function (s) { return s.id === fig.getAttribute('data-album'); });
      if (!sec || !sec.items || !sec.items.length) return;
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.setAttribute('aria-label', 'Открыть альбом: ' + sec.title);
      var open = function () { openLightbox(sec.items, 0); };
      fig.addEventListener('click', open);
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  buildGalleries();
  wireAlbums();
  wirePortrait();
})();