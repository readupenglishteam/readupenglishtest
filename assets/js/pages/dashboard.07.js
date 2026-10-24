
  let ratings = { q1: 5, q2: 5, q3: 5 };

  function openSupportModal() {
    showSupportChoice();
    document.getElementById('supportModal').classList.remove('hidden');
    // Tự động điền tên + email nếu học viên đã đăng nhập
    if (typeof currentUser !== 'undefined' && currentUser) {
      document.getElementById('spEmail').value = currentUser.email || '';
      document.getElementById('spFullName').value = currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
    }
  }

  function closeSupportModal() { document.getElementById('supportModal').classList.add('hidden'); }
  function showSupportChoice() {
    document.getElementById('supportChoiceView').classList.remove('hidden');
    document.getElementById('createTicketForm').classList.add('hidden');
    document.getElementById('ticketHistoryView').classList.add('hidden');
  }
  function showCreateTicketForm() {
    document.getElementById('supportChoiceView').classList.add('hidden');
    document.getElementById('createTicketForm').classList.remove('hidden');
  }

  async function handleCreateTicket(e) {
    e.preventDefault();
    const ticketCode = 'TK-' + Math.floor(10000 + Math.random() * 90000);
    const payload = {
      ticket_code: ticketCode,
      user_id: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null,
      full_name: document.getElementById('spFullName').value,
      email: document.getElementById('spEmail').value,
      title: document.getElementById('spTitle').value,
      content: document.getElementById('spContent').value
    };

    const { error } = await sbClient.from('support_tickets').insert([payload]);
    if (error) { notify("[error] Lỗi gửi yêu cầu: " + error.message); return; }

    notify(`[success] Gửi yêu cầu thành công! Mã hỗ trợ của bạn là: ${ticketCode}`);
    document.getElementById('spTitle').value = '';
    document.getElementById('spContent').value = '';
    showTicketHistoryView();
  }

  async function showTicketHistoryView() {
    document.getElementById('supportChoiceView').classList.add('hidden');
    document.getElementById('ticketHistoryView').classList.remove('hidden');

    const container = document.getElementById('ticketListContainer');
    container.innerHTML = '<p class="text-xs text-gray-400">Đang tải dữ liệu...</p>';

    let query = sbClient.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (typeof currentUser !== 'undefined' && currentUser) {
      query = query.eq('user_id', currentUser.id);
    } else {
      const inputEmail = prompt("Nhập Email của bạn để kiểm tra lịch sử hỗ trợ:");
      if (!inputEmail) { showSupportChoice(); return; }
      query = query.eq('email', inputEmail.trim());
    }

    const { data: tickets, error } = await query;
    if (error || !tickets || tickets.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Chưa có lịch sử yêu cầu hỗ trợ nào.</p>';
      return;
    }

    // Render giao diện thẻ phản hồi chuẩn như ảnh đính kèm
    container.innerHTML = tickets.map(t => `
      <div class="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border dark:border-zinc-700 space-y-2 text-xs">
        <div class="flex justify-between items-start gap-2">
          <strong class="text-gray-900 dark:text-white font-bold">${t.title}</strong>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${t.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">
            Mã: ${t.ticket_code}
          </span>
        </div>
        <p class="text-gray-500 text-[11px]">Ngày gửi: ${new Date(t.created_at).toLocaleString('vi-VN')}</p>
        <div class="text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900/60 p-2.5 rounded-xl border dark:border-zinc-800">
          ${t.content}
        </div>
        ${t.admin_reply ? `
      <div class="p-3 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-100 dark:border-red-900/40 text-xs space-y-1">
      <span class="font-bold text-[#cf1717] block"><i class="bi bi-chat-dots-fill"></i> Trả lời từ hỗ trợ:</span>
      <p class="text-gray-800 dark:text-gray-200">${t.admin_reply}</p>
      </div>
      ` : `
      <p class="text-[11px] text-yellow-600 italic"><i class="bi bi-hourglass-split"></i> Đang chờ Quản trị viên phản hồi...</p>
      `}
      </div>
    `).join('');
  }

  // KHẢO SÁT
  function openFeedbackModal() { document.getElementById('feedbackModal').classList.remove('hidden'); setRating(1, 5); setRating(2, 5); setRating(3, 5); }
  function closeFeedbackModal() { document.getElementById('feedbackModal').classList.add('hidden'); }

  function setRating(qNum, starCount) {
    ratings[`q${qNum}`] = starCount;
    const stars = document.querySelectorAll(`#starQ${qNum} .star${qNum}`);
    stars.forEach((s, idx) => {
        s.className = `star${qNum} ${idx < starCount ? 'text-amber-400' : 'text-gray-300'}`;
    });
  }

  async function handleSendFeedback(e) {
    e.preventDefault();
    const payload = {
      q1_rating: ratings.q1,
      q2_rating: ratings.q2,
      q3_rating: ratings.q3,
      comment: document.getElementById('fbComment').value
    };

    const { error } = await sbClient.from('feedbacks').insert([payload]);
    if (error) { notify("[error] Lỗi gửi đánh giá: " + error.message); return; }

    notify("[heart] Cảm ơn bạn đã đóng góp ý kiến cho ReadUp English!");
    document.getElementById('fbComment').value = '';
    closeFeedbackModal();
  }

  // Hàm mở Modal hướng dẫn dành cho Student khi bấm nút '?'
  async function openStudentGuide(sectionKey, sectionTitle) {
    document.getElementById('studentGuideTitle').innerHTML = `<i class="bi bi-lightbulb-fill"></i> Hướng Dẫn: ${escapeHtml(sectionTitle)}`;
    document.getElementById('studentGuideModal').classList.remove('hidden');

    const container = document.getElementById('studentGuideContainer');
    container.innerHTML = '<p class="text-xs text-gray-400 italic">Đang tải...</p>';

    // Lấy dữ liệu chỉ lọc target_role = 'student'
    const { data, error } = await sbClient
    .from('guides')
    .select('*')
    .eq('section_key', sectionKey)
    .eq('target_role', 'student')
    .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 italic">Chưa có hướng dẫn nào cho phần này.</p>';
      return;
    }

    container.innerHTML = data.map(item => `
    <div class="p-4 bg-gray-50 dark:bg-zinc-800/80 rounded-xl border border-gray-200 dark:border-zinc-700 space-y-2">
      <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
        <span class="text-[#cf1717]">•</span> ${escapeHtml(item.title)}
      </h4>
      ${item.content ? `<div class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">${item.content}</div>` : ''}
      ${item.image_url ? `<img src="${item.image_url}" class="w-full max-h-72 object-contain rounded-lg border border-gray-200 dark:border-zinc-700 mt-2">` : ''}
    </div>
  `).join('');
  }
  function escapeHtml(str) {
    return str ? String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  }

  function closeStudentGuide() {
    document.getElementById('studentGuideModal').classList.add('hidden');
  }

  let pronunChartInstance = null;

  // 1. Tải danh sách câu từ Supabase vào Select
  async function loadStudentPronunPhrases() {
    const select = document.getElementById('selectPronunPhrase');
    if (!select) return;

    const { data } = await sbClient.from('pronunciation_phrases').select('*').order('created_at', { ascending: false });

    if (data && data.length > 0) {
      currentPhrasesList = data;
      select.innerHTML = data.map(item => `<option value="${item.id}">${escapeHtml(item.phrase)}</option>`).join('');
      updateTargetSpeechText();
    } else {
      select.innerHTML = '<option value="">Chưa có câu mẫu nào</option>';
    }
  }

  function updateTargetSpeechText() {
    const select = document.getElementById('selectPronunPhrase');
    const selectedObj = currentPhrasesList.find(p => p.id == select.value);
    document.getElementById('targetSpeechText').innerText = selectedObj ? selectedObj.phrase : '';
  }

  // 2. Thu Âm & Chấm Điểm Web Speech API
  // === DÁN ĐOẠN NÀY THAY THẾ CHO ĐOẠN BẠN VỪA GỬI ===
  let recognition = null;
  let silenceTimer = null;
  let finalSpeechTranscript = '';

  // 1. Kiểm tra và kích hoạt Modal xin quyền Micro
  async function checkAndRequestMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      startPronunciationCheck();
    } catch (err) {
      document.getElementById('micPermissionModal')?.classList.remove('hidden');
    }
  }

  // 2. Cấp quyền từ Modal
  async function grantMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      closeMicModal();
      startPronunciationCheck();
    } catch (err) {
      notify("[warning] Trình duyệt đã bị từ chối quyền Micro. Vui lòng cho phép quyền Micro trên thanh địa chỉ trình duyệt!");
      closeMicModal();
    }
  }

  function closeMicModal() {
    document.getElementById('micPermissionModal')?.classList.add('hidden');
  }

  // 3. Logic Thu Âm & Chấm Điểm Web Speech API
  function startPronunciationCheck() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      notify("[error] Trình duyệt không hỗ trợ Web Speech API. Hãy dùng Google Chrome hoặc Microsoft Edge!");
      return;
    }

    const targetElem = document.getElementById('targetSpeechText');
    const targetText = targetElem ? targetElem.innerText.trim() : document.getElementById('aiSearchInput')?.value.trim();

    if (!targetText) {
      notify("Vui lòng nhập từ vựng hoặc chọn câu để đọc!");
      return;
    }

    // Nếu đang nói mà bấm nút lần nữa -> Dừng lại ngay
    if (recognition && recognition.isSpeaking) {
      clearTimeout(silenceTimer);
      recognition.stop();
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    finalSpeechTranscript = '';
    recognition.isSpeaking = true;

    // Cập nhật trạng thái nút ghi âm
    setRecordBtnState(true);

    recognition.start();

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalSpeechTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
          if (recognition) recognition.stop();
        }, 2500);
    };

    recognition.onend = async () => {
      clearTimeout(silenceTimer);
      if (recognition) recognition.isSpeaking = false;
      resetRecordBtn();

      const spokenText = finalSpeechTranscript.trim();
      if (spokenText) {
        if (typeof processPronunResult === 'function') {
          await processPronunResult(targetText, spokenText);
        } else {
          notify("[mic] Âm thanh thu nhận: " + spokenText);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);
      clearTimeout(silenceTimer);

      if (event.error === 'service-not-allowed' || event.error === 'not-allowed') {
        document.getElementById('micPermissionModal')?.classList.remove('hidden');
      } else if (event.error !== 'no-speech') {
        notify("[error] Lỗi ghi âm: " + event.error);
      }

      resetRecordBtn();
    };
  }

  // Hàm bổ trợ cập nhật giao diện nút bấm
  function setRecordBtnState(isRecording) {
    const btn = document.getElementById('btnRecordSpeech');
    const btnText = document.getElementById('btnRecordText');

    if (btnText) {
      btnText.innerHTML = isRecording ? "<i class='bi bi-mic-fill'></i> Đang nghe... (Bấm khi nói xong)" : "Bấm để nói lại";
    }

    if (btn) {
      if (isRecording) {
        btn.classList.add('text-amber-500', 'animate-pulse');
      } else {
        btn.classList.remove('text-amber-500', 'animate-pulse');
      }
    }
  }

  function resetRecordBtn() {
    setRecordBtnState(false);
  }
  // 3. Phân tích kết quả + Lưu lên Supabase
  async function processPronunResult(targetText, spokenText) {
    const clean = (str) => str.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim().split(/\s+/);

  const targetWords = clean(targetText);
  const spokenWords = clean(spokenText);

  let correctCount = 0;
  let htmlResult = "";

  targetWords.forEach(word => {
    if (spokenWords.includes(word)) {
      correctCount++;
      htmlResult += `<span class="text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/60 px-1.5 py-0.5 rounded mr-1 inline-block my-0.5"><i class="bi bi-check-lg"></i> ${word}</span>`;
    } else {
      htmlResult += `<span class="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-1.5 py-0.5 rounded mr-1 inline-block my-0.5 line-through"><i class="bi bi-x-lg"></i> ${word}</span>`;
    }
  });

  const score = Math.round((correctCount / targetWords.length) * 100);

  // Hiển thị UI kết quả
  document.getElementById('speechResultBox').classList.remove('hidden');
  document.getElementById('speechWordComparison').innerHTML = htmlResult;
  document.getElementById('speechRawTranscript').innerText = `Máy nghe được: "${spokenText}"`;

  const badge = document.getElementById('speechScoreBadge');
  badge.innerText = `${score}% Chính Xác`;
  badge.className = score >= 80
    ? "text-xs font-extrabold px-[#10px] py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    : "text-xs font-extrabold px-[#10px] py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";

  // 1. LẤY USER ID THỰC TẾ TỪ AUTH
  const { data: { user } } = await sbClient.auth.getUser();
  const studentId = user ? user.id : window.currentUserId;

  if (!studentId) {
    notify("[warning] Bạn chưa đăng nhập nên không thể lưu kết quả bài làm!");
    return;
  }

  // 2. LƯU ĐIỂM CHO ĐÚNG USER
  const { error } = await sbClient.from('pronunciation_history').insert([{
    user_id: studentId,
    phrase_text: targetText,
    score: score,
    spoken_text: spokenText
  }]);

  if (error) {
    console.error("Lỗi khi lưu điểm phát âm:", error);
  }

  // 3. CẬP NHẬT LẠI BIỂU ĐỒ CÁ NHÂN
  await renderPronunChart();
  // 🔥 BƯỚC 5 ĐẶT Ở ĐÂY: Cộng 20 XP và duy trì Streak ngay sau khi đọc xong bài
  await rewardXPAndStreak(20);
}

// 4. Lấy lịch sử & Vẽ Biểu Đồ
// 4. Lấy lịch sử & Vẽ Biểu Đồ
async function renderPronunChart() {
  const canvas = document.getElementById('pronunChart');
  if (!canvas) return;

  // 1. LẤY USER ID CHUẨN TỪ SUPABASE AUTH
  const { data: { user } } = await sbClient.auth.getUser();
  const studentId = user ? user.id : window.currentUserId;

  if (!studentId) {
    console.warn("Chưa đăng nhập tài khoản, không thể tải biểu đồ cá nhân.");
    return;
  }

  // 2. LẤY 10 LẦN MỚI NHẤT CỦA ĐÚNG USER NÀY (ascending: false)
  const { data, error } = await sbClient
    .from('pronunciation_history')
    .select('*')
    .eq('user_id', studentId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Lỗi lấy lịch sử phát âm:", error);
    return;
  }

  // Đảo ngược mảng để vẽ biểu đồ theo thứ tự thời gian từ cũ -> mới
  const recentData = data ? data.reverse() : [];

  const labels = recentData.map((_, index) => `Lần ${index + 1}`);
  const scores = recentData.map(item => item.score);

  if (pronunChartInstance) {
    pronunChartInstance.destroy(); // Hủy biểu đồ cũ trước khi vẽ mới
  }

  pronunChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Độ chính xác (%)',
        data: scores,
        borderColor: '#cf1717',
        backgroundColor: 'rgba(207, 23, 23, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#cf1717',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: { callback: value => value + '%' }
        }
      }
    }
  });
}

// Khởi tạo tính năng khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  loadStudentPronunPhrases();
  renderPronunChart();
});

let currentPhrasesList = [];

async function loadStudentPronunPhrases() {
  const select = document.getElementById('selectPronunPhrase');
  if (!select) return;

  const { data } = await sbClient.from('pronunciation_phrases').select('*').order('created_at', { ascending: false });

  if (data && data.length > 0) {
    currentPhrasesList = data;
    select.innerHTML = data.map(item => `<option value="${item.id}">${escapeHtml(item.phrase)}</option>`).join('');
    updateTargetSpeechText();
  } else {
    select.innerHTML = '<option value="">Chưa có câu mẫu nào</option>';
  }
}

// Cập nhật câu + Gợi ý khi đổi Option trong Select
function updateTargetSpeechText() {
  const select = document.getElementById('selectPronunPhrase');
  const selectedObj = currentPhrasesList.find(p => p.id == select.value);

  if (selectedObj) {
    document.getElementById('targetSpeechText').innerText = selectedObj.phrase;

    // Đổ dữ liệu vào Khung Gợi Ý
    document.getElementById('hintTextPhrase').innerText = selectedObj.phrase;
    document.getElementById('hintTextIpa').innerText = selectedObj.ipa || 'Chưa cập nhật IPA';
    document.getElementById('hintTextMeaning').innerText = selectedObj.meaning ? `Nghĩa: ${selectedObj.meaning}` : 'Chưa cập nhật nghĩa tiếng Việt';
  }
}

// Bật / Tắt Khung Gợi Ý
function togglePronunHint() {
  const hintCard = document.getElementById('pronunHintCard');
  if (hintCard) {
    hintCard.classList.toggle('hidden');
  }
}

  // ==================== QUẢN LÝ STREAK, XP & LEADERBOARD ====================

// 1. Tải chỉ số Streak & XP cá nhân
async function loadUserStats() {
  const { data: { user } } = await sbClient.auth.getUser();
  if (!user) return;

  let { data, error } = await sbClient.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();

  if (!data) {
    // Tạo mới nếu chưa có
    const { data: newStat } = await sbClient.from('user_stats').insert([{ user_id: user.id, streak_count: 0, total_xp: 0 }]).select().single();
    data = newStat;
  }

  if (data) {
    document.getElementById('userStreakCount').innerText = data.streak_count || 0;
    document.getElementById('userTotalXp').innerText = data.total_xp || 0;

    // Cập nhật danh hiệu dựa trên XP
    const badgeTitle = getBadgeTitle(data.total_xp || 0);
    document.getElementById('userBadgeTitle').innerHTML = badgeTitle;
  }
}

// 2. Hàm gọi khi Hoàn Thành Bài Tập (Được cộng XP và Tính Streak)
async function rewardXPAndStreak(addedXp = 20) {
  const { data: { user } } = await sbClient.auth.getUser();
  if (!user) return;

  const todayStr = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  let { data: stat } = await sbClient.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
  if (!stat) return;

  let currentStreak = stat.streak_count || 0;
  let lastDate = stat.last_study_date;
  let newXp = (stat.total_xp || 0) + addedXp;

  if (lastDate !== todayStr) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      currentStreak += 1; // Học liên tiếp ngày hôm qua -> Tăng Streak
    } else {
      currentStreak = 1; // Bị đứt chuỗi -> Reset về 1
    }
  }

  // Cập nhật Database
  await sbClient.from('user_stats').update({
    streak_count: currentStreak,
    total_xp: newXp,
    last_study_date: todayStr,
    updated_at: new Date()
  }).eq('user_id', user.id);

  // Load lại giao diện
  await loadUserStats();
}

// 3. Quy đổi Danh Hiệu Huy Hiệu
function getBadgeTitle(xp) {
  if (xp >= 1000) return "<i class='bi bi-gem'></i> Đại Cao Thủ";
  if (xp >= 500) return "<i class='bi bi-fire'></i> Chuyên Gia Reading";
  if (xp >= 200) return "<i class='bi bi-lightning-charge-fill'></i> Cần Cù Bứt Phá";
  return "<i class='bi bi-flower1'></i> Tân Thủ";
}

// Mở Modal & Render Bảng Xếp Hạng (Đã nâng cấp nhận diện "Bạn (Tôi)")
async function openLeaderboardModal() {
  document.getElementById('modalLeaderboard').classList.remove('hidden');
  const container = document.getElementById('leaderboardList');
  container.innerHTML = '<p class="text-center text-xs text-gray-400 italic py-4"><i class="bi bi-hourglass-split"></i> Đang tải xếp hạng...</p>';

  // Lấy tài khoản đang đăng nhập hiện tại
  const { data: { user: currentUser } } = await sbClient.auth.getUser();

  // Lấy Top 10 học sinh có XP cao nhất
  const { data, error } = await sbClient
    .from('user_stats')
    .select('total_xp, streak_count, user_id')
    .order('total_xp', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Chưa có dữ liệu bảng xếp hạng.</p>';
    return;
  }

  const medals = ['<i class="bi bi-award-fill text-lg text-amber-400"></i>', '<i class="bi bi-award-fill text-lg text-slate-400"></i>', '<i class="bi bi-award-fill text-lg text-orange-600"></i>'];

  container.innerHTML = data.map((item, index) => {
    const rankIcon = medals[index] || `#${index + 1}`;
    const badge = getBadgeTitle(item.total_xp);

    // Kiểm tra nếu dòng này là của chính người dùng đang đăng nhập
    const isMe = currentUser && currentUser.id === item.user_id;
    const displayName = isMe ? "Bạn (Tôi)" : `Học sinh #${item.user_id.substring(0, 5)}`;

    return `
        <div class="flex items-center justify-between p-3 rounded-2xl transition ${
        isMe
        ? 'bg-red-50 dark:bg-red-950/60 border-2 border-[#cf1717] shadow-sm'
        : (index === 0 ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200' : 'bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/60')
      }">
      <div class="flex items-center gap-3">
      <span class="w-7 text-center font-black text-sm sm:text-base">${rankIcon}</span>
      <div>
      <p class="font-extrabold text-xs sm:text-sm ${isMe ? 'text-[#cf1717] dark:text-red-400' : 'text-gray-900 dark:text-white'}">
      ${displayName} ${isMe ? '<i class="bi bi-star-fill"></i>' : ''}
      </p>
      <span class="text-[10px] font-bold text-gray-500 dark:text-gray-400">${badge} • <i class="bi bi-fire"></i> ${item.streak_count || 0} ngày</span>
      </div>
      </div>
      <div class="text-right">
      <span class="font-black text-sm text-[#cf1717] dark:text-red-400">${item.total_xp || 0}</span>
      <span class="text-[10px] font-bold text-gray-400 block">XP</span>
      </div>
      </div>
      `;
  }).join('');
}

