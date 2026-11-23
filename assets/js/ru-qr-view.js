/* ReadUp — Khung hiển thị mã QR điểm danh của GIÁO VIÊN.
   Dùng chung cho: (1) cửa sổ cấu hình trong teacher.html, (2) trang riêng qr-display.html (chiếu lên máy chiếu).
   Cần: thư viện qrcode-generator (global `qrcode`), supabase client truyền vào.
   Mã đổi theo chu kỳ (mặc định 10 giây) do SERVER tính; trang này chỉ hỏi server mã hiện tại. */
(function (w) {
  'use strict';
  const RL = () => { try { return localStorage.getItem('readup-language') === 'en' ? 'en' : 'vi'; } catch (e) { return 'vi'; } };
  const T = (vi, en) => RL() === 'en' ? en : vi;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vnTime = iso => { try { return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }); } catch (e) { return ''; } };

  function checkinUrl(sessionId, code) {
    const u = new URL('checkin.html', location.href);
    u.search = '';
    u.searchParams.set('s', sessionId);
    u.searchParams.set('c', code);
    return u.toString();
  }

  function qrSvg(text) {
    if (!w.qrcode) return '<p style="color:#b91c1c;font-size:12px">' + esc(T('Chưa tải được thư viện tạo QR (kiểm tra mạng).', 'QR library failed to load (check your connection).')) + '</p>';
    const q = w.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  }

  /* mount(root, { sb, sessionId, compact, onCount, onClosed }) → { stop(), refresh() } */
  function mount(root, opt) {
    const sb = opt.sb, sid = String(opt.sessionId);
    let stopped = false, timer = null, tick = null, expiresAt = 0, rotate = 0, lastCode = '', lastChecked = null, busy = false, lastFetch = 0, showPw = false, state = null;

    root.innerHTML = `
      <div class="rqv ${opt.compact ? 'rqv-compact' : 'rqv-full'}">
        <div class="rqv-main">
          <div class="rqv-qrbox"><div class="rqv-qr" data-r="qr"></div><div class="rqv-veil" data-r="veil"></div></div>
          <div class="rqv-bar" data-r="barwrap"><span data-r="bar"></span></div>
          <div class="rqv-timer" data-r="timer"></div>
          <div class="rqv-hint">${esc(T('Học sinh chỉ cần quét QR bằng nút “Điểm danh QR” hoặc camera điện thoại.', 'Students just scan the QR with “QR Check-in” or their phone camera.'))}</div>
        </div>
        <div class="rqv-side">
          <div class="rqv-stat"><b data-r="done">0</b><span>/ <span data-r="total">0</span> ${esc(T('đã điểm danh', 'checked in'))}</span></div>
          <div class="rqv-info" data-r="info"></div>
          <div class="rqv-pw" data-r="pw"></div>
          <div class="rqv-recent-h">${esc(T('Vừa điểm danh', 'Just checked in'))}</div>
          <ul class="rqv-recent" data-r="recent"></ul>
          <div class="rqv-err" data-r="err"></div>
        </div>
      </div>`;
    const $ = k => root.querySelector('[data-r="' + k + '"]');

    function paint(d) {
      state = d;
      rotate = d.rotate_seconds || 0;
      $('done').textContent = d.checked_in; $('total').textContent = d.total_students;
      const live = d.is_open && d.in_window;
      const v = $('veil');
      if (!live) {
        v.style.display = 'flex';
        v.textContent = !d.is_open ? T('Mã đã đóng', 'Code closed')
          : (new Date(d.server_now) < new Date(d.starts_at) ? T('Chưa tới giờ điểm danh (' + vnTime(d.starts_at) + ')', 'Check-in opens at ' + vnTime(d.starts_at))
            : T('Đã hết giờ điểm danh (' + vnTime(d.ends_at) + ')', 'Check-in ended at ' + vnTime(d.ends_at)));
      } else v.style.display = 'none';

      if (d.code !== lastCode) { lastCode = d.code; $('qr').innerHTML = qrSvg(checkinUrl(sid, d.code)); }
      $('barwrap').style.display = (rotate > 0 && live) ? 'block' : 'none';
      $('timer').textContent = rotate > 0 ? '' : T('Mã cố định trong suốt buổi học', 'Static code for the whole session');
      expiresAt = rotate > 0 && d.seconds_left != null ? performance.now() + d.seconds_left * 1000 : 0;

      $('info').innerHTML =
        `<div>🕒 ${esc(vnTime(d.starts_at))} – ${esc(vnTime(d.ends_at))}</div>` +
        `<div>🔄 ${rotate > 0 ? esc(T('Đổi mã mỗi ' + rotate + ' giây', 'New code every ' + rotate + 's')) : esc(T('Mã cố định', 'Static code'))}</div>` +
        `<div>📍 ${d.require_location ? esc(T('Bắt buộc vị trí (≤ ' + d.radius_m + ' m)', 'Location required (≤ ' + d.radius_m + ' m)')) : esc(T('Không yêu cầu vị trí', 'No location check'))}</div>` +
        (d.late_after_minutes != null ? `<div>⏱ ${esc(T('Quét sau ' + d.late_after_minutes + ' phút tính Muộn (L)', 'Scans after ' + d.late_after_minutes + ' min count as Late (L)'))}</div>` : '');
      $('pw').innerHTML = d.password
        ? `<span>${esc(T('Mật khẩu', 'Password'))}:</span> <b>${showPw ? esc(d.password) : '••••••'}</b> <button type="button" data-r="pwbtn">${esc(showPw ? T('Ẩn', 'Hide') : T('Hiện', 'Show'))}</button>`
        : `<span>${esc(T('Không cần mật khẩu — quét là điểm danh.', 'No password — scanning is enough.'))}</span>`;
      const pb = root.querySelector('[data-r="pwbtn"]'); if (pb) pb.onclick = () => { showPw = !showPw; paint(state); };
      $('recent').innerHTML = (d.recent || []).map(r => `<li><span>${esc(r.name)}</span><em class="rqv-${esc(r.status)}">${esc(r.status)}</em><small>${esc(vnTime(r.at))}</small></li>`).join('') || `<li class="rqv-none">${esc(T('Chưa có ai quét.', 'Nobody yet.'))}</li>`;
      $('err').textContent = '';
      if (lastChecked !== null && d.checked_in !== lastChecked && opt.onCount) { try { opt.onCount(d.checked_in); } catch (e) {} }
      lastChecked = d.checked_in;
    }

    async function fetchNow() {
      if (stopped || busy) return; busy = true;
      try {
        const { data, error } = await sb.rpc('qr_teacher_current', { p_session_id: sid });
        if (error) throw error;
        if (!data || !data.ok) { $('err').textContent = data && data.error === 'forbidden' ? T('Tài khoản này không có quyền với lớp này.', 'No permission for this class.') : T('Buổi này chưa bật mã QR.', 'QR not enabled for this session.'); }
        else paint(data);
      } catch (e) { $('err').textContent = T('Mất kết nối, đang thử lại… ', 'Connection lost, retrying… ') + (e.message || ''); }
      finally { busy = false; lastFetch = performance.now(); }
    }

    function loop() {
      if (stopped) return;
      const now = performance.now();
      if (expiresAt) {
        const left = Math.max(0, expiresAt - now);
        $('timer').textContent = T('Mã đổi sau ', 'New code in ') + Math.ceil(left / 1000) + 's';
        $('bar').style.width = Math.min(100, (left / (rotate * 1000)) * 100) + '%';
        if (left <= 0 && now - lastFetch > 700) fetchNow();
      }
      if (now - lastFetch > 4000) fetchNow();   // cập nhật số lượng/danh sách vừa quét
      tick = setTimeout(loop, 250);
    }

    fetchNow().then(loop);
    return {
      refresh: fetchNow,
      stop() { stopped = true; clearTimeout(tick); clearTimeout(timer); root.innerHTML = ''; }
    };
  }

  const CSS = `
  .rqv{display:grid;gap:18px;font-family:inherit;color:#1f2430}
  .rqv-full{grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);align-items:start}
  .rqv-compact{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  @media(max-width:760px){.rqv-full,.rqv-compact{grid-template-columns:1fr}}
  .rqv-main{display:flex;flex-direction:column;align-items:center;gap:10px}
  .rqv-qrbox{position:relative;width:100%;max-width:520px;aspect-ratio:1/1;background:#fff;border:3px solid #cf1717;border-radius:18px;padding:10px;box-sizing:border-box}
  .rqv-compact .rqv-qrbox{max-width:260px}
  .rqv-qr,.rqv-qr svg{width:100%;height:100%;display:block}
  .rqv-veil{display:none;position:absolute;inset:0;background:rgba(255,255,255,.95);border-radius:15px;align-items:center;justify-content:center;text-align:center;padding:16px;font-weight:800;color:#b91c1c}
  .rqv-bar{display:none;width:100%;max-width:520px;height:8px;background:#eadede;border-radius:99px;overflow:hidden}
  .rqv-compact .rqv-bar{max-width:260px}
  .rqv-bar span{display:block;height:100%;width:100%;background:#cf1717;border-radius:99px;transition:width .25s linear}
  .rqv-timer{font-size:13px;font-weight:700;color:#6b7280;min-height:18px}
  .rqv-code{font-size:56px;line-height:1;font-weight:900;letter-spacing:.08em;color:#cf1717;font-variant-numeric:tabular-nums}
  .rqv-compact .rqv-code{font-size:32px}
  .rqv-hint{font-size:12px;color:#6b7280;text-align:center;max-width:420px}
  .rqv-stat{font-size:15px;color:#4b5563}.rqv-stat b{font-size:44px;color:#047857;margin-right:4px}
  .rqv-compact .rqv-stat b{font-size:30px}
  .rqv-info{margin-top:8px;font-size:13px;line-height:1.8;color:#374151}
  .rqv-pw{margin-top:8px;font-size:13px;padding:8px 10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px}
  .rqv-pw button{font-size:11px;font-weight:800;border:1px solid #d1d5db;border-radius:8px;padding:1px 8px;background:#fff;cursor:pointer}
  .rqv-recent-h{margin-top:12px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af}
  .rqv-recent{list-style:none;margin:6px 0 0;padding:0;max-height:260px;overflow:auto}
  .rqv-compact .rqv-recent{max-height:140px}
  .rqv-recent li{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f1f1f4;font-size:13px}
  .rqv-recent li span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
  .rqv-recent em{font-style:normal;font-weight:900;font-size:11px;border-radius:6px;padding:1px 7px}
  .rqv-P{background:#c8e6c9;color:#1b5e20}.rqv-L{background:#fff3b0;color:#7a5b00}
  .rqv-recent small{color:#9ca3af}.rqv-none{color:#9ca3af;font-style:italic}
  .rqv-err{margin-top:8px;font-size:12px;color:#b91c1c;min-height:14px}
  .dark .rqv{color:#e5e7eb}.dark .rqv-info,.dark .rqv-stat{color:#d1d5db}
  .dark .rqv-recent li{border-color:#3f3f46}.dark .rqv-pw{background:#3a2a14;border-color:#7c4a14}.dark .rqv-pw button{background:#27272a;color:#e5e7eb;border-color:#52525b}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  w.RUQRView = { mount, checkinUrl, vnTime };
})(window);
