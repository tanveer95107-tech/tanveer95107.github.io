/* Tanu Store - mobile upgrade + Quick View fix. Put next to index.html */
(function () {
  if (window.__tanuMobile) return;
  window.__tanuMobile = true;

  /* ---------- CSS ---------- */
  var css = `
html{-webkit-tap-highlight-color:transparent}
button,a,.pcard{touch-action:manipulation}
.pcard-slider,.modal-slider{touch-action:pan-y}
.mobile-cta{display:none!important}
.tabbar{display:none}
@media (hover:none){
  .pcard-wish{opacity:1;transform:none}
  .pcard-quick,.slider-arrow{display:none}
  .pcard:hover .pcard-img img{transform:none}
}
@media (max-width:900px){
  .tabbar{position:fixed;left:0;right:0;bottom:0;z-index:890;display:grid;grid-template-columns:repeat(5,1fr);background:rgba(255,255,255,.97);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:6px 4px calc(6px + env(safe-area-inset-bottom,0px));box-shadow:0 -6px 24px rgba(0,0,0,.06)}
  .tabbar button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-height:48px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c7c85;position:relative}
  .tabbar button svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
  .tabbar button.active{color:var(--gold-3)}
  .tabbar i{font-style:normal;position:absolute;top:2px;left:calc(50% + 6px);min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:var(--gold);color:var(--ink);font-size:9px;font-weight:800;place-items:center}
  .foot{padding-bottom:70px}
  .modal-ov{padding:0;overflow:hidden;background:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}
  .modal{position:absolute;inset:0;width:100%;max-width:none;margin:0;display:block;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;animation:fadeIn .25s ease}
  .modal-media{min-height:0;height:62vh;max-height:560px}
  .modal-slider{min-height:0;height:100%}
  .modal-info{display:block;padding:22px 20px 0}
  .modal-info h2{font-size:24px}
  .modal-actions{position:sticky;bottom:0;z-index:6;background:#fff;margin:8px -20px 0;padding:12px 20px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line)}
  .modal-close{position:fixed;top:12px;right:12px;width:42px;height:42px}
  .modal-thumbs{bottom:12px}
}
@media (max-width:640px){
  .section{padding:52px 0}
  .sec-head{margin-bottom:30px}
  .hero{min-height:72vh;min-height:72svh}
  .hero-inner{padding:48px 16px}
  .hero-scroll{display:none}
  .hero-bg{animation:none;transform:none;background-image:url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=75')}
  .news-form input,.search-field input{font-size:16px}
  .toast{bottom:78px}
  .scroll-top{bottom:84px}
  .drawer-foot{padding-bottom:calc(20px + env(safe-area-inset-bottom,0px))}
}
`;
  var st = document.createElement('style');
  st.setAttribute('data-tanu-mobile', '');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- New Arrivals: Quick View opens the correct product ---------- */
  var naMap = [['men',0],['men',1],['men',2],['women',0],['women',1],['women',2],['kids',0],['kids',1]];
  document.querySelectorAll('#newGrid .pcard-quick').forEach(function (b, i) {
    if (naMap[i]) b.setAttribute('onclick', "openModal(" + naMap[i][1] + ",'" + naMap[i][0] + "')");
  });

  /* ---------- Tap on a card opens the product ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('button, a, input')) return;
    var card = e.target.closest('.pcard');
    if (!card) return;
    var q = card.querySelector('.pcard-quick');
    if (q) q.click();
  });

  /* ---------- Swipe on photos ---------- */
  var sx = 0, sy = 0, sl = null;
  document.addEventListener('touchstart', function (e) {
    sl = e.target.closest('.pcard-slider, .modal-slider');
    if (sl) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }
  }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (!sl) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      var dir = dx < 0 ? 1 : -1;
      if (sl.classList.contains('modal-slider')) {
        if (modalImages.length > 1) setModalSlide((modalActiveIdx + dir + modalImages.length) % modalImages.length);
      } else {
        if (dir === 1) nextSlide(sl); else prevSlide(sl);
      }
    }
    sl = null;
  }, { passive: true });

  /* ---------- Bottom tab bar ---------- */
  var ic = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V21H3z"/></svg>',
    men: '<svg viewBox="0 0 24 24"><path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z"/></svg>',
    women: '<svg viewBox="0 0 24 24"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>',
    kids: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>',
    cart: '<svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'
  };
  var bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.setAttribute('aria-label', 'Quick navigation');
  bar.innerHTML = [['#home','Home',ic.home],['#men','Men',ic.men],['#women','Women',ic.women],['#kids','Kids',ic.kids]]
    .map(function (t) {
      return '<button type="button" data-t="' + t[0] + '" aria-label="' + t[1] + '">' + t[2] + '<span>' + t[1] + '</span></button>';
    }).join('') +
    '<button type="button" id="tabCart" aria-label="Cart">' + ic.cart + '<span>Cart</span><i id="tabCartCount" style="display:none">0</i></button>';
  document.body.appendChild(bar);
  bar.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'tabCart') { openCart(); return; }
    smoothScrollTo(b.getAttribute('data-t'));
  });

  var ticking = false;
  function spy() {
    ticking = false;
    var y = window.scrollY + window.innerHeight * 0.35, cur = '#home';
    ['#men', '#women', '#kids'].forEach(function (s) {
      var el = document.querySelector(s);
      if (el && el.offsetTop <= y) cur = s;
    });
    bar.querySelectorAll('[data-t]').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-t') === cur);
    });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(spy); }
  }, { passive: true });
  spy();

  /* ---------- Cart count on the tab bar ---------- */
  function syncTabCart() {
    var n = cart.length, b = document.getElementById('tabCartCount');
    if (b) { b.textContent = n; b.style.display = n ? 'grid' : 'none'; }
  }
  var _updateCart = updateCart;
  updateCart = function () { _updateCart.apply(this, arguments); syncTabCart(); };
  syncTabCart();

  /* ---------- Hide the loading screen sooner ---------- */
  setTimeout(function () {
    var p = document.getElementById('preloader');
    if (p) p.classList.add('done');
  }, 500);
})();
