
    const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
    const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
    const IMGBB_API_KEY = "db7c3dd769cc772e9b9b1df33d114bd1";
    const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let chartInstance = null;
    let allExams = [];
    let allResults = [];

    async function checkAdmin() {
      const { data: { user } } = await sbClient.auth.getUser();
      if (!user) { window.location.href = 'index.html'; return; }

      const { data: profile } = await sbClient.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { window.location.href = 'dashboard.html'; return; }

      loadAdminExams();
      loadResultsWithProfiles();
      loadAdminNews();
    }

    async function loadAdminExams() {
      const { data: exams } = await sbClient.from('exams').select('*').order('created_at', { ascending: false });
      allExams = exams || [];

      const countElem = document.getElementById('adminExamCount');
      if (countElem) countElem.innerText = `${allExams.length} bài`;

      const container = document.getElementById('adminExamList');
      const selectFilter = document.getElementById('examSelectFilter');

      selectFilter.innerHTML = '<option value="">Chọn bài thi để xem...</option>' + 
        allExams.map(e => `<option value="${e.id}">${e.title}</option>`).join('');

      ruPaginate('exams', 'adminExamList', allExams, 6, exam => `
        <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-bold text-[#cf1717] bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">${exam.topic}</span>
            <span class="text-xs text-gray-400">${new Date(exam.created_at).toLocaleDateString('vi-VN')}</span>
          </div>
          <h3 class="font-bold text-sm text-gray-900 dark:text-white">${exam.title}</h3>
          <div class="pt-2 flex gap-2">
            <button onclick="editExam('${exam.id}')" class="w-1/2 py-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg hover:bg-blue-100 transition"><i class="bi bi-pencil-fill"></i> Sửa</button>
            <button onclick="deleteExam('${exam.id}')" class="w-1/2 py-1.5 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg hover:bg-red-100 transition"><i class="bi bi-trash3-fill"></i> Xóa</button>
            <button type="button" onclick="previewExam('${exam.token}')" class="w-1/2 py-1.5 bg-amber-50 dark:bg-red-950/50 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-lg hover:bg-red-100 transition"><i class="bi bi-eye-fill"></i> Xem thử</button>
          </div>
        </div>
      `, '<p class="text-gray-500 text-sm col-span-full">Chưa có bài thi nào.</p>');
    }

    // JOIN LẤY THÔNG TIN HỌ TÊN VÀ NGÀY SINH TỪ BẢNG PROFILES
    async function loadResultsWithProfiles() {
      const { data: results } = await sbClient
        .from('exam_results')
        .select('*, profiles(full_name, dob)')
        .order('submitted_at', { ascending: false });
      
      allResults = results || [];
    }

    function renderScoreChartAndTable() {
      const examId = document.getElementById('examSelectFilter').value;
      const tbody = document.getElementById('adminGradebookBody');
      if (!examId) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="p-3 text-center text-gray-400">Vui lòng chọn bài thi ở danh sách trên.</td></tr>`;
        if (chartInstance) chartInstance.destroy();
        return;
      }

      const filtered = allResults.filter(r => r.exam_id === examId);

      // Render Bảng điểm sinh viên
      if (tbody) {
        if (filtered.length === 0) {
          ruPaginate('grade', 'adminGradebookBody', [], 10, null, `<tr><td colspan="5" class="p-3 text-center text-gray-400">Chưa có sinh viên nào làm bài thi này.</td></tr>`);
        } else {
          ruPaginate('grade', 'adminGradebookBody', filtered, 10, r => `
            <tr class="hover:bg-gray-50 dark:hover:bg-zinc-800">
              <td class="p-3 font-bold text-gray-900 dark:text-white">${r.profiles?.full_name || 'N/A'}</td>
              <td class="p-3 text-gray-500">${r.profiles?.dob || 'N/A'}</td>
              <td class="p-3 font-extrabold text-[#cf1717]">${r.score} điểm</td>
              <td class="p-3 text-gray-500">${Math.floor(r.time_spent / 60)}m ${r.time_spent % 60}s</td>
              <td class="p-3 text-gray-400">${new Date(r.submitted_at).toLocaleString('vi-VN')}</td>
            </tr>
          `);
        }
      }

      // Render Biểu đồ Chart.js
      const scoreCounts = {};
      filtered.forEach(r => { scoreCounts[r.score] = (scoreCounts[r.score] || 0) + 1; });
      const labels = Object.keys(scoreCounts).sort((a,b) => a - b).map(s => `${s} Điểm`);
      const dataValues = labels.map(l => scoreCounts[parseInt(l)]);

      const ctx = document.getElementById('scoreChart').getContext('2d');
      if (chartInstance) chartInstance.destroy();

      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{ label: 'Số lượng sinh viên đạt mức điểm', data: dataValues, backgroundColor: '#cf1717', borderRadius: 6 }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
      });
    }

    // QUẢN LÝ TIN TỨC (SỬA / XÓA)
    async function loadAdminNews() {
      const { data: news } = await sbClient.from('news').select('*').order('created_at', { ascending: false });
      const container = document.getElementById('adminNewsList');

      window.__adminNews = news || [];
      ruPaginate('news', 'adminNewsList', news || [], 4, n => `
        <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-4 rounded-xl flex justify-between items-center">
          <div>
            <h4 class="font-bold text-sm text-gray-900 dark:text-white">${n.title}</h4>
            <p class="text-xs text-gray-400">${new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
          </div>
          <div class="flex gap-2">
            <button onclick="editNews('${n.id}')" class="text-xs text-blue-500 font-bold hover:underline">Sửa</button>
            <button onclick="deleteNews('${n.id}')" class="text-xs text-red-500 font-bold hover:underline">Xóa</button>
            <button type="button" onclick="previewAnnouncement('${n.id}')" class="text-xs text-amber-500 font-bold hover:underline">Xem thử</button>
          </div>
        </div>
      `, '<p class="text-gray-400 text-sm">Chưa có thông báo nào.</p>');
    }

    async function handleSaveNews(e) {
      e.preventDefault();
      const id = document.getElementById('editingNewsId').value;
      let newsContentValue;
      try { newsContentValue = getNewsContent(); } catch (err) { return alert('JSON chưa đúng cú pháp: ' + err.message); }
      if (!newsContentValue) return alert('Bạn chưa nhập nội dung thông báo!');
      const newsData = {
        title: document.getElementById('newsTitle').value,
        content: newsContentValue,
        image_url: document.getElementById('newsImageUrl').value
      };

      const { error } = id
        ? await sbClient.from('news').update(newsData).eq('id', id)
        : await sbClient.from('news').insert([newsData]);
      if (error) return alert('Không thể lưu thông báo: ' + error.message + '\nNếu ảnh quá lớn, hãy thử ảnh nhỏ hơn.');
      resetNewsForm();
      loadAdminNews();
    }

    function editNews(id) {
      // Look up local news model instead of inserting a potentially 1 MB base64
      // image directly inside an onclick HTML attribute.
      const news = (window.__adminNews || []).find(n => String(n.id) === String(id));
      if (!news) return alert('Không tìm thấy thông báo. Vui lòng tải lại trang.');
      document.getElementById('editingNewsId').value = id;
      document.getElementById('newsTitle').value = news.title || '';
      setNewsContent(news.content || '');
      document.getElementById('newsTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.RUImageClipboard) RUImageClipboard.setNews(news.image_url || '');
      else document.getElementById('newsImageUrl').value = news.image_url || '';
      document.getElementById('newsSubmitBtn').innerText = 'Cập Nhật Thông Báo';
    }

    async function deleteNews(id) {
      if (confirm("Bạn có chắc muốn xóa thông báo này?")) {
        await sbClient.from('news').delete().eq('id', id);
        loadAdminNews();
      }
    }

  // TẠO & SỬA BÀI THI
  function openExamModal() {
    document.getElementById('editingExamId').value = '';
    document.getElementById('examModalTitle').innerText = 'Tạo Bài Reading Mới';
    
    // Reset toàn bộ ô nhập liệu về trạng thái trống
    document.getElementById('examTitle').value = '';
    document.getElementById('examTopic').value = '';
    document.getElementById('examTime').value = '60';
    document.getElementById('examNotes').value = '';
    setPassageMode('word'); setPassageHtml('');
    qbLoad([]);
    
    const vocabElem = document.getElementById('examVocab');
    if (vocabElem) vocabElem.value = '[]';

    document.getElementById('examModal').classList.remove('hidden');
  }

  function closeExamModal() {
    document.getElementById('examModal').classList.add('hidden');
  }

  function editExam(id) {
    const exam = allExams.find(e => e.id === id);
    if (!exam) return;
    document.getElementById('editingExamId').value = exam.id;
    document.getElementById('examModalTitle').innerText = 'Chỉnh Sửa Bài Reading';
    document.getElementById('examTitle').value = exam.title || '';
    document.getElementById('examTopic').value = exam.topic || '';
    document.getElementById('examTime').value = exam.time_limit || 60;
    document.getElementById('examNotes').value = exam.notes || '';
    setPassageMode('word'); setPassageHtml(exam.passage_html || '');
    qbLoad(exam.questions || []);
    
    // 💥 BỔ SUNG: Đổ dữ liệu từ vựng hiện tại vào ô examVocab
    const vocabElem = document.getElementById('examVocab');
    if (vocabElem) {
      const vocabData = typeof exam.vocabulary === 'string' 
        ? exam.vocabulary 
        : JSON.stringify(exam.vocabulary || [], null, 2);
      vocabElem.value = vocabData;
    }

    document.getElementById('examModal').classList.remove('hidden');
  }

  async function handleSaveExam(e) {
  e.preventDefault();
  const id = document.getElementById('editingExamId').value;
  const passageHtml = getPassageHtml();
  if (!passageHtml) { alert('Bạn chưa nhập đoạn văn Reading!'); return; }
  const qbErr = qbValidate(); if (qbErr) { alert(qbErr); return; }
  try {
    const questionsJson = qbGetData();
    const vocabVal = document.getElementById('examVocab')?.value.trim();
    const vocabularyJson = vocabVal ? JSON.parse(vocabVal) : [];

    const titleVal = document.getElementById('examTitle').value;
    const topicVal = document.getElementById('examTopic').value;

    // Tự động tạo token dạng slug từ Tên bài thi (hoặc topicVal nếu muốn lấy theo chủ đề)
    const generatedToken = createSlug(titleVal);

    const examData = {
      title: titleVal,
      topic: topicVal,
      time_limit: parseInt(document.getElementById('examTime').value) || 60,
      notes: document.getElementById('examNotes').value,
      passage_html: passageHtml,
      questions: questionsJson,
      vocabulary: vocabularyJson,
      token: generatedToken
    };

    if (id) {
      await sbClient.from('exams').update(examData).eq('id', id);
    } else {
      await sbClient.from('exams').insert([examData]);
    }

    closeExamModal();
    loadAdminExams();
  } catch (err) { 
    alert("Dữ liệu JSON không hợp lệ! Vui lòng kiểm tra lại cú pháp ở ô Câu hỏi hoặc Từ vựng."); 
  }
}

    async function deleteExam(id) {
      if (confirm("Xóa bài thi này?")) {
        await sbClient.from('exams').delete().eq('id', id);
        loadAdminExams();
      }
    }

    // UTILS UPLOAD ANH
    async function uploadImageToImgBB(fileInput, hiddenInputId, statusId) {
      const file = fileInput.files[0];
      const status = document.getElementById(statusId);
      if (!file) return;

      status.innerHTML = "<i class='bi bi-hourglass-split'></i> Đang tải ảnh lên...";
      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          document.getElementById(hiddenInputId).value = data.data.url;
          status.innerHTML = "<i class='bi bi-check-circle-fill'></i> Upload ảnh thành công!";
        }
      } catch (err) { status.innerHTML = "<i class='bi bi-x-circle-fill'></i> Lỗi upload ảnh!"; }
    }

    async function uploadPassageImage(fileInput) {
      const file = fileInput.files[0];
      const status = document.getElementById('passageImgStatus');
      if (!file) return;

      status.innerHTML = "<i class='bi bi-hourglass-split'></i> Đang upload...";
      const formData = new FormData();
      formData.append("image", file);

      try {
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          const imgTag = `<img src="${data.data.url}" alt="Illustration" class="w-full max-w-lg mx-auto my-4 rounded-xl shadow-md">`;
          insertPassageHtml(imgTag);
          status.innerHTML = "<i class='bi bi-check-circle-fill'></i> Đã tự chèn mã HTML ảnh vào ô Reading Passage!";
        }
      } catch (err) { status.innerHTML = "<i class='bi bi-x-circle-fill'></i> Lỗi upload!"; }
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

    window.onload = checkAdmin;

function switchAdminTab(tab) {
    document.getElementById('adminTicketsSection').classList.add('hidden');
    document.getElementById('adminFeedbacksSection').classList.add('hidden');
    
    if (tab === 'tickets') {
      document.getElementById('adminTicketsSection').classList.remove('hidden');
      loadAdminTickets();
    } else if (tab === 'feedbacks') {
      document.getElementById('adminFeedbacksSection').classList.remove('hidden');
      loadAdminFeedbacks();
    }
  }

// Tải dữ liệu Yêu Cầu Hỗ Trợ
async function loadAdminTickets() {
  const container = document.getElementById('adminTicketList');
  const countBadge = document.getElementById('adminTicketCount');

  const { data: tickets, error } = await sbClient
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !tickets || tickets.length === 0) {
    countBadge.innerText = '0 yêu cầu';
    ruPaginate('tickets', 'adminTicketList', [], 6, null, '<p class="text-gray-500 text-sm col-span-full">Chưa có yêu cầu hỗ trợ nào.</p>');
    return;
  }

  countBadge.innerText = `${tickets.length} yêu cầu`;
  ruPaginate('tickets', 'adminTicketList', tickets, 6, t => `
    <div class="p-4 bg-white dark:bg-zinc-800 rounded-2xl border dark:border-zinc-700 shadow-sm flex flex-col justify-between space-y-3">
      <div class="space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400' : 'bg-red-100 text-[#cf1717] dark:bg-red-950/60'}">
            ${t.ticket_code}
          </span>
          <span class="text-[10px] text-gray-400">${new Date(t.created_at).toLocaleDateString('vi-VN')}</span>
        </div>
        <h3 class="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">${t.title}</h3>
        <p class="text-[11px] text-gray-500 dark:text-gray-400"><i class="bi bi-person-fill"></i> ${t.full_name} (${t.email})</p>
        <p class="p-2 bg-gray-50 dark:bg-zinc-900 rounded-xl text-xs text-gray-700 dark:text-gray-300 border dark:border-zinc-800">${t.content}</p>
      </div>

      <div class="pt-2 border-t dark:border-zinc-700/60 space-y-2">
        <textarea id="reply_${t.id}" rows="2" placeholder="Nhập câu trả lời..." class="w-full p-2 border rounded-xl dark:bg-zinc-900 dark:border-zinc-700 text-xs outline-none focus:ring-1 focus:ring-[#cf1717]">${t.admin_reply || ''}</textarea>
        <button onclick="sendAdminReply('${t.id}')" class="w-full py-1.5 bg-[#cf1717] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition">
          ${t.admin_reply ? 'Cập Nhật Trả Lời' : 'Gửi Phản Hồi'}
        </button>
      </div>
    </div>
  `);
}

// Gửi phản hồi hỗ trợ
async function sendAdminReply(ticketId) {
  const replyText = document.getElementById(`reply_${ticketId}`).value;
  if (!replyText.trim()) return alert("Vui lòng nhập nội dung phản hồi!");

  const { error } = await sbClient
    .from('support_tickets')
    .update({ admin_reply: replyText, status: 'resolved' })
    .eq('id', ticketId);

  if (error) alert("Lỗi: " + error.message);
  else {
    alert("Đã gửi câu trả lời thành công!");
    loadAdminTickets();
  }
}

// Tải dữ liệu Đánh Giá Dịch Vụ
async function loadAdminFeedbacks() {
  const container = document.getElementById('adminFeedbackList');
  const countBadge = document.getElementById('adminFeedbackCount');

  const { data: list, error } = await sbClient
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !list || list.length === 0) {
    countBadge.innerText = '0 đánh giá';
    ruPaginate('feedbacks', 'adminFeedbackList', [], 6, null, '<p class="text-gray-500 text-sm col-span-full">Chưa có đánh giá nào.</p>');
    return;
  }

  countBadge.innerText = `${list.length} đánh giá`;
  ruPaginate('feedbacks', 'adminFeedbackList', list, 6, f => `
    <div class="p-4 bg-white dark:bg-zinc-800 rounded-2xl border dark:border-zinc-700 shadow-sm space-y-2 text-xs">
      <div class="flex justify-between items-center text-[10px] text-gray-400">
        <span>Ẩn danh</span>
        <span>${new Date(f.created_at).toLocaleDateString('vi-VN')}</span>
      </div>

      <div class="space-y-1 text-[11px] text-gray-700 dark:text-gray-300">
        <div class="flex justify-between"><span>Giao diện:</span> <strong class="text-amber-400">${'<i class="bi bi-star-fill"></i>'.repeat(f.q1_rating)}</strong></div>
        <div class="flex justify-between"><span>Đề thi & Nội dung:</span> <strong class="text-amber-400">${'<i class="bi bi-star-fill"></i>'.repeat(f.q2_rating)}</strong></div>
        <div class="flex justify-between"><span>Tốc độ hệ thống:</span> <strong class="text-amber-400">${'<i class="bi bi-star-fill"></i>'.repeat(f.q3_rating)}</strong></div>
      </div>

      ${f.comment ? `
        <div class="p-2.5 bg-gray-50 dark:bg-zinc-900 rounded-xl text-gray-700 dark:text-gray-300 border dark:border-zinc-800 italic text-[11px]">
          "${f.comment}"
        </div>
      ` : ''}
    </div>
  `);
}

// Gọi hàm khi tải trang Admin
document.addEventListener("DOMContentLoaded", () => {
  loadAdminTickets();
  loadAdminFeedbacks();
});
let currentSectionKey = '';
let currentGuideRole = 'admin'; // ➕ Biến lưu Tab hiện tại ('admin' hoặc 'student')
let currentGuideImageUrl = '';

// 1. Mở Popup Hướng Dẫn (Mặc định mở Tab Admin)
async function openGuideModal(sectionKey, sectionTitle) {
  currentSectionKey = sectionKey;
  currentGuideRole = 'admin'; 
  document.getElementById('guideModalTitle').innerHTML = `<i class="bi bi-question-circle-fill"></i> Hướng Dẫn: ${escapeHtml(sectionTitle)}`;
  document.getElementById('guideModal').classList.remove('hidden');
  
  updateTabUI();
  resetGuideForm();
  await loadGuidesList();
}

// ➕ 2. Hàm chuyển đổi giữa Tab Admin và Tab Student
async function switchGuideTab(role) {
  currentGuideRole = role;
  updateTabUI();
  resetGuideForm();
  await loadGuidesList();
}

// ➕ 3. Hàm cập nhật màu sắc & tiêu đề khi đổi Tab
function updateTabUI() {
  const btnAdmin = document.getElementById('tabBtnAdmin');
  const btnStudent = document.getElementById('tabBtnStudent');
  const listTitle = document.getElementById('guideListTitle');

  if (!btnAdmin || !btnStudent) return;

  if (currentGuideRole === 'admin') {
    btnAdmin.className = "py-2 px-4 font-bold text-sm border-b-2 border-[#cf1717] text-[#cf1717] dark:text-red-400 transition";
    btnStudent.className = "py-2 px-4 font-bold text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 border-b-2 border-transparent transition";
    if (listTitle) listTitle.innerHTML = "<i class='bi bi-clipboard-fill'></i> Danh Sách Hướng Dẫn (Cho Admin)";
  } else {
    btnStudent.className = "py-2 px-4 font-bold text-sm border-b-2 border-[#cf1717] text-[#cf1717] dark:text-red-400 transition";
    btnAdmin.className = "py-2 px-4 font-bold text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 border-b-2 border-transparent transition";
    if (listTitle) listTitle.innerHTML = "<i class='bi bi-clipboard-fill'></i> Danh Sách Hướng Dẫn (Cho Học Sinh)";
  }
}

// 4. Đóng Popup Hướng Dẫn
function closeGuideModal() {
  document.getElementById('guideModal').classList.add('hidden');
}

// 5. Tải Ảnh Hướng Dẫn lên Supabase Bucket
async function uploadGuideImage(input) {
  const file = input.files[0];
  if (!file) return;

  const statusElem = document.getElementById('guideUploadStatus');
  statusElem.innerText = 'Đang tải ảnh lên...';

  const apiKey = 'db7c3dd769cc772e9b9b1df33d114bd1';
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();

    if (result.success) {
      const imgUrl = result.data.url;
      // Tạo thẻ img HTML chuẩn định dạng
      const imgTag = `<img src="${imgUrl}" alt="Illustration" class="w-full max-w-lg mx-auto my-4 rounded-xl shadow-md">`;

      // Chèn trực tiếp vào ô textarea Nội dung
      const contentInput = document.getElementById('guideInputContent');
      if (contentInput) {
        contentInput.value = contentInput.value ? `${contentInput.value}\n${imgTag}` : imgTag;
      }

      statusElem.innerHTML = '<i class="bi bi-check-circle-fill"></i> Đã chèn ảnh vào nội dung!';
    } else {
      alert('Tải ảnh thất bại: ' + (result.error ? result.error.message : 'Lỗi kết nối'));
      statusElem.innerText = '';
    }
  } catch (error) {
    alert('Tải ảnh thất bại: ' + error.message);
    statusElem.innerText = '';
  }
}


function clearGuideImage() {
  currentGuideImageUrl = '';
  document.getElementById('guideImagePreview').classList.add('hidden');
  document.getElementById('guidePreviewImg').src = '';
  document.getElementById('guideImageInput').value = '';
  document.getElementById('guideUploadStatus').innerText = '';
}

// 6. Lưu / Thêm / Cập nhật Hướng Dẫn (Đã thêm target_role)
async function saveGuide() {
  const title = document.getElementById('guideInputTitle').value.trim();
  const content = document.getElementById('guideInputContent').value.trim();
  const editId = document.getElementById('guideEditId').value;

  if (!title) {
    alert('Vui lòng nhập tiêu đề hướng dẫn!');
    return;
  }

  const payload = {
    section_key: currentSectionKey,
    target_role: currentGuideRole, // ➕ Lưu theo Tab đang mở (admin hoặc student)
    title: title,
    content: content,
    image_url: currentGuideImageUrl
  };

  let error = null;
  if (editId) {
    const res = await sbClient.from('guides').update(payload).eq('id', editId);
    error = res.error;
  } else {
    const res = await sbClient.from('guides').insert([payload]);
    error = res.error;
  }

  if (error) {
    alert('Lưu hướng dẫn thất bại: ' + error.message);
  } else {
    resetGuideForm();
    await loadGuidesList();
  }
}

// 7. Tải danh sách hướng dẫn (Đã lọc theo Tab đang chọn)
async function loadGuidesList() {
  const container = document.getElementById('guideListContainer');
  container.innerHTML = '<p class="text-xs text-gray-400 italic">Đang tải...</p>';

  const { data, error } = await sbClient
    .from('guides')
    .select('*')
    .eq('section_key', currentSectionKey)
    .eq('target_role', currentGuideRole) // ➕ Lọc dữ liệu theo target_role
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-400 italic">Chưa có hướng dẫn nào dành cho ${currentGuideRole === 'admin' ? 'Admin' : 'Học sinh'} ở mục này.</p>`;
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="p-3.5 bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm space-y-2">
      <div class="flex justify-between items-center">
        <h5 class="font-bold text-sm text-gray-800 dark:text-gray-100">${escapeHtml(item.title)}</h5>
        <div class="flex gap-2">
          <button onclick='editGuide(${JSON.stringify(item)})' class="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">Sửa</button>
          <button onclick="deleteGuide(${item.id})" class="text-xs text-red-600 dark:text-red-400 font-bold hover:underline">Xóa</button>
        </div>
      </div>
      ${item.content ? `<div class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">${item.content}</div>` : ''}
      ${item.image_url ? `<img src="${item.image_url}" class="max-h-48 rounded-lg border mt-2 object-contain">` : ''}
    </div>
  `).join('');
}

// 8. Điền dữ liệu vào form khi bấm "Sửa"
function editGuide(guide) {
  document.getElementById('guideEditId').value = guide.id;
  document.getElementById('guideInputTitle').value = guide.title || '';
  document.getElementById('guideInputContent').value = guide.content || '';
  
  if (guide.image_url) {
    currentGuideImageUrl = guide.image_url;
    document.getElementById('guidePreviewImg').src = guide.image_url;
    document.getElementById('guideImagePreview').classList.remove('hidden');
  } else {
    clearGuideImage();
  }

  document.getElementById('guideFormHeading').innerHTML = '<i class="bi bi-pencil-fill"></i> Chỉnh Sửa Hướng Dẫn';
  document.getElementById('btnCancelGuideEdit').classList.remove('hidden');
}

// 9. Xóa Hướng Dẫn
async function deleteGuide(id) {
  if (!confirm('Bạn có chắc muốn xóa hướng dẫn này?')) return;
  const { error } = await sbClient.from('guides').delete().eq('id', id);
  if (error) {
    alert('Xóa thất bại: ' + error.message);
  } else {
    await loadGuidesList();
  }
}

// 10. Reset Form
function resetGuideForm() {
  document.getElementById('guideEditId').value = '';
  document.getElementById('guideInputTitle').value = '';
  document.getElementById('guideInputContent').value = '';
  document.getElementById('guideFormHeading').innerHTML = '<i class="bi bi-plus-circle-fill"></i> Thêm Hướng Dẫn Mới';
  document.getElementById('btnCancelGuideEdit').classList.add('hidden');
  clearGuideImage();
}

function escapeHtml(str) {
  return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
}

    // 1. CHÈN VIDEO YOUTUBE
function insertYoutubeVideo() {
  const url = prompt("Nhập đường dẫn Video YouTube (ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ):");
  if (!url) return;

  // Lấy Video ID từ đường dẫn YouTube
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    const iframeTag = `\n<div class="relative w-full aspect-video my-3 rounded-xl overflow-hidden shadow-md">\n  <iframe class="w-full h-full" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>\n</div>\n`;
    
    const contentInput = document.getElementById('guideInputContent');
    contentInput.value += iframeTag;
  } else {
    alert("Đường dẫn YouTube không hợp lệ!");
  }
}

// 2. CHÈN FILE / TÀI LIỆU (PDF, Word, Google Drive link)
// CHÈN TÀI LIỆU (PDF, Docx, Google Drive...) - CÓ NÚT TẢI & KHUNG ĐỌC TRỰC TIẾP
function insertDocFile() {
  let fileUrl = prompt("Nhập link File (PDF/Docx) hoặc link Google Drive:");
  if (!fileUrl) return;
  fileUrl = fileUrl.trim();

  const fileName = prompt("Nhập tên hiển thị của tài liệu:", "Tài liệu hướng dẫn") || "Tài liệu đính kèm";

  let embedUrl = "";

  // 1. Nếu là Link Google Drive -> Tự động chuyển thành Link nhúng Preview
  if (fileUrl.includes("drive.google.com")) {
    if (fileUrl.includes("/file/d/")) {
      const fileId = fileUrl.split("/file/d/")[1].split("/")[0];
      embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    } else {
      embedUrl = fileUrl; // Giữ nguyên nếu là link dạng khác
    }
  } 
  // 2. Nếu là file trực tiếp (Doc, Docx, PDF...) -> Sử dụng trình xem Google Docs Viewer
  else {
    embedUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  }

  // Khung HTML kết hợp: Nút mở/tải + Khung xem trực tiếp
  const docTag = `\n<div class="my-4 p-3 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-200 dark:border-zinc-700 shadow-sm">
  <div class="flex items-center justify-between gap-2 flex-wrap">
    <span class="font-bold text-xs text-gray-800 dark:text-gray-100 flex items-center gap-1.5">📄 ${escapeHtml(fileName)}
    </span>
  </div>
  <iframe src="${embedUrl}" class="w-full h-96 rounded-lg border border-gray-300 dark:border-zinc-600 shadow-inner bg-white" allow="autoplay"></iframe>
  <div class="flex justify-center pt-1">
    <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow">📎 Tải tài liệu </a></div>
</div>\n`;

  const contentInput = document.getElementById('guideInputContent');
  if (contentInput) {
    contentInput.value += docTag;
  }
}

    // Tải danh sách câu luyện phát âm
async function loadAdminPronunPhrases() {
  const container = document.getElementById('adminPronunList');
  const countBadge = document.getElementById('adminPronunCount');
  if (!container) return;

  const { data, error } = await sbClient
    .from('pronunciation_phrases')
    .select('*')
    .order('created_at', { ascending: false });

  // Cập nhật số lượng hiển thị trên Badge
  if (countBadge) {
    countBadge.innerText = `${data ? data.length : 0} câu`;
  }

  if (error || !data || data.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 italic p-2">Chưa có câu mẫu nào.</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/80 rounded-xl border border-gray-100 dark:border-zinc-700/60 hover:border-gray-300 transition">
      <span class="text-sm font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(item.phrase)}</span>
      <button onclick="deletePronunPhrase(${item.id})" class="text-xs text-red-600 dark:text-red-400 font-bold hover:underline px-2 py-1">Xóa</button>
    </div>
  `).join('');
}
    
