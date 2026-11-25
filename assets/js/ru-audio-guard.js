/* ReadUp audio guard — dùng chung cho test.html và assignment.html.
   Khi học sinh THOÁT khỏi màn làm bài (nộp bài, sang màn kết quả, đổi màn hình, rời/đóng trang, bfcache)
   thì mọi âm thanh / video (bài nghe) tự động dừng. Không dừng khi chỉ chuyển trang câu hỏi / tab bài đọc,
   để học sinh vẫn nghe liên tục lúc làm bài. */
(function () {
  'use strict';
  if (window.RUAudioGuard) return;

  // Các "màn hình" lớn của 2 trang: nếu media nằm trong màn đang bị ẩn thì coi như đã thoát khỏi màn đó.
  var VIEW_SEL = '#exam,#attemptView,#resultView,#listView,#classPickView,#loginView';
  var playing = new Set();

  function inHiddenView(el) {
    var v = el.closest && el.closest(VIEW_SEL);
    return !!(v && v.getClientRects().length === 0);
  }
  function isGone(el) { return !el.isConnected || inHiddenView(el); }
  function pause(m) { try { m.pause(); } catch (e) {} playing.delete(m); }

  // Dừng toàn bộ media trong root (mặc định cả trang). frames:true -> ngắt luôn khung nhúng (YouTube, Drive...).
  function stopAll(root, opts) {
    root = root || document; opts = opts || {};
    if (root.querySelectorAll) root.querySelectorAll('audio,video').forEach(pause);
    playing.forEach(function (m) { if (!root.contains || root === document || root.contains(m)) pause(m); });
    if (opts.frames && root.querySelectorAll) root.querySelectorAll('iframe').forEach(blankFrame);
  }
  function blankFrame(f) {
    var src = f.getAttribute('src');
    if (!src || src === 'about:blank') return;
    f.setAttribute('data-ru-src', src);
    f.setAttribute('src', 'about:blank');
  }

  document.addEventListener('play', function (e) {
    var t = e.target; if (t && t.matches && t.matches('audio,video')) playing.add(t);
  }, true);
  ['pause', 'ended'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { playing.delete(e.target); }, true);
  });

  function sweep() {
    playing.forEach(function (m) { if (isGone(m)) pause(m); });
    // khung nhúng (YouTube/Drive...) nằm trong màn đã ẩn -> ngắt; màn hiện lại -> nạp lại
    document.querySelectorAll('iframe').forEach(function (f) {
      var v = f.closest && f.closest(VIEW_SEL); if (!v) return;
      var hidden = v.getClientRects().length === 0;
      if (hidden) blankFrame(f);
      else if (f.hasAttribute('data-ru-src') && f.getAttribute('src') === 'about:blank') {
        f.setAttribute('src', f.getAttribute('data-ru-src')); f.removeAttribute('data-ru-src');
      }
    });
  }
  setInterval(sweep, 600);

  // Rời / đóng trang, hoặc trang được khôi phục từ bộ nhớ đệm (bfcache) -> dừng hết
  window.addEventListener('pagehide', function () { stopAll(document); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) stopAll(document); });

  window.RUAudioGuard = { stopAll: stopAll, sweep: sweep };
})();
