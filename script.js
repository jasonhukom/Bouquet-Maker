(function () {
  'use strict';

  var ASSETS = 'assets/';
  var WRAP_FILE = 'bouquet-wrap.png';
  var OPENING = 0.30;
  var MAX_ANGLE = 78;
  var SLOTS = [0, -14, 14, -28, 28, -42, 42, -56, 56, -7, 7, -21, 21, -35, 35, -49, 49, -63, 63];

  var flowersEl = document.getElementById('flowers');
  var wrap = document.getElementById('wrap');
  var rail = document.getElementById('rail');
  var clearBtn = document.getElementById('clear');
  var z = 10;
  var autoIndex = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setSrc(img, file) {
    img.addEventListener('error', function () { img.style.visibility = 'hidden'; }, { once: true });
    img.src = ASSETS + file;
  }

  function anchor() {
    var r = wrap.getBoundingClientRect();
    var nw = wrap.naturalWidth;
    var nh = wrap.naturalHeight;
    if (!nw || !nh || !r.width) {
      var railW = rail.getBoundingClientRect().width || 0;
      return { x: (window.innerWidth - railW) / 2, y: window.innerHeight * 0.62 };
    }
    var shown = nh * Math.min(r.width / nw, r.height / nh);
    return { x: r.left + r.width / 2, y: r.bottom - shown + shown * OPENING };
  }

  function layout() {
    var a = anchor();
    flowersEl.style.setProperty('--ax', a.x + 'px');
    flowersEl.style.setProperty('--ay', a.y + 'px');
  }

  function overRail(x) { return x >= rail.getBoundingClientRect().left; }

  function pose(el, r, s) {
    el.dataset.r = r;
    el.dataset.s = s;
    el.style.setProperty('--r', r + 'deg');
    el.style.setProperty('--s', s);
  }

  function aim(el, px, py) {
    var a = anchor();
    var dx = px - a.x;
    var dy = py - a.y;
    var d = Math.hypot(dx, dy);
    var r = d < 24 ? 0 : clamp(Math.atan2(dx, -dy) * 180 / Math.PI, -MAX_ANGLE, MAX_ANGLE);
    var h = el.offsetHeight || 200;
    var s = clamp(d / (h * 0.95), 0.8, 1.2);
    pose(el, Math.round(r * 10) / 10, Math.round(s * 100) / 100);
  }

  function headPoint(el) {
    var a = anchor();
    var r = (parseFloat(el.dataset.r) || 0) * Math.PI / 180;
    var s = parseFloat(el.dataset.s) || 1;
    var len = el.offsetHeight * s * 0.95;
    return { x: a.x + Math.sin(r) * len, y: a.y - Math.cos(r) * len };
  }

  function makeFlower(file) {
    var el = document.createElement('img');
    el.className = 'flower';
    el.alt = '';
    el.draggable = false;
    el.style.zIndex = ++z;
    pose(el, 0, 1);
    setSrc(el, file);
    flowersEl.appendChild(el);
    bindFlower(el);
    return el;
  }

  function removeFlower(el) {
    el.classList.add('leaving');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
  }

  function addAuto(file) {
    var base = SLOTS[autoIndex % SLOTS.length];
    autoIndex += 1;
    var r = clamp(base + (Math.random() - 0.5) * 6, -70, 70);
    var s = clamp(1.08 - Math.abs(r) / 200 + (Math.random() - 0.5) * 0.08, 0.8, 1.15);
    var el = makeFlower(file);
    pose(el, Math.round(r * 10) / 10, Math.round(s * 100) / 100);
    el.classList.add('bloom');
    el.addEventListener('animationend', function () { el.classList.remove('bloom'); }, { once: true });
  }

  function bindFlower(el) {
    el.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();

      var id = e.pointerId;
      var head = headPoint(el);
      var ox = e.clientX - head.x;
      var oy = e.clientY - head.y;
      el.style.zIndex = ++z;
      el.classList.remove('bloom');
      el.classList.add('dragging');

      function move(ev) {
        if (ev.pointerId !== id) return;
        aim(el, ev.clientX - ox, ev.clientY - oy);
        el.classList.toggle('away', overRail(ev.clientX));
      }

      function end(ev) {
        if (ev.pointerId !== id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        el.classList.remove('dragging', 'away');
        if (ev.type === 'pointerup' && overRail(ev.clientX)) removeFlower(el);
      }
      function up(ev) { end(ev); }
      function cancel(ev) { end(ev); }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    });

    el.addEventListener('dblclick', function () { removeFlower(el); });
  }

  function bindChip(chip) {
    var file = chip.getAttribute('data-file');
    setSrc(chip.querySelector('img'), file);

    chip.addEventListener('pointerdown', function (e) {
      if (e.button > 0) return;
      e.preventDefault();

      var id = e.pointerId;
      var sx = e.clientX;
      var sy = e.clientY;
      var el = null;
      chip.classList.add('held');

      function move(ev) {
        if (ev.pointerId !== id) return;
        if (!el) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
          el = makeFlower(file);
          el.classList.add('dragging');
        }
        aim(el, ev.clientX, ev.clientY);
        el.classList.toggle('away', overRail(ev.clientX));
      }

      function finish(ev, cancelled) {
        if (ev.pointerId !== id) return;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        chip.classList.remove('held');

        if (!el) { if (!cancelled) addAuto(file); return; }
        el.classList.remove('dragging', 'away');
        if (cancelled || overRail(ev.clientX)) removeFlower(el);
      }
      function up(ev) { finish(ev, false); }
      function cancel(ev) { finish(ev, true); }

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', cancel);
    });
  }

  Array.prototype.forEach.call(rail.querySelectorAll('.chip'), bindChip);

  clearBtn.addEventListener('click', function () {
    Array.prototype.forEach.call(flowersEl.querySelectorAll('.flower'), removeFlower);
    autoIndex = 0;
  });

  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  wrap.addEventListener('load', layout);
  setSrc(wrap, WRAP_FILE);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', layout);
  layout();
})();