// Lưu câu mẫu mới
async function savePronunPhrase() {
  const input = document.getElementById('inputPronunPhrase');
  const phrase = input.value.trim();
  if (!phrase) {
    alert("Vui lòng nhập cụm từ!");
    return;
  }

  const { error } = await sbClient.from('pronunciation_phrases').insert([{ phrase }]);
  if (error) {
    alert("Lỗi: " + error.message);
  } else {
    input.value = '';
    await loadAdminPronunPhrases();
  }
}

// Xóa câu mẫu
async function deletePronunPhrase(id) {
  if (!confirm("Xóa câu này?")) return;
  await sbClient.from('pronunciation_phrases').delete().eq('id', id);
  await loadAdminPronunPhrases();
}

// Gọi tải danh sách khi mở trang
document.addEventListener('DOMContentLoaded', loadAdminPronunPhrases);

    let localPronunPhrases = []; // Lưu biến tạm để gọi nhanh khi bấm Sửa

async function loadAdminPronunPhrases() {
  const container = document.getElementById('adminPronunList');
  const countBadge = document.getElementById('adminPronunCount');
  if (!container) return;

  const { data, error } = await sbClient
    .from('pronunciation_phrases')
    .select('*')
    .order('created_at', { ascending: false });

  localPronunPhrases = data || [];

  if (countBadge) countBadge.innerText = `${localPronunPhrases.length} câu`;

  if (error || localPronunPhrases.length === 0) {
    ruPaginate('pronun', 'adminPronunList', [], 5, null, '<p class="text-xs text-gray-400 italic p-2">Chưa có câu mẫu nào.</p>');
    return;
  }

  ruPaginate('pronun', 'adminPronunList', localPronunPhrases, 5, item => `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/80 rounded-xl border border-gray-100 dark:border-zinc-700/60 hover:border-gray-300 transition gap-2">
      <div class="space-y-0.5">
        <p class="text-sm font-bold text-gray-800 dark:text-gray-100">${escapeHtml(item.phrase)}</p>
        <div class="flex items-center gap-3 text-xs">
          <span class="text-[#cf1717] dark:text-red-400 font-sans font-medium text-xs tracking-wide">${item.ipa ? escapeHtml(item.ipa) : 'Chưa có IPA'}</span>
          <span class="text-gray-500 dark:text-gray-400 italic">${item.meaning ? escapeHtml(item.meaning) : 'Chưa có nghĩa'}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
        <button onclick="editPronunPhrase(${item.id})" class="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline px-2 py-1">Sửa</button>
        <button onclick="deletePronunPhrase(${item.id})" class="text-xs text-red-600 dark:text-red-400 font-bold hover:underline px-2 py-1">Xóa</button>
      </div>
    </div>
  `);
}