function closeLeaderboardModal() {
  document.getElementById('modalLeaderboard').classList.add('hidden');
}

// Gọi hàm tải chỉ số khi bắt đầu trang
document.addEventListener('DOMContentLoaded', loadUserStats);

// 1. Bấm nút bắt đầu khôi phục chuỗi
async function startStreakRecovery() {
  const { data: { user } } = await sbClient.auth.getUser();
  if (!user) return;

  await sbClient.from('user_stats').update({
    is_recovering: true,
    recovery_progress: 0
  }).eq('user_id', user.id);

  notify("[goal] Nhiệm vụ khôi phục: Bạn cần luyện tập phát âm 2 câu chuẩn xác để lấy lại chuỗi ngọn lửa!");
  document.getElementById('streakRecoveryBox').classList.add('hidden');
}

// 2. Chèn đoạn kiểm tra này VÀO TRONG HÀM processPronunResult(targetText, spokenText)
// (Ngay sau khi chấm điểm phát âm thành công)
async function checkStreakRecoveryProgress() {
  const { data: { user } } = await sbClient.auth.getUser();
  if (!user) return;

  const { data: stat } = await sbClient.from('user_stats').select('*').eq('user_id', user.id).single();
  if (!stat || !stat.is_recovering) return;

  let currentProgress = (stat.recovery_progress || 0) + 1;

  if (currentProgress >= 2) {
    // Đã đọc đủ 2 bài -> Khôi phục thành công!
    await sbClient.from('user_stats').update({
      is_recovering: false,
      recovery_progress: 0,
      streak_count: (stat.streak_count || 1) + 1,
      last_study_date: new Date().toISOString().split('T')[0]
    }).eq('user_id', user.id);

    notify("[celebrate] CHÚC MỪNG! Bạn đã hoàn thành 2 bài phát âm và KHÔI PHỤC CHUỖI <i class='bi bi-fire'></i> thành công!");
  } else {
    // Mới đọc được 1 bài
    await sbClient.from('user_stats').update({
      recovery_progress: currentProgress
    }).eq('user_id', user.id);

    notify(`[cheer] Tuyệt vời! Bạn đã hoàn thành ${currentProgress}/2 bài phát âm. Hãy đọc thêm 1 câu nữa để cứu chuỗi!`);
  }
}

// ==================== CHỈ QUẢN LÝ THÔNG BÁO CHUỖI STREAK ====================

async function checkStreakNotifications() {
  const { data: { user } } = await sbClient.auth.getUser();
  if (!user) return;

  const { data: stat } = await sbClient.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
  if (!stat || !stat.last_study_date) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastDate = new Date(stat.last_study_date);
  lastDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
  const recoveryBtn = document.getElementById('streakRecoveryBtn');
  const todayStr = today.toISOString().split('T')[0];

  // TRƯỜNG HỢP 1: Bỏ lỡ từ 1 đến 7 ngày (Quên 1-7 ngày) -> CẢNH BÁO & CHO KHÔI PHỤC
  if (diffDays >= 2 && diffDays <= 8) {
    if (recoveryBtn) recoveryBtn.classList.remove('hidden');

    if (localStorage.getItem('seen_streak_recovery_' + todayStr) !== 'true') {
      showAutoModal({
        icon: 'bi-shield-fill-check',
        title: `Cảnh Báo: Chuỗi <i class="bi bi-fire"></i> ${stat.streak_count} Ngày Sắp Mất!`,
        note: `Bạn đã bỏ lỡ ${diffDays - 1} ngày học. Hãy bấm khôi phục và hoàn thành 2 bài phát âm để cứu ngay ngọn lửa!`,
        btnText: 'Khôi phục ngay',
        onConfirm: () => {
          localStorage.setItem('seen_streak_recovery_' + todayStr, 'true');
          closeAutoModal();
          startStreakRecovery();
          const element = document.getElementById('pronunSection');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        },
        onCancel: () => {
          localStorage.setItem('seen_streak_recovery_' + todayStr, 'true');
          closeAutoModal();
        }
      });
    }
  }

  // TRƯỜNG HỢP 2: Bỏ lỡ quá 7 ngày (Đến ngày thứ 8 trở đi) -> RESET VỀ 0 & THÔNG BÁO MẤT CHUỖI
  else if (diffDays > 8) {
    await sbClient.from('user_stats').update({
      streak_count: 0,
      is_recovering: false,
      recovery_progress: 0
    }).eq('user_id', user.id);

    if (recoveryBtn) recoveryBtn.classList.add('hidden');
    const streakCountElem = document.getElementById('userStreakCount');
    if (streakCountElem) streakCountElem.innerText = '0';

    if (localStorage.getItem('seen_streak_lost_' + todayStr) !== 'true') {
      showAutoModal({
        icon: 'bi-heartbreak-fill',
        title: 'Chuỗi <i class="bi bi-fire"></i> Đã Bị Dập Tắt!',
        note: 'Do bạn đã không vào học hơn 7 ngày nên chuỗi ngày học đã bị tự động reset về 0. Hãy học ngay bài hôm nay để thắp lại ngọn lửa nhé!',
        btnText: 'Thắp lại lửa ngay',
        onConfirm: () => {
          localStorage.setItem('seen_streak_lost_' + todayStr, 'true');
          closeAutoModal();
          const element = document.getElementById('pronunSection');
          if (element) element.scrollIntoView({ behavior: 'smooth' });
        },
        onCancel: () => {
          localStorage.setItem('seen_streak_lost_' + todayStr, 'true');
          closeAutoModal();
        }
      });
    }
  }
}

// HÀM HIỂN THỊ VÀ TẮT POPUP
function showAutoModal({ icon, title, note, btnText, onConfirm, onCancel }) {
  document.getElementById('autoModalIcon').innerHTML = `<i class="bi ${icon}"></i>`;
  document.getElementById('autoModalTitle').innerHTML = title;
  document.getElementById('autoModalNote').innerText = note;

  const actionBtn = document.getElementById('autoModalActionBtn');
  actionBtn.innerText = btnText;
  actionBtn.onclick = onConfirm;

  window.currentOnCancelHandler = onCancel;
  document.getElementById('autoLoginModal').classList.remove('hidden');
}

