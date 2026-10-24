
  (function () {
    var slider = document.getElementById('ruSlider');
    var track  = document.getElementById('ruTrack');
    var dots   = document.querySelectorAll('#ruDots .ru-dot');
    var total  = dots.length, idx = 0, timer = null, DELAY = 4000;

    function go(n) {
      idx = (n + total) % total;
      track.style.transform = 'translateX(' + (-idx * 100) + '%)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
    }
    function start() { stop(); timer = setInterval(function () { go(idx + 1); }, DELAY); }
    function stop()  { if (timer) { clearInterval(timer); timer = null; } }

    document.getElementById('ruPrev').addEventListener('click', function (e) { e.stopPropagation(); go(idx - 1); start(); });
    document.getElementById('ruNext').addEventListener('click', function (e) { e.stopPropagation(); go(idx + 1); start(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); start(); }); });

    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    // Vuốt trên điện thoại (vuốt = chuyển ảnh, chạm = về index)
    var sx = 0, moved = false;
    slider.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; moved = false; stop(); }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { moved = true; go(dx < 0 ? idx + 1 : idx - 1); }
      start();
    });

    // Bấm vào ảnh -> quay về trang index
    slider.addEventListener('click', function () {
      if (moved) { moved = false; return; }
      window.location.href = 'index.html';
    });

    // Chặn chuột phải, kéo thả, chọn, giữ ảnh
    ['contextmenu', 'dragstart', 'selectstart', 'copy', 'cut'].forEach(function (ev) {
      slider.addEventListener(ev, function (e) { e.preventDefault(); });
    });

    // Tạm dừng khi chuyển tab để tiết kiệm tài nguyên
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    go(0);
    var loaded = 0;
    document.querySelectorAll('.ru-slide img').forEach(function (im) {
      function done() { if (++loaded === total) start(); }
      if (im.complete && im.naturalWidth) done(); else { im.addEventListener('load', done); im.addEventListener('error', done); }
    });
  })();
  