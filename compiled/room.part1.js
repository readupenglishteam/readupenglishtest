/* Source: assets/js/pages/room.02.js */

  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
    const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
    const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser = null;
  let activeRoomCode = null;
  let activeRoomData = null;
  let roomChannel = null;
  let chatChannel = null;
  let html5QrScanner = null;

  // Helper Escape HTML chống XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
  function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

  function generateRoomCode() {
    const chars = '0123456789';
    let rand = '';
    for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
    return `READ-${rand}`;
  }

  // --- 1. KHỞI TẠO VÀ XÁC THỰC USER ---
  async function initRoomApp() {
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session || !session.user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = session.user;

    // Lắng nghe danh sách phòng Realtime
    fetchAndRenderRoomsList();
    subscribeAllRoomsList();

    // Khôi phục phòng nếu có tham số từ URL hoặc Cache
    const urlParams = new URLSearchParams(window.location.search);
    const joinCodeParam = urlParams.get('join_code');
    const cacheRoomCode = localStorage.getItem('last_active_room');

    if (joinCodeParam) {
      await joinRoom(joinCodeParam);
    } else if (cacheRoomCode) {
      await selectRoom(cacheRoomCode);
    }
  }

  // --- 2. HIỂN THỊ DANH SÁCH PHÒNG Ở CỘT TRÁI ---
  async function fetchAndRenderRoomsList() {
    const { data: rooms } = await sbClient.from('rooms').select('*').order('created_at', { ascending: false });
    const container = document.getElementById('roomListSidebar');
    const badge = document.getElementById('totalRoomsBadge');
    
    if (badge) badge.innerText = `${rooms ? rooms.length : 0} Phòng`;

    if (!rooms || rooms.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-gray-400 text-xs">
          <p class="text-3xl mb-2">🛋️</p>
          Chưa có phòng học nào.<br>Hãy bấm <strong>Tạo Phòng</strong> để bắt đầu!
        </div>`;
      return;
    }

    container.innerHTML = rooms.map(room => {
      const isSelected = room.room_code === activeRoomCode;
      const isHost = room.host_id === currentUser.id;

      return `
        <div onclick="selectRoom('${room.room_code}')" class="p-3.5 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
          isSelected 
            ? 'bg-red-50 dark:bg-red-950/40 border-[#cf1717] shadow-sm' 
            : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:border-red-300'
        }">
          <div class="flex items-center gap-3 truncate">
            <div class="w-10 h-10 rounded-xl ${isSelected ? 'bg-[#cf1717] text-white' : 'bg-red-100 dark:bg-zinc-800 text-[#cf1717]'} flex items-center justify-center font-black text-xs flex-shrink-0">
              ${room.room_code.slice(-4)}
            </div>
            <div class="truncate space-y-0.5">
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-xs text-gray-900 dark:text-white truncate">${room.room_code}</span>
                ${isHost ? '<span class="text-[9px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded">HOST</span>' : ''}
              </div>
              <p class="text-[10px] text-gray-500 truncate">${room.mode === 'battle' ? '⚔️ Đua Tốc Độ' : '☕ Co-working'}</p>
            </div>
          </div>
          <span class="text-xs text-gray-400">➔</span>
        </div>
      `;
    }).join('');
  }

  // --- 3. TẠO PHÒNG MỚI ---
  function openCreateRoomModal() { openModal('modalCreateRoom'); }
  
  async function handleCreateRoom() {
    const examToken = document.getElementById('roomExamSelect').value;
    const mode = document.querySelector('input[name="roomMode"]:checked')?.value || 'battle';
    const roomCode = generateRoomCode();

    const { error } = await sbClient.from('rooms').insert([{
      room_code: roomCode,
      host_id: currentUser.id,
      exam_token: examToken,
      mode: mode,
      status: 'waiting'
    }]);

    if (error) {
      alert("❌ Lỗi tạo phòng: " + error.message);
      return;
    }

    const fullName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    await sbClient.from('room_participants').insert([{
      room_code: roomCode,
      user_id: currentUser.id,
      full_name: fullName,
      role: 'host',
      score: 0,
      is_finished: false
    }]);

    closeModal('modalCreateRoom');
    await selectRoom(roomCode);
  }

  // --- 4. THAM GIA PHÒNG & CHỌN PHÒNG ---
  function openJoinRoomModal() { openModal('modalJoinRoom'); }

  async function submitJoinCode() {
    const code = document.getElementById('inputJoinCode').value.trim().toUpperCase();
    if (!code) return alert("Vui lòng nhập mã!");
    closeModal('modalJoinRoom');
    await joinRoom(code);
  }

  async function joinRoom(roomCode) {
    const { data: room } = await sbClient.from('rooms').select('*').eq('room_code', roomCode).maybeSingle();
    if (!room) return alert("❌ Mã phòng không tồn tại!");

    const fullName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    const { data: existing } = await sbClient.from('room_participants').select('*').eq('room_code', roomCode).eq('user_id', currentUser.id).maybeSingle();

    if (!existing) {
      await sbClient.from('room_participants').insert([{
        room_code: roomCode,
        user_id: currentUser.id,
        full_name: fullName,
        role: room.host_id === currentUser.id ? 'host' : 'member',
        score: 0,
        is_finished: false
      }]);
    }

    await selectRoom(roomCode);
  }

  async function selectRoom(roomCode) {
    activeRoomCode = roomCode;
    localStorage.setItem('last_active_room', roomCode);

    const { data: room } = await sbClient.from('rooms').select('*').eq('room_code', roomCode).maybeSingle();
    if (!room) {
      localStorage.removeItem('last_active_room');
      document.getElementById('emptyRoomState').classList.remove('hidden');
      document.getElementById('activeRoomDetailState').classList.add('hidden');
      return;
    }

    activeRoomData = room;

    // Chuyển UI
    document.getElementById('emptyRoomState').classList.add('hidden');
    document.getElementById('activeRoomDetailState').classList.remove('hidden');

    // Cập nhật Header phòng
    document.getElementById('currentRoomTitle').innerText = `Phòng ${roomCode}`;
    document.getElementById('currentRoomCodeBadge').innerText = roomCode;
    document.getElementById('currentRoomModeText').innerText = room.mode === 'battle' ? '⚔️ Đua Tốc Độ' : '☕ Co-working';

    // Đánh dấu quyền Host
    const isHost = room.host_id === currentUser.id;
    const hostGroup = document.getElementById('hostControlGroup');
    if (isHost) hostGroup.classList.replace('hidden', 'flex');
    else hostGroup.classList.replace('flex', 'hidden');

    // Vẽ QR
    const qrBox = document.getElementById('roomQrContainer');
    qrBox.innerHTML = '';
    const shareUrl = `${window.location.origin}${window.location.pathname}?join_code=${roomCode}`;
    new QRCode(qrBox, { text: shareUrl, width: 100, height: 100 });

    // Tải thông tin thành viên & Chat
    fetchParticipants(roomCode);
    fetchChatMessages(roomCode);
    subscribeRoomRealtime(roomCode);

    fetchAndRenderRoomsList();
  }

  // --- 5. TẢI THÀNH VIÊN VÀ CHAT REALTIME ---
  async function fetchParticipants(roomCode) {
    const { data: list } = await sbClient.from('room_participants').select('*').eq('room_code', roomCode);
    if (!list) return;

    document.getElementById('participantCountText').innerText = `${list.length}/10`;

    // Lấy tên host
    const hostUser = list.find(p => p.role === 'host');
    if (hostUser) document.getElementById('currentRoomHostName').innerText = hostUser.full_name;

    const container = document.getElementById('roomParticipantsList');
    container.innerHTML = list.map(p => `
      <div class="p-2.5 bg-gray-50 dark:bg-zinc-800/80 rounded-xl flex items-center justify-between text-xs font-bold border border-gray-100 dark:border-zinc-700">
        <span class="text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <span>👤</span> ${escapeHtml(p.full_name)}
          ${p.role === 'host' ? '👑' : ''}
        </span>
        ${p.is_finished 
          ? `<span class="text-emerald-500 font-extrabold">${p.score || 0}đ ✅</span>` 
          : '<span class="text-amber-500 font-normal">⏳ Đang chờ</span>'}
      </div>
    `).join('');
  }

  async function fetchChatMessages(roomCode) {
    const { data: msgs } = await sbClient.from('room_messages').select('*').eq('room_code', roomCode).order('created_at', { ascending: true });
    const box = document.getElementById('chatMessagesBox');
    box.innerHTML = '';
    if (msgs) msgs.forEach(m => appendChatMessage(m));
  }

  function appendChatMessage(msg) {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    const isMe = msg.user_id === currentUser.id;
    const msgEl = document.createElement('div');
    msgEl.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'}`;

    msgEl.innerHTML = `
      <span class="text-[9px] text-gray-400 px-1 mb-0.5">${escapeHtml(msg.user_name)}</span>
      <div class="max-w-[80%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm ${
        isMe 
          ? 'bg-[#cf1717] text-white rounded-tr-none font-medium shadow-sm' 
          : 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-tl-none border border-gray-200 dark:border-zinc-700 shadow-sm'
      }">
        ${escapeHtml(msg.message)}
      </div>
    `;

    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
  }

  async function handleSendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('inputChatMessage');
    const text = input.value.trim();
    if (!text || !activeRoomCode) return;

    input.value = '';
    const fullName = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];

    await sbClient.from('room_messages').insert([{
      room_code: activeRoomCode,
      user_id: currentUser.id,
      user_name: fullName,
      message: text
    }]);
  }

  function subscribeRoomRealtime(roomCode) {
    if (roomChannel) sbClient.removeChannel(roomChannel);

    roomChannel = sbClient.channel(`room_live_${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_code=eq.${roomCode}` }, () => fetchParticipants(roomCode))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_code=eq.${roomCode}` }, (payload) => appendChatMessage(payload.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` }, () => {
        alert("⚠️ Phòng này đã bị chủ phòng xóa!");
        localStorage.removeItem('last_active_room');
        location.reload();
      })
      .subscribe();
  }

  function subscribeAllRoomsList() {
    sbClient.channel('all_rooms_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchAndRenderRoomsList())
      .subscribe();
  }

  // --- 6. HÀNH ĐỘNG CỦA CHỦ PHÒNG & THÀNH VIÊN ---
  async function handleStartExamForGroup() {
    if (!activeRoomData) return;
    alert(`🚀 Đang chuyển cả nhóm tới bài Reading token: ${activeRoomData.exam_token}`);
    window.location.href = `exam.html?token=${activeRoomData.exam_token}&room_code=${activeRoomCode}`;
  }

  async function handleHostDeleteRoom() {
    if (!confirm("⚠️ Bạn có chắc chắn muốn xóa phòng này? Tất cả thành viên sẽ rời khỏi phòng.")) return;
    await sbClient.from('room_participants').delete().eq('room_code', activeRoomCode);
    await sbClient.from('room_messages').delete().eq('room_code', activeRoomCode);
    await sbClient.from('rooms').delete().eq('room_code', activeRoomCode);
    localStorage.removeItem('last_active_room');
    location.reload();
  }

  async function handleLeaveRoom() {
    if (activeRoomCode && currentUser) {
      await sbClient.from('room_participants').delete().eq('room_code', activeRoomCode).eq('user_id', currentUser.id);
    }
    localStorage.removeItem('last_active_room');
    document.getElementById('emptyRoomState').classList.remove('hidden');
    document.getElementById('activeRoomDetailState').classList.add('hidden');
    activeRoomCode = null;
    fetchAndRenderRoomsList();
  }

  function copyRoomCode() {
    if (!activeRoomCode) return;
    navigator.clipboard.writeText(activeRoomCode);
    alert("📋 Đã sao chép mã phòng: " + activeRoomCode);
  }

  // Camera QR
  async function toggleQrScanner() {
    const container = document.getElementById('qrReaderContainer');
    if (container.classList.contains('hidden')) {
      container.classList.remove('hidden');
      html5QrScanner = new Html5Qrcode("qrReaderContainer");
      try {
        await html5QrScanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 200 }, async (text) => {
          await html5QrScanner.stop();
          container.classList.add('hidden');
          let code = text;
          try { code = new URL(text).searchParams.get('join_code') || text; } catch(e){}
          closeModal('modalJoinRoom');
          await joinRoom(code);
        });
      } catch (err) { container.classList.add('hidden'); }
    } else {
      if (html5QrScanner) await html5QrScanner.stop();
      container.classList.add('hidden');
    }
  }

  function triggerQrFileUpload() { document.getElementById('qrFileInput')?.click(); }

  async function handleQrImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const scanner = new Html5Qrcode("qrReaderContainer");
    try {
      const decoded = await scanner.scanFile(file, true);
      let code = decoded;
      try { code = new URL(decoded).searchParams.get('join_code') || decoded; } catch(e){}
      closeModal('modalJoinRoom');
      await joinRoom(code);
    } catch(err) {
      alert("❌ Không tìm thấy mã QR hợp lệ trong ảnh!");
    }
  }

  // Helper User Dropdown & Darkmode
  function toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    document.getElementById('userDropdownMenu')?.classList.toggle('hidden');
  }

  function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  }

  async function handleLogout() {
    await sbClient.auth.signOut();
    window.location.href = 'index.html';
  }

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('userDropdownMenu');
    if (menu && !menu.contains(e.target)) menu.classList.add('hidden');
  });

  window.onload = initRoomApp;

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
