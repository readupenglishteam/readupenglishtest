/* Source: assets/js/pages/assignment.03.js */

  // =====================================================================
  // CẤU HÌNH SUPABASE
  // =====================================================================
  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
  const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  function pel(id) { return document.getElementById(id); }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // =====================================================================
  // BỘ NHỚ ĐỆM: vẽ ngay dữ liệu của lần trước rồi âm thầm tải bản mới nhất,
  // để lịch học / danh sách bài tập cảm giác không có thời gian chờ.
  // =====================================================================
  const ruMem = {};
  const RU_CACHE_VER = 'v2';
  function cacheGet(key) {
    if (key in ruMem) return ruMem[key];
    try {
      const raw = localStorage.getItem('ru_cache_' + RU_CACHE_VER + ':' + key);
      if (raw) { const v = JSON.parse(raw); ruMem[key] = v; return v; }
    } catch (e) {}
    return null;
  }
  function cacheSet(key, val) {
    ruMem[key] = val;
    try { localStorage.setItem('ru_cache_' + RU_CACHE_VER + ':' + key, JSON.stringify(val)); } catch (e) {}
  }

  // =====================================================================
  // TOAST NOTIFICATION (giống hệ thống chung — đường màu đỏ chạy phía dưới)
  // =====================================================================
  function notify(rawMessage) {
    const msg = String(rawMessage ?? '');
    const emojiMatch = msg.match(/^(?:\p{Extended_Pictographic}|\uFE0F|\u200D)+\s*/u);
    const BI_MAP = {'🖍':'highlighter','🟢':'circle-fill','🧽':'eraser-fill','🏠':'house-door-fill','⭐':'star-fill','👤':'person-circle','🌙':'moon-stars-fill','🔑':'key-fill','📅':'calendar-event','🔄':'arrow-clockwise','⏳':'hourglass-split','🔒':'lock-fill','📝':'pencil-square','⏱':'stopwatch','✅':'check-circle-fill','🎉':'stars','💾':'floppy-fill','☕':'cup-hot','⚠':'exclamation-triangle-fill','⏰':'alarm','⛔':'slash-circle-fill','✏':'pencil','📄':'file-earmark-text','💡':'lightbulb','❌':'x-circle-fill','🔔':'bell-fill','❤':'heart-fill','💪':'hand-thumbs-up-fill','📋':'clipboard-check','📌':'pin-angle-fill','ℹ':'info-circle-fill'};
    let icon = 'bell-fill', text = msg;
    if (emojiMatch && emojiMatch[0].trim()) { const ek = emojiMatch[0].trim().replace(/\uFE0F/g, ''); icon = BI_MAP[ek] || 'bell-fill'; text = msg.slice(emojiMatch[0].length).trim() || msg; }
    let title = 'Thông báo';
    if (/❌/.test(msg) || /lỗi|thất bại|không thể/i.test(msg)) title = 'Lỗi';
    else if (/⚠️/.test(msg)) title = 'Cảnh báo';
    else if (/🎉|✅|❤️|💪|💾|📋/.test(msg)) title = 'Thành công';
    showToastNotification({ title, message: text, icon });
  }
  function showToastNotification({ title, message, icon = 'bell-fill' }) {
    const container = pel('toastContainer'); if (!container) return;
    const toastId = 'toast-' + Date.now() + Math.random().toString(36).slice(2,6);
    const html = `
      <div id="${toastId}" class="pointer-events-auto bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 translate-x-full opacity-0 relative">
        <div class="p-3.5 sm:p-4 flex items-start gap-3">
          <div class="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/80 flex-shrink-0 flex items-center justify-center text-[#cf1717] dark:text-red-400 font-bold text-base shadow-sm"><i class="bi bi-${icon}"></i></div>
          <div class="flex-1 pr-4">
            <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">${title}</h4>
            <p class="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">${message}</p>
          </div>
          <button onclick="closeToast('${toastId}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-white text-base leading-none p-1"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="h-1 bg-red-100 dark:bg-zinc-800 w-full"><div class="h-full bg-[#cf1717] animate-toast-bar"></div></div>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
    const el = pel(toastId);
    setTimeout(() => el.classList.remove('translate-x-full', 'opacity-0'), 50);
    setTimeout(() => closeToast(toastId), 5000);
  }
  function closeToast(id) { const el = pel(id); if (!el) return; el.classList.add('translate-x-full', 'opacity-0'); setTimeout(() => el.remove(), 300); }
  function openSupportHint() { notify('ℹ️ Vui lòng liên hệ trực tiếp giáo viên hoặc admin ReadUp English để nâng cấp VIP.'); }

  function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) { document.documentElement.classList.remove('dark'); localStorage.theme = 'light'; }
    else { document.documentElement.classList.add('dark'); localStorage.theme = 'dark'; }
  }

  // ===== Dropdown "dải chọn" (menu section) & menu Trang cá nhân =====
  function toggleSectionNavMenu(e) {
    if (e) e.stopPropagation();
    pel('userDropdownMenu')?.classList.add('hidden');
    pel('sectionNavMenu')?.classList.toggle('hidden');
  }
  function toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    pel('sectionNavMenu')?.classList.add('hidden');
    pel('userDropdownMenu')?.classList.toggle('hidden');
  }
  document.addEventListener('click', () => {
    pel('sectionNavMenu')?.classList.add('hidden');
    pel('userDropdownMenu')?.classList.add('hidden');
  });
  async function handleLogout() {
    sessionStorage.clear();
    await sbClient.auth.signOut();
    window.location.href = 'assignment.html';
  }

  // =====================================================================
  // TRẠNG THÁI CHUNG
  // =====================================================================
  let currentUser = null, myProfile = null;
  let allAssignments = [];
  let currentPage = 1;
  const PAGE_SIZE = 6;
  let currentAssignment = null;
  let timerInterval = null;

  // =====================================================================
  // ĐĂNG NHẬP NGAY TRONG TRANG ASSIGNMENT
  // =====================================================================
  function showLoginView(note) {
    ['classPickView', 'listView', 'attemptView'].forEach(id => pel(id)?.classList.add('hidden'));
    pel('mustChangePwBanner')?.classList.add('hidden');
    pel('headerUserArea')?.classList.add('hidden');
    pel('loginView')?.classList.remove('hidden');
    if (note) setLoginMsg(note, 'info');
    setTimeout(() => pel('loginEmail')?.focus(), 80);
  }
  function setLoginMsg(text, type = 'error') {
    const el = pel('loginMsg'); if (!el) return;
    if (!text) { el.classList.add('hidden'); el.textContent = ''; return; }
    const tone = type === 'error' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
               : type === 'ok'    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300';
    el.className = 'text-xs font-semibold rounded-xl px-3 py-2 ' + tone;
    el.textContent = text;
  }
  function setLoginBusy(busy) {
    const btn = pel('loginBtn'); if (!btn) return;
    btn.disabled = busy;
    pel('loginBtnText').textContent = busy ? 'Đang đăng nhập...' : 'Đăng nhập';
  }
  function toggleLoginPw() {
    const input = pel('loginPassword'), show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    pel('loginPwIcon').className = 'bi ' + (show ? 'bi-eye-slash' : 'bi-eye');
  }
  function loginErrText(err) {
    const m = String((err && err.message) || '').toLowerCase();
    if (m.includes('invalid login')) return 'Sai email hoặc mật khẩu.';
    if (m.includes('not confirmed')) return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư của bạn.';
    if (m.includes('failed to fetch') || m.includes('network')) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    return 'Đăng nhập thất bại: ' + ((err && err.message) || 'lỗi không xác định');
  }
  async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = pel('loginEmail').value.trim(), password = pel('loginPassword').value;
    if (!email || !password) { setLoginMsg('Vui lòng nhập đầy đủ email và mật khẩu.'); return; }
    setLoginBusy(true); setLoginMsg('');
    try {
      const { data, error } = await sbClient.auth.signInWithPassword({ email, password });
      if (error) { setLoginMsg(loginErrText(error)); return; }
      // Admin / giáo viên: giữ đúng hành vi cũ -> chuyển về trang của họ
      const { data: prof } = await sbClient.from('profiles').select('role').eq('id', data.user.id).single();
      const role = (prof && prof.role ? String(prof.role) : '').trim().toLowerCase();
      if (role === 'admin') { window.location.href = 'admin.html'; return; }
      if (role === 'teacher' || role === 'assistant') { window.location.href = 'teacher.html'; return; }
      pel('loginPassword').value = '';
      await init();   // học sinh: vào thẳng danh sách lớp / bài tập (hoặc đúng bài đang mở theo ?token=)
    } catch (err) {
      setLoginMsg(loginErrText(err));
    } finally {
      setLoginBusy(false);
    }
  }
  async function loginWithProvider(provider) {
    setLoginMsg('');
    // Quay lại đúng trang này (kèm ?token / ?class nếu có). Cần thêm URL trang này vào Redirect URLs của Supabase.
    const redirectTo = window.location.origin + window.location.pathname + window.location.search;
    const { error } = await sbClient.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setLoginMsg('Lỗi đăng nhập ' + (provider === 'google' ? 'Google' : 'Facebook') + ': ' + error.message);
  }

  async function init() {
    // Đọc phiên từ bộ nhớ trình duyệt (không gọi mạng, tự làm mới token nếu hết hạn)
    let { data: { session } } = await sbClient.auth.getSession();
    if (!session) { // đợi Supabase khôi phục phiên rồi thử lại 1 lần trước khi kết luận là chưa đăng nhập
      await new Promise(r => setTimeout(r, 700));
      ({ data: { session } } = await sbClient.auth.getSession());
    }
    const user = session && session.user;
    if (!user) { showLoginView(); return; }   // chưa đăng nhập -> hiện form ngay trong trang này
    pel('loginView')?.classList.add('hidden');
    pel('headerUserArea')?.classList.remove('hidden');
    currentUser = user;

    // Lấy thêm thông tin avatar_url nếu bạn muốn hiển thị cả avatar
    const { data: profile } = await sbClient
        .from('profiles')
        .select('full_name, role, must_change_password, avatar_url')
        .eq('id', user.id)
        .single();

    myProfile = profile || { role: 'student' };

    // Lấy tên học sinh: Ưu tiên full_name -> user_metadata -> Email -> 'Học sinh'
    const studentName = myProfile?.full_name 
        || user.user_metadata?.full_name 
        || user.email?.split('@')[0] 
        || 'Học sinh';

    // Đẩy tên vào dropdown menu
    const dropdownNameEl = document.getElementById('dropdownUserName') || pel('dropdownUserName');
    if (dropdownNameEl) {
        dropdownNameEl.innerText = studentName;
    }

    // (Tùy chọn) Cập nhật avatar nếu có
    if (myProfile?.avatar_url) {
        const avatarImg = document.getElementById('headerAvatarImg') || pel('headerAvatarImg');
        const avatarIcon = document.getElementById('headerAvatarIcon') || pel('headerAvatarIcon');
        if (avatarImg) {
            avatarImg.src = myProfile.avatar_url;
            avatarImg.classList.remove('hidden');
        }
        if (avatarIcon) avatarIcon.classList.add('hidden');
    }

    // Nhắc đổi mật khẩu lần đầu nếu tài khoản do giáo viên/admin tạo hộ (must_change_password = true)
    // Banner luôn hiện (nhẹ, không animation). Toast sẽ được hiện SAU khi màn hình đã tải xong (xem bên dưới)
    const needPwToast = !!myProfile.must_change_password;
    if (needPwToast) pel('mustChangePwBanner')?.classList.remove('hidden');

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const classId = params.get('class');
    // Tải màn hình chính XONG rồi mới hiện toast nhắc đổi mật khẩu -> hai việc không chạy song song nữa.
    // Khi đang mở trực tiếp 1 bài làm (có token) thì KHÔNG hiện toast để không làm gián đoạn việc làm bài
    // (banner đổi mật khẩu phía trên vẫn hiển thị).
    try {
      if (token) await loadAttempt(token);
      else if (classId) await loadList(classId);
      else await loadClassPicker();
    } catch (err) {
      console.error('Lỗi tải trang:', err);
    }

    if (needPwToast && !token && !sessionStorage.getItem('ru_pw_toast_shown')) {
      sessionStorage.setItem('ru_pw_toast_shown', '1');
      // đợi trình duyệt vẽ xong khung hình rồi mới hiện toast
      requestAnimationFrame(() => setTimeout(() => {
        notify('🔑 Vui lòng đổi mật khẩu ban đầu do giáo viên cấp trong trang Hồ sơ cá nhân.');
      }, 400));
    }
  }

  // =====================================================================
  // LỊCH HỌC CỦA HỌC SINH — gộp lịch mọi lớp đã tham gia, hiện ngay màn hình chính
  // Cần: file 3_student_calendar.sql (cho học sinh quyền xem lịch + điểm danh của mình sau khi chốt)
  // =====================================================================
  const scalTodayStr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  let scalSessions = [];        // toàn bộ buổi học của mọi lớp
  let scalClassMap = {};        // class_id -> { id, title, class_code }
  let scalLocked = new Set();   // session_id đã được GV chốt điểm danh
  let scalAtt = {};             // session_id -> 'P' | 'L' | 'E' | 'A' (chỉ của buổi đã chốt)
  let scalSelected = scalTodayStr();
  let scalAssignErr = '';
  let scalAssign = [];         // bài tập (đã xuất bản) của mọi lớp, có hạn nộp
  let scalMonth = (() => { const [y, m] = scalTodayStr().split('-').map(Number); return new Date(y, m - 1, 1); })();

  const SCAL_ATT = {
    P: { t: 'Có mặt',           bg: '#C8E6C9', fg: '#1B5E20' },
    L: { t: 'Đi muộn',          bg: '#FFF3B0', fg: '#7A5B00' },
    E: { t: 'Nghỉ có phép',     bg: '#BBDEFB', fg: '#0D47A1' },
    A: { t: 'Nghỉ không phép',  bg: '#FFCDD2', fg: '#B71C1C' },
  };
  const SCAL_WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  async function scalFetchAll(buildQuery) {
    const size = 1000; let from = 0, all = [];
    while (true) {
      const { data, error } = await buildQuery().range(from, from + size - 1);
      if (error) throw error;
      all = all.concat(data || []);
      if (!data || data.length < size) break;
      from += size;
    }
    return all;
  }

  async function loadStudentCalendar() {
    const box = pel('scalSelectedContent');
    const cacheKey = 'scal:' + currentUser.id;
    const cached = cacheGet(cacheKey);
    if (cached) {
      scalSessions = cached.sessions || []; scalAssign = cached.assign || [];
      scalLocked = new Set(cached.locked || []); scalAtt = cached.att || {};
      scalClassMap = cached.classMap || {};
      scalRenderReminder(); scalRender();
    }
    try {
      const { data: cls, error: cErr } = await sbClient.from('class_students').select('class_id, classes(id, title, class_code)').eq('student_id', currentUser.id);
      if (cErr) throw cErr;
      scalClassMap = {};
      (cls || []).forEach(r => { if (r.classes) scalClassMap[r.classes.id] = r.classes; });
      const classIds = Object.keys(scalClassMap);
      if (!classIds.length) {
        scalSessions = []; scalAssign = []; scalLocked = new Set(); scalAtt = {};
        cacheSet(cacheKey, { sessions: [], assign: [], locked: [], att: {}, classMap: {} });
        scalRenderReminder(); scalRender();
        if (!cached) box.innerHTML = '<p class="text-xs text-gray-400 italic">Bạn chưa tham gia lớp nào nên chưa có lịch học.</p>';
        return;
      }
      scalSessions = await scalFetchAll(() => sbClient.from('class_schedule_sessions').select('*').in('class_id', classIds).order('session_date', { ascending: true }).order('id'));

      // Bài tập đã xuất bản của các lớp — hiển thị nhỏ trên lịch theo hạn nộp
      try {
        scalAssignErr = ''; scalAssign = await scalFetchAll(() => sbClient.from('assignments').select('id, token, title, due_date, class_id').in('class_id', classIds).eq('is_published', true).not('is_test', 'is', true).not('due_date', 'is', null).order('due_date', { ascending: true }));
      } catch (e) { scalAssignErr = e.message || String(e); console.error('Không tải được hạn nộp bài tập:', e); }

      // Trạng thái điểm danh: chỉ lấy của các buổi GV ĐÃ CHỐT (nếu chưa chạy SQL chốt thì coi như chưa chốt)
      scalLocked = new Set(); scalAtt = {};
      try {
        const locks = await scalFetchAll(() => sbClient.from('class_attendance_locks').select('session_id').in('class_id', classIds).order('session_id'));
        scalLocked = new Set(locks.map(r => r.session_id));
        if (scalLocked.size) {
          const rows = await scalFetchAll(() => sbClient.from('class_attendance').select('session_id, status').eq('student_id', currentUser.id).in('class_id', classIds).order('id'));
          rows.forEach(r => { if (scalLocked.has(r.session_id)) scalAtt[r.session_id] = r.status; });
        }
      } catch (e) { console.warn('Không tải được trạng thái điểm danh:', e); }

      cacheSet(cacheKey, { sessions: scalSessions, assign: scalAssign, locked: [...scalLocked], att: scalAtt, classMap: scalClassMap });
      scalRenderReminder();
      scalRender();
    } catch (err) {
      if (!cached) box.innerHTML = `<p class="text-red-500 text-xs">Lỗi tải lịch học: ${esc(err.message || err)}<br><span class="text-gray-400">Đã chạy file <b>3_student_calendar.sql</b> trong Supabase chưa?</span></p>`;
      else console.warn('Làm mới lịch học thất bại, đang dùng bản đã lưu:', err);
    }
  }

  function scalShiftMonth(n) { scalMonth = new Date(scalMonth.getFullYear(), scalMonth.getMonth() + n, 1); scalRenderGrid(); }
  function scalSelect(dateStr) { scalSelected = dateStr; scalRenderGrid(); scalRenderDetail(); }
  function scalGoToday() {
    const t = scalTodayStr(); const [y, m] = t.split('-').map(Number);
    scalMonth = new Date(y, m - 1, 1); scalSelect(t);
  }
  function scalRender() { scalRenderGrid(); scalRenderDetail(); }

  function scalRenderGrid() {
    const year = scalMonth.getFullYear(), month = scalMonth.getMonth();
    pel('scalMonthYear').innerText = `Tháng ${month + 1}, ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    const lead = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = scalTodayStr();

    const info = {};  // date -> { total, suspended }
    scalSessions.forEach(s => {
      if (!s.session_date) return;
      const d = String(s.session_date).slice(0, 10);
      const o = info[d] || (info[d] = { total: 0, suspended: 0 });
      o.total++; if (s.status === 'suspended') o.suspended++;
    });
    const dueInfo = {}; // date -> số bài tập đến hạn ngày đó
    scalAssign.forEach(x => {
      const d = String(x.due_date || '').slice(0, 10);
      if (d) dueInfo[d] = (dueInfo[d] || 0) + 1;
    });

    let html = '<div class="p-2"></div>'.repeat(lead);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sel = ds === scalSelected, today = ds === todayStr, o = info[ds];
      let cls = 'hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300';
      if (sel) cls = 'bg-[#cf1717] text-white font-black shadow-md';
      else if (today) cls = 'border-2 border-[#cf1717] font-bold text-[#cf1717] dark:text-red-400';
      let dot = '<span class="w-2 h-2 mt-1"></span>';
      if (o) {
        const allSusp = o.suspended === o.total;
        dot = `<span class="w-2 h-2 mt-1 rounded-full shadow-sm ${sel ? 'bg-white' : (allSusp ? 'bg-gray-400' : 'bg-[#cf1717]')}"></span>`;
      }
      // Chấm bài tập: nhỏ hơn hẳn chấm lịch học, đặt cạnh dưới
      const dueCount = dueInfo[ds] || 0;
      const dueDot = dueCount
        ? `<span class="w-1.5 h-1.5 rounded-full ${sel ? 'bg-white' : 'bg-amber-500'}" style="margin-top:1px" title="${dueCount} bài tập đến hạn"></span>`
        : '';
      html += `<div onclick="scalSelect('${ds}')" class="p-2 sm:p-2.5 rounded-xl cursor-pointer transition flex flex-col items-center justify-center min-h-[42px] ${cls}">
        <span class="text-xs sm:text-sm font-bold">${d}</span>${dot}${dueDot}</div>`;
    }
    pel('scalDaysGrid').innerHTML = html;
  }

  function scalRenderDetail() {
    const [y, m, d] = scalSelected.split('-').map(Number);
    const wd = SCAL_WEEKDAY[new Date(y, m - 1, d).getDay()];
    const list = scalSessions
      .filter(s => String(s.session_date || '').slice(0, 10) === scalSelected)
      .sort((a, b) => String(a.session_time || '').localeCompare(String(b.session_time || ''), 'vi', { numeric: true }));
    const dd = String(d).padStart(2, '0'), mm = String(m).padStart(2, '0');
    pel('scalSelectedTitle').innerText = `${wd}, ${dd}/${mm}/${y}${list.length ? ` (${list.length} lịch học)` : ''}`;

    const box = pel('scalSelectedContent');
    if (!list.length) {
      box.innerHTML = `<div class="p-8 text-center bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
        <span class="text-2xl block mb-1"><i class="bi bi-cup-hot"></i></span><p class="text-xs text-gray-400 font-medium">Không có buổi học nào trong ngày này.</p></div>` + scalAssignCardsHtml();
      return;
    }

    box.innerHTML = list.map(s => {
      const cls = scalClassMap[s.class_id] || {};
      const susp = s.status === 'suspended';
      let attLine = '';
      if (!susp) {
        let val;
        if (scalLocked.has(s.id)) {
          const a = SCAL_ATT[scalAtt[s.id]];
          val = a ? `<span class="sc-att" style="background:${a.bg};color:${a.fg}">${a.t}</span>` : '<span class="text-gray-400">Chưa ghi nhận</span>';
        } else {
          val = '<span class="text-gray-400 italic font-normal">Chờ giáo viên chốt</span>';
        }
        attLine = `<p><b>Trạng thái điểm danh</b>: ${val}</p>`;
      }
      return `
      <div class="flex gap-3">
        <div class="flex flex-col items-center pt-1">
          <span class="w-4 h-4 rounded-full bg-white dark:bg-zinc-900 border-[5px] border-[#0f4c4c] flex-shrink-0"></span>
          <span class="flex-1 w-1 mt-1 rounded bg-[#4b9a95]"></span>
        </div>
        <div class="sc-card flex-1 rounded-2xl p-4 pb-5 text-sm space-y-1.5 ${susp ? 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 pr-12 min-h-[150px]' : 'bg-gray-50 dark:bg-zinc-800/80 border border-gray-200/80 dark:border-zinc-700/80'} text-gray-900 dark:text-gray-100">
          ${susp ? '<div class="sc-alert">!</div><div class="sc-ribbon">Tạm ngưng học</div>' : ''}
          <p class="text-[11px]"><a href="assignment.html?class=${encodeURIComponent(s.class_id)}" title="Vào lớp học này để xem bài tập" class="font-black text-[#cf1717] bg-red-100/80 dark:bg-red-950 px-2 py-0.5 rounded-md hover:bg-[#cf1717] hover:text-white transition cursor-pointer no-underline">${esc(cls.class_code || '')} ›</a>
            <span class="text-gray-500 dark:text-gray-400 ml-1">${esc(cls.title || 'Lớp học')}</span></p>
          <p class="font-extrabold text-base leading-snug">${esc(s.subject_name || '(chưa rõ tên buổi)')}</p>
          <p><b>Phòng</b>: ${esc(s.room || '—')}</p>
          <p><b>Thời gian</b>: ${esc(s.session_time || '—')}</p>
          ${s.lecturer ? `<p><b>Giảng viên</b>: ${esc(s.lecturer)}</p>` : ''}
          <p><b>Ghi chú</b>${s.note ? ': ' + esc(s.note) : ''}</p>
          ${attLine}
        </div>
      </div>`;
    }).join('') + scalAssignCardsHtml();
  }

  // Bài tập đến hạn đúng ngày đang chọn — thẻ nhỏ hơn thẻ buổi học, bấm vào để làm bài luôn
  function scalDueTone(diffDays) {
    if (diffDays < 0) return { bar: 'bg-gray-400', tag: 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-gray-300', label: 'Đã quá hạn' };
    if (diffDays === 0) return { bar: 'bg-[#cf1717]', tag: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400', label: 'Hạn hôm nay' };
    return { bar: 'bg-amber-400', tag: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400', label: `Còn ${diffDays} ngày` };
  }
  function scalAssignRowHtml(x, todayStr) {
    const cls = scalClassMap[x.class_id] || {};
    const dd = String(x.due_date).slice(0, 10);
    const diffDays = Math.round((new Date(dd) - new Date(todayStr)) / 86400000);
    const tone = scalDueTone(diffDays);
    const [yy, mm, d2] = dd.split('-');
    return `<a href="assignment.html?token=${encodeURIComponent(x.token)}" class="flex items-center gap-2 bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl pl-2 pr-3 py-2 text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5 transition no-underline text-gray-900 dark:text-gray-100">
      <span class="w-1.5 self-stretch rounded-full ${tone.bar} flex-shrink-0"></span>
      <span class="flex-1 min-w-0">
        <span class="block font-bold truncate">${esc(x.title)}</span>
        <span class="block text-[10px] text-gray-400 truncate">${esc(cls.class_code || '')} · ${esc(cls.title || '')} · Hạn ${d2}/${mm}/${yy}</span>
      </span>
      <span class="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${tone.tag}">${tone.label}</span>
    </a>`;
  }
  function scalAssignCardsHtml() {
    const todayStr = scalTodayStr();
    let html = '';
    if (scalAssignErr) html += `<p class="text-[11px] text-red-500 pt-1"><i class="bi bi-exclamation-triangle-fill"></i> Không tải được bài tập trên lịch: ${esc(scalAssignErr)}</p>`;
    const list = scalAssign.filter(x => String(x.due_date || '').slice(0, 10) === scalSelected);
    if (list.length) html += `<div class="pt-1 space-y-1.5"><p class="text-[10px] font-bold uppercase text-amber-600 pl-1"><i class="bi bi-pencil-square"></i> Bài tập đến hạn ngày này</p>${list.map(x => scalAssignRowHtml(x, todayStr)).join('')}</div>`;
    // Bài tập sắp đến hạn (mọi tháng) để không phải lật từng tháng mới thấy
    const upcoming = scalAssign
      .filter(x => { const d = String(x.due_date || '').slice(0, 10); return d >= todayStr && d !== scalSelected; })
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))).slice(0, 5);
    if (upcoming.length) html += `<div class="pt-2 space-y-1.5 border-t border-dashed border-gray-200 dark:border-zinc-800"><p class="text-[10px] font-bold uppercase text-amber-600 pl-1"><i class="bi bi-pin-angle-fill"></i> Bài tập sắp đến hạn</p>${upcoming.map(x => scalAssignRowHtml(x, todayStr)).join('')}</div>`;
    return html;
  }

  // Lời nhắc trên đầu lịch: tổng hợp bài tập sắp đến hạn / đã quá hạn trên MỌI ngày (không chỉ ngày đang chọn)
  function scalRenderReminder() {
    const box = pel('scalReminderBox');
    if (!box) return;
    const todayStr = scalTodayStr();
    const upcoming = scalAssign
      .map(x => ({ ...x, diffDays: Math.round((new Date(String(x.due_date).slice(0, 10)) - new Date(todayStr)) / 86400000) }))
      .filter(x => x.diffDays >= -2 && x.diffDays <= 3) // quá hạn tối đa 2 ngày trước hoặc sắp tới trong 3 ngày
      .sort((a, b) => a.diffDays - b.diffDays);
    if (!upcoming.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    const overdue = upcoming.filter(x => x.diffDays < 0).length;
    const dueToday = upcoming.filter(x => x.diffDays === 0).length;
    const parts = [];
    if (overdue) parts.push(`<b>${overdue}</b> đã quá hạn`);
    if (dueToday) parts.push(`<b>${dueToday}</b> hạn hôm nay`);
    const soon = upcoming.length - overdue - dueToday;
    if (soon) parts.push(`<b>${soon}</b> sắp đến hạn`);
    box.classList.remove('hidden');
    box.innerHTML = `<button type="button" onclick="scalJumpToFirstDue()" class="w-full text-left text-[11px] font-bold px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:brightness-105 transition">
      <i class="bi bi-bell-fill"></i> Bạn có bài tập ${parts.join(', ')} — bấm để xem
    </button>`;
  }
  function scalJumpToFirstDue() {
    if (!scalAssign.length) return;
    const todayStr = scalTodayStr();
    const first = scalAssign
      .map(x => ({ ...x, diffDays: Math.round((new Date(String(x.due_date).slice(0, 10)) - new Date(todayStr)) / 86400000) }))
      .filter(x => x.diffDays >= -2 && x.diffDays <= 3)
      .sort((a, b) => a.diffDays - b.diffDays)[0];
    if (!first) return;
    const [y, m] = String(first.due_date).slice(0, 10).split('-').map(Number);
    scalMonth = new Date(y, m - 1, 1);
    scalSelect(String(first.due_date).slice(0, 10));
  }

  // =====================================================================
  // KẾT QUẢ HỌC TẬP — học sinh chọn lớp rồi xem bảng điểm của chính mình
  // Cách tính giống trang teacher (Quản lý điểm): lấy cấu hình từ bảng class_grade_config
  // Cần: file 4_student_grades.sql (cho học sinh quyền ĐỌC cách tính điểm của lớp mình)
  // =====================================================================
  const GR_DEFAULT_CFG = { qtMode: 'all', qtIds: [], ckMode: 'all', ckIds: [], attPct: 0, qtPct: 40, ckPct: 60, missingZero: true, attInQt: false };
  let grClasses = {}, grSeq = 0;

  const grNum = v => { if (v == null) return '—'; const r = Math.round(v * 100) / 100; return Number.isInteger(r) ? r.toFixed(1) : String(r); };
  const grNum2 = v => v == null ? '—' : (Math.round(v * 100) / 100).toFixed(2);
  const grAvg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  function grScoreColor(v) { return v == null ? '#9ca3af' : v >= 8 ? '#15803d' : v >= 7 ? '#0369a1' : v >= 5 ? '#b45309' : '#b91c1c'; }
  function grRank(s) {
    if (s == null) return null;
    if (s >= 9) return { t: 'Xuất sắc', bg: '#C8E6C9', fg: '#1B5E20' };
    if (s >= 8) return { t: 'Giỏi', bg: '#DCEDC8', fg: '#33691E' };
    if (s >= 7) return { t: 'Khá', bg: '#BBDEFB', fg: '#0D47A1' };
    if (s >= 5) return { t: 'Trung bình', bg: '#FFF3B0', fg: '#7A5B00' };
    if (s >= 4) return { t: 'Yếu', bg: '#FFE0B2', fg: '#E65100' };
    return { t: 'Kém', bg: '#FFCDD2', fg: '#B71C1C' };
  }

  async function grLoadClasses() {
    const sel = pel('grClassSelect'), body = pel('grBody');
    if (!sel || !body) return;
    const { data, error } = await sbClient.from('class_students').select('class_id, classes(id, title, class_code)').eq('student_id', currentUser.id);
    if (error) { body.innerHTML = `<p class="text-red-500 text-xs">Lỗi tải danh sách lớp: ${esc(error.message)}</p>`; return; }
    const rows = (data || []).filter(r => r.classes);
    grClasses = {}; rows.forEach(r => { grClasses[String(r.classes.id)] = r.classes; });
    sel.innerHTML = '<option value="">-- Chọn lớp để xem kết quả học tập --</option>' +
      rows.map(r => `<option value="${esc(r.classes.id)}">${esc(r.classes.class_code)} — ${esc(r.classes.title)}</option>`).join('');
    if (!rows.length) { body.innerHTML = '<p class="text-xs text-gray-400 italic">Bạn chưa tham gia lớp học nào nên chưa có kết quả học tập.</p>'; return; }
    body.innerHTML = '<p class="text-gray-400 text-sm"><i class="bi bi-arrow-up-circle"></i> Hãy chọn một lớp ở trên để xem kết quả học tập.</p>';
    if (rows.length === 1) { sel.value = String(rows[0].classes.id); loadGradeReport(); }   // chỉ có 1 lớp -> xem luôn
  }

  async function loadGradeReport() {
    const cid = pel('grClassSelect').value, body = pel('grBody');
    pel('btnGrReload').disabled = !cid;
    if (!cid) { body.innerHTML = '<p class="text-gray-400 text-sm"><i class="bi bi-arrow-up-circle"></i> Hãy chọn một lớp ở trên để xem kết quả học tập.</p>'; return; }
    const seq = ++grSeq;
    body.innerHTML = '<p class="text-xs text-gray-400 italic"><i class="bi bi-hourglass-split"></i> Đang tải kết quả học tập...</p>';
    try {
      const cfgP = (async () => {
        try {
          const { data, error } = await sbClient.from('class_grade_config').select('config').eq('class_id', cid).maybeSingle();
          if (!error && data && data.config) return data.config;
        } catch (e) { /* chưa có bảng / chưa cấp quyền -> dùng mặc định */ }
        return null;
      })();
      const lockP = scalFetchAll(() => sbClient.from('class_attendance_locks').select('session_id').eq('class_id', cid).order('session_id')).catch(() => []);
      const attP = scalFetchAll(() => sbClient.from('class_attendance').select('session_id, status').eq('student_id', currentUser.id).eq('class_id', cid).order('id')).catch(() => []);
      const sesP = scalFetchAll(() => sbClient.from('class_schedule_sessions').select('id, session_date, status').eq('class_id', cid).order('id')).catch(() => []);
      const asP = sbClient.from('assignments').select('id, title, is_test, total_points, created_at').eq('class_id', cid).eq('is_published', true).order('created_at', { ascending: true });
      const [cfgRaw, locks, attRows, sessions, asRes] = await Promise.all([cfgP, lockP, attP, sesP, asP]);
      if (asRes.error) throw asRes.error;
      const assigns = asRes.data || [];
      let attempts = [];
      if (assigns.length) {
        const { data, error } = await sbClient.from('assignment_attempts').select('assignment_id, auto_score, total_points, manual_scores').eq('student_id', currentUser.id).in('assignment_id', assigns.map(a => a.id));
        if (error) throw error;
        attempts = data || [];
      }
      if (seq !== grSeq) return;   // người dùng đã đổi lớp khác trong lúc đang tải
      grRender(cid, { cfg: { ...GR_DEFAULT_CFG, ...(cfgRaw || {}) }, locks, attRows, sessions, assigns, attempts });
    } catch (err) {
      if (seq !== grSeq) return;
      body.innerHTML = `<p class="text-red-500 text-xs">Lỗi tải kết quả học tập: ${esc(err.message || err)}</p>`;
    }
  }

  function grRender(cid, d) {
    const { cfg, locks, attRows, sessions, assigns, attempts } = d;
    const cls = grClasses[String(cid)] || {};
    const studentName = myProfile?.full_name || currentUser.user_metadata?.full_name || (currentUser.email || '').split('@')[0] || 'Học sinh';

    // ---- Chuyên cần: học sinh chỉ thấy điểm danh của các buổi GV đã chốt -> chỉ tính các buổi đã chốt & đã học
    const today = scalTodayStr(), lockedSet = new Set(locks.map(r => r.session_id));
    const heldIds = new Set(sessions.filter(s => s.status !== 'suspended' && String(s.session_date).slice(0, 10) <= today && lockedSet.has(s.id)).map(s => s.id));
    const totalDays = heldIds.size;
    const pres = attRows.filter(r => heldIds.has(r.session_id) && (r.status === 'P' || r.status === 'L')).length;
    const att10 = totalDays ? pres / totalDays * 10 : null;

    // ---- Điểm từng bài (thang 10, lấy lần làm cao nhất)
    const asList = assigns.filter(a => !a.is_test), testList = assigns.filter(a => a.is_test);
    const qtIds = new Set(cfg.qtMode === 'pick' ? cfg.qtIds : asList.map(a => a.id));
    const ckIds = new Set(cfg.ckMode === 'pick' ? cfg.ckIds : testList.map(a => a.id));
    const totalOf = Object.fromEntries(assigns.map(a => [a.id, a.total_points]));
    const best = {};
    attempts.forEach(r => {
      const tp = r.total_points || totalOf[r.assignment_id] || 0; if (!tp) return;
      const score = (r.auto_score || 0) + sumManualScores(r.manual_scores);
      const v = Math.min(10, score / tp * 10);
      if (best[r.assignment_id] === undefined || v > best[r.assignment_id]) best[r.assignment_id] = v;
    });
    const pool = (list, ids) => { const arr = []; list.forEach(a => { if (!ids.has(a.id)) return; const v = best[a.id]; if (v !== undefined) arr.push(v); else if (cfg.missingZero) arr.push(0); }); return arr; };
    const aw = cfg.attPct || 0;
    const qtArr = pool(asList, qtIds);
    const attInQt = !aw && !!cfg.attInQt && att10 != null;
    if (attInQt) qtArr.push(att10);
    const qt = grAvg(qtArr), ck = grAvg(pool(testList, ckIds));
    const finRaw = (qt != null && ck != null && (!aw || att10 != null)) ? ((aw ? att10 * aw : 0) + qt * cfg.qtPct + ck * cfg.ckPct) / 100 : null;
    const fin = finRaw == null ? null : Math.round(finRaw * 100) / 100;
    const rank = grRank(fin);

    // ---- HTML
    const scoreCell = v => v === undefined ? '<span class="text-gray-400">—</span>' : `<b style="color:${grScoreColor(v)}">${grNum(v)}/10</b>`;
    const asRows = asList.map((a, i) => {
      const v = best[a.id], on = qtIds.has(a.id);
      const st = v === undefined ? `<span class="kq-badge kq-b-miss">Chưa nộp${on && cfg.missingZero ? ' · tính 0 điểm' : ''}</span>` : (on ? '<span class="kq-badge kq-b-qt">Lấy điểm QT</span>' : '');
      return `<tr><td class="kq-c">${i + 1}</td><td class="font-semibold">${esc(a.title)}</td><td class="kq-c">${scoreCell(v)}</td><td>${st}</td></tr>`;
    });
    if (attInQt) asRows.push(`<tr><td class="kq-c">${asList.length + 1}</td><td class="font-semibold">Chuyên cần (${pres}/${totalDays} buổi)</td><td class="kq-c">${scoreCell(att10)}</td><td><span class="kq-badge kq-b-qt">Lấy điểm QT</span></td></tr>`);
    const asBody = asRows.join('') || '<tr><td colspan="4" class="text-gray-400 italic">Lớp chưa có bài Assignment nào.</td></tr>';

    const teBody = testList.map((a, i) => {
      const v = best[a.id], on = ckIds.has(a.id);
      const st = v === undefined ? `<span class="kq-badge kq-b-miss">Chưa làm${on && cfg.missingZero ? ' · tính 0 điểm' : ''}</span>` : (on ? '<span class="kq-badge kq-b-ck">Lấy điểm CK</span>' : '');
      return `<tr><td class="kq-c">${i + 1}</td><td class="font-semibold">${esc(a.title)}</td><td class="kq-c">${scoreCell(v)}</td><td>${st}</td></tr>`;
    }).join('') || '<tr><td colspan="4" class="text-gray-400 italic">Lớp chưa có bài Test nào.</td></tr>';

    const attWeight = aw ? aw + '%' : (attInQt ? 'Tính trong ĐQT' : '0%');
    const rankHtml = rank ? `<span class="kq-badge" style="background:${rank.bg};color:${rank.fg};font-size:13px;padding:3px 14px"><i class="bi bi-circle-fill" style="font-size:10px"></i> ${rank.t}</span>` : '<span class="text-gray-400">—</span>';
    const passHtml = fin == null ? '<span class="text-gray-400">—</span>'
      : fin >= 7 ? '<span style="color:#166534" class="font-extrabold"><i class="bi bi-check-circle-fill" style="font-size:20px;vertical-align:-3px"></i> Đạt</span>'
                 : '<span style="color:#991b1b" class="font-extrabold"><i class="bi bi-x-circle-fill" style="font-size:20px;vertical-align:-3px"></i> Không đạt</span>';
    const thead = cols => `<thead><tr>${cols.join('')}</tr></thead>`;

    pel('grBody').innerHTML = `
      <div class="rounded-2xl border border-red-200 dark:border-red-900/60 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20 p-4 space-y-1.5">
        <h3 class="font-black text-base sm:text-lg uppercase text-[#cf1717] dark:text-red-400">${esc(cls.title || '')}</h3>
        <p class="text-sm"><b>Họ và tên:</b> ${esc(studentName)}</p>
        <p class="text-sm"><b>Lớp:</b> ${esc(cls.class_code || '')}</p>
        <p class="text-sm"><b>Chuyên cần:</b> ${totalDays ? `${pres}/${totalDays} buổi` : '<span class="text-gray-400">chưa có buổi nào được chốt điểm danh</span>'}</p>
      </div>

      <div class="space-y-2 pt-2">
        <h3 class="kq-sub text-sky-700 dark:text-sky-400"><i class="bi bi-journal-bookmark-fill"></i> 1. ĐIỂM ASSIGNMENT</h3>
        <div class="kq-wrap"><table class="kq-table">${thead(['<th class="kq-th-as kq-c" style="width:60px">STT</th>', '<th class="kq-th-as">Bài tập</th>', '<th class="kq-th-as kq-c" style="width:110px">Điểm</th>', '<th class="kq-th-as">Trạng thái</th>'])}<tbody>${asBody}</tbody></table></div>
        <span class="kq-sumline bg-sky-100 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300"><i class="bi bi-bar-chart-fill"></i> Điểm quá trình: ${qt == null ? '—' : grNum(qt) + '/10'}</span>
      </div>

      <div class="space-y-2 pt-3">
        <h3 class="kq-sub text-violet-700 dark:text-violet-400"><i class="bi bi-pencil-square"></i> 2. ĐIỂM TEST / KIỂM TRA</h3>
        <div class="kq-wrap"><table class="kq-table">${thead(['<th class="kq-th-te kq-c" style="width:60px">STT</th>', '<th class="kq-th-te">Bài kiểm tra</th>', '<th class="kq-th-te kq-c" style="width:110px">Điểm</th>', '<th class="kq-th-te">Trạng thái</th>'])}<tbody>${teBody}</tbody></table></div>
        <span class="kq-sumline bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300"><i class="bi bi-award-fill"></i> Điểm cuối kỳ: ${ck == null ? '—' : grNum(ck) + '/10'}</span>
      </div>

      <div class="space-y-2 pt-3">
        <h3 class="kq-sub text-amber-600 dark:text-amber-400"><i class="bi bi-star-fill"></i> TỔNG KẾT</h3>
        <div class="kq-wrap"><table class="kq-table kq-fin">${thead(['<th class="kq-th-fin">Nội dung</th>', '<th class="kq-th-fin kq-c">Trọng số</th>', '<th class="kq-th-fin kq-c" style="min-width:130px">Điểm</th>'])}<tbody>
          <tr><td class="font-semibold">Chuyên cần</td><td class="kq-c">${attWeight}</td><td class="kq-c font-bold">${totalDays ? `${pres}/${totalDays}` : '—'}</td></tr>
          <tr><td class="font-semibold">Điểm quá trình</td><td class="kq-c">${cfg.qtPct}%</td><td class="kq-c font-bold" style="color:${grScoreColor(qt)}">${qt == null ? '—' : grNum2(qt) + '/10'}</td></tr>
          <tr><td class="font-semibold">Điểm cuối kỳ</td><td class="kq-c">${cfg.ckPct}%</td><td class="kq-c font-bold" style="color:${grScoreColor(ck)}">${ck == null ? '—' : grNum2(ck) + '/10'}</td></tr>
          <tr class="kq-total"><td>ĐIỂM TỔNG KẾT</td><td></td><td class="kq-c" style="color:#cf1717">${fin == null ? '—' : grNum2(fin) + '/10'}</td></tr>
          <tr><td class="font-extrabold">Xếp loại</td><td></td><td class="kq-c">${rankHtml}</td></tr>
          <tr><td class="font-extrabold">Đạt</td><td></td><td class="kq-c">${passHtml}</td></tr>
        </tbody></table></div>
        ${fin == null ? '<p class="text-[11px] text-amber-600"><i class="bi bi-info-circle"></i> Chưa đủ điểm để tính tổng kết (cần có điểm quá trình và điểm cuối kỳ).</p>' : ''}
        <p class="text-[11px] text-gray-400"><i class="bi bi-info-circle"></i> Điểm các bài quy về thang 10, nếu làm nhiều lần thì lấy lần cao nhất. Chuyên cần chỉ tính các buổi giáo viên đã chốt điểm danh. Đạt khi điểm tổng kết ≥ 7,0.</p>
      </div>`;
  }

  // =====================================================================
  // CHẾ ĐỘ 0: CHỌN LỚP — học sinh chọn lớp trước, sau đó mới thấy danh sách bài tập của lớp đó
  // =====================================================================
  async function loadClassPicker() {
    pel('classPickView').classList.remove('hidden');
    loadStudentCalendar();   // lịch học hiện cho mọi học sinh (không cần VIP, không cần chọn lớp)
    grLoadClasses();         // Kết quả học tập: học sinh chọn lớp rồi xem bảng điểm của mình
    if (myProfile.role !== 'vip') {
      pel('classPickLoading').classList.add('hidden');
      pel('vipLockBox0').classList.remove('hidden');
      return;
    }
    pel('vipBadge0').classList.remove('hidden');
    const cacheKey = 'classpicker:' + currentUser.id;
    const cached = cacheGet(cacheKey);
    function paintClassPicker(myClassRows) {
      pel('classPickLoading').classList.add('hidden');
      pel('classPickEmpty').classList.toggle('hidden', !!myClassRows.length);
      pel('classPickGrid').innerHTML = myClassRows.map(r => `
        <a href="assignment.html?class=${r.classes.id}" class="block bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 space-y-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">
          <span class="text-[10px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-950 text-[#cf1717] rounded-full">${esc(r.classes.class_code)}</span>
          <h4 class="font-bold text-sm text-gray-900 dark:text-white">${esc(r.classes.title)}</h4>
          ${r.classes.info ? `<p class="text-xs text-gray-400 line-clamp-2">${esc(r.classes.info)}</p>` : ''}
          <p class="text-[11px] font-bold text-[#cf1717]">Xem bài tập →</p>
        </a>`).join('');
    }
    if (cached) paintClassPicker(cached);
    const { data, error } = await sbClient.from('class_students').select('class_id, classes(id, title, class_code, info)').eq('student_id', currentUser.id);
    if (!cached) pel('classPickLoading').classList.add('hidden');
    if (error) { if (!cached) notify('❌ Lỗi tải danh sách lớp: ' + error.message); return; }
    const myClassRows = (data || []).filter(r => r.classes);
    cacheSet(cacheKey, myClassRows);
    paintClassPicker(myClassRows);
  }

  // =====================================================================
  // CHẾ ĐỘ 1: DANH SÁCH BÀI TẬP của 1 lớp đã chọn
  // =====================================================================
  async function loadList(classId) {
    pel('listView').classList.remove('hidden');
    if (myProfile.role !== 'vip') {
      pel('loadingMsg').classList.add('hidden');
      pel('vipLockBox').classList.remove('hidden');
      return;
    }
    pel('vipBadge').classList.remove('hidden');

    // Xác nhận học sinh có thuộc lớp này không, đồng thời lấy tên lớp để hiển thị tiêu đề
    const { data: membership } = await sbClient.from('class_students').select('id, classes(title, class_code)').eq('class_id', classId).eq('student_id', currentUser.id).maybeSingle();
    if (!membership || !membership.classes) {
      notify('❌ Bạn không thuộc lớp này.');
      pel('listView').classList.add('hidden');
      loadClassPicker();
      return;
    }
    pel('listClassTitle').innerText = `${membership.classes.class_code} — ${membership.classes.title}`;

    const cacheKey = 'alist:' + classId + ':' + currentUser.id;
    const cached = cacheGet(cacheKey);
    if (cached) {
      allAssignments = cached;
      pel('emptyMsg').classList.toggle('hidden', !!allAssignments.length);
      if (allAssignments.length) { pel('assignGridWrap').classList.remove('hidden'); currentPage = 1; renderPage(); }
    }

    const { data, error } = await sbClient.from('assignments').select('id, token, title, description, total_points, created_at, due_date, classes(title, class_code)')
      .eq('class_id', classId).eq('is_published', true).not('is_test', 'is', true).order('created_at', { ascending: false });
    pel('loadingMsg').classList.add('hidden');
    if (error) { if (!cached) notify('❌ Lỗi tải bài tập: ' + error.message); return; }
    allAssignments = data || [];
    pel('emptyMsg').classList.toggle('hidden', !!allAssignments.length);
    if (!allAssignments.length) { cacheSet(cacheKey, []); return; }

    // Kiểm tra bài nào học sinh đã nộp
    const { data: myAttempts, error: attErr } = await sbClient.from('assignment_attempts').select('assignment_id, auto_score, total_points, manual_scores').eq('student_id', currentUser.id).order('submitted_at', { ascending: true });
    if (attErr) notify('⚠️ Không tải được trạng thái bài đã nộp: ' + attErr.message);
    const attemptMap = {}; (myAttempts || []).forEach(a => attemptMap[a.assignment_id] = a);
    allAssignments.forEach(a => a._attempt = attemptMap[a.id] || null);

    cacheSet(cacheKey, allAssignments);
    pel('assignGridWrap').classList.remove('hidden');
    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const totalPages = Math.max(1, Math.ceil(allAssignments.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allAssignments.slice(start, start + PAGE_SIZE);

    pel('assignGrid').innerHTML = pageItems.map(a => `
      <a href="assignment.html?token=${encodeURIComponent(a.token)}" class="block bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 space-y-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-950 text-[#cf1717] rounded-full">${esc(a.classes?.class_code || '')}</span>
          ${a._attempt ? `<span class="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full">Đã nộp: ${Math.round(((a._attempt.auto_score||0)+sumManualScores(a._attempt.manual_scores))*100)/100}/${a._attempt.total_points}</span>` : `<span class="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full">Chưa làm</span>`.replace(/^(?=.*)/, '') && (isAssignmentExpired(a) ? `<span class="text-[10px] font-bold px-2 py-0.5 bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 rounded-full">Đã hết hạn · Chỉ xem</span>` : `<span class="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-full">Chưa làm</span>`)}
        </div>
        <h4 class="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">${esc(a.title)}</h4>
        <p class="text-xs text-gray-400 line-clamp-2">${esc(a.description || '')}</p>
        <p class="text-[10px] text-gray-400">${a.total_points} điểm · ${new Date(a.created_at).toLocaleDateString('vi-VN')}${a.due_date ? ' · Hạn: ' + fmtDueDate(a.due_date) : ''}</p>
      </a>`).join('');

    let pagerHtml = '';
    for (let i = 1; i <= totalPages; i++) {
      pagerHtml += `<button onclick="goPage(${i})" class="w-8 h-8 rounded-lg text-xs font-bold transition ${i === currentPage ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'}">${i}</button>`;
    }
    pel('pager').innerHTML = totalPages > 1 ? pagerHtml : '';
  }
  function goPage(p) { currentPage = p; renderPage(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

  // =====================================================================
  // CHẾ ĐỘ LÀM BÀI (theo token)
  // =====================================================================
  async function loadAttempt(token) {
    if (myProfile.role !== 'vip') {
      pel('listView').classList.remove('hidden');
      pel('loadingMsg').classList.add('hidden');
      pel('vipLockBox').classList.remove('hidden');
      return;
    }
    const { data: a, error } = await sbClient.from('assignments').select('*, classes(title, class_code)').eq('token', token).eq('is_published', true).not('is_test', 'is', true).maybeSingle();
    if (error || !a) { notify('❌ Không tìm thấy bài tập hoặc bài chưa được xuất bản.'); pel('listView').classList.remove('hidden'); pel('loadingMsg').classList.add('hidden'); pel('emptyMsg').classList.remove('hidden'); return; }

    // Kiểm tra học sinh có thuộc lớp này không
    const { data: membership } = await sbClient.from('class_students').select('id').eq('class_id', a.class_id).eq('student_id', currentUser.id).maybeSingle();
    if (!membership) { notify('❌ Bạn không thuộc lớp học của bài tập này.'); pel('listView').classList.remove('hidden'); pel('loadingMsg').classList.add('hidden'); pel('emptyMsg').classList.remove('hidden'); return; }

    // Hạn nộp tính theo NGÀY (hết ngày hạn, giờ Việt Nam). Hết hạn -> không làm / không sửa nữa.
    const expired = isAssignmentExpired(a);
    const { data: allAttempts } = await sbClient.from('assignment_attempts').select('*').eq('assignment_id', a.id).eq('student_id', currentUser.id).order('submitted_at', { ascending: false });
    const latest = (allAttempts || [])[0] || null;
    if (latest) {
      // Đã từng làm: luôn mở lại bài gần nhất KÈM điểm + nhận xét của giáo viên.
      // Còn hạn -> sửa trực tiếp trên bài đó; hết hạn -> chỉ xem.
      if (expired) notify(`⏰ Bài tập đã hết hạn (${fmtDueDate(a.due_date)}) — đây là bài làm gần nhất của bạn.`);
      showResult(a, latest, { expired, used: attemptsUsedOf(allAttempts) });
      return;
    }
    if (expired) {
      // Hết hạn mà chưa làm: vẫn cho XEM lại đề (kèm đáp án + giải thích) nhưng KHÔNG cho làm / nộp.
      notify(`⏰ Bài tập đã hết hạn (${fmtDueDate(a.due_date)}) — bạn chỉ có thể xem lại, không thể làm bài này nữa.`);
      showResult(a, { answers: {}, auto_score: 0, total_points: a.total_points, manual_scores: {}, _empty: true }, { expired: true, used: 0 });
      return;
    }

    currentAssignment = a;
    pel('atTitle').innerText = a.title;
    pel('atDesc').innerText = a.description || '';
    pel('backToListLink1').href = 'assignment.html?class=' + a.class_id;
    pel('attemptView').classList.remove('hidden');

    const counter = { n: 0 };
    pel('questionArea').innerHTML = (a.questions || []).map(q => renderTopLevelBlock(q, counter, 'attempt')).join('');
    pel('questionArea').querySelectorAll('img').forEach(im => { im.loading = 'lazy'; im.decoding = 'async'; });
    initReadingHighlighting();

    if (a.time_limit_minutes) startTimer(a.time_limit_minutes * 60);
  }

  // Vẽ 1 khối cấp cao nhất (text / reading / câu hỏi thường) ở chế độ làm bài ('attempt') hoặc xem lại ('review')
  function renderTopLevelBlock(q, counter, mode, attempt) {
    if (q.type === 'text') return `<div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 qcontent text-sm ${q.two_col ? 'qcontent-2col' : ''}">${q.content || ''}</div>`;
    if (q.type === 'reading') return renderReadingSplit(q, counter, mode, attempt);
    counter.n++;
    return mode === 'attempt' ? renderQuestionInput(q, counter.n) : renderReviewQuestion(q, counter.n, attempt);
  }

  let readingBlockSeq = 0;
  function renderReadingSplit(q, counter, mode, attempt) {
    readingBlockSeq++;
    const rid = 'rd' + readingBlockSeq + '-' + q.id;
    const qHtml = (q.sub_blocks || []).map(sb => renderTopLevelBlock(sb, counter, mode, attempt)).join('<div class="h-3"></div>');
    return `
      <div class="space-y-2">
        <div class="rd-tabs rounded-t-2xl overflow-hidden">
          <button type="button" class="rd-tab-btn active" onclick="switchRdTab('${rid}','passage',this)"><i class="bi bi-book"></i> Bài đọc</button>
          <button type="button" class="rd-tab-btn" onclick="switchRdTab('${rid}','questions',this)"><i class="bi bi-question-circle"></i> Câu hỏi</button>
        </div>
        <div class="rd-split shadow-sm">
          <div id="${rid}-passage" data-rd-passage="${rid}" class="rd-pane rd-passage qcontent text-sm ${q.two_col ? 'qcontent-2col' : ''}" style="flex:1 1 50%">${q.content || ''}</div>
          <div class="rd-resizer" data-resizer-for="${rid}"></div>
          <div id="${rid}-questions" class="rd-pane rd-questions space-y-3" style="flex:1 1 50%">${qHtml}</div>
        </div>
      </div>`;
  }
  function switchRdTab(rid, which, btn) {
    const wrap = btn.closest('.space-y-2');
    wrap.querySelectorAll('.rd-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const passage = pel(rid + '-passage'), questions = pel(rid + '-questions');
    if (which === 'passage') { passage.style.display = ''; questions.style.display = 'none'; }
    else { passage.style.display = 'none'; questions.style.display = ''; }
  }

  function renderQuestionInput(q, qNo) {
    if (q.type === 'fill') return renderFillBlock(q, qNo);
    let inputHtml = '';
    if (q.type === 'mcq' || q.type === 'tf') {
      inputHtml = (q.options || []).map(o => `
        <label class="flex items-center gap-2 p-2.5 border dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[#cf1717] transition">
          <input type="radio" name="ans-${q.id}" value="${esc(o.id)}"> <span class="text-sm">${esc(o.text)}</span>
        </label>`).join('');
    } else if (q.type === 'multi') {
      inputHtml = (q.options || []).map(o => `
        <label class="flex items-center gap-2 p-2.5 border dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[#cf1717] transition">
          <input type="checkbox" name="ans-${q.id}" value="${esc(o.id)}"> <span class="text-sm">${esc(o.text)}</span>
        </label>`).join('');
    } else if (q.type === 'essay') {
      inputHtml = `<textarea id="ans-${q.id}" rows="5" placeholder="Viết câu trả lời của bạn..." class="w-full p-2.5 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 text-sm"></textarea>`;
    }
    return `
      <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm" data-q="${q.id}">
        <p class="text-xs font-bold text-[#cf1717]">Câu ${qNo} · ${q.points} điểm</p>
        <div class="qcontent text-sm text-gray-900 dark:text-white">${q.content || ''}</div>
        <div class="space-y-2">${inputHtml}</div>
      </div>`;
  }

  // Câu điền khuyết: hỗ trợ nhiều chỗ trống {{1}}, {{2}}... ngay trong nội dung (1 chỗ cũng được).
  // Bài cũ chưa có q.blanks (chỉ có accepted_answers đơn) vẫn hiển thị ô nhập bên dưới như trước.
  function renderFillBlock(q, qNo) {
    let contentHtml;
    if (q.blanks && q.blanks.length) {
      contentHtml = (q.content || '').replace(/\{\{(\d+)\}\}/g, (m, n) => {
        const bl = q.blanks.find(b => String(b.gap) === n);
        const hintLen = (bl && bl.accepted_answers && bl.accepted_answers.length)
          ? Math.max(...bl.accepted_answers.map(a => String(a).length)) : 6;
        const chWidth = Math.min(Math.max(hintLen + 3, 5), 28);
        return `<textarea id="ans-${q.id}-${n}" data-gap="${n}" placeholder="…" rows="1" oninput="autoGrowFillInput(this)" style="width:${chWidth}ch"
          class="fillbox mx-1 px-2 py-1 rounded-lg border-2 border-[#cf1717]/40 dark:bg-zinc-800 dark:border-red-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#cf1717]"></textarea>`;
      });
    } else {
      contentHtml = `${q.content || ''}<div class="mt-3"><textarea id="ans-${q.id}" rows="2" oninput="autoGrowFillInput(this)" placeholder="Nhập câu trả lời..." class="w-full p-2.5 rounded-xl border dark:bg-zinc-800 dark:border-zinc-700 text-sm resize-none overflow-hidden"></textarea></div>`;
    }
    return `
      <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm" data-q="${q.id}">
        <p class="text-xs font-bold text-[#cf1717]">Câu ${qNo} · ${q.points} điểm</p>
        <div class="qcontent text-sm text-gray-900 dark:text-white leading-loose">${contentHtml}</div>
      </div>`;
  }

  // Ô điền khuyết tự nới rộng theo độ dài học sinh đang gõ: rộng ra tới một mức rồi tự xuống hàng như văn bản thường,
  // và tự cao lên theo số dòng — không còn giới hạn 1 đoạn ngắn như trước.
  function autoGrowFillInput(el) {
    const lines = el.value.split('\n');
    const longest = Math.max(...lines.map(l => l.length), 5);
    el.style.width = Math.min(Math.max(longest + 3, 5), 34) + 'ch';
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  // =====================================================================
  // BÀI ĐỌC (READING): thanh trượt chia cột (desktop) / tab chuyển (mobile) + bôi đen highlight
  // =====================================================================
  function initReadingSplits() {
    document.querySelectorAll('.rd-resizer').forEach(resizer => {
      if (resizer.dataset.bound) return; resizer.dataset.bound = '1';
      const rid = resizer.getAttribute('data-resizer-for');
      const passage = pel(rid + '-passage'), wrap = resizer.parentElement;
      let dragging = false;
      function onMove(clientX) {
        const rect = wrap.getBoundingClientRect();
        let pct = ((clientX - rect.left) / rect.width) * 100;
        pct = Math.min(75, Math.max(25, pct));
        passage.style.flex = `0 0 ${pct}%`;
      }
      resizer.addEventListener('mousedown', e => { dragging = true; e.preventDefault(); });
      resizer.addEventListener('touchstart', () => { dragging = true; }, { passive: true });
      window.addEventListener('mousemove', e => { if (dragging) onMove(e.clientX); });
      window.addEventListener('touchmove', e => { if (dragging && e.touches[0]) onMove(e.touches[0].clientX); }, { passive: true });
      window.addEventListener('mouseup', () => dragging = false);
      window.addEventListener('touchend', () => dragging = false);
    });
    // Trên điện thoại: mặc định chỉ hiện bài đọc, bấm tab để xem câu hỏi (đủ chỗ hơn là chia đôi màn hình nhỏ)
    if (window.innerWidth <= 768) {
      document.querySelectorAll('.rd-questions').forEach(el => { el.style.display = 'none'; });
    }
  }

  // =====================================================================
  // HIGHLIGHT BÀI ĐỌC — lấy nguyên cơ chế từ trang EXAM (thanh công cụ Tô Vàng / Tô Xanh / Xóa Tô)
  // =====================================================================
  function initReadingHighlighting() { initReadingSplits(); }

  // Highlight & dictionary interactions are owned exclusively by assets/js/ru-highlight.js.
  // Keeping the old listeners would reopen and reposition the menu after the new code runs.

  function startTimer(seconds) {
    let remain = seconds;
    const box = pel('atTimer'); box.classList.remove('hidden');
    function tick() {
      const m = Math.floor(remain / 60), s = remain % 60;
      box.innerHTML = `<i class="bi bi-stopwatch"></i> ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (remain <= 0) { clearInterval(timerInterval); notify('⚠️ Hết giờ! Bài tập tự động nộp.'); submitAssignment(); return; }
      remain--;
    }
    tick(); timerInterval = setInterval(tick, 1000);
  }

  // =====================================================================
  // NỘP BÀI & CHẤM ĐIỂM TỰ ĐỘNG
  // =====================================================================
  // ===== Hạn nộp bài =====
  function isAssignmentExpired(a) { const d = a && a.due_date ? String(a.due_date).slice(0, 10) : null; return !!d && scalTodayStr() > d; }
  function fmtDueDate(v) { const [y, m, d] = String(v).slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
  // Số lượt đã dùng = số dòng bài làm (dữ liệu cũ) + số lần đã lưu chỉnh sửa trên bài gần nhất
  function attemptsUsedOf(list) { const l = list || []; return l.length + ((l[0] && l[0].edit_count) || 0); }

  async function submitAssignment() {
    if (!currentAssignment) return;
    if (isAssignmentExpired(currentAssignment)) { notify('⛔ Bài tập đã hết hạn, không thể nộp bài.'); return; }
    if (timerInterval) clearInterval(timerInterval);
    const btn = pel('submitBtn'); btn.disabled = true; btn.innerText = 'Đang nộp bài...';

    const answers = {};
    let auto_score = 0, has_essay = false;
    const flatQuestions = [];
    (currentAssignment.questions || []).forEach(q => {
      if (q.type === 'reading') (q.sub_blocks || []).forEach(sb => flatQuestions.push(sb));
      else flatQuestions.push(q);
    });
    flatQuestions.forEach(q => {
      if (q.type === 'text') return;
      if (q.type === 'mcq' || q.type === 'tf') {
        const el = document.querySelector(`input[name="ans-${q.id}"]:checked`);
        const val = el ? el.value : null;
        answers[q.id] = val;
        const correctOpt = (q.options || []).find(o => o.correct);
        if (val && correctOpt && val === correctOpt.id) auto_score += (parseFloat(q.points) || 0);
      } else if (q.type === 'multi') {
        const checked = Array.from(document.querySelectorAll(`input[name="ans-${q.id}"]:checked`)).map(x => x.value);
        answers[q.id] = checked;
        const correctIds = (q.options || []).filter(o => o.correct).map(o => o.id).sort();
        const givenIds = [...checked].sort();
        if (correctIds.length && JSON.stringify(correctIds) === JSON.stringify(givenIds)) auto_score += (parseFloat(q.points) || 0);
      } else if (q.type === 'fill') {
        if (q.blanks && q.blanks.length) {
          const gapAnswers = {};
          let correctCount = 0;
          q.blanks.forEach(bl => {
            const val = (pel(`ans-${q.id}-${bl.gap}`)?.value || '').trim();
            gapAnswers[bl.gap] = val;
            const accepted = (bl.accepted_answers || []).map(a => a.toLowerCase().trim());
            if (val && accepted.includes(val.toLowerCase())) correctCount++;
          });
          answers[q.id] = gapAnswers;
          const perBlank = (parseFloat(q.points) || 0) / q.blanks.length;
          auto_score += perBlank * correctCount;
        } else {
          const val = (pel('ans-' + q.id)?.value || '').trim();
          answers[q.id] = val;
          const accepted = (q.accepted_answers || []).map(a => a.toLowerCase().trim());
          if (val && accepted.includes(val.toLowerCase())) auto_score += (parseFloat(q.points) || 0);
        }
      } else if (q.type === 'essay') {
        const val = pel('ans-' + q.id)?.value || '';
        answers[q.id] = val;
        has_essay = true;
      }
    });
    auto_score = Math.round(auto_score * 100) / 100;

    const row = {
      assignment_id: currentAssignment.id, student_id: currentUser.id, answers,
      auto_score, total_points: currentAssignment.total_points || 0, has_essay
    };
    const { data: saved, error } = await sbClient.from('assignment_attempts').insert([row]).select().single();
    if (error) { notify('❌ Lỗi nộp bài: ' + error.message); btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Nộp Bài'; return; }
    notify('🎉 Nộp bài thành công!');
    showResult(currentAssignment, saved, { expired: false, used: 1 });
  }

  // =====================================================================
  // HIỂN THỊ KẾT QUẢ + GIẢI THÍCH ĐÁP ÁN
  // =====================================================================
  function sumManualScores(obj) { return Object.values(obj || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0); }

  // ===== Xem lại bài đã làm + sửa trực tiếp trên bài đó (khi còn hạn) =====
  let rv = null; // { a, attempt, answers (bản đang sửa), dirty:Set, canEdit, expired, used }
  const rvViewAttempt = () => ({ ...rv.attempt, answers: rv.answers });

  function showResult(a, attempt, opts) {
    opts = opts || {};
    const expired = !!opts.expired, used = opts.used || 1;
    const canEdit = !expired && (!a.max_attempts || used < a.max_attempts);
    // Chỉ hiện đáp án đúng + giải thích khi bài HẾT HẠN (bài không đặt hạn thì hiện khi đã hết lượt)
    const reveal = expired || (!a.due_date && !canEdit);
    rv = { a, attempt, answers: JSON.parse(JSON.stringify(attempt.answers || {})), dirty: new Set(), canEdit, expired, used, reveal };

    pel('classPickView').classList.add('hidden');
    pel('listView').classList.add('hidden');
    pel('attemptView').classList.add('hidden');
    pel('resultView').classList.remove('hidden');
    if (a.class_id) pel('backToListLink2').href = 'assignment.html?class=' + a.class_id;

    const manualSum = sumManualScores(attempt.manual_scores);
    const finalScore = Math.round(((attempt.auto_score || 0) + manualSum) * 100) / 100;
    pel('rsScore').innerText = attempt._empty ? 'Chưa nộp bài' : `${finalScore} / ${attempt.total_points}`;
    pel('rsTitle').innerHTML = attempt._empty ? '<i class="bi bi-alarm"></i> Bài đã hết hạn — chỉ xem lại' : expired ? '<i class="bi bi-alarm"></i> Bài đã hết hạn — kết quả gần nhất' : 'Bài làm của bạn';

    const essayQs = (a.questions || []).filter(q => q.type === 'essay');
    const allEssayGraded = essayQs.length > 0 && essayQs.every(q => attempt.manual_scores && attempt.manual_scores[q.id] !== undefined);
    pel('rsEssayNote').classList.toggle('hidden', !(attempt.has_essay && !allEssayGraded));

    const due = a.due_date ? fmtDueDate(a.due_date) : null;
    let msg, tone;
    if (attempt._empty) { msg = `Bài tập đã hết hạn (${due}) và bạn chưa nộp bài. Bạn chỉ có thể xem lại đề, đáp án và giải thích bên dưới — không thể làm hoặc nộp bài nữa.`; tone = 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300'; }
    else if (expired) { msg = `<i class="bi bi-alarm"></i> Bài tập đã hết hạn (${due}). Bạn không thể làm hoặc sửa nữa — bên dưới là bài làm gần nhất, kèm điểm và nhận xét của giáo viên nếu đã chấm.`; tone = 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300'; }
    else if (canEdit) { msg = `<i class="bi bi-pencil"></i> ${due ? 'Bài còn hạn đến ' + due + '. ' : ''}Bên dưới là điểm của từng câu. Đáp án đúng và giải thích sẽ hiện sau khi bài hết hạn. Câu nào chưa đạt điểm tối đa, bấm “Sửa câu này” để làm lại rồi bấm “Lưu chỉnh sửa”.${a.max_attempts ? ' Còn ' + (a.max_attempts - used) + ' lượt lưu.' : ''}`; tone = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'; }
    else { msg = `<i class="bi bi-info-circle-fill"></i> Bạn đã dùng hết ${a.max_attempts} lượt làm/sửa bài — đây là kết quả gần nhất.${rv.reveal ? '' : ' Đáp án đúng và giải thích sẽ hiện khi bài hết hạn' + (due ? ' (' + due + ')' : '') + '.'}`; tone = 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300'; }
    const bn = pel('rsBanner'); bn.className = 'text-xs font-semibold rounded-xl p-3 text-left ' + tone; bn.innerHTML = msg;

    rvRenderAll();
    initReadingHighlighting();
    rvUpdateSaveBar();
  }

  function rvRenderAll() {
    const counter = { n: 0 };
    pel('reviewArea').innerHTML = (rv.a.questions || []).map(q => renderTopLevelBlock(q, counter, 'review', rvViewAttempt())).join('');
  }
  function rvFlat() { const out = []; (rv.a.questions || []).forEach(q => { if (q.type === 'reading') (q.sub_blocks || []).forEach(sb => out.push(sb)); else out.push(q); }); return out; }
  function rvQNo(qid) { return rvFlat().filter(x => x.type !== 'text').findIndex(x => x.id === qid) + 1; }
  function rvUpdateSaveBar() { const n = rv.dirty.size; pel('rvSaveBar').classList.toggle('hidden', !(rv.canEdit && n)); pel('rvSaveCount').innerText = n; }

  function rvEditBtnHtml(q) {
    if (!rv || !rv.canEdit || q.type === 'text') return '';
    return `<div class="flex items-center gap-2">${rv.dirty.has(q.id) ? '<span class="text-[10px] font-bold text-amber-600">● Đã sửa, chưa lưu</span>' : ''}
      <button type="button" onclick="rvStartEdit('${q.id}')" class="ml-auto text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-[#cf1717] hover:text-white transition"><i class="bi bi-pencil"></i> Sửa câu này</button></div>`;
  }

  function rvStartEdit(qid) {
    if (!rv || !rv.canEdit) return;
    const q = rvFlat().find(x => x.id === qid);
    const card = document.querySelector(`#reviewArea [data-q="${qid}"]`);
    if (!q || !card) return;
    const wrap = document.createElement('div');
    wrap.setAttribute('data-q-edit', qid);
    wrap.innerHTML = renderQuestionInput(q, rvQNo(qid)) + `
      <div class="flex gap-2 justify-end mt-2">
        <button type="button" onclick="rvCancelEdit('${qid}')" class="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800">↩️ Hủy</button>
        <button type="button" onclick="rvApplyEdit('${qid}')" class="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#cf1717] text-white"><i class="bi bi-check-circle-fill"></i> Xong câu này</button>
      </div>`;
    card.replaceWith(wrap);
    rvPrefill(q, rv.answers[qid]);
  }
  function rvCloseEdit(qid) {
    const q = rvFlat().find(x => x.id === qid);
    const wrap = document.querySelector(`#reviewArea [data-q-edit="${qid}"]`);
    if (q && wrap) wrap.outerHTML = renderReviewQuestion(q, rvQNo(qid), rvViewAttempt());
    rvUpdateSaveBar();
  }
  function rvCancelEdit(qid) { rvCloseEdit(qid); }
  function rvApplyEdit(qid) {
    const q = rvFlat().find(x => x.id === qid); if (!q) return;
    const val = rvReadAnswer(q);
    if (JSON.stringify(val) !== JSON.stringify(rv.answers[qid] ?? null)) { rv.answers[qid] = val; rv.dirty.add(qid); }
    rvCloseEdit(qid);
  }

  function rvPrefill(q, g) {
    if (q.type === 'mcq' || q.type === 'tf') document.querySelectorAll(`input[name="ans-${q.id}"]`).forEach(i => { i.checked = (i.value === g); });
    else if (q.type === 'multi') { const arr = Array.isArray(g) ? g : []; document.querySelectorAll(`input[name="ans-${q.id}"]`).forEach(i => { i.checked = arr.includes(i.value); }); }
    else if (q.type === 'fill' && q.blanks && q.blanks.length) {
      const o = (g && typeof g === 'object') ? g : {};
      q.blanks.forEach(bl => { const el = pel(`ans-${q.id}-${bl.gap}`); if (el) { el.value = o[bl.gap] || ''; autoGrowFillInput(el); } });
    } else { const el = pel('ans-' + q.id); if (el) { el.value = g || ''; if (q.type === 'fill') autoGrowFillInput(el); } }
  }
  function rvReadAnswer(q) {
    if (q.type === 'mcq' || q.type === 'tf') { const el = document.querySelector(`input[name="ans-${q.id}"]:checked`); return el ? el.value : null; }
    if (q.type === 'multi') return Array.from(document.querySelectorAll(`input[name="ans-${q.id}"]:checked`)).map(x => x.value);
    if (q.type === 'fill') {
      if (q.blanks && q.blanks.length) { const o = {}; q.blanks.forEach(bl => { o[bl.gap] = (pel(`ans-${q.id}-${bl.gap}`)?.value || '').trim(); }); return o; }
      return (pel('ans-' + q.id)?.value || '').trim();
    }
    if (q.type === 'essay') return pel('ans-' + q.id)?.value || '';
    return null;
  }

  // Chấm lại tự động từ bộ đáp án (cùng luật chấm với lúc nộp bài)
  function scoreFromAnswers(questions, answers) {
    let auto = 0, has_essay = false;
    const flat = []; (questions || []).forEach(q => { if (q.type === 'reading') (q.sub_blocks || []).forEach(sb => flat.push(sb)); else flat.push(q); });
    const norm = x => String(x ?? '').toLowerCase().trim();
    flat.forEach(q => {
      const g = answers[q.id], pts = parseFloat(q.points) || 0;
      if (q.type === 'mcq' || q.type === 'tf') { const c = (q.options || []).find(o => o.correct); if (g && c && g === c.id) auto += pts; }
      else if (q.type === 'multi') { const ids = (q.options || []).filter(o => o.correct).map(o => o.id).sort(); const giv = Array.isArray(g) ? [...g].sort() : []; if (ids.length && JSON.stringify(ids) === JSON.stringify(giv)) auto += pts; }
      else if (q.type === 'fill') {
        if (q.blanks && q.blanks.length) { const go = (g && typeof g === 'object') ? g : {}; let ok = 0; q.blanks.forEach(bl => { const v = norm(go[bl.gap]); if (v && (bl.accepted_answers || []).map(norm).includes(v)) ok++; }); auto += pts / q.blanks.length * ok; }
        else { const v = norm(g); if (v && (q.accepted_answers || []).map(norm).includes(v)) auto += pts; }
      } else if (q.type === 'essay') has_essay = true;
    });
    return { auto_score: Math.round(auto * 100) / 100, has_essay };
  }

  async function rvSave() {
    if (!rv || !rv.dirty.size) return;
    if (document.querySelector('#reviewArea [data-q-edit]')) { notify('⚠️ Còn câu đang sửa dở — bấm “Xong câu này” hoặc “Hủy” trước khi lưu.'); return; }
    if (isAssignmentExpired(rv.a)) { notify('⛔ Bài tập đã hết hạn, không thể lưu chỉnh sửa.'); return; }
    const btn = pel('rvSaveBtn'); btn.disabled = true; btn.innerText = 'Đang lưu...';
    const { auto_score, has_essay } = scoreFromAnswers(rv.a.questions, rv.answers);
    const patch = { answers: rv.answers, auto_score, has_essay, submitted_at: new Date().toISOString() };
    if ('edit_count' in rv.attempt) patch.edit_count = (rv.attempt.edit_count || 0) + 1;
    const { data, error } = await sbClient.from('assignment_attempts').update(patch).eq('id', rv.attempt.id).select().single();
    btn.disabled = false; btn.innerHTML = '<i class="bi bi-floppy-fill"></i> Lưu chỉnh sửa';
    if (error) { notify('❌ Không lưu được chỉnh sửa: ' + error.message + ' (đã chạy file SQL cập nhật quyền chưa?)'); return; }
    notify('✅ Đã lưu chỉnh sửa!');
    showResult(rv.a, data, { expired: false, used: rv.used + 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Điểm đạt được của 1 câu (cùng luật chấm với scoreFromAnswers). null = tự luận chưa chấm.
  function questionEarned(q, given, attempt) {
    const pts = parseFloat(q.points) || 0;
    const norm = x => String(x ?? '').toLowerCase().trim();
    let earned = 0;
    if (q.type === 'mcq' || q.type === 'tf') {
      const c = (q.options || []).find(o => o.correct);
      if (given && c && given === c.id) earned = pts;
    } else if (q.type === 'multi') {
      const ids = (q.options || []).filter(o => o.correct).map(o => o.id).sort();
      const giv = Array.isArray(given) ? [...given].sort() : [];
      if (ids.length && JSON.stringify(ids) === JSON.stringify(giv)) earned = pts;
    } else if (q.type === 'fill') {
      if (q.blanks && q.blanks.length) {
        const go = (given && typeof given === 'object') ? given : {};
        let ok = 0;
        q.blanks.forEach(bl => { const v = norm(go[bl.gap]); if (v && (bl.accepted_answers || []).map(norm).includes(v)) ok++; });
        earned = pts / q.blanks.length * ok;
      } else { const v = norm(given); if (v && (q.accepted_answers || []).map(norm).includes(v)) earned = pts; }
    } else if (q.type === 'essay') {
      const m = attempt.manual_scores && attempt.manual_scores[q.id];
      if (m === undefined || m === null) return null;
      earned = parseFloat(m) || 0;
    }
    return Math.round(earned * 100) / 100;
  }

  function renderReviewQuestion(q, qNo, attempt) {
    const reveal = !!(rv && rv.reveal);   // true = được xem đáp án đúng + giải thích
    const given = attempt.answers ? attempt.answers[q.id] : null;
    const pts = parseFloat(q.points) || 0;
    const earned = questionEarned(q, given, attempt);
    let chipCls = 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-gray-300', chipTxt;
    if (earned === null) chipTxt = `Chờ chấm / ${pts}`;
    else {
      chipTxt = `${earned} / ${pts}`;
      chipCls = earned >= pts ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
              : earned > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
              : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400';
    }
    let bodyHtml = '';
    if (q.type === 'mcq' || q.type === 'tf' || q.type === 'multi') {
      const givenArr = Array.isArray(given) ? given : (given ? [given] : []);
      bodyHtml = (q.options || []).map(o => {
        let cls = 'border dark:border-zinc-700';
        if (reveal) {
          if (o.correct) cls = 'opt-correct border';
          else if (givenArr.includes(o.id)) cls = 'opt-wrong border';
        } else if (givenArr.includes(o.id)) {
          cls = 'border-2 border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30';   // chỉ đánh dấu lựa chọn của HS, không lộ đúng/sai
        }
        return `<div class="p-2.5 rounded-xl ${cls} text-sm flex items-center gap-2">
          ${givenArr.includes(o.id) ? '<i class="bi bi-arrow-right-circle-fill"></i> ' : ''}${esc(o.text)} ${reveal && o.correct ? ' <span class="text-emerald-600 font-bold text-xs">(Đáp án đúng)</span>' : ''}
        </div>`;
      }).join('');
    } else if (q.type === 'fill') {
      if (q.blanks && q.blanks.length) {
        const givenObj = (given && typeof given === 'object') ? given : {};
        bodyHtml = q.blanks.map(bl => {
          const gv = (givenObj[bl.gap] || '').trim();
          const accepted = bl.accepted_answers || [];
          const isCorrect = accepted.map(x => x.toLowerCase().trim()).includes(gv.toLowerCase());
          const cls = (reveal && !attempt._empty) ? (isCorrect ? 'opt-correct' : 'opt-wrong') : 'dark:border-zinc-700';
          return `<div class="p-2.5 rounded-xl border text-sm ${cls}">
            Chỗ trống ${bl.gap}: bạn trả lời <b class="whitespace-pre-wrap">${esc(gv || '(bỏ trống)')}</b>
            ${reveal ? `<span class="block text-xs text-gray-500 mt-0.5">Đáp án chấp nhận: ${esc(accepted.join(', '))}</span>` : ''}
          </div>`;
        }).join('');
      } else {
        const accepted = (q.accepted_answers || []).join(', ');
        const isCorrect = (q.accepted_answers || []).map(x => x.toLowerCase().trim()).includes((given || '').toLowerCase().trim());
        const cls = (reveal && !attempt._empty) ? (isCorrect ? 'opt-correct' : 'opt-wrong') : 'dark:border-zinc-700';
        bodyHtml = `<div class="p-2.5 rounded-xl border text-sm ${cls} whitespace-pre-wrap">Bạn trả lời: <b>${esc(given || '(bỏ trống)')}</b></div>
          ${reveal ? `<p class="text-xs text-gray-500 mt-1">Đáp án chấp nhận: ${esc(accepted)}</p>` : ''}`;
      }
    } else if (q.type === 'essay') {
      const gradedScore = attempt.manual_scores && attempt.manual_scores[q.id] !== undefined ? attempt.manual_scores[q.id] : null;
      const comment = (attempt.manual_comments && attempt.manual_comments[q.id]) || '';
      bodyHtml = `<div class="p-2.5 rounded-xl border dark:border-zinc-700 text-sm whitespace-pre-wrap">${esc(given || '(bỏ trống)')}</div>
        ${attempt._empty ? '' : gradedScore !== null
          ? `<p class="text-xs font-bold text-emerald-600 mt-1"><i class="bi bi-check-circle-fill"></i> Giáo viên đã chấm: ${gradedScore}/${q.points} điểm</p>`
          : `<p class="text-xs text-amber-500 mt-1"><i class="bi bi-file-earmark-text"></i> Câu tự luận — chờ giáo viên chấm điểm.</p>`}
        ${comment ? `<div class="mt-2 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs"><b class="text-blue-600 dark:text-blue-400"><i class="bi bi-pencil-square"></i> Nhận xét của giáo viên:</b> <span class="whitespace-pre-wrap">${esc(comment)}</span></div>` : ''}`;
    }
    return `
      <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm" data-q="${q.id}">
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-bold text-[#cf1717]">Câu ${qNo}</p>
          ${attempt._empty ? `<span class="text-[11px] font-bold text-gray-400">${pts} điểm</span>` : `<span class="text-[11px] font-extrabold px-2.5 py-1 rounded-full ${chipCls}"><i class="bi bi-bullseye"></i> ${chipTxt} điểm</span>`}
        </div>
        <div class="qcontent text-sm text-gray-900 dark:text-white">${q.content || ''}</div>
        <div class="space-y-2">${bodyHtml}</div>
        ${rvEditBtnHtml(q)}
        ${reveal && q.explanation ? `<div class="pt-2 border-t dark:border-zinc-800"><p class="text-[10px] font-bold uppercase text-gray-400 mb-1"><i class="bi bi-lightbulb"></i> Giải thích</p><div class="qcontent text-xs text-gray-600 dark:text-gray-300">${q.explanation}</div></div>` : ''}
      </div>`;
  }

  window.onload = init;

;
/* Source: assets/js/ru-highlight.js */
/* ReadUp highlight & dictionary: a single event owner for both exam.html and assignment.html. */
(function (w) {
  'use strict';
  const palette = {yellow:'#fff176',green:'#c8e6c9',blue:'#bbdefb',pink:'#f8bbd0',orange:'#ffe0b2',purple:'#e1bee7'};
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = (name) => `<i class="bi bi-${name}" aria-hidden="true"></i>`;
  const menu = document.getElementById('textSelectionMenu');
  if (!menu) return;
  // All old selection handlers in the two page scripts have been retired; this is the only owner.
  menu.className = 'ruhl-menu hidden';
  menu.setAttribute('role','toolbar'); menu.setAttribute('aria-label','Highlight and look up text');
  const swatches=Object.entries(palette).map(([name,color]) => `<button type="button" class="ruhl-swatch" data-ruhl-color="${name}" title="Highlight ${name}" aria-label="Highlight ${name}"><span class="ruhl-color-dot" style="background:${color}"></span>${name[0].toUpperCase()+name.slice(1)}</button>`).join('');
  menu.innerHTML=`<div class="ruhl-title">${icon('highlighter')} <strong>Highlight</strong><button type="button" class="ruhl-x" data-ruhl-action="hide" title="Close">${icon('x-lg')}</button></div><div class="ruhl-swatches">${swatches}</div><div class="ruhl-actions"><button type="button" data-ruhl-action="copy">${icon('clipboard')} <span>Copy</span></button><button type="button" data-ruhl-action="lookup">${icon('translate')} <span>Look up</span></button><button type="button" data-ruhl-action="note">${icon('chat-left-text')} <span>Note</span></button><button type="button" id="btnRemoveHighlight" data-ruhl-action="remove">${icon('eraser')} <span>Remove</span></button><button type="button" class="ruhl-clear" data-ruhl-action="clear">${icon('trash3')} <span>Clear all</span></button></div>`;
  const notes=document.createElement('div');notes.className='ruhl-note hidden';notes.id='ruhlNote';notes.setAttribute('role','dialog');notes.setAttribute('aria-label','Ghi chú văn bản');
  notes.innerHTML=`<div class="ruhl-pophead"><strong>${icon('chat-left-text')} Ghi chú</strong><button type="button" class="ruhl-x" data-ruhl-noteclose>${icon('x-lg')}</button></div><div class="ruhl-popbody"><div id="ruhlNoteQuote" class="ruhl-notequote"></div><textarea id="ruhlNoteText" rows="3" placeholder="Write a note or meaning…"></textarea><div class="ruhl-popfoot"><button type="button" data-ruhl-noteclose>Cancel</button><button type="button" class="ruhl-primary" data-ruhl-notesave>${icon('check2')} Save</button></div></div>`;
  document.body.append(notes);
  let selectedRange=null, currentMark=null, selectedText='', anchorRect=null, requestId=0;
  const isOpen=el=>!el.classList.contains('hidden');
  function targetFromNode(node){const el=node && (node.nodeType===3?node.parentElement:node);return el?.closest?.('[data-rd-passage],#passageContent,#questionsForm,#questionArea');}
  function selection(){const s=w.getSelection();if(!s||s.isCollapsed||!s.rangeCount||!s.toString().trim())return null;const r=s.getRangeAt(0);const target=targetFromNode(r.commonAncestorContainer);if(!target || target.closest('[contenteditable="true"],input,textarea'))return null;return r;}
  function capture(){const r=selection();if(!r)return false;selectedRange=r.cloneRange();selectedText=r.toString().trim();currentMark=null;const boxes=r.getClientRects();anchorRect=(boxes.length?boxes[0]:r.getBoundingClientRect());return true;}
  function chosenText(){return currentMark?.textContent?.trim()||selectedText||selectedRange?.toString().trim()||'';}
  function closeMenu(){menu.classList.add('hidden');}
  function closePanel(){ /* global dictionary is independent of highlight menu */ }
  function closeNote(){notes.classList.add('hidden');}
  // Place the UI away from the selection. Side positions take priority; never center it on the text.
  function place(el, rect, preferSide=true){
    if(!rect)return;
    el.classList.remove('hidden');
    const gap=12,margin=10,VW=w.innerWidth,VH=w.innerHeight;
    const width=el.offsetWidth||260,height=el.offsetHeight||240;
    let left,top;
    if(preferSide && VW-rect.right-gap-margin>=width){left=rect.right+gap;top=rect.top-16;}
    else if(preferSide && rect.left-gap-margin>=width){left=rect.left-width-gap;top=rect.top-16;}
    else if(rect.top-gap-margin>=height){left=rect.left;top=rect.top-height-gap;}
    else if(VH-rect.bottom-gap-margin>=height){left=rect.left;top=rect.bottom+gap;}
    else if(VW-rect.right-gap-margin>=width){left=rect.right+gap;top=rect.top;}
    else {left=Math.max(margin,Math.min(VW-width-margin,rect.left));top=rect.bottom+gap;}
    left=Math.min(Math.max(margin,left),Math.max(margin,VW-width-margin));
    top=Math.min(Math.max(margin,top),Math.max(margin,VH-height-margin));
    el.style.left=Math.round(left)+'px';el.style.top=Math.round(top)+'px';
  }
  function openMenu(){if(!anchorRect)return;closePanel();closeNote();menu.querySelector('[data-ruhl-action="remove"]').hidden=!currentMark;place(menu,anchorRect,true);}
  function paint(color){
    if(!palette[color])return;
    if(currentMark?.isConnected){currentMark.style.backgroundColor=palette[color];currentMark.dataset.ruhlColor=color;closeMenu();return;}
    const r=selectedRange;if(!r || r.collapsed)return;
    const m=document.createElement('mark');m.className='highlight-item';m.dataset.ruhlColor=color;m.style.backgroundColor=palette[color];m.style.color='#18202c';m.style.padding='0 2px';m.style.borderRadius='3px';
    try{m.appendChild(r.extractContents());r.insertNode(m);currentMark=m;selectedText=m.textContent.trim();selectedRange=null;w.getSelection()?.removeAllRanges();}catch(e){console.warn('[ReadUp] Highlight không áp dụng cho vùng DOM này:',e);}
    closeMenu();
  }
  function unwrap(m){if(!m?.isConnected)return;const parent=m.parentNode;while(m.firstChild)parent.insertBefore(m.firstChild,m);m.remove();parent.normalize();}
  function remove(){unwrap(currentMark);currentMark=null;closeMenu();}
  function clear(){const marks=[...document.querySelectorAll('#passageContent mark.highlight-item,#questionsForm mark.highlight-item,#questionArea mark.highlight-item,[data-rd-passage] mark.highlight-item')];if(!marks.length){closeMenu();return;}if(!w.confirm(window.RULang?.current()==='vi'?'Xóa toàn bộ phần tô màu trên trang?':'Remove all highlights on this page?'))return;marks.reverse().forEach(unwrap);currentMark=null;closeMenu();}
  function fallbackCopy(t){const a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.append(a);a.select();document.execCommand('copy');a.remove();}
  function copy(t){if(!t)return;if(navigator.clipboard?.writeText)navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t));else fallbackCopy(t);closeMenu();}
  function noteKey(){return 'readup-notes:'+location.pathname+location.search;}
  function storedNotes(){try{return JSON.parse(localStorage.getItem(noteKey())||'{}');}catch{return {};}}
  function openNote(initial){const text=chosenText();if(!text)return;closeMenu();closePanel();document.getElementById('ruhlNoteQuote').textContent=text;document.getElementById('ruhlNoteText').value=initial??currentMark?.dataset.ruhlNote??storedNotes()[text]??'';place(notes,anchorRect||{left:20,right:20,top:20,bottom:20},true);}
  function saveNote(){const text=chosenText(),value=document.getElementById('ruhlNoteText').value.trim();if(!text)return;const data=storedNotes();if(value)data[text]=value;else delete data[text];try{localStorage.setItem(noteKey(),JSON.stringify(data));}catch{}
    if(!currentMark&&selectedRange)paint('yellow');if(currentMark?.isConnected){currentMark.dataset.ruhlNote=value;currentMark.title=value;}closeNote();}
  function openLookup(){const t=chosenText();if(!t)return;closeMenu();closeNote();window.RUFinder?.open(t);}
  menu.addEventListener('pointerdown',e=>{if(e.target.closest('button'))e.preventDefault();});
  menu.addEventListener('click',e=>{const c=e.target.closest('[data-ruhl-color]');if(c){paint(c.dataset.ruhlColor);return;}const a=e.target.closest('[data-ruhl-action]');if(!a)return;({hide:closeMenu,copy:()=>copy(chosenText()),lookup:openLookup,note:()=>openNote(),remove,clear})[a.dataset.ruhlAction]?.();});
  notes.addEventListener('click',e=>{if(e.target.closest('[data-ruhl-noteclose]'))closeNote();else if(e.target.closest('[data-ruhl-notesave]'))saveNote();});
  document.addEventListener('pointerup',e=>{if(e.target.closest?.('#textSelectionMenu,#ru-dictionary-root,#ruhlNote'))return;
    const hit=e.target.closest?.('mark.highlight-item');if(hit&&targetFromNode(hit)){currentMark=hit;selectedText=hit.textContent.trim();selectedRange=null;anchorRect=hit.getBoundingClientRect();openMenu();return;}
    // pointerup is fired for mouse, pen and touch, including scrollable reading panes.
    if(capture()){openMenu();return;}
    closeMenu();
  });
  document.addEventListener('click',e=>{if(e.target.closest?.('#textSelectionMenu,#ru-dictionary-root,#ruhlNote'))return;if(!e.target.closest?.('mark.highlight-item')&&!selection()){closeMenu();closeNote();}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();closeNote();}});
  w.RUHighlight={paint,remove,clear,lookup:openLookup};
})(window);

;
/* Source: assets/js/page-loader.js */
/* Màn hình chờ dùng chung. Không sửa đổi hoặc can thiệp vào hàm gốc của từng trang. */
(function () {
  'use strict';
  var overlay = document.getElementById('ru-page-loader');
  if (!overlay) return;
  var pathname = location.pathname.split('/').pop().toLowerCase() || 'index.html';
  var protectedPages = [
    'admin.html', 'dashboard.html', 'editlml.html', 'exam.html',
    'profile.html', 'room.html', 'teacher.html', 'vocab.html', 'gamevocab.html'
  ];
  var isDemo = pathname === 'gamevocab.html' && new URLSearchParams(location.search).has('demo');
  var requiresLogin = protectedPages.indexOf(pathname) !== -1 && !isDemo;
  var dismissed = false;

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    overlay.classList.add('ru-page-loader--done');
    overlay.setAttribute('aria-hidden', 'true');
    window.setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 190);
  }
  function fail() {
    if (requiresLogin) {
      // Giữ nguyên đích chuyển hướng đăng nhập như các trang hiện tại.
      window.location.replace('index.html');
      return;
    }
    dismiss();
  }
  async function verifyAndReveal() {
    // Các trang công khai không cần đợi Supabase để hiện nội dung.
    if (!requiresLogin) { dismiss(); return; }
    if (typeof sbClient === 'undefined' || !sbClient || !sbClient.auth) {
      // Trang công khai hoặc phòng thi không dùng sbClient.
      if (requiresLogin) { fail(); return; }
      dismiss();
      return;
    }
    try {
      // Dùng lại Supabase client sẵn có của trang; không tạo thêm phiên hay client mới.
      var authResult = await sbClient.auth.getSession();
      var user = authResult && authResult.data && authResult.data.session && authResult.data.session.user;
      if (requiresLogin && !user) { fail(); return; }
      // Trang quyền hạn giáo viên/admin tiếp tục được kiểm tra role bằng logic có sẵn.
      dismiss();
    } catch (error) {
      console.warn('Không kiểm tra được phiên đăng nhập:', error);
      fail();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verifyAndReveal, { once: true });
  } else {
    verifyAndReveal();
  }
}());
