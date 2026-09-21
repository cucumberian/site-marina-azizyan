/* Марина Азизян — поведение страницы
   карусели избранных работ, сетки галерей, лайтбокс,
   «читать полностью» и появление секций при скролле. */
(function () {
  'use strict';

  var DATA = window.AZ_DATA || { sections: [], featured: [] };

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
    return img;
  }

  function makeCard(item) {
    var card = el('div', 'card');
    var box = el('div', 'thumb');
    box.appendChild(imgFor(item, 'thumb'));
    card.appendChild(box);
    card.appendChild(el('div', 'cap', item.caption || ''));
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

  /* ─── featured carousel ─── */
  function buildFeatured() {
    var block = document.querySelector('[data-carousel="featured"]');
    if (!block || !DATA.featured.length) return;

    var track = block.querySelector('[data-track]');
    var dots = block.querySelector('[data-dots]');
    var count = block.querySelector('[data-count]');

    DATA.featured.forEach(function (item, i) {
      var c = makeCard(item);
      wireCard(c, DATA.featured, i);
      track.appendChild(c);
    });

    count.textContent = DATA.featured.length + ' работ';

    var dotEls = [];
    DATA.featured.forEach(function (_, i) {
      var d = el('button', 'dot');
      d.type = 'button';
      d.setAttribute('aria-label', 'Работа ' + (i + 1));
      d.addEventListener('click', function () { scrollToIndex(track, i, dotEls); });
      dots.appendChild(d);
      dotEls.push(d);
    });

    function update() {
      var cards = track.children;
      if (!cards.length) return;
      var left = track.scrollLeft;
      var best = 0, bestD = Infinity;
      for (var i = 0; i < cards.length; i++) {
        var d = Math.abs(cards[i].offsetLeft - left);
        if (d < bestD) { bestD = d; best = i; }
      }
      dotEls.forEach(function (d, i) { d.classList.toggle('on', i === best); });
    }
    track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    update();

    block.querySelector('[data-prev]').addEventListener('click', function () {
      var idx = activeIndex(track, dotEls);
      scrollToIndex(track, Math.max(0, idx - 1), dotEls);
    });
    block.querySelector('[data-next]').addEventListener('click', function () {
      var idx = activeIndex(track, dotEls);
      scrollToIndex(track, Math.min(DATA.featured.length - 1, idx + 1), dotEls);
    });
  }

  function activeIndex(track, dotEls) {
    return dotEls.findIndex(function (d) { return d.classList.contains('on'); });
  }

  function scrollToIndex(track, i, dotEls) {
    var card = track.children[i];
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft - 2, behavior: 'smooth' });
    dotEls.forEach(function (d, j) { d.classList.toggle('on', j === i); });
  }

  /* ─── galleries ─── */
  var COLLAPSED = 8;

  function buildGalleries() {
    DATA.sections.forEach(function (sec) {
      var host = document.querySelector('[data-gallery="' + sec.id + '"]');
      if (!host || !sec.items || !sec.items.length) return;

      var grid = el('div', 'grid');
      host.appendChild(grid);
      var shown = Math.min(COLLAPSED, sec.items.length);

      function render(n) {
        grid.innerHTML = '';
        for (var i = 0; i < n && i < sec.items.length; i++) {
          var card = makeCard(sec.items[i]);
          wireCard(card, sec.items, i);
          grid.appendChild(card);
        }
      }
      render(shown);

      if (sec.items.length > shown) {
        var btn = el('button', 'grid-cta', 'показать все ' + sec.items.length);
        btn.type = 'button';
        btn.addEventListener('click', function () {
          render(sec.items.length);
          btn.remove();
        });
        host.appendChild(btn);
      }
    });
  }

  /* ─── lightbox ─── */
  var lb = document.querySelector('[data-lightbox]');
  var lbImg = lb.querySelector('[data-lb-img]');
  var lbCap = lb.querySelector('[data-lb-caption]');
  var lbCredit = lb.querySelector('[data-lb-credit]');
  var set = [], pos = 0, lastFocus = null;

  function paint() {
    var item = set[pos];
    if (!item) return;
    lbImg.src = item.src;
    lbImg.alt = item.caption || '';
    lbCap.textContent = item.caption || '';
    lbCredit.textContent = item.credit || '';
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

  buildFeatured();
  buildGalleries();
  wirePortrait();
})();