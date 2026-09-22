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
  // свёрнуто: на десктопе 4 кадра (прежний вид работ), на телефоне (≤720px —
  // та же граница, что у CSS-разворота «в край») — 1. Остальное — лайтбокс / «показать все»
  var COLLAPSED = window.matchMedia('(max-width: 720px)').matches ? 1 : 4;

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
    resetView();
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
    resetView();
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

  /* ─── зум лайтбокса: pinch-тач, даблтап/даблклик → 100%, панорама ───
     100% = натуральный размер файла; при смене кадра зум сбрасывается. */
  var view = { s: 1, x: 0, y: 0 };

  function maxScale() {
    var item = set[pos];
    var w = lbImg.clientWidth, h = lbImg.clientHeight;
    if (!w || !h || !item || !item.w) return 1;
    // не даём уйти меньше вписанного и дальше 100%
    return Math.max(1, Math.min(item.w / w, item.h / h));
  }

  function applyView() {
    if (view.s <= 1) { view.s = 1; view.x = 0; view.y = 0; }
    else {
      // не даём картине улететь за экран целиком
      var overX = Math.max(0, (lbImg.clientWidth * view.s - window.innerWidth) / 2 + 8);
      var overY = Math.max(0, (lbImg.clientHeight * view.s - window.innerHeight) / 2 + 8);
      view.x = Math.max(-overX, Math.min(overX, view.x));
      view.y = Math.max(-overY, Math.min(overY, view.y));
    }
    lbImg.style.transform = view.s > 1
      ? 'translate(' + view.x + 'px, ' + view.y + 'px) scale(' + view.s + ')'
      : '';
    lb.classList.toggle('zoomed', view.s > 1);
  }

  function resetView() { view.s = 1; view.x = 0; view.y = 0; applyView(); }

  // масштаб с якорем в точке px,py (от центра экрана): она остаётся на месте
  function zoomAt(px, py, sNew) {
    sNew = Math.max(1, Math.min(maxScale(), sNew));
    var k = sNew / view.s;
    view.x = px - (px - view.x) * k;
    view.y = py - (py - view.y) * k;
    view.s = sNew;
    applyView();
  }

  function toggleZoom(px, py) {
    if (view.s > 1) resetView();
    else zoomAt(px || 0, py || 0, maxScale());
  }

  // мышь: одиночный клик по картинке — зум 100% / обратно.
  // тач-клики пропускаем: их занимается даблтап выше.
  var drag = null, dragMoved = false;
  lbImg.addEventListener('click', function (e) {
    if (e.pointerType === 'touch') return;
    if (dragMoved) { dragMoved = false; return; } // это было перетаскивание, не клик
    toggleZoom(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2);
  });
  lbImg.addEventListener('mousedown', function (e) {
    if (view.s <= 1) return;
    drag = { x: e.clientX, y: e.clientY };
    dragMoved = false;
    e.preventDefault();
  });
  window.addEventListener('mousemove', function (e) {
    if (!drag) return;
    view.x += e.clientX - drag.x; view.y += e.clientY - drag.y;
    drag.x = e.clientX; drag.y = e.clientY;
    dragMoved = true;
    applyView();
  });
  window.addEventListener('mouseup', function () { drag = null; });

  // колесо/трекпад: листает серию; при зуме — прокручивает саму картинку.
  // копим deltaY: один «щелчок» (~100px) = один кадр, быстрое вращение проматывает сразу.
  var wheelAcc = 0;
  lb.addEventListener('wheel', function (e) {
    e.preventDefault();
    if (view.s > 1) {
      view.x -= e.deltaX;
      view.y -= e.deltaY;
      applyView();
      return;
    }
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (e.deltaMode) d *= 16; // firefox может отдавать строки, не пиксели
    if (d && Math.sign(d) !== Math.sign(wheelAcc)) wheelAcc = 0; // сменили направление
    wheelAcc += d;
    if (Math.abs(wheelAcc) >= 100) {
      step(wheelAcc > 0 ? 1 : -1);
      wheelAcc = 0;
    }
  }, { passive: false });

  /* ─── тач ───
     pinch — зум, один палец при зуме — панорама,
     свайп при 100% (view.s === 1) — листает серию,
     даблтап — 100% / обратно во вписанную. */
  var touchX = null, touchY = null, panX = 0, panY = 0, moved = false;
  var swipeAt = 0, pinch = null;
  var lastTapAt = 0, lastTapX = 0, lastTapY = 0;

  function tdist(a, b) {
    var dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // false → обычный тап (клик по фону закроет), true → мы уже всё сделали
  function handleTap(x, y) {
    var now = Date.now();
    if (now - lastTapAt < 300 && Math.abs(x - lastTapX) < 30 && Math.abs(y - lastTapY) < 30) {
      lastTapAt = 0;
      toggleZoom(x - window.innerWidth / 2, y - window.innerHeight / 2);
      return true;
    }
    lastTapAt = now; lastTapX = x; lastTapY = y;
    return false;
  }

  lb.addEventListener('touchstart', function (e) {
    if (e.touches.length === 2) {
      pinch = { d: tdist(e.touches[0], e.touches[1]), s: view.s };
      touchX = touchY = null;
    } else if (e.touches.length === 1) {
      pinch = null;
      touchX = panX = e.touches[0].clientX;
      touchY = panY = e.touches[0].clientY;
      moved = false;
    } else { touchX = null; pinch = null; }
  }, { passive: true });

  lb.addEventListener('touchmove', function (e) {
    if (pinch && e.touches.length === 2 && pinch.d > 0) {
      var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - window.innerWidth / 2;
      var my = (e.touches[0].clientY + e.touches[1].clientY) / 2 - window.innerHeight / 2;
      var sNew = Math.max(1, Math.min(maxScale(), pinch.s * tdist(e.touches[0], e.touches[1]) / pinch.d));
      var k = sNew / view.s;
      view.x = mx - (mx - view.x) * k;
      view.y = my - (my - view.y) * k;
      view.s = sNew;
      applyView();
      moved = true;
    } else if (touchX != null && e.touches.length === 1) {
      var x = e.touches[0].clientX, y = e.touches[0].clientY;
      if (view.s > 1) {
        view.x += x - panX; view.y += y - panY;
        panX = x; panY = y;
        moved = true;
        applyView();
      } else if (Math.abs(x - touchX) > 8 || Math.abs(y - touchY) > 8) {
        moved = true;
      }
    }
  }, { passive: true });

  lb.addEventListener('touchend', function (e) {
    if (pinch && e.touches.length < 2) pinch = null;
    if (touchX == null || e.touches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touchX, dy = t.clientY - touchY;
    touchX = null;

    if (view.s > 1) {
      // зумленное не листаем: тап = кандидат на даблтап, движение = панорама
      if (!moved && handleTap(t.clientX, t.clientY)) e.preventDefault();
      return;
    }
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      swipeAt = Date.now();
      step(dx < 0 ? 1 : -1);
      if (e.cancelable) e.preventDefault(); // гасим синтетический click/dblclick после свайпа
    } else if (handleTap(t.clientX, t.clientY)) {
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

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