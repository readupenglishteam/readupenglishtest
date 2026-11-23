/* ReadUp — Cửa sổ "Điểm danh bằng QR" của giáo viên / trợ giảng (teacher.html).
   Chạy SAU teacher.part2.js và dùng các biến toàn cục của nó: sbClient, pel, notify, esc, attClass, attSessions, loadAttendance.
   Không thay đổi điểm danh thủ công P/L/E/A — QR chỉ ghi thêm cho học sinh chưa có dòng điểm danh.
   Cần chạy 2_qr_attendance.sql trong Supabase. */
(function (w) {
  'use strict';
  let view = null, curSid = null;

  const vnDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const vnHHMM = iso => { try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }); } catch (e) { return ''; } };
  const pad = n => String(n).padStart(2, '0');

  // "18:00 - 20:30", "18h00-20h30", "18h – 20h" → ['18:00','20:30']; không đọc được → ['','']
  function parseWindow(txt) {
    const m = [...String(txt || '').matchAll(/(\d{1,2})\s*(?:[:hH.]|giờ)\s*(\d{2})?/g)].map(x => pad(Math.min(23, +x[1])) + ':' + pad(Math.min(59, +(x[2] || 0))));
    return [m[0] || '', m[1] || ''];
  }
  const toIso = (date, hhmm) => date + 'T' + hhmm + ':00+07:00';
  const ERR = {
    forbidden: 'Bạn không có quyền với lớp này.', no_session: 'Không tìm thấy buổi học.', suspended: 'Buổi học đang tạm ngưng.',
    bad_window: 'Giờ kết thúc phải sau giờ bắt đầu.', window_not_on_session_day: 'Khung giờ phải nằm trong NGÀY của buổi học.',
    bad_rotate: 'Chu kỳ đổi mã không hợp lệ.', need_teacher_location: 'Hãy lấy vị trí của bạn (hoặc nhập tọa độ) khi bật kiểm tra vị trí.'
  };

  function ensureModal() {
    if (document.getElementById('qrAttModal')) return;
    const d = document.createElement('div');
    d.id = 'qrAttModal';
    d.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm hidden items-start justify-center p-3 z-[10001] overflow-y-auto';
    d.innerHTML = `
    <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 sm:p-6 w-full max-w-4xl my-4 shadow-2xl space-y-4">
      <div class="flex justify-between items-start gap-3 border-b dark:border-zinc-800 pb-3">
        <div class="min-w-0">
          <h3 class="font-extrabold text-lg text-[#cf1717] dark:text-red-400"><i class="bi bi-qr-code-scan"></i> Điểm danh bằng mã QR</h3>
          <p id="qaSub" class="text-xs text-gray-500 truncate"></p>
        </div>
        <button type="button" onclick="closeQrAttendance()" class="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">&times;</button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label class="block font-bold uppercase mb-1">Khung giờ mã có hiệu lực <span class="normal-case font-normal text-gray-400">(trong ngày buổi học)</span></label>
          <div class="flex items-center gap-2">
            <input id="qaStart" type="time" class="flex-1 min-w-0 p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 text-sm">
            <span class="font-bold">→</span>
            <input id="qaEnd" type="time" class="flex-1 min-w-0 p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 text-sm">
          </div>
          <p id="qaWinHint" class="text-[10px] text-gray-400 mt-1"></p>
        </div>
        <div>
          <label class="block font-bold uppercase mb-1">Đổi mã tự động</label>
          <select id="qaRotate" class="w-full p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 text-sm">
            <option value="10">Mỗi 10 giây (khuyến nghị — chống chụp ảnh mã gửi bạn)</option>
            <option value="20">Mỗi 20 giây</option>
            <option value="30">Mỗi 30 giây</option>
            <option value="60">Mỗi 60 giây</option>
            <option value="0">Mã cố định cả buổi</option>
          </select>
        </div>
        <div>
          <label class="flex items-center gap-2 font-bold uppercase mb-1"><input type="checkbox" id="qaUsePw" onchange="qrAttToggle()"> Bắt buộc mật khẩu</label>
          <div id="qaPwBox" class="hidden flex gap-2">
            <input id="qaPw" type="text" maxlength="40" placeholder="VD: 4821" class="flex-1 min-w-0 p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 text-sm">
            <button type="button" onclick="document.getElementById('qaPw').value=String(Math.floor(1000+Math.random()*9000))" class="px-3 rounded-lg border dark:border-zinc-700 font-bold">Ngẫu nhiên</button>
          </div>
          <p class="text-[10px] text-gray-400 mt-1">Tắt = học sinh quét là điểm danh luôn (như Moodle không đặt mật khẩu).</p>
        </div>
        <div>
          <label class="block font-bold uppercase mb-1">Tính Muộn (L) nếu quét sau <span class="normal-case font-normal text-gray-400">(phút, bỏ trống = luôn P)</span></label>
          <input id="qaLate" type="number" min="0" max="300" placeholder="VD: 15" class="w-full p-2.5 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700 text-sm">
        </div>
        <div class="sm:col-span-2 rounded-xl border dark:border-zinc-700 p-3 space-y-2">
          <label class="flex items-center gap-2 font-bold uppercase"><input type="checkbox" id="qaUseLoc" onchange="qrAttToggle()"> Kiểm tra vị trí học sinh</label>
          <div id="qaLocBox" class="hidden space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" onclick="qrAttGetLocation()" class="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"><i class="bi bi-geo-alt-fill"></i> Lấy vị trí của tôi (lớp học)</button>
              <span class="font-bold">Bán kính</span>
              <input id="qaRadius" type="number" min="10" max="5000" value="100" class="w-24 p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700"> <span>mét</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <input id="qaLat" type="number" step="any" placeholder="Vĩ độ (lat)" class="w-40 p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
              <input id="qaLng" type="number" step="any" placeholder="Kinh độ (lng)" class="w-40 p-2 rounded-lg border dark:bg-zinc-800 dark:border-zinc-700">
              <span id="qaLocMsg" class="text-[11px] text-gray-500"></span>
            </div>
            <p class="text-[10px] text-gray-400">Học sinh phải bật vị trí; server tính khoảng cách và từ chối nếu ngoài bán kính (có bù sai số GPS tối đa 50 m). Nên đứng trong lớp khi bấm “Lấy vị trí”.</p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" id="qaSave" onclick="qrAttSave()" class="bg-[#cf1717] hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm shadow transition"><i class="bi bi-play-fill"></i> Bắt đầu / Cập nhật mã</button>
        <button type="button" id="qaPop" onclick="qrAttPopout()" class="bg-gray-800 hover:bg-black text-white font-bold px-4 py-2.5 rounded-lg text-sm shadow transition hidden"><i class="bi bi-box-arrow-up-right"></i> Mở trang chiếu mã (tab mới)</button>
        <button type="button" id="qaStop" onclick="qrAttClose()" class="bg-gray-200 dark:bg-zinc-700 font-bold px-4 py-2.5 rounded-lg text-sm hidden"><i class="bi bi-stop-circle"></i> Đóng mã</button>
        <span id="qaMsg" class="text-xs font-bold text-[#cf1717]"></span>
      </div>

      <div id="qaView" class="border-t dark:border-zinc-800 pt-4"></div>
    </div>`;
    document.body.appendChild(d);
  }

  function setMsg(t) { const e = document.getElementById('qaMsg'); if (e) e.textContent = t || ''; }
  function sessionOf(sid) { return (typeof attSessions !== 'undefined' ? attSessions : []).find(x => String(x.id) === String(sid)); }

  w.qrAttToggle = function () {
    document.getElementById('qaPwBox').classList.toggle('hidden', !document.getElementById('qaUsePw').checked);
    document.getElementById('qaLocBox').classList.toggle('hidden', !document.getElementById('qaUseLoc').checked);
  };

  w.qrAttGetLocation = function () {
    const msg = document.getElementById('qaLocMsg');
    if (!navigator.geolocation) { msg.textContent = 'Trình duyệt không hỗ trợ định vị.'; return; }
    msg.textContent = 'Đang lấy vị trí…';
    navigator.geolocation.getCurrentPosition(p => {
      document.getElementById('qaLat').value = p.coords.latitude.toFixed(6);
      document.getElementById('qaLng').value = p.coords.longitude.toFixed(6);
      msg.textContent = '✔ Đã lấy (sai số ≈ ' + Math.round(p.coords.accuracy) + ' m)';
    }, e => { msg.textContent = 'Không lấy được vị trí: ' + (e.message || e.code) + ' — hãy cho phép vị trí hoặc nhập tay.'; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  };

  w.openQrAttendance = async function (sessionId) {
    const s = sessionOf(sessionId);
    if (!s) return notify('⚠️ Không tìm thấy buổi học.');
    ensureModal();
    curSid = String(sessionId);
    const cls = (typeof attClass !== 'undefined' && attClass) || {};
    document.getElementById('qaSub').textContent = (cls.class_code || '') + ' — ' + (cls.title || '') + ' · ' + String(s.session_date).slice(0, 10).split('-').reverse().join('/') + ' · ' + (s.session_time || '');
    const m = document.getElementById('qrAttModal'); m.classList.remove('hidden'); m.classList.add('flex');
    if (view) { view.stop(); view = null; }
    setMsg('');

    // Mặc định theo ca học (đọc từ "Ca học"); có QR từ trước thì nạp lại cấu hình cũ
    const [a, b] = parseWindow(s.session_time);
    document.getElementById('qaStart').value = a; document.getElementById('qaEnd').value = b;
    document.getElementById('qaRotate').value = '10'; document.getElementById('qaUsePw').checked = false; document.getElementById('qaPw').value = '';
    document.getElementById('qaLate').value = ''; document.getElementById('qaUseLoc').checked = false; document.getElementById('qaRadius').value = 100;
    document.getElementById('qaLat').value = ''; document.getElementById('qaLng').value = ''; document.getElementById('qaLocMsg').textContent = '';
    document.getElementById('qaWinHint').textContent = (a && b) ? 'Tự lấy từ “Ca học”: ' + s.session_time + '. Có thể chỉnh lại.' : 'Chưa đọc được giờ từ “Ca học” (' + (s.session_time || 'trống') + ') — hãy nhập giờ bắt đầu/kết thúc.';
    try { const last = JSON.parse(localStorage.getItem('ru_qr_loc_' + (cls.id || '')) || 'null'); if (last && isFinite(last.lat)) { document.getElementById('qaLat').value = last.lat; document.getElementById('qaLng').value = last.lng; document.getElementById('qaLocMsg').textContent = 'Dùng lại vị trí đã lưu lần trước (bấm “Lấy vị trí” để cập nhật).'; } } catch (e) {}
    qrAttToggle();

    const { data } = await sbClient.rpc('qr_teacher_current', { p_session_id: curSid });
    if (data && data.ok) {
      document.getElementById('qaStart').value = vnHHMM(data.starts_at); document.getElementById('qaEnd').value = vnHHMM(data.ends_at);
      document.getElementById('qaRotate').value = String(data.rotate_seconds);
      if (data.password) { document.getElementById('qaUsePw').checked = true; document.getElementById('qaPw').value = data.password; }
      if (data.late_after_minutes != null) document.getElementById('qaLate').value = data.late_after_minutes;
      qrAttToggle();
      showView(data.is_open);
    } else { showView(false); }
  };

  function showView(open) {
    const host = document.getElementById('qaView');
    document.getElementById('qaPop').classList.toggle('hidden', !open);
    document.getElementById('qaStop').classList.toggle('hidden', !open);
    if (view) { view.stop(); view = null; }
    if (!open) { host.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa bật mã. Chọn cấu hình rồi bấm “Bắt đầu / Cập nhật mã”.</p>'; return; }
    view = RUQRView.mount(host, { sb: sbClient, sessionId: curSid, compact: true, onCount: () => { try { if (typeof attClass !== 'undefined' && attClass) loadAttendance(); } catch (e) {} } });
  }

  w.qrAttSave = async function () {
    const s = sessionOf(curSid); if (!s) return;
    const date = String(s.session_date).slice(0, 10);
    const st = document.getElementById('qaStart').value, en = document.getElementById('qaEnd').value;
    if (!st || !en) return setMsg('⚠️ Hãy nhập giờ bắt đầu và giờ kết thúc.');
    if (en <= st) return setMsg('⚠️ Giờ kết thúc phải sau giờ bắt đầu.');
    const useLoc = document.getElementById('qaUseLoc').checked;
    const lat = parseFloat(document.getElementById('qaLat').value), lng = parseFloat(document.getElementById('qaLng').value);
    if (useLoc && (!isFinite(lat) || !isFinite(lng))) return setMsg('⚠️ Hãy bấm “Lấy vị trí của tôi” hoặc nhập tọa độ lớp học.');
    const pw = document.getElementById('qaUsePw').checked ? document.getElementById('qaPw').value.trim() : '';
    if (document.getElementById('qaUsePw').checked && !pw) return setMsg('⚠️ Hãy nhập mật khẩu (hoặc bỏ chọn “Bắt buộc mật khẩu”).');
    const lateV = document.getElementById('qaLate').value;
    const btn = document.getElementById('qaSave'); btn.disabled = true; setMsg('Đang lưu…');
    const { data, error } = await sbClient.rpc('qr_teacher_open', {
      p_session_id: curSid, p_starts: toIso(date, st), p_ends: toIso(date, en),
      p_rotate: parseInt(document.getElementById('qaRotate').value, 10),
      p_password: pw || null, p_require_location: useLoc, p_lat: useLoc ? lat : null, p_lng: useLoc ? lng : null,
      p_radius: parseInt(document.getElementById('qaRadius').value, 10) || 100, p_late_after: lateV === '' ? null : parseInt(lateV, 10)
    });
    btn.disabled = false;
    if (error) { setMsg('❌ ' + error.message + (/function|does not exist|schema cache/i.test(error.message) ? ' — bạn đã chạy 2_qr_attendance.sql trong Supabase chưa?' : '')); return; }
    if (!data || !data.ok) { setMsg('❌ ' + (ERR[data && data.error] || (data && data.error) || 'Không lưu được.')); return; }
    if (useLoc) { try { localStorage.setItem('ru_qr_loc_' + ((attClass && attClass.id) || ''), JSON.stringify({ lat, lng })); } catch (e) {} }
    setMsg('✔ Đã bật mã QR.');
    showView(true);
    if (date !== vnDate()) notify('ℹ️ Buổi này diễn ra ngày ' + date.split('-').reverse().join('/') + ' — mã chỉ có hiệu lực trong khung giờ của ngày đó.');
  };

  w.qrAttPopout = function () { window.open('qr-display.html?s=' + encodeURIComponent(curSid), '_blank', 'noopener'); };

  w.qrAttClose = async function () {
    if (!confirm('Đóng mã QR của buổi này? Học sinh sẽ không quét được nữa (điểm danh đã ghi vẫn giữ nguyên).')) return;
    const { data, error } = await sbClient.rpc('qr_teacher_close', { p_session_id: curSid });
    if (error || !data || !data.ok) return setMsg('❌ ' + ((error && error.message) || (data && data.error) || 'Không đóng được.'));
    setMsg('Đã đóng mã.'); showView(false);
  };

  w.closeQrAttendance = function () {
    if (view) { view.stop(); view = null; }
    const m = document.getElementById('qrAttModal'); if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    try { if (typeof attClass !== 'undefined' && attClass) loadAttendance(); } catch (e) {}
  };
})(window);