function handleCancelModal() {
  if (typeof window.currentOnCancelHandler === 'function') {
    const handler = window.currentOnCancelHandler;
    window.currentOnCancelHandler = null;
    handler();
  } else {
    closeAutoModal();
  }
}

function closeAutoModal() {
  document.getElementById('autoLoginModal').classList.add('hidden');
}

// KHỞI CHẠY KHI VỪA ĐĂNG NHẬP VÀO DASHBOARD
document.addEventListener('DOMContentLoaded', () => {
  loadUserStats();
  checkStreakNotifications();
});

const WORKER_URL = "https://readupenglishtest.vercel.app/api/dictionary";

async function handleAISearch() {
  const queryElem = document.getElementById('aiSearchInput');
  const query = queryElem ? queryElem.value.trim() : '';
  const container = document.getElementById('aiResultContainer');
  if (!query) return;

  container.classList.remove('hidden');
  const cacheKey = `dict_cache_${query.toLowerCase()}`;

  // 1. KIỂM TRA CACHE: Nếu đã tra rồi -> Hiển thị ngay lập tức (0.01 giây)
  const cachedData = localStorage.getItem(cacheKey);
  if (cachedData) {
    renderAIResult(JSON.parse(cachedData));
    return;
  }

  // 2. LOADING SKELETON: Hiệu ứng khung chờ mờ nhấp nháy chuyên nghiệp
  container.innerHTML = `
      <div class="animate-pulse space-y-3 p-2">
      <div class="h-6 bg-gray-200 dark:bg-zinc-700 rounded-md w-1/3"></div>
      <div class="h-4 bg-gray-200 dark:bg-zinc-700 rounded-md w-1/4"></div>
      <div class="space-y-2 pt-2">
      <div class="h-16 bg-gray-100 dark:bg-zinc-800 rounded-2xl"></div>
      <div class="h-16 bg-gray-100 dark:bg-zinc-800 rounded-2xl"></div>
      </div>
      </div>
      `;

  const isSingleWord = query.split(/\s+/).length <= 2;

  // Prompt ép Gemini trả về IPA riêng cho từng từ loại/biến thể (forms)
  const prompt = isSingleWord ? `
      Bạn là từ điển AI chuyên sâu. Hãy phân tích từ/cụm từ "${query}".
      Trả về kết quả dưới dạng JSON duy nhất (không chứa mã markdown \`\`\`json) theo cấu trúc:
    {
      "type": "word",
      "word": "${query}",
      "ipa": "/phiên âm chính/",
      "forms": [
        {
          "pos": "Danh từ / Động từ / Tính từ / Trạng từ",
          "wordForm": "từ biến thể (ví dụ: development)",
          "ipa": "/phiên âm IPA riêng của từ biến thể này/",
          "meaning": "nghĩa tiếng Việt",
          "example": "câu ví dụ tiếng Anh (dịch nghĩa tiếng Việt)"
        }
      ],
      "synonyms": ["từ đồng nghĩa 1", "từ đồng nghĩa 2"],
      "antonyms": ["từ trái nghĩa 1", "từ trái nghĩa 2"],
      "socialContext": "Ngữ cảnh hoặc tiếng lóng/cách dùng từ này phổ biến"
    }
  ` : `
    Hãy dịch đoạn văn sau sang tiếng Việt tự nhiên nhất: "${query}".
    Trả về JSON duy nhất (không chứa mã markdown \`\`\`json):
    {
      "type": "translation",
      "original": "${query}",
      "translated": "bản dịch tiếng Việt",
      "keyGrammar": "Ghi chú ngắn về cấu trúc ngữ pháp nổi bật"
    }
  `;

        try {
          const response = await fetch(WORKER_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: prompt })
          });

          const data = await response.json();

          if (data.error) {
            const errMsg = typeof data.error === 'object' ? (data.error.message || JSON.stringify(data.error)) : data.error;
            throw new Error(errMsg);
          }

          if (!data.candidates || !data.candidates[0]) {
            throw new Error("Không nhận được dữ liệu phản hồi hợp lệ từ AI.");
          }

          let rawText = data.candidates[0].content.parts[0].text;
          rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const resData = JSON.parse(rawText);

          // Lưu vào bộ nhớ đệm Cache
          localStorage.setItem(cacheKey, JSON.stringify(resData));

          renderAIResult(resData);
        } catch (err) {
          console.error("Lỗi chi tiết:", err);
          container.innerHTML = `<div class="p-3 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold"><i class="bi bi-x-circle-fill"></i> Đã xảy ra lỗi: ${err.message}</div>`;
        }
      }

      // Hàm bổ trợ phát âm giọng chuẩn US
      function playAudioWord(word) {
        if (!word) return;
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }

      function renderAIResult(data) {
        const container = document.getElementById('aiResultContainer');
        if (!container) return;

        // Trường hợp 1: Dịch cả câu / đoạn văn
        if (data.type === 'translation') {
          container.innerHTML = `
      <div class="p-4 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-100 dark:border-zinc-700 space-y-2 text-xs">
        <div class="font-bold text-[#cf1717] text-sm">Bản dịch AI:</div>
        <p class="text-gray-900 dark:text-white font-medium text-sm leading-relaxed">${data.translated}</p>
        ${data.keyGrammar ? `<div class="pt-2 border-t dark:border-zinc-700 text-gray-500 italic"><i class="bi bi-lightbulb-fill"></i> Ghi chú: ${data.keyGrammar}</div>` : ''}
      </div>
    `;
          return;
        }

        // Trường hợp 2: Tra cứu từ vựng chi tiết (Nâng cấp IPA biến thể + Loa phát âm)
        const formsHTML = (data.forms || []).map(f => {
            // Tự động phối màu badge theo loại từ (Danh, Động, Tính, Trạng)
            let badgeColor = "bg-red-50 dark:bg-red-950 text-[#cf1717]";
            const pos = f.pos || '';
            if (pos.includes("Động")) badgeColor = "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400";
            if (pos.includes("Tính")) badgeColor = "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400";
            if (pos.includes("Trạng") || pos.includes("Phó")) badgeColor = "bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400";

            const wordForm = f.wordForm || data.word;
            const formIpaHTML = f.ipa ? `<span class="font-mono text-gray-400 text-[11px] border-l border-gray-300 dark:border-zinc-700 pl-2 ml-1">${f.ipa}</span>` : '';

            return `
      <div class="p-3 bg-white dark:bg-zinc-800/80 rounded-xl border border-gray-100 dark:border-zinc-700/60 space-y-1.5 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 ${badgeColor} font-bold text-[11px] rounded">${f.pos}</span>
            <strong class="text-gray-900 dark:text-white text-sm">${wordForm}</strong>
            ${formIpaHTML}
          </div>
          <button onclick="playAudioWord('${wordForm}')" class="p-1 text-gray-400 hover:text-[#cf1717] transition text-xs" title="Phát âm biến thể này"><i class="bi bi-volume-up-fill"></i></button>
        </div>
        <p class="text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm"><i class="bi bi-arrow-right-short"></i> ${f.meaning}</p>
        ${f.example ? `<p class="text-gray-500 dark:text-gray-400 italic text-xs bg-gray-50/50 dark:bg-zinc-900/50 p-2 rounded-lg">Ex: ${f.example}</p>` : ''}
      </div>
    `;
        }).join('');

        container.innerHTML = `
    <div class="space-y-3 text-xs">
      <!-- Header Từ & Phiên âm chính + Loa + Nút Lưu -->
      <div class="flex items-center justify-between border-b border-gray-200/60 dark:border-zinc-800 pb-2.5">
        <div class="flex items-baseline gap-2">
          <h4 class="text-xl font-black text-[#cf1717]">${data.word}</h4>
          <span class="font-mono text-gray-400">${data.ipa || ''}</span>
          <button onclick="playAudioWord('${data.word}')" class="p-1 text-gray-400 hover:text-[#cf1717] transition text-sm" title="Phát âm từ gốc"><i class="bi bi-volume-up-fill"></i></button>
        </div>
        <button onclick="saveToNotebook('${data.word}', '${data.ipa || ''}', '${data.forms?.[0]?.meaning || ''}')" class="px-2.5 py-1 bg-red-50 dark:bg-red-950 text-[#cf1717] dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg text-[11px] font-bold hover:bg-red-100 transition">
        <i class="bi bi-bookmark-fill"></i> Lưu từ
        </button>
      </div>

      <!-- Các dạng từ loại & IPA biến thể -->
      <div class="space-y-2">
        <div class="font-bold text-gray-700 dark:text-gray-300">Biến thể & Từ loại:</div>
        ${formsHTML}
      </div>

      <!-- Đồng nghĩa & Trái nghĩa -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        <div class="p-2.5 bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-xl">
          <span class="font-bold text-green-700 dark:text-green-400 block mb-1">Từ đồng nghĩa:</span>
          <span class="text-gray-700 dark:text-gray-300">${(data.synonyms || []).join(', ') || 'Không có'}</span>
        </div>
        <div class="p-2.5 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl">
          <span class="font-bold text-red-700 dark:text-red-400 block mb-1">Từ trái nghĩa:</span>
          <span class="text-gray-700 dark:text-gray-300">${(data.antonyms || []).join(', ') || 'Không có'}</span>
        </div>
      </div>

      <!-- Ngữ cảnh MXH -->
      ${data.socialContext ? `
        <div class="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-gray-700 dark:text-gray-300">
        <span class="font-bold text-amber-600 dark:text-amber-400 block mb-0.5"><i class="bi bi-globe2"></i> Xu hướng & MXH:</span>
        ${data.socialContext}
        </div>
        ` : ''}
    </div>
  `;
      }

      // 1. Hàm lưu từ vựng thật vào localStorage
      function saveToNotebook(word, ipa, meaning) {
        let notebook = JSON.parse(localStorage.getItem('readup_notebook') || '[]');

        // Kiểm tra trùng lặp từ
        const exists = notebook.some(item => item.word.toLowerCase() === word.toLowerCase());
        if (exists) {
          notify(`Từ "${word}" đã có trong sổ tay của bạn rồi!`);
          return;
        }

        notebook.unshift({ word, ipa: ipa || '', meaning: meaning || '', time: new Date().toLocaleDateString('vi-VN') });
        localStorage.setItem('readup_notebook', JSON.stringify(notebook));
        notify(`[success] Đã lưu từ "${word}" vào Sổ tay!`);
      }

      // 2. Mở Bảng Pop-up Sổ Tay
      function openNotebookModal() {
        const modal = document.getElementById('notebookModal');
        const container = document.getElementById('notebookList');
        if (!modal || !container) return;

        let notebook = JSON.parse(localStorage.getItem('readup_notebook') || '[]');

        if (notebook.length === 0) {
          container.innerHTML = `
      <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-xs space-y-1">
        <p class="text-2xl"><i class="bi bi-inbox"></i></p>
        <p>Sổ tay đang trống.</p>
        <p class="text-[11px]">Hãy bấm "<i class='bi bi-bookmark-fill'></i> Lưu từ" khi tra cứu để tích lũy từ mới nhé!</p>
      </div>
    `;
        } else {
          container.innerHTML = notebook.map((item, index) => `
      <div class="p-3 bg-white/60 dark:bg-zinc-800/60 rounded-2xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-sm">
        <div class="space-y-0.5">
          <div class="flex items-center gap-2">
            <strong class="text-sm font-bold text-gray-900 dark:text-white capitalize">${item.word}</strong>
            <span class="text-xs font-mono text-gray-400">${item.ipa}</span>
            <button onclick="playAudioWord('${item.word}')" class="text-xs text-gray-400 hover:text-[#cf1717]"><i class="bi bi-volume-up-fill"></i></button>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300 font-medium">${item.meaning}</p>
        </div>
        <button onclick="deleteFromNotebook(${index})" class="text-gray-400 hover:text-red-500 p-1.5 transition text-xs" title="Xóa từ này">
          <i class="bi bi-trash3-fill"></i>
        </button>
      </div>
    `).join('');
        }

        modal.classList.remove('hidden');
      }

      // 3. Đóng Bảng Sổ Tay
      function closeNotebookModal() {
        document.getElementById('notebookModal')?.classList.add('hidden');
      }

      // 4. Xóa từ khỏi Sổ tay
      function deleteFromNotebook(index) {
        let notebook = JSON.parse(localStorage.getItem('readup_notebook') || '[]');
        notebook.splice(index, 1);
        localStorage.setItem('readup_notebook', JSON.stringify(notebook));
        openNotebookModal(); // Render lại danh sách sau khi xóa
      }

      // Sử dụng tên biến riêng biệt để tránh xung đột
      const SPEAKING_WORKER_URL = "https://readupenglishtest.vercel.app/api/speaking";

      function toggleTopicInput() {
        const part = document.getElementById('speakingPart').value;
        const topicContainer = document.getElementById('topicContainer');
        const questionLabel = document.getElementById('questionLabel');

        if (part === 'Part 3' || part === 'Part 2') {
          topicContainer.classList.remove('hidden');
          questionLabel.textContent = part === 'Part 3' ? 'CÂU HỎI THẢO LUẬN SÂU' : 'YÊU CẦU CỤ THỂ (CUE CARD)';
        } else {
          topicContainer.classList.add('hidden');
          questionLabel.textContent = 'CÂU HỎI HOẶC CHỦ ĐỀ';
        }
      }

      async function generateSpeakingHint() {
        const part = document.getElementById('speakingPart').value;
        const band = document.getElementById('targetBand').value;
        const topic = document.getElementById('speakingTopic').value.trim();
        const question = document.getElementById('speakingQuestion').value.trim();
        const container = document.getElementById('aiResultContainer');

        if (!question) {
          notify('Vui lòng nhập câu hỏi hoặc thông tin yêu cầu!');
          return;
        }

        container.classList.remove('hidden');
        container.innerHTML = `
    <div class="p-6 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl text-center space-y-2">
      <div class="inline-block animate-spin rounded-full h-6 w-6 border-2 border-[#cf1717] border-t-transparent"></div>
      <p class="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300"><i class="bi bi-robot"></i> AI đang phân tích dữ liệu cho ${part} (Mục tiêu ${band})...</p>
    </div>
  `;

        try {
          const response = await fetch(SPEAKING_WORKER_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question, topic, part, band })
          });

          if (!response.ok) throw new Error('API Request failed');

          const data = await response.json();
          renderAIResponse(data);
        } catch (error) {
          console.error('Speaking API Error:', error);
          container.innerHTML = `
      <div class="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-2xl text-xs sm:text-sm font-medium text-center">
        <i class="bi bi-x-circle-fill"></i> Có lỗi xảy ra trong quá trình kết nối AI. Vui lòng thử lại sau!
      </div>
    `;
        }
      }

      function renderAIResponse(data) {
        const container = document.getElementById('aiResultContainer');

        const vocabHtml = (data.vocabulary || []).map(v => `
    <span class="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50 px-2.5 py-1 rounded-lg text-xs font-medium">
      <b class="font-bold">${v.word}</b>: ${v.meaning} <span class="opacity-75">(${v.band})</span>
    </span>
  `).join(' ');

        container.innerHTML = `
    <div class="p-5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-sm space-y-3">
      <h3 class="font-extrabold text-amber-600 dark:text-amber-400 text-xs sm:text-sm flex items-center gap-1.5">
        <span><i class="bi bi-lightbulb-fill"></i></span> Ý TƯỞNG & CẤU TRÚC PHÂN TÍCH
      </h3>

      <div class="space-y-1.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        <p><b class="text-gray-900 dark:text-white">Nói trực tiếp:</b> ${data.structure_ree?.response || ''}</p>
        <p><b class="text-gray-900 dark:text-white">Giải thích:</b> ${data.structure_ree?.explanation || ''}</p>
        <p><b class="text-gray-900 dark:text-white">Mở rộng / Ví dụ:</b> ${data.structure_ree?.example || ''}</p>
      </div>

      <div class="pt-3 border-t border-gray-100 dark:border-zinc-800 space-y-2">
        <h4 class="font-bold text-xs text-gray-500 uppercase tracking-wider">TỪ VỰNG ĂN ĐIỂM (${data.vocabulary?.length || 0} từ):</h4>
        <div class="flex flex-wrap gap-1.5">${vocabHtml}</div>
      </div>
    </div>

    <div class="p-5 bg-red-50/60 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40 rounded-2xl space-y-2">
      <h3 class="font-extrabold text-[#cf1717] dark:text-red-400 text-xs sm:text-sm flex items-center gap-1.5">
        <span><i class="bi bi-star-fill"></i></span> BÀI MẪU THAM KHẢO
      </h3>
      <p class="text-xs sm:text-sm leading-relaxed text-gray-800 dark:text-gray-200 font-medium">
        ${data.sample_answer || ''}
      </p>
    </div>
  `;
      }

      // ================= LOGIC QUẢN LÝ LỊCH HỌC & BÀI THI READING =================
      let calCurrentDate = new Date();
      let calSelectedDateStr = calCurrentDate.toISOString().split('T')[0];

      function initCalendar() {
        renderCalendar();
        updateSelectedDateDetails();
      }

      function renderCalendar() {
        const year = calCurrentDate.getFullYear();
        const month = calCurrentDate.getMonth();

        const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
        const monthYearElem = document.getElementById('calendarMonthYear');
        if (monthYearElem) monthYearElem.innerText = `${monthNames[month]}, ${year}`;

        const grid = document.getElementById('calendarDaysGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const startingDay = (firstDay === 0) ? 6 : firstDay - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Tập hợp danh sách các ngày có bài Reading
        const datesWithExams = new Set();
        if (Array.isArray(globalTestsList)) {
          globalTestsList.forEach(exam => {
              if (exam.created_at) {
                const dateStr = new Date(exam.created_at).toISOString().split('T')[0];
                datesWithExams.add(dateStr);
              }
          });
        }

        // Tập hợp các ngày có bài Học (post)
        const datesWithPosts = new Set();
        (globalPostsList || []).forEach(p => { if (p.created_at) datesWithPosts.add(localDateStr(p.created_at)); });

        // Các ô trống đầu tháng
        for (let i = 0; i < startingDay; i++) {
          grid.innerHTML += `<div class="p-2"></div>`;
        }

        const todayStr = new Date().toISOString().split('T')[0];

        for (let d = 1; d <= daysInMonth; d++) {
          const monthFormatted = String(month + 1).padStart(2, '0');
          const dayFormatted = String(d).padStart(2, '0');
          const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;

          const hasExam = datesWithExams.has(dateStr);
          const hasPost = datesWithPosts.has(dateStr);
          const isSelected = dateStr === calSelectedDateStr;
          const isToday = dateStr === todayStr;

          let bgClass = "hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-300";
          if (isSelected) {
            bgClass = "bg-[#cf1717] text-white font-black shadow-md";
          } else if (isToday) {
            bgClass = "border-2 border-[#cf1717] font-bold text-[#cf1717] dark:text-red-400";
          }

          grid.innerHTML += `
      <div onclick="selectCalendarDate('${dateStr}')"
           class="p-2 sm:p-2.5 rounded-xl cursor-pointer transition flex flex-col items-center justify-center relative min-h-[42px] ${bgClass}">
        <span class="text-xs sm:text-sm font-bold">${d}</span>
        <span class="flex items-center justify-center gap-0.5 mt-1 h-2">
          ${hasExam ? `<span class="w-2 h-2 ${isSelected ? 'bg-white' : 'bg-[#cf1717]'} rounded-full shadow-sm"></span>` : ''}
          ${hasPost ? `<span class="w-2 h-2 ${isSelected ? 'bg-amber-200' : 'bg-indigo-500'} rounded-full shadow-sm"></span>` : ''}
        </span>
      </div>
    `;
        }
      }

      function prevCalendarMonth() {
        calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
        renderCalendar();
      }

      function nextCalendarMonth() {
        calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
        renderCalendar();
      }

      function selectCalendarDate(dateStr) {
        calSelectedDateStr = dateStr;
        renderCalendar();
        updateSelectedDateDetails();
      }

      function updateSelectedDateDetails() {
        const titleElem = document.getElementById('selectedDateTitle');
        const contentElem = document.getElementById('selectedDateContent');
        if (!titleElem || !contentElem) return;

        const [y, m, d] = calSelectedDateStr.split('-');
        titleElem.innerHTML = `<i class="bi bi-pin-angle-fill"></i> Chi tiết ngày: ${d}/${m}/${y}`;

        // Lọc bài Reading trong ngày chọn
        const dayExams = (globalTestsList || []).filter(exam => {
            if (!exam.created_at) return false;
            return new Date(exam.created_at).toISOString().split('T')[0] === calSelectedDateStr;
        });

        // Lọc thông báo trong ngày chọn
        const dayNews = (globalNewsList || []).filter(news => {
            if (!news.created_at) return false;
            return new Date(news.created_at).toISOString().split('T')[0] === calSelectedDateStr;
        });

        let html = '';

        // 1. HIỂN THỊ THÔNG BÁO TRONG NGÀY (CHỈ ĐỂ TIÊU ĐỀ + BẤM VÀO MỞ NỘI DUNG)
        if (dayNews.length > 0) {
          html += `<div class="space-y-2 mb-3">`;
          dayNews.forEach(news => {
              html += `
        <div onclick="openNewsModal('${news.id}')"
             class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-amber-100/80 dark:hover:bg-amber-900/50 transition shadow-sm group">
          <div class="flex items-center gap-2 overflow-hidden">
            <span class="text-sm"><i class="bi bi-megaphone-fill"></i></span>
            <span class="text-xs font-bold text-amber-900 dark:text-amber-200 truncate">${news.title}</span>
          </div>
          <span class="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform">Xem tin <i class="bi bi-arrow-right"></i></span>
        </div>
      `;
          });
          html += `</div>`;
        }

        // 1b. HIỂN THỊ BÀI HỌC (POST) TRONG NGÀY -> BẤM VÀO CHUYỂN SANG TRANG POST
        const dayPosts = (globalPostsList || []).filter(p => p.created_at && localDateStr(p.created_at) === calSelectedDateStr);
        if (dayPosts.length > 0) {
          html += `<div class="space-y-2 mb-3">`;
          dayPosts.forEach(p => {
            html += `
        <a href="${postLink(p)}"
           class="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl flex items-center gap-3 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 hover:border-indigo-400 transition shadow-sm group">
          <div class="w-12 h-12 shrink-0 rounded-xl overflow-hidden shadow">${postThumb(p, 'w-full h-full')}</div>
          <div class="min-w-0 flex-1">
            <span class="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-300"><i class="bi bi-journal-richtext"></i> Bài học</span>
            <p class="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-100 truncate">${escPost(p.title)}</p>
          </div>
          <span class="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-300 shrink-0 group-hover:translate-x-0.5 transition-transform">Xem bài <i class="bi bi-arrow-right"></i></span>
        </a>`;
          });
          html += `</div>`;
        }

        // 2. HIỂN THỊ BÀI THI READING (MỖI BÀI 1 KHUNG RIÊNG)
        if (dayExams.length > 0) {
          dayExams.forEach(exam => {
              // Đếm số lượng câu hỏi
              let qCount = 0;
              if (exam.questions) {
                try {
                  const parsed = typeof exam.questions === 'string' ? JSON.parse(exam.questions) : exam.questions;
                  qCount = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
                } catch(e) { qCount = 0; }
              }

              // Đếm số lượng từ vựng
              let vocabCount = 0;
              if (exam.vocabulary) {
                try {
                  const parsedV = typeof exam.vocabulary === 'string' ? JSON.parse(exam.vocabulary) : exam.vocabulary;
                  vocabCount = Array.isArray(parsedV) ? parsedV.length : 0;
                } catch(e) { vocabCount = 0; }
              }

              html += `
        <div onclick="window.location.href='exam.html?token=${exam.token}'"
             class="p-4 bg-gray-50 dark:bg-zinc-800/90 rounded-2xl border border-gray-200/80 dark:border-zinc-700/80 hover:border-[#cf1717] dark:hover:border-[#cf1717] transition cursor-pointer shadow-sm space-y-2.5 group">

          <!-- Hàng 1: CHỦ ĐỀ KHÔNG CẦN CHỮ "CHỦ ĐỀ:" + Nút chuyển trang -->
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[#cf1717] bg-red-100/80 dark:bg-red-950 px-2.5 py-1 rounded-lg">
              ${exam.topic || 'General'}
            </span>
            <span class="text-xs font-bold text-[#cf1717] dark:text-red-400 group-hover:translate-x-1 transition-transform">
              Vào làm bài <i class="bi bi-arrow-right"></i>
            </span>
          </div>

          <!-- Tiêu đề bài -->
          <h4 class="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-snug line-clamp-1">
            ${exam.title || 'Bài thi Reading'}
          </h4>

          <!-- Hàng 2: Các Chỉ Số (Số câu + Phút + Số từ vựng) -->
          <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
            <span class="bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-2xs"><i class="bi bi-question-circle-fill"></i> ${qCount} câu hỏi</span>
            <span class="bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-2xs"><i class="bi bi-stopwatch"></i> ${exam.time_limit || 60} phút</span>
            <span class="bg-white dark:bg-zinc-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-2xs"><i class="bi bi-journals"></i> ${vocabCount} từ vựng</span>
          </div>

          <!-- Hàng 3: Ghi chú -->
          <p class="text-xs text-gray-500 dark:text-gray-400 italic line-clamp-1 border-t border-gray-200/60 dark:border-zinc-700/60 pt-2 mt-1">
            <i class="bi bi-pencil-square"></i> ${exam.notes || 'Không có ghi chú'}
          </p>
        </div>
      `;
          });
        }

        // Trường hợp không có dữ liệu
        if (dayNews.length === 0 && dayExams.length === 0 && dayPosts.length === 0) {
          html = `
      <div class="p-8 text-center bg-gray-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-zinc-800">
        <span class="text-2xl block mb-1"><i class="bi bi-cup-hot-fill"></i></span>
        <p class="text-xs text-gray-400 font-medium">Không có bài làm, bài học hay thông báo nào trong ngày này.</p>
      </div>
    `;
        }

        contentElem.innerHTML = html;
      }

      // =========================================================================
      // CHỨC NĂNG THÔNG BÁO NỘI DUNG MỚI TRONG 3 NGÀY (TOAST NOTIFICATION)
      // =========================================================================

      // 0. Hàm thay thế cho alert() mặc định của trình duyệt: hiển thị dưới dạng Toast góc phải
      // (Dùng để KHÔNG còn hiện popup giữa màn hình nữa, thay bằng toast có thanh đỏ chạy)
      function notify(rawMessage) {
        const msg = String(rawMessage ?? '');
        // Loại thông báo đặt ở đầu chuỗi dạng "[error] ..." -> chọn Bootstrap Icon + tiêu đề tương ứng
        const NOTIFY_TYPES = {
          error:     { icon: 'bi-x-circle-fill',             title: 'Lỗi' },
          warning:   { icon: 'bi-exclamation-triangle-fill', title: 'Cảnh báo' },
          success:   { icon: 'bi-check-circle-fill',         title: 'Thành công' },
          celebrate: { icon: 'bi-patch-check-fill',          title: 'Thành công' },
          heart:     { icon: 'bi-heart-fill',                title: 'Thành công' },
          cheer:     { icon: 'bi-hand-thumbs-up-fill',       title: 'Thành công' },
          saved:     { icon: 'bi-floppy-fill',               title: 'Thành công' },
          copied:    { icon: 'bi-clipboard-check-fill',      title: 'Thành công' },
          info:      { icon: 'bi-info-circle-fill',          title: 'Thông tin' },
          bell:      { icon: 'bi-bell-fill',                 title: 'Thông báo' },
          goal:      { icon: 'bi-bullseye',                  title: 'Thông báo' },
          mic:       { icon: 'bi-mic-fill',                  title: 'Thông báo' }
        };
        const tagMatch = msg.match(/^\[(\w+)\]\s*/);
        const tagged = tagMatch && NOTIFY_TYPES[tagMatch[1]] ? tagMatch[1] : null;
        const type = tagged ? NOTIFY_TYPES[tagged] : { icon: 'bi-bell-fill', title: 'Thông báo' };
        const text = tagged ? (msg.slice(tagMatch[0].length).trim() || msg) : msg;
        let title = type.title;
        if (tagged === 'error' || /lỗi|thất bại|không thể/i.test(msg)) title = 'Lỗi';
        showToastNotification({ title, message: text, icon: type.icon });
      }

      // 1. Hàm hiển thị Toast Popup góc phải
      function showToastNotification({ title, message, icon = 'bi-bell-fill', linkUrl = null, onClick = null }) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
    <div id="${toastId}" class="pointer-events-auto bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 translate-x-full opacity-0 relative">
      <div class="p-3.5 sm:p-4 flex items-start gap-3">
        <!-- Icon tròn màu đỏ chủ đạo -->
        <div class="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/80 flex-shrink-0 flex items-center justify-center text-[#cf1717] dark:text-red-400 font-bold text-base shadow-sm">
          <i class="bi ${icon}"></i>
        </div>

        <!-- Nội dung -->
        <div class="flex-1 pr-4">
          <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">${title}</h4>
          <p class="text-xs text-gray-600 dark:text-gray-300 mt-1 break-words">${message}</p>

          <!-- Ưu tiên gọi hàm onClick nếu có, nếu không thì dùng linkUrl -->
          ${onClick ? `
        <button type="button" onclick="${onClick}; closeToast('${toastId}')" class="inline-block mt-1.5 text-xs font-bold text-[#cf1717] hover:underline cursor-pointer">
        Xem ngay <i class="bi bi-arrow-right"></i>
        </button>
        ` : (linkUrl ? `
        <a href="${linkUrl}" class="inline-block mt-1.5 text-xs font-bold text-[#cf1717] hover:underline">
        Xem ngay <i class="bi bi-arrow-right"></i>
        </a>
        ` : '')}
        </div>

        <!-- Nút đóng -->
        <button onclick="closeToast('${toastId}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-white text-base leading-none p-1">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Thanh tiến trình tự chạy 5s -->
      <div class="h-1 bg-red-100 dark:bg-zinc-800 w-full">
        <div class="h-full bg-[#cf1717] animate-toast-bar"></div>
      </div>
    </div>
  `;

        container.insertAdjacentHTML('beforeend', toastHtml);

        // Hiệu ứng trượt vào
        const toastElem = document.getElementById(toastId);
        setTimeout(() => {
            toastElem.classList.remove('translate-x-full', 'opacity-0');
          }, 50);

        // Tự động biến mất sau 5 giây
        setTimeout(() => {
            closeToast(toastId);
          }, 5000);
      }

      // Hàm đóng Toast
      function closeToast(id) {
        const elem = document.getElementById(id);
        if (elem) {
          elem.classList.add('translate-x-full', 'opacity-0');
          setTimeout(() => elem.remove(), 300);
        }
      }

      // 2. Hàm kiểm tra dữ liệu mới trong 3 ngày qua khi Học Sinh đăng nhập
      async function checkNewUpdatesInLast3Days() {
        // Tính mốc thời gian 3 ngày trước
        const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
        const threeDaysAgo = new Date(Date.now() - THREE_DAYS_MS).toISOString();

        try {
          // 1. Kiểm tra Bài Reading mới
          const { data: newExams } = await sbClient
          .from('exams')
          .select('title, created_at, token')
          .gte('created_at', threeDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1);

          if (newExams && newExams.length > 0) {
            showToastNotification({
                title: 'Bài Reading Mới!',
                message: `Đã có bài thi mới: "${newExams[0].title}"`,
                icon: 'bi-book',
                linkUrl: `exam.html?token=${newExams[0].token}`
            });
          }

          // 2. Kiểm tra Tin Tức / Thông Báo mới
          const { data: newNews } = await sbClient
          .from('news')
          .select('title, created_at, id')
          .gte('created_at', threeDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1);

          if (newNews && newNews.length > 0) {
            setTimeout(() => {
                showToastNotification({
                    title: 'Thông Báo Mới!',
                    message: newNews[0].title,
                    icon: 'bi-bell-fill',
                    // Gọi trực tiếp hàm mở Modal bài tin dựa theo ID
                    onClick: `openNewsModal('${newNews[0].id}')`
                });
              }, 600);
          }

          // 3. Kiểm tra Bài Tập Phát Âm mới (Nếu bạn đã tạo bảng 'pronunciation' hoặc tương tự trong Supabase)
          const { data: newPronun } = await sbClient
          .from('pronunciation') // Thay tên bảng bài phát âm của bạn vào đây nếu có
          .select('title, created_at')
          .gte('created_at', threeDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1);

          if (newPronun && newPronun.length > 0) {
            setTimeout(() => {
                showToastNotification({
                    title: 'Bài Luyện Phát Âm Mới!',
                    message: `Bài mới: "${newPronun[0].title}"`,
                    icon: 'bi-mic-fill'
                });
              }, 1200);
          }

        } catch (err) {
          console.log("Kiểm tra cập nhật mới:", err);
        }
      }

      // ================= HỆ THỐNG PHÒNG HỌC NHÓM REALTIME =================
      let activeRoomCode = null;
      let roomRealtimeChannel = null;
      let activeWidgetChannel = null;
      let chatRealtimeChannel = null;
      let html5QrCodeScanner = null;

      // Helper chống XSS
      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
          }

          // Helper đóng/mở Modal
          function openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
          function closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }

          // 1. TẠO MÃ REA-XXXX
          function generateRoomCode() {
            const chars = '0123456789';
            let rand = '';
            for (let i = 0; i < 4; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
            return `READ-${rand}`;
          }

          // 2. MỞ MODAL TẠO PHÒNG & NỐI DỮ LIỆU ĐỀ READING
          function openCreateRoomModal() {
            if (!currentUser) {
              notify("[warning] Bạn cần đăng nhập tài khoản để khởi tạo phòng học!");
              return;
            }

            const select = document.getElementById('roomExamSelect');
            if (!select) return;

            let optionsHtml = `<option value="">-- Chọn bài Reading --</option>`;
            optionsHtml += `<option value="PRONUNCIATION_DEV">Bài Luyện Phát Âm (Đang phát triển)</option>`;

            if (typeof globalTestsList !== 'undefined' && Array.isArray(globalTestsList) && globalTestsList.length > 0) {
              globalTestsList.forEach(test => {
                  optionsHtml += `<option value="${test.token}">${escapeHtml(test.title)} (${test.time_limit || 60} phút)</option>`;
              });
            }

            select.innerHTML = optionsHtml;
            document.getElementById('roomExamCardDetails')?.classList.add('hidden');
            openModal('modalCreateRoom');
          }

          // 3. XỬ LÝ CHỌN BÀI LUYỆN
          function handleExamTypeSelect(token) {
            const detailsCard = document.getElementById('roomExamCardDetails');
            if (!detailsCard) return;

            if (token === 'PRONUNCIATION_DEV') {
              notify("ℹ Tính năng Luyện Phát Âm Nhóm đang được phát triển. Vui lòng chọn bài Reading!");
              const select = document.getElementById('roomExamSelect');
              if (select) select.value = '';
              detailsCard.classList.add('hidden');
              return;
            }

            const exam = (typeof globalTestsList !== 'undefined') ? globalTestsList.find(t => t.token === token) : null;
            if (exam) {
              let vocabCount = 0;
              try {
                const v = typeof exam.vocabulary === 'string' ? JSON.parse(exam.vocabulary) : exam.vocabulary;
                vocabCount = Array.isArray(v) ? v.length : 0;
              } catch (e) {}

              const titleEl = document.getElementById('roomCardTitle');
              const qEl = document.getElementById('roomCardQuestions');
              const timeEl = document.getElementById('roomCardTime');
              const vocabEl = document.getElementById('roomCardVocab');

              if (titleEl) titleEl.innerText = exam.title;
              if (qEl) qEl.innerHTML = `<i class="bi bi-question-circle-fill"></i> ${exam.questions_count || 10} câu hỏi`;
              if (timeEl) timeEl.innerHTML = `<i class="bi bi-stopwatch"></i> ${exam.time_limit || 60} phút`;
              if (vocabEl) vocabEl.innerHTML = `<i class="bi bi-journals"></i> ${vocabCount} từ vựng`;

              detailsCard.classList.remove('hidden');
            } else {
              detailsCard.classList.add('hidden');
            }
          }

          // 4. CHỦ PHÒNG TẠO PHÒNG LÊN SUPABASE
          async function handleCreateRoom() {
            if (!currentUser) {
              notify("[warning] Bạn cần đăng nhập tài khoản!");
              return;
            }

            const select = document.getElementById('roomExamSelect');
            const token = select ? select.value : '';
            if (!token || token === 'PRONUNCIATION_DEV') {
              notify("Vui lòng chọn bài Reading hợp lệ!");
              return;
            }

            const mode = document.querySelector('input[name="roomMode"]:checked')?.value || 'battle';
            const roomCode = generateRoomCode();

            // 1. Thêm phòng vào DB
            const { error: roomErr } = await sbClient.from('rooms').insert([{
                  room_code: roomCode,
                  host_id: currentUser.id,
                  exam_token: token,
                  mode: mode,
                  status: 'waiting'
            }]);

            if (roomErr) {
              notify("[error] Không thể tạo phòng: " + roomErr.message);
              return;
            }

            // === [THÊM MỚI] 2. Tự động thêm Host (Admin) vào bảng 'room_participants' ===
            const fullName = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'Chủ phòng');

            const { error: partErr } = await sbClient.from('room_participants').insert([{
                  room_code: roomCode,
                  user_id: currentUser.id,
                  full_name: fullName,
                  role: 'host',
                  score: 0,
                  is_finished: false
            }]);

            if (partErr) {
              console.error("❌ Lỗi khi chèn Host vào room_participants:", partErr);
            }

            // 3. Lưu mã phòng vừa tạo vào bộ nhớ trình duyệt
            localStorage.setItem('last_active_room', roomCode);
            // =========================================================================

            closeModal('modalCreateRoom');
            await enterLobby(roomCode, true);
          }

          // 5. THAM GIA PHÒNG THÔNG QUA MÃ
          function openJoinRoomModal() {
            if (!currentUser) {
              notify("[warning] Bạn cần đăng nhập tài khoản sinh viên để tham gia phòng!");
              return;
            }
            openModal('modalJoinRoom');
          }

          async function submitJoinCode() {
            const input = document.getElementById('inputJoinCode');
            const rawCode = input ? input.value.trim().toUpperCase() : '';
            if (!rawCode) {
              notify("Vui lòng nhập mã phòng!");
              return;
            }
            closeModal('modalJoinRoom');
            await joinRoom(rawCode);
          }

          async function joinRoom(roomCode) {
            if (!currentUser) {
              notify("[warning] Bạn cần đăng nhập để tham gia phòng!");
              return;
            }

            // 1. Kiểm tra phòng tồn tại (Thử tìm theo cột 'code' hoặc 'room_code')
            let { data: room, error: roomErr } = await sbClient
            .from('rooms')
            .select('*')
            .eq('code', roomCode)
            .maybeSingle();

            // Fallback nếu trong DB tên cột là 'room_code'
            if (!room) {
              const res = await sbClient.from('rooms').select('*').eq('room_code', roomCode).maybeSingle();
              room = res.data;
              roomErr = res.error;
            }

            if (roomErr || !room) {
              console.error("❌ Lỗi tìm phòng:", roomErr);
              notify("[error] Mã phòng không tồn tại hoặc đã bị đóng!");
              return;
            }

            const fullName = currentUser.user_metadata?.full_name || (currentUser.email ? currentUser.email.split('@')[0] : 'Người dùng');

            // 2. Thêm người dùng vào danh sách tham gia
            try {
              const { data: existing, error: selectErr } = await sbClient
              .from('room_participants')
              .select('id')
              .eq('room_code', roomCode)
              .eq('user_id', currentUser.id)
              .maybeSingle();

              if (selectErr) console.error("❌ Lỗi kiểm tra thành viên:", selectErr);

              if (!existing) {
                const { error: insertErr } = await sbClient.from('room_participants').insert([{
                      room_code: roomCode,
                      user_id: currentUser.id,
                      full_name: fullName,
                      role: room.host_id === currentUser.id ? 'host' : 'member',
                      score: 0,
                      is_finished: false
                }]);

                if (insertErr) {
                  console.error("❌ Lỗi Thêm Thành Viên (Supabase Insert Error):", insertErr);
                  notify("Lỗi tham gia phòng: " + insertErr.message);
                  return;
                }
              }
            } catch (err) {
              console.error("❌ Lỗi ngoại lệ:", err);
            }

            // 3. Lưu cache & Cập nhật lại giao diện
            localStorage.setItem('last_active_room', roomCode);

            if (typeof renderWidgetParticipants === 'function') {
              await renderWidgetParticipants(roomCode);
            }

            await enterLobby(roomCode, room.host_id === currentUser.id);
          }

          // 6. VÀO SẢNH CHỜ & LẮNG NGHE REALTIME
          async function enterLobby(roomCode, isHost) {
            activeRoomCode = roomCode;

            // Lấy thông tin phòng
            const { data: room } = await sbClient.from('rooms').select('*').eq('room_code', roomCode).single();
            if (!room) return;

            const codeEl = document.getElementById('lobbyRoomCode');
            const modeEl = document.getElementById('lobbyModeBadge');
            if (codeEl) codeEl.innerText = roomCode;
            if (modeEl) modeEl.innerHTML = room.mode === 'battle' ? '<i class="bi bi-speedometer2"></i> Battle Mode' : '<i class="bi bi-cup-hot-fill"></i> Co-working Mode';

            const btnStart = document.getElementById('btnStartGame');
            if (btnStart) {
              if (isHost) btnStart.classList.remove('hidden');
              else btnStart.classList.add('hidden');
            }

            // Vẽ Mã QR
            const qrContainer = document.getElementById('lobbyQrCanvas');
            if (qrContainer) {
              qrContainer.innerHTML = '';
              const joinUrl = `${window.location.origin}${window.location.pathname}?join_code=${roomCode}`;
              if (typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, { text: joinUrl, width: 120, height: 120 });
              }
            }

            openModal('modalLobby');

            // Tải danh sách người tham gia ban đầu & Kích hoạt Realtime
            await fetchParticipants(roomCode);
            subscribeRoomRealtime(roomCode, isHost, room.exam_token);
            // [BỔ SUNG] Khởi tạo kênh Realtime ngay khi vào sảnh chờ, để gửi tin nhắn & nhận thông báo Lưu/Xóa phòng hoạt động ngay từ đầu
            if (typeof initRoomRealtime === 'function') initRoomRealtime(roomCode);
            // [FIX] Chuyển kênh lắng nghe Widget/Chat sang phòng MỚI này ngay lập tức -> tránh phòng CŨ gửi thông báo trễ làm mất/đóng nhầm khung phòng mới
            if (typeof subscribeRoomWidgetRealtime === 'function') subscribeRoomWidgetRealtime(roomCode);
          }

          async function fetchParticipants(roomCode) {
            const { data: list } = await sbClient.from('room_participants').select('*').eq('room_code', roomCode);
            if (!list) return;

            const countEl = document.getElementById('lobbyCount');
            if (countEl) countEl.innerText = `${list.length}/10`;

            const container = document.getElementById('lobbyParticipantList');
            if (!container) return;

            container.innerHTML = list.map(p => `
    <div class="p-2.5 bg-gray-50 dark:bg-zinc-800 rounded-xl flex items-center justify-between text-xs font-bold">
      <span class="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
        <span><i class="bi bi-person-fill"></i></span> ${escapeHtml(p.full_name)}
      </span>
      ${p.is_finished ? '<span class="text-green-600 dark:text-green-400"><i class="bi bi-check-circle-fill"></i> Đã xong</span>' : '<span class="text-amber-500"><i class="bi bi-hourglass-split"></i> Đang chờ</span>'}
    </div>
  `).join('');
          }

          // LẮNG NGHE THAY ĐỔI REALTIME TỪ SUPABASE
          function subscribeRoomRealtime(roomCode, isHost, examToken) {
            if (roomRealtimeChannel) {
              try { sbClient.removeChannel(roomRealtimeChannel); } catch (e) {}
            }

            roomRealtimeChannel = sbClient.channel(`room_${roomCode}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_code=eq.${roomCode}` }, () => {
                fetchParticipants(roomCode);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
                if (payload.new.status === 'playing') {
                  window.location.href = `exam.html?token=${examToken}&room_code=${roomCode}`;
                }
            })
            .subscribe();
          }

          // 7. CHỦ PHÒNG BẤM BẮT ĐẦU
          async function handleStartGame() {
            if (!activeRoomCode) return;
            await sbClient.from('rooms').update({ status: 'playing' }).eq('room_code', activeRoomCode);
          }

          // 8. RỜI PHÒNG
          async function handleLeaveRoom() {
            if (activeRoomCode && currentUser) {
              await sbClient.from('room_participants').delete().eq('room_code', activeRoomCode).eq('user_id', currentUser.id);
            }
            closeModal('modalLobby');
            if (roomRealtimeChannel) {
              try { sbClient.removeChannel(roomRealtimeChannel); } catch (e) {}
            }
          }

          // 9. COPIED TOKEN CODE & MÃ QR CAMERA
          function copyRoomCode() {
            if (!activeRoomCode) return;
            navigator.clipboard.writeText(activeRoomCode);
            notify("[copied] Đã sao chép mã phòng!");
          }

          // QUÉT QR CAMERA CỰC NHANH + PHẢN HỒI RUNG
          async function toggleQrScanner() {
            const container = document.getElementById('qrReaderContainer');
            if (!container) return;

            if (container.classList.contains('hidden')) {
              container.classList.remove('hidden');
              if (typeof Html5Qrcode !== 'undefined') {
                html5QrCodeScanner = new Html5Qrcode("qrReaderContainer");
                try {
                  await html5QrCodeScanner.start(
                    { facingMode: "environment" },
                    { fps: 25, qrbox: { width: 220, height: 220 } },
                    async (decodedText) => {
                      if (navigator.vibrate) navigator.vibrate(150);
                      try { await html5QrCodeScanner.stop(); } catch (e) {}
                      container.classList.add('hidden');

                      let joinCode = decodedText;
                      try {
                        const parsedUrl = new URL(decodedText);
                        joinCode = parsedUrl.searchParams.get('join_code') || decodedText;
                      } catch (e) {}

                      closeModal('modalJoinRoom');
                      await joinRoom(joinCode);
                    },
                    () => {} // Bỏ qua thông báo lỗi khi không thấy mã QR trong khung
                  );
                } catch (err) {
                  console.error("Không thể khởi động camera quét QR:", err);
                  container.classList.add('hidden');
                }
              }
            } else {
              if (html5QrCodeScanner) {
                try { await html5QrCodeScanner.stop(); } catch (e) {}
              }
              container.classList.add('hidden');
            }
          }

          // GIẢI MÃ QR TỪ ẢNH UPLOAD + PHẢN HỒI RUNG
          async function handleQrImageUpload(event) {
            const file = event.target?.files?.[0];
            if (!file) return;

            if (typeof Html5Qrcode === 'undefined') return;
            const html5QrCode = new Html5Qrcode("qrReaderContainer");

            try {
              const decodedText = await html5QrCode.scanFile(file, true);

              if (navigator.vibrate) navigator.vibrate(150);

              let joinCode = decodedText;
              try {
                const parsedUrl = new URL(decodedText);
                joinCode = parsedUrl.searchParams.get('join_code') || decodedText;
              } catch (e) {}

              closeModal('modalJoinRoom');
              await joinRoom(joinCode);

            } catch (err) {
              notify("[error] Không tìm thấy mã QR hợp lệ trong ảnh này. Vui lòng chọn ảnh chụp rõ nét hơn!");
            } finally {
              try { await html5QrCode.clear(); } catch(e) {}
              event.target.value = '';
            }
          }

          // Kích hoạt mở Thư viện ảnh của thiết bị
          async function triggerQrFileUpload() {
            if (html5QrCodeScanner) {
              try { await html5QrCodeScanner.stop(); } catch (e) {}
              document.getElementById('qrReaderContainer')?.classList.add('hidden');
            }
            document.getElementById('qrFileInput')?.click();
          }

          // ================= TỰ ĐỘNG KHÔI PHỤC PHÒNG & KHUNG CHAT KHI LOAD TRANG =================
          window.addEventListener('DOMContentLoaded', async () => {
              // 1. Kiểm tra Auth Session
              try {
                if (typeof sbClient !== 'undefined') {
                  const { data: { session } } = await sbClient.auth.getSession();
                  currentUser = session?.user || null;
                }
              } catch (err) {
                console.error("Lỗi khi kiểm tra phiên đăng nhập:", err);
              }

              // 2. Xử lý tham số ?join_code=...
              const urlParams = new URLSearchParams(window.location.search);
              const joinCodeParam = urlParams.get('join_code');

              if (joinCodeParam) {
                if (currentUser) {
                  await joinRoom(joinCodeParam);
                } else {
                  notify("[warning] Bạn đã mở liên kết vào phòng! Vui lòng đăng nhập tài khoản để vào phòng thi đấu.");
                }
                return;
              }

              // 3. Khôi phục phòng đang hoạt động
              const activeRoomCodeParam = urlParams.get('active_room') || localStorage.getItem('last_active_room');
              if (activeRoomCodeParam) {
                await initActiveRoomWidget(activeRoomCodeParam);
              }
          });

          // KHỞI TẠO KHUNG PHÒNG VÀ KHUNG CHAT WIDGET
          async function initActiveRoomWidget() {
            const urlParams = new URLSearchParams(window.location.search);
            const roomCode = urlParams.get('active_room') || localStorage.getItem('last_active_room');

            // Nếu không có mã phòng thì ẩn widget
            if (!roomCode) {
              leaveActiveRoomWidget();
              return;
            }

            // Đảm bảo đã có thông tin user
            if (!currentUser) {
              const { data: { user } } = await sbClient.auth.getUser();
              if (user) currentUser = user;
              else {
                leaveActiveRoomWidget();
                return;
              }
            }

            // 1. Lấy thông tin người tham gia
            const { data: participant } = await sbClient
            .from('room_participants')
            .select('*')
            .eq('room_code', roomCode)
            .eq('user_id', currentUser.id)
            .maybeSingle();

            if (!participant) {
              localStorage.removeItem('last_active_room');
              leaveActiveRoomWidget();
              return;
            }

            // 2. Tìm thông tin phòng (Thử cả cột 'code' và 'room_code')
            const { data: room, error: roomErr } = await sbClient
            .from('rooms')
            .select('*')
            .eq('room_code', roomCode)
            .maybeSingle();

            if (roomErr) {
              console.error("❌ Lỗi lấy thông tin phòng:", roomErr);
            }

            // [BỔ SUNG] Nếu phòng đã bị xóa khỏi bảng 'rooms' nhưng vẫn còn sót dòng room_participants (do xóa trước khi có bản vá này)
            // -> dọn sạch cache & dữ liệu thừa, KHÔNG hiện lại khung phòng đã bị giải tán
            if (!room) {
              localStorage.removeItem('last_active_room');
              await sbClient.from('room_participants').delete().eq('room_code', roomCode).eq('user_id', currentUser.id);
              leaveActiveRoomWidget();
              return;
            }

            // 3. HIỂN THỊ KHUNG WIDGET & GẮN MÃ PHÒNG
            const container = document.getElementById('sectionActiveRoomContainer');
            if (container) {
              container.classList.remove('hidden');
              container.style.display = 'block';
            }

            const roomCodeEl = document.getElementById('sectionRoomCode');
            if (roomCodeEl) roomCodeEl.innerText = roomCode;

            // [BỔ SUNG] Hiển thị tiêu đề + thông tin bài thi đang làm trong phòng này (để biết bảng điểm ứng với bài nào)
            const examTitleEl = document.getElementById('sectionExamTitle');
            if (examTitleEl) {
              if (room && room.exam_token) {
                const { data: examInfo } = await sbClient
                .from('exams')
                .select('title')
                .eq('token', room.exam_token)
                .maybeSingle();
                examTitleEl.innerHTML = `<i class="bi bi-book"></i> Bài thi: ${escapeHtml(examInfo?.title || room.exam_token)}`;
              } else {
                examTitleEl.innerText = '';
              }
            }

            // 4. Phân quyền hiển thị nút Host
            const isHost = (room && room.host_id === currentUser.id) || (participant.role === 'host');
            const hostControls = document.getElementById('sectionHostControls');
            if (hostControls) {
              if (isHost) {
                hostControls.classList.remove('hidden');
                hostControls.classList.add('flex');
              } else {
                hostControls.classList.add('hidden');
                hostControls.classList.remove('flex');
              }
            }

            // 5. Nạp danh sách thành viên, tin nhắn và đăng ký Realtime
            if (typeof renderWidgetParticipants === 'function') await renderWidgetParticipants(roomCode);
            // [FIX] Tên hàm đúng là loadChatMessages (trước đây gọi nhầm loadRoomMessages nên không tồn tại -> không tải được lịch sử chat)
            if (typeof loadChatMessages === 'function') await loadChatMessages(roomCode);
            // [FIX] Tên hàm đúng là subscribeRoomWidgetRealtime (trước đây gọi nhầm subscribeRealtimeRoom nên không tồn tại -> Host Lưu/Xóa phòng không báo được cho thành viên)
            if (typeof subscribeRoomWidgetRealtime === 'function') subscribeRoomWidgetRealtime(roomCode);
            // [BỔ SUNG] Khởi tạo kênh Realtime gửi/nhận tin nhắn Chat 2 chiều + nhận broadcast Xóa phòng (hàm này đã có sẵn trong file nhưng chưa từng được gọi)
            if (typeof initRoomRealtime === 'function') initRoomRealtime(roomCode);
          }

          // Render Tiến Độ / Bảng Điểm Các Thành Viên Trên Widget
          async function renderWidgetParticipants(roomCode) {
            const { data: list } = await sbClient
            .from('room_participants')
            .select('*')
            .eq('room_code', roomCode)
            .order('score', { ascending: false })
            .order('completion_time', { ascending: true });

            if (!list) return;

            const countEl = document.getElementById('sectionParticipantCount');
            if (countEl) countEl.innerText = `${list.length}/10`;

            const container = document.getElementById('sectionParticipantsList') || document.getElementById('widgetParticipantsList');
            if (!container) return;

            let rank = 1;
            container.innerHTML = list.map(p => {
                let statusBadge = '';
                if (p.is_finished) {
                  let medal = rank === 1 ? '<i class="bi bi-award-fill text-lg text-amber-400"></i>' : rank === 2 ? '<i class="bi bi-award-fill text-lg text-slate-400"></i>' : rank === 3 ? '<i class="bi bi-award-fill text-lg text-orange-600"></i>' : `#${rank}`;
                  statusBadge = `
        <span class="text-[11px] font-black text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
          ${medal} ${p.score || 0}đ (${p.completion_time || 0}s)
        </span>`;
                  rank++;
                } else {
                  statusBadge = `
        <span class="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-1 rounded-lg animate-pulse border border-amber-500/30">
          <i class="bi bi-hourglass-split"></i> Đang làm...
        </span>`;
                }

                return `
      <div class="p-2 bg-black/20 rounded-xl flex items-center justify-between border border-white/5">
        <span class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
          <span><i class="bi bi-person-fill"></i></span> ${escapeHtml(p.full_name)}
        </span>
        ${statusBadge}
      </div>
    `;
            }).join('');
          }

          // Tải & Render Tin Nhắn Chat
          // 2. Tải & Render Tin Nhắn Chat
          async function loadChatMessages(roomCode) {
            const box = document.getElementById('sectionChatBox');
            if (!box) return;

            const { data: messages, error } = await sbClient
            .from('room_messages')
            .select('*')
            .eq('room_code', roomCode)
            .order('created_at', { ascending: true });

            if (error) {
              console.error("Lỗi lấy lịch sử chat:", error);
              return;
            }

            box.innerHTML = '';
            if (messages && messages.length > 0) {
              messages.forEach(msg => appendSingleChatMessage(msg));
            }
          }

          // 3. Hiển thị 1 tin nhắn lên khung Chat
          function appendSingleChatMessage(msg) {
            const box = document.getElementById('sectionChatBox');
            if (!box) return;

            const isMe = currentUser && currentUser.id === msg.user_id;
            const msgEl = document.createElement('div');
            msgEl.className = `flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1`;

            msgEl.innerHTML = `
    <span class="text-[9px] text-red-200/70 px-1 mb-0.5">${escapeHtml(msg.user_name || 'Học viên')}</span>
    <div class="max-w-[85%] px-3 py-1.5 rounded-2xl text-xs ${
      isMe
        ? 'bg-white text-[#cf1717] font-bold rounded-tr-none shadow'
        : 'bg-black/40 text-white rounded-tl-none border border-white/10'
    }">
      ${escapeHtml(msg.message)}
    </div>
  `;

            box.appendChild(msgEl);
            box.scrollTop = box.scrollHeight; // Tự động cuộn xuống tin nhắn mới nhất
          }

          // 4. Gửi Tin Nhắn Chat (Hiển thị ngay + Lưu Supabase)
          // 1. Hàm gửi tin nhắn
          async function handleSendChatMessage(event) {
            event.preventDefault();
            const input = document.getElementById('sectionInputChat');
            const messageText = input ? input.value.trim() : '';

            if (!messageText || !roomChannel) return;

            const senderName = currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Thành viên';

            const msgPayload = {
              sender: senderName,
              senderId: currentUser?.id,
              text: messageText,
              time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            };

            // Hiển thị ngay trên màn hình người gửi
            appendChatMessage(msgPayload);

            // Broadcast tin nhắn tới tất cả người khác trong phòng
            await roomChannel.send({
                type: 'broadcast',
                event: 'chat_msg',
                payload: msgPayload
            });

            // [BỔ SUNG] LƯU TIN NHẮN VÀO SUPABASE (trước đây chỉ broadcast realtime, không hề insert vào bảng room_messages nên tin nhắn không được lưu lại)
            const roomCodeForMsg = currentRoomCode || activeRoomCode || document.getElementById('sectionRoomCode')?.innerText?.trim();
            if (roomCodeForMsg) {
              const { error: msgInsertErr } = await sbClient.from('room_messages').insert([{
                    room_code: roomCodeForMsg,
                    user_id: currentUser?.id,
                    user_name: senderName,
                    message: messageText
              }]);
              if (msgInsertErr) console.error("❌ Lỗi lưu tin nhắn vào Supabase:", msgInsertErr);
            }

            input.value = '';
          }

          // 2. Hàm chèn tin nhắn vào ô Chat UI và tự động cuộn xuống cuối
          function appendChatMessage(msg) {
            const chatBox = document.getElementById('sectionChatBox');
            if (!chatBox) return;

            const isMe = msg.senderId === currentUser?.id;

            const msgHtml = `
    <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} mb-2">
      <span class="text-[10px] text-red-200/80 mb-0.5 px-1">${msg.sender} • ${msg.time}</span>
      <div class="px-3 py-1.5 rounded-2xl max-w-[85%] break-words text-xs shadow-sm ${
        isMe
          ? 'bg-amber-300 text-zinc-900 font-medium rounded-tr-none'
          : 'bg-white/20 text-white rounded-tl-none border border-white/10'
      }">
        ${escapeHtml(msg.text)}
      </div>
    </div>
  `;

            chatBox.insertAdjacentHTML('beforeend', msgHtml);
            chatBox.scrollTop = chatBox.scrollHeight; // Tự động cuộn xuống tin nhắn mới nhất
          }
          // 5. Lắng Nghe Realtime Widget & Chat (Đã sửa lỗi đồng bộ khi Xóa / Lưu phòng)
          function subscribeRoomWidgetRealtime(roomCode) {
            if (chatRealtimeChannel) {
              try { sbClient.removeChannel(chatRealtimeChannel); } catch (e) {}
            }

            chatRealtimeChannel = sbClient.channel(`section_room_${roomCode}`)
            // A. Lắng nghe cập nhật điểm / người tham gia
            .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_code=eq.${roomCode}` }, () => {
                if (typeof renderWidgetParticipants === 'function') renderWidgetParticipants(roomCode);
            })

            // B. Lắng nghe tin nhắn chat
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_code=eq.${roomCode}` }, (payload) => {
                // Chỉ vẽ tin nhắn nhận được từ NGƯỜI KHÁC
                if (payload.new.user_id !== currentUser?.id) {
                  if (typeof appendSingleChatMessage === 'function') appendSingleChatMessage(payload.new);
                }
            })

            // C. 🚀 LẮNG NGHE BẢNG ROOMS (Bắt cả DELETE và UPDATE status = 'finished')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` }, (payload) => {
                const isDeleted = payload.eventType === 'DELETE';
                const isFinished = payload.eventType === 'UPDATE' && payload.new?.status === 'finished';

                // [FIX] Chỉ xử lý nếu phòng này VẪN ĐANG là phòng đang active hiện tại -> tránh phòng CŨ (đã rời) gửi tín hiệu trễ làm mất trạng thái phòng MỚI
                const stillActive = roomCode === (localStorage.getItem('last_active_room') || '');
                if ((isDeleted || isFinished) && stillActive) {
                  notify(isDeleted ? "[warning] Chủ phòng đã hủy và xóa phòng này!" : "[saved] Chủ phòng đã đóng và lưu phòng đấu!");
                  closeActiveRoomCompletely(); // 👈 Xóa sạch khung đỏ & xóa cache
                }
            })
            .subscribe();
          }

          // Hàm Toggle Ẩn / Hiện Khung An Toàn
          function toggleMainFrame(showExplicitly = null) {
            const targetFrame = document.getElementById('mainExamSection') || document.getElementById('selectedDateContent');
            const restoreBtn = document.getElementById('btnRestoreFrame');

            if (!targetFrame) return;

            const isCurrentlyHidden = targetFrame.classList.contains('hidden');
            const shouldShow = showExplicitly !== null ? showExplicitly : isCurrentlyHidden;

            if (shouldShow) {
              targetFrame.classList.remove('hidden');
              if (restoreBtn) restoreBtn.classList.add('hidden');
            } else {
              targetFrame.classList.add('hidden');
              if (restoreBtn) restoreBtn.classList.remove('hidden');
            }
          }

          // 1. LƯU PHÒNG (Chủ phòng lưu -> Cả 2 bên nhận được thông báo/kết quả)
          // 1. LƯU PHÒNG (Chủ phòng bấm)
          async function handleHostSaveRoom() {
            const roomCode = localStorage.getItem('last_active_room') || document.getElementById('sectionRoomCode')?.innerText?.trim();
            if (!roomCode) return;

            if (!confirm("Bạn có chắc muốn LƯU & KHÓA phòng này? Kết quả sẽ được chuyển vào Lịch sử bài làm.")) return;

            const { error } = await sbClient
            .from('rooms')
            .update({ status: 'finished' })
            .eq('room_code', roomCode);

            if (error) {
              notify("[error] Lỗi khi lưu phòng: " + error.message);
              return;
            }

            notify("[success] Đã lưu phòng thành công vào Lịch sử!");
            closeActiveRoomCompletely(); // 👈 Đóng sạch khung đỏ & xóa cache
          }

          // 2. XÓA PHÒNG (Chủ phòng bấm)
          // 1. Hàm Host thực hiện xóa phòng
          async function handleHostDeleteRoom() {
            const roomCode = currentRoomCode || localStorage.getItem('last_active_room') || document.getElementById('sectionRoomCode')?.innerText?.trim();
            if (!roomCode || roomCode === 'READ-0000') { notify("[warning] Không tìm thấy mã phòng để xóa!"); return; }
            if (!confirm("Bạn có chắc chắn muốn giải tán phòng đấu này?")) return;

            // 1. Báo tức thì cho tất cả thành viên (chờ gửi xong rồi mới xóa)
            try {
              if (roomChannel) {
                await roomChannel.send({ type: 'broadcast', event: 'room_deleted', payload: {} });
              }
            } catch (e) { console.warn("Không gửi được broadcast xóa phòng:", e); }

            // 2. Xóa dữ liệu con TRƯỚC (tin nhắn, người tham gia), xóa bảng rooms SAU CÙNG (tránh vướng khóa ngoại)
            const r1 = await sbClient.from('room_messages').delete().eq('room_code', roomCode);
            if (r1.error) console.warn("Xóa room_messages:", r1.error.message);

            const r2 = await sbClient.from('room_participants').delete().eq('room_code', roomCode);
            if (r2.error) console.warn("Xóa room_participants:", r2.error.message);

            // .select() để biết CHÍNH XÁC có dòng nào bị xóa không (RLS chặn thì trả về 0 dòng mà không báo lỗi)
            const r3 = await sbClient.from('rooms').delete().eq('room_code', roomCode).select();
            if (r3.error) {
              notify("[error] Không xóa được phòng: " + r3.error.message);
              return;
            }
            if (!r3.data || r3.data.length === 0) {
              notify("[error] Database không cho xóa phòng (thiếu quyền DELETE / RLS policy trên bảng 'rooms'). Xem hướng dẫn SQL.");
              console.error("Xóa rooms trả về 0 dòng -> nhiều khả năng thiếu RLS policy DELETE cho host.");
              return;
            }

            // 3. Dọn giao diện + cache
            localStorage.removeItem('last_active_room');
            closeRoomUIWithAnimation(true);
          }

          // 2. Hàm tạo hiệu ứng mờ dần & đóng khung phòng (Dùng chung cho Host & Thành viên)
          function closeRoomUIWithAnimation(isHost = false) {
            const container = document.getElementById('sectionActiveRoomContainer');
            if (!container) return;

            // Hiệu ứng mờ dần (Fade out & Scale down)
            container.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.92)';

            setTimeout(() => {
                container.classList.add('hidden');
                container.style.display = 'none';
                // Reset lại style ban đầu cho lần mở phòng sau
                container.style.opacity = '1';
                container.style.transform = 'scale(1)';

                if (!isHost) {
                  notify("[bell] Chủ phòng đã giải tán phòng thi đấu này!");
                }

                // Hủy kết nối Channel Realtime
                if (roomChannel) {
                  sbClient.removeChannel(roomChannel);
                  roomChannel = null;
                }

                // [BỔ SUNG] Dọn sạch toàn bộ cache & kênh Realtime còn sót lại
                // -> Trước đây chỉ ẩn khung bằng CSS nhưng không xóa cache 'last_active_room' và không hủy chatRealtimeChannel/roomRealtimeChannel
                // nên phòng đã xóa vẫn có thể tự hiện lại (chỉ mất hẳn khi F5 tải lại trang)
                localStorage.removeItem('last_active_room');
                if (typeof chatRealtimeChannel !== 'undefined' && chatRealtimeChannel) {
                  try { sbClient.removeChannel(chatRealtimeChannel); } catch (e) {}
                  chatRealtimeChannel = null;
                }
                if (typeof roomRealtimeChannel !== 'undefined' && roomRealtimeChannel) {
                  try { sbClient.removeChannel(roomRealtimeChannel); } catch (e) {}
                  roomRealtimeChannel = null;
                }
                if (typeof loadRoomHistory === 'function') loadRoomHistory(1);
              }, 400);
          }
          // 3. ẨN / HIỆN KHUNG PHÒNG TRỰC TIẾP (Dành cho cả Host & Thành viên)
          // 1. ẨN / HIỆN NỘI DUNG PHÒNG (Nút "Ẩn Khung")
          function leaveActiveRoomWidget() {
            const body = document.getElementById('sectionActiveRoomBody');
            const btn = document.getElementById('btnToggleWidget');

            if (body) {
              // Toggle lớp hidden
              const isHidden = body.classList.toggle('hidden');
              if (btn) {
                btn.innerHTML = isHidden ? '<i class="bi bi-eye-fill"></i> Hiện Khung' : 'Ẩn Khung <i class="bi bi-x-lg"></i>';
              }
            }
          }

          // 2. ĐÓNG HOÀN TOÀN KHUNG PHÒNG TRỰC TIẾP (Khi Xóa / Lưu / Mất phòng)
          function closeActiveRoomCompletely() {
            localStorage.removeItem('last_active_room');

            const widgetContainer = document.getElementById('sectionActiveRoomContainer');
            if (widgetContainer) {
              widgetContainer.classList.add('hidden');
              widgetContainer.style.display = 'none'; // initActiveRoomWidget từng set display:block -> phải reset, nếu không khung không ẩn
            }

            // Hủy TOÀN BỘ kênh realtime của phòng
            try { if (roomRealtimeChannel) sbClient.removeChannel(roomRealtimeChannel); } catch (e) {}
            try { if (chatRealtimeChannel) sbClient.removeChannel(chatRealtimeChannel); } catch (e) {}
            try { if (roomChannel) sbClient.removeChannel(roomChannel); } catch (e) {}
            roomRealtimeChannel = null;
            chatRealtimeChannel = null;
            roomChannel = null;
            currentRoomCode = null;

            if (typeof loadRoomHistory === 'function') loadRoomHistory(1);
          }
          // Đặt đoạn này ở cuối file JS Dashboard của bạn
          document.addEventListener('DOMContentLoaded', () => {
              sbClient.auth.onAuthStateChange(async (event, session) => {
                  if (session && session.user) {
                    currentUser = session.user;
                    // Khi đã có user -> Kích hoạt Widget phòng làm bài ngay
                    await initActiveRoomWidget();
                  }
              });
          });

          function toggleUserDropdown(e) {
            // Ngăn không cho sự kiện click vào Avatar lan ra ngoài window
            if (e) e.stopPropagation();

            const menu = document.getElementById('userDropdownMenu');
            if (menu) menu.classList.toggle('hidden');
            // Đóng menu điều hướng section nếu đang mở
            const navMenu = document.getElementById('sectionNavMenu');
            if (navMenu) navMenu.classList.add('hidden');
          }

          // Đóng dropdown khi click bất kỳ đâu bên ngoài
          document.addEventListener('click', function(e) {
              const menu = document.getElementById('userDropdownMenu');
              if (menu && !menu.contains(e.target)) {
                menu.classList.add('hidden');
              }
              const navMenu = document.getElementById('sectionNavMenu');
              if (navMenu && !navMenu.contains(e.target)) {
                navMenu.classList.add('hidden');
              }
          });

          // --- MENU 3 GẠCH: ĐIỀU HƯỚNG NHANH TỚI SECTION ---
          function toggleSectionNavMenu(e) {
            if (e) e.stopPropagation();
            const navMenu = document.getElementById('sectionNavMenu');
            if (navMenu) navMenu.classList.toggle('hidden');
            // Đóng menu avatar nếu đang mở
            const userMenu = document.getElementById('userDropdownMenu');
            if (userMenu) userMenu.classList.add('hidden');
          }

          function scrollToSection(e, sectionId) {
            if (e) e.preventDefault();
            const target = document.getElementById(sectionId);
            if (target) {
              const headerOffset = 80; // Trừ chiều cao header cố định (sticky)
              const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
              window.scrollTo({ top: elementPosition - headerOffset, behavior: 'smooth' });
            }
            const navMenu = document.getElementById('sectionNavMenu');
            if (navMenu) navMenu.classList.add('hidden');
          }

          // ĐỔI TÊN BIẾN RIÊNG CHO LỊCH SỬ PHÒNG ĐẤU (Không bị lặp với lịch sử cá nhân)
          let globalRoomHistoryList = [];
          let currentRoomHistoryPage = 1;
          const ROOM_HISTORY_PER_PAGE = 3; // Chỉ hiển thị đúng 3 phòng/trang

          // 1. Tải lịch sử phòng đấu (không phụ thuộc khóa ngoại; phòng đã xóa sẽ tự biến mất)
          async function loadRoomHistory(page = 1) {
            if (!currentUser) {
              const { data: { user } } = await sbClient.auth.getUser();
              if (!user) return;
              currentUser = user;
            }
            currentRoomHistoryPage = page;

            const { data: parts, error } = await sbClient
            .from('room_participants')
            .select('room_code, score, joined_at')
            .eq('user_id', currentUser.id)
            .order('joined_at', { ascending: false });

            if (error) { console.error("❌ Lỗi tải lịch sử phòng:", error); return; }

            const codes = [...new Set((parts || []).map(p => p.room_code))];
            let roomsMap = {};
            if (codes.length) {
              const { data: rooms, error: rErr } = await sbClient
              .from('rooms')
              .select('room_code, exam_token, status, created_at')
              .in('room_code', codes);
              if (rErr) console.error("❌ Lỗi tải thông tin phòng:", rErr);
              (rooms || []).forEach(r => { roomsMap[r.room_code] = r; });
            }

            // Chỉ giữ phòng CÒN TỒN TẠI (phòng đã xóa thì không hiện), phòng đã lưu (finished) hiện đầy đủ
            globalRoomHistoryList = (parts || [])
              .filter(p => roomsMap[p.room_code])
              .map(p => ({ ...p, rooms: roomsMap[p.room_code] }));

            const maxPage = Math.max(1, Math.ceil(globalRoomHistoryList.length / ROOM_HISTORY_PER_PAGE));
            if (currentRoomHistoryPage > maxPage) currentRoomHistoryPage = maxPage;
            renderRoomHistoryUI(currentRoomHistoryPage);
          }

          async function reloadRoomScores(roomCode) {
            if (typeof renderWidgetParticipants === 'function') {
              await renderWidgetParticipants(roomCode);
            }
          }

          // 2. Render giao diện Lịch sử phòng đấu
          function renderRoomHistoryUI(page) {
            const container = document.getElementById('historyListContainer');
            const paginationBox = document.getElementById('historyPaginationContainer');
            if (!container) return;
            currentRoomHistoryPage = page;

            const totalPages = Math.ceil(globalRoomHistoryList.length / ROOM_HISTORY_PER_PAGE) || 1;
            const start = (page - 1) * ROOM_HISTORY_PER_PAGE;
            const pageItems = globalRoomHistoryList.slice(start, start + ROOM_HISTORY_PER_PAGE);

            container.innerHTML = '';

            if (pageItems.length === 0) {
              container.innerHTML = `<div class="text-center py-6 text-gray-400 text-xs">Chưa có lịch sử phòng làm bài nào.</div>`;
              if (paginationBox) paginationBox.innerHTML = '';
              return;
            }

            pageItems.forEach(item => {
                const room = item.rooms || {};
                const card = document.createElement('div');
                card.className = "p-4 bg-gray-50 dark:bg-zinc-800/70 border border-gray-200 dark:border-zinc-700/60 rounded-2xl flex items-center justify-between shadow-sm hover:border-red-500 cursor-pointer transition active:scale-[0.99] my-2";
                card.onclick = () => openRoomFromHistory(item.room_code);

                const d = new Date(item.joined_at);
                const dateStr = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}) + ' ' + d.toLocaleDateString('vi-VN');
                const badge = room.status === 'finished'
                  ? '<span class="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700"><i class="bi bi-floppy-fill"></i> Đã lưu</span>'
                  : '<span class="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700"><i class="bi bi-circle-fill text-[6px] align-middle"></i> Đang mở</span>';

                card.innerHTML = `
      <div>
        <h4 class="font-black text-sm text-gray-800 dark:text-white uppercase">${escapeHtml(room.exam_token || 'BÀI THI')} (${escapeHtml(item.room_code)}) ${badge}</h4>
        <span class="text-xs text-gray-400">Tham gia lúc: ${dateStr}</span>
      </div>
      <div class="text-right space-y-1.5">
        <span class="block text-base font-black text-red-600">${item.score || 0} điểm</span>
        <span class="block text-[10px] text-gray-400">Bấm để xem lại phòng & chat</span>
        ${room.exam_token ? `<button onclick="event.stopPropagation(); window.location.href='exam.html?token=${encodeURIComponent(room.exam_token)}&room_code=${encodeURIComponent(item.room_code)}';" class="text-[10px] font-bold text-white bg-[#cf1717] hover:bg-red-700 px-2.5 py-1 rounded-lg transition"><i class="bi bi-pencil-square"></i> Xem đáp án</button>` : ''}
      </div>
    `;
                container.appendChild(card);
            });

            if (paginationBox) {
              renderPaginationControls(paginationBox, page, totalPages, 'renderRoomHistoryUI');
            }
          }
          // Bấm vào phòng trong lịch sử -> Mở lại Khung phòng và Chat
          async function openRoomFromHistory(roomCode) {
            localStorage.setItem('last_active_room', roomCode);

            const container = document.getElementById('sectionActiveRoomContainer') || document.getElementById('activeRoomWidget');
            if (container) container.classList.remove('hidden');

            // Cập nhật tiêu đề phòng
            const codeEl = document.getElementById('sectionRoomCode');
            if (codeEl) codeEl.innerText = roomCode;

            // [BỔ SUNG] Hiển thị tiêu đề bài thi của phòng này trong khung, để biết bảng điểm ứng với bài nào
            const examTitleEl = document.getElementById('sectionExamTitle');
            if (examTitleEl) {
              const { data: roomInfo } = await sbClient.from('rooms').select('exam_token').eq('room_code', roomCode).maybeSingle();
              if (roomInfo?.exam_token) {
                const { data: examInfo } = await sbClient.from('exams').select('title').eq('token', roomInfo.exam_token).maybeSingle();
                examTitleEl.innerHTML = `<i class="bi bi-book"></i> Bài thi: ${escapeHtml(examInfo?.title || roomInfo.exam_token)}`;
              } else {
                examTitleEl.innerText = '';
              }
            }

            // Tải bảng điểm & tin nhắn chat của phòng này
            if (typeof renderWidgetParticipants === 'function') renderWidgetParticipants(roomCode);
            await loadChatMessages(roomCode);
            subscribeRoomWidgetRealtime(roomCode);
            // [BỔ SUNG] Khởi tạo kênh Realtime để gửi tin nhắn & nhận thông báo Lưu/Xóa phòng khi mở lại từ Lịch sử
            if (typeof initRoomRealtime === 'function') initRoomRealtime(roomCode);

            window.scrollTo({ top: 0, behavior: 'smooth' }); // Cuộn lên đầu trang xem phòng
          }

          let currentRoomJoinUrl = '';

          // 1. Hàm vẽ QR nhỏ trên giao diện
          function renderLobbyQr(roomCode) {
            const qrContainer = document.getElementById('lobbyQrCanvas');
            if (!qrContainer) return;

            // Tự động tìm mã phòng nếu chưa được truyền vào
            if (!roomCode) {
              roomCode = document.getElementById('sectionRoomCode')?.innerText?.trim() || localStorage.getItem('last_active_room');
            }
            if (!roomCode) return;

            // Lấy mã phòng sạch (Ví dụ: READ-8023)
            const cleanCode = roomCode.match(/READ-\d+/i)?.[0] || roomCode;
            currentRoomJoinUrl = `${window.location.origin}${window.location.pathname}?join_code=${cleanCode}`;

            qrContainer.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
              new QRCode(qrContainer, {
                  text: currentRoomJoinUrl,
                  width: 120,
                  height: 120
              });
            }
          }

          // 2. Hàm Bật Phóng To (Tự động cấp chữa nếu URL bị rỗng)
          function openEnlargedQrModal() {
            const modal = document.getElementById('qrModal');
            const modalQrCanvas = document.getElementById('modalQrCanvas');
            if (!modal || !modalQrCanvas) return;

            // Tự quét lấy Mã phòng trực tiếp từ màn hình nếu URL đang bị trống
            if (!currentRoomJoinUrl) {
              const rawText = document.body.innerText;
              const matchedCode = rawText.match(/READ-\d+/i)?.[0] || localStorage.getItem('last_active_room');
              if (matchedCode) {
                currentRoomJoinUrl = `${window.location.origin}${window.location.pathname}?join_code=${matchedCode}`;
              }
            }

            if (!currentRoomJoinUrl) {
              notify("Không tìm thấy đường dẫn phòng để phóng to QR!");
              return;
            }

            modalQrCanvas.innerHTML = ''; // Xóa canvas cũ

            // Vẽ mã QR kích thước lớn 260x260
            if (typeof QRCode !== 'undefined') {
              new QRCode(modalQrCanvas, {
                  text: currentRoomJoinUrl,
                  width: 260,
                  height: 260
              });
            }

            modal.classList.remove('hidden'); // Hiển thị khung phóng to
          }

          // 3. Đóng Popup
          function closeEnlargedQrModal() {
            const modal = document.getElementById('qrModal');
            if (modal) modal.classList.add('hidden');
          }
          let roomChannel = null;
          let currentRoomCode = null;

          function initRoomRealtime(roomCode) {
            currentRoomCode = roomCode;

            // Hủy channel cũ nếu có
            if (roomChannel) {
              sbClient.removeChannel(roomChannel);
            }

            // Khởi tạo Channel duy nhất theo mã phòng
            roomChannel = sbClient.channel(`room_live_${roomCode}`, {
                config: { broadcast: { ack: false } }
            });

            // 1. Lắng nghe Chat Realtime
            roomChannel.on('broadcast', { event: 'chat_msg' }, (response) => {
                // Chỉ hiển thị nếu tin nhắn đến từ người khác
                if (response.payload.senderId !== currentUser?.id) {
                  appendChatMessage(response.payload);
                }
            });

            // 2. Lắng nghe khi Phòng bị Xóa
            roomChannel.on('broadcast', { event: 'room_deleted' }, () => {
                closeRoomUIWithAnimation(false);
            });

            // 3. Lắng nghe khi Điểm số / Tiến độ thay đổi
            roomChannel.on('broadcast', { event: 'score_update' }, () => {
                reloadRoomScores(roomCode);
            });

            // 4. Lắng nghe Postgres DB Changes làm lớp dự phòng (Backup)
            roomChannel
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'room_participants',
                filter: `room_code=eq.${roomCode}`
              }, () => {
                reloadRoomScores(roomCode);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  console.log(`✅ Đã kết nối Realtime phòng: ${roomCode}`);
                  reloadRoomScores(roomCode); // Load điểm lần đầu khi join
                }
            });
          }
          function initScrollReveal() {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                      entry.target.classList.add('active');
                      observer.unobserve(entry.target); // Chạy 1 lần rồi dừng
                    }
                });
              }, { threshold: 0.15 });

            document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
          }

          document.addEventListener('DOMContentLoaded', initScrollReveal);