// Lưu (Thêm mới hoặc Cập nhật)
async function savePronunPhrase() {
  const editId = document.getElementById('editPronunId').value;
  const phrase = document.getElementById('inputPronunPhrase').value.trim();
  const ipa = document.getElementById('inputPronunIpa').value.trim();
  const meaning = document.getElementById('inputPronunMeaning').value.trim();

  if (!phrase) {
    alert("Vui lòng nhập câu tiếng Anh!");
    return;
  }

  const payload = { phrase, ipa, meaning };

  if (editId) {
    // Đang ở chế độ SỬA
    const { error } = await sbClient.from('pronunciation_phrases').update(payload).eq('id', editId);
    if (error) alert("Lỗi sửa: " + error.message);
  } else {
    // Đang ở chế độ THÊM MỚI
    const { error } = await sbClient.from('pronunciation_phrases').insert([payload]);
    if (error) alert("Lỗi thêm: " + error.message);
  }

  cancelPronunEdit();
  await loadAdminPronunPhrases();
}

// Chuyển form sang trạng thái SỬA
function editPronunPhrase(id) {
  const item = localPronunPhrases.find(p => p.id === id);
  if (!item) return;

  document.getElementById('editPronunId').value = item.id;
  document.getElementById('inputPronunPhrase').value = item.phrase || '';
  document.getElementById('inputPronunIpa').value = item.ipa || '';
  document.getElementById('inputPronunMeaning').value = item.meaning || '';

  document.getElementById('btnSavePronunText').innerText = "Lưu Cập Nhật";
  document.getElementById('btnSavePronunIcon').innerHTML = "<i class='bi bi-floppy-fill'></i>";
  document.getElementById('btnCancelPronunEdit').classList.remove('hidden');
}

// Hủy Sửa / Reset Form
function cancelPronunEdit() {
  document.getElementById('editPronunId').value = '';
  document.getElementById('inputPronunPhrase').value = '';
  document.getElementById('inputPronunIpa').value = '';
  document.getElementById('inputPronunMeaning').value = '';

  document.getElementById('btnSavePronunText').innerText = "Thêm Câu";
  document.getElementById('btnSavePronunIcon').innerText = "+";
  document.getElementById('btnCancelPronunEdit').classList.add('hidden');
}

// Xóa câu
async function deletePronunPhrase(id) {
  if (!confirm("Bạn có chắc muốn xóa câu này?")) return;
  await sbClient.from('pronunciation_phrases').delete().eq('id', id);
  await loadAdminPronunPhrases();
}

      async function loadAdminLeaderboard() {
  const { data } = await sbClient
    .from('user_stats')
    .select('*')
    .order('total_xp', { ascending: false });

  const tbody = document.getElementById('adminLeaderboardTable');
  if (!tbody || !data) return;
  window.__lbData = data;
  renderLeaderboard();
}
let __lbExpanded = false;
const LB_COLLAPSED_ROWS = 5;
function toggleLeaderboard() { __lbExpanded = !__lbExpanded; renderLeaderboard(); }
function renderLeaderboard() {
  const tbody = document.getElementById('adminLeaderboardTable');
  const wrap = document.getElementById('adminLeaderboardWrap');
  const btn = document.getElementById('adminLeaderboardToggle');
  const data = window.__lbData || [];
  if (!tbody) return;
  const rows = __lbExpanded ? data : data.slice(0, LB_COLLAPSED_ROWS);
  if (wrap) { wrap.classList.toggle('max-h-[26rem]', __lbExpanded); wrap.classList.toggle('overflow-y-auto', __lbExpanded); }
  if (btn) {
    btn.innerHTML = __lbExpanded
      ? '<i class="bi bi-arrows-collapse"></i> Thu gọn bảng'
      : `<i class="bi bi-arrows-expand"></i> Mở rộng bảng${data.length > LB_COLLAPSED_ROWS ? ' (' + data.length + ' học sinh)' : ''}`;
  }
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-400">Chưa có dữ liệu chuỗi học.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(item => `
    <tr class="hover:bg-gray-50 dark:hover:bg-zinc-700/50">
      <td class="p-3 font-mono font-bold text-gray-900 dark:text-white">#${item.user_id.substring(0, 8)}</td>
      <td class="p-3 font-black text-[#cf1717] dark:text-red-400"><i class="bi bi-fire"></i> ${item.streak_count || 0} ngày</td>
      <td class="p-3 font-black text-amber-500">${item.total_xp || 0} XP</td>
      <td class="p-3">${item.last_study_date || 'Chưa học'}</td>
      <td class="p-3">
        ${item.is_recovering ? '<span class="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 font-bold rounded-full">Đang khôi phục (2 bài)</span>' : '<span class="px-2 py-0.5 text-[10px] bg-green-100 text-green-700 font-bold rounded-full">Bình thường</span>'}
      </td>
    </tr>
  `).join('');
}

// Gọi hàm khi trang Admin tải xong
document.addEventListener('DOMContentLoaded', loadAdminLeaderboard);

function createSlug(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')                     // Tách các ký tự dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, '')       // Xóa các dấu thanh
    .replace(/đ/g, 'd').replace(/Đ/g, 'd') // Chuyển đ/Đ thành d
    .replace(/['’]/g, '')                  // Xóa dấu nháy đơn (ví dụ: Minh's -> minhs)
    .replace(/[^a-z0-9\s-]/g, '')          // Xóa các ký tự đặc biệt (: , ! ? ...)
    .trim()
    .replace(/\s+/g, '-')                  // Thay khoảng trắng thành dấu gạch nối (-)
    .replace(/-+/g, '-');                  // Xóa nhiều dấu gạch nối liền nhau
}
    
  