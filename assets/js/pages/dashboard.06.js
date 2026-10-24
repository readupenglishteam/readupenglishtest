
  const SUPABASE_URL = "https://klovtvjfvfenhkvifujy.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WevQJCkdgfwbgnUoNu1SfA_Ec9hT49-";
  const sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  let currentUser = null;

  // KHỞI TẠO DASHBOARD SONG SONG SIÊU TỐC
  async function initDashboard() {
    // 1. Dựng khung Lịch ngay tức thì (0ms delay)
    if (typeof initCalendar === 'function') initCalendar();

    // 2. Kiểm tra Auth từ Session Local
    const { data: { session } } = await sbClient.auth.getSession();
    if (!session || !session.user) {
      window.location.href = 'index.html';
      return;
    }
    currentUser = session.user;

    // 3. TẢI SONG SONG TẤT CẢ DỮ LIỆU CÙNG 1 LÚC
    try {
      await Promise.all([
          // 🚀 TÁC VỤ 1 CẬP NHẬT: Lấy Profile & Hiển thị tên ở CẢ Welcome lẫn Dropdown Menu
          sbClient.from('profiles').select('full_name, avatar_url').eq('id', currentUser.id).maybeSingle()
          .then(({ data: profile }) => {
              // Lấy tên ưu tiên: Profile -> User Metadata -> Tên Email -> "Người dùng"
              const displayName = profile?.full_name
              || currentUser.user_metadata?.full_name
              || currentUser.email?.split('@')[0]
              || 'Người dùng';

              // 1. Cập nhật dòng chào "👋 Chào, Tên"
              const welcomeElem = document.getElementById('welcomeUser');
              if (welcomeElem) welcomeElem.innerHTML = `<i class="bi bi-emoji-smile"></i> Chào, ${String(displayName).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';')}`;

              // 2. Cập nhật tên ở Dropdown Menu
              const dropdownNameElem = document.getElementById('dropdownUserName');
              if (dropdownNameElem) dropdownNameElem.innerText = displayName;

              // 3. Cập nhật ảnh đại diện ở nút Avatar trên thanh Header (nếu người dùng đã đổi ảnh)
              const headerIcon = document.getElementById('headerAvatarIcon');
              const headerImg = document.getElementById('headerAvatarImg');
              if (profile?.avatar_url) {
                if (headerImg) { headerImg.src = profile.avatar_url; headerImg.classList.remove('hidden'); }
                if (headerIcon) headerIcon.classList.add('hidden');
              } else {
                if (headerImg) { headerImg.classList.add('hidden'); headerImg.src = ''; }
                if (headerIcon) headerIcon.classList.remove('hidden');
              }
          }),

          // Tác vụ 2: Tải Tin tức
          typeof loadNews === 'function' ? loadNews() : Promise.resolve(),

          // Tác vụ 2b: Tải Bài học (post) cho Lịch + Dải slider
          typeof loadPosts === 'function' ? loadPosts() : Promise.resolve(),

          // Tác vụ LML: 3 tài liệu mới nhất
          typeof loadLmlRecent === 'function' ? loadLmlRecent() : Promise.resolve(),

          // Tác vụ 3: Tải Bài thi
          typeof loadExams === 'function' ? loadExams() : Promise.resolve(),

          // Tác vụ 4: Tải Lịch sử làm bài cá nhân
          typeof loadStudentHistory === 'function' ? loadStudentHistory() : Promise.resolve(),

          // Tác vụ 5: Khởi tạo Phòng đấu đang chạy
          typeof initActiveRoomWidget === 'function' ? initActiveRoomWidget() : Promise.resolve(),

          // Tác vụ 6: Tải Lịch sử các phòng đấu cũ
          typeof loadRoomHistory === 'function' ? loadRoomHistory(1) : Promise.resolve()
      ]);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu Dashboard:", error);
    } finally {
      // 4. Vẽ Lịch & Chấm đỏ
      if (typeof renderCalendar === 'function') renderCalendar();
      if (typeof updateSelectedDateDetails === 'function') updateSelectedDateDetails();
    }

    if (!sessionStorage.getItem('hasShownNewUpdateToast')) {
      checkNewUpdatesInLast3Days();
      sessionStorage.setItem('hasShownNewUpdateToast', 'true');
    }
  }
  // Biến toàn cục lưu trữ danh sách tin tức để Pop-up đọc dữ liệu
  let globalNewsList = [];
  let currentNewsPage = 1;
  const NEWS_PER_PAGE = 3;


  // =========================================================================
  // BÀI HỌC (POST): dữ liệu dùng chung cho Lịch + Dải slider
  // =========================================================================
  let globalPostsList = [];
  let postSlideIdx = 0, postSlideCount = 0, postPausedUntil = 0, postSlideTimer = null;
  const POSTS_PER_SLIDE = 2;      // 2 bài dọc / 1 slide
  const POST_MAX_SLIDES = 5;      // tối đa 5 slide (10 bài mới nhất)
  const POST_AUTO_MS = 5000;      // tự chuyển mỗi 5 giây

  const escPost = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
  const postLink = p => 'post.html?token=' + encodeURIComponent(p.token);
  function localDateStr(d) {
    const x = new Date(d);
    return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  }
  function postThumb(p, cls) {
    return p.thumbnail_url
      ? `<img src="${escPost(p.thumbnail_url)}" alt="${escPost(p.title)}" loading="lazy" class="${cls} object-cover">`
      : `<div class="${cls} bg-gradient-to-br from-red-500 to-[#cf1717] flex items-center justify-center text-white text-2xl"><i class="bi bi-journal-richtext"></i></div>`;
  }

  async function loadPosts() {
    try {
      const { data, error } = await sbClient.from('posts')
        .select('id,title,token,thumbnail_url,excerpt,created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      globalPostsList = data || [];
    } catch (e) {
      console.error('Lỗi tải bài học:', e);
      globalPostsList = [];
    }
    renderPostSlider();
  }

  function postCardHtml(p, i) {
    return `
      <a href="${postLink(p)}" style="animation-delay:${i * 80}ms"
         class="post-card-anim group flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/60 hover:border-[#cf1717] hover:bg-white dark:hover:bg-zinc-800 hover:shadow-lg transition-all duration-300">
        <div class="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl overflow-hidden shadow-md ring-2 ring-white dark:ring-zinc-700">
          ${postThumb(p, 'w-full h-full group-hover:scale-110 transition duration-500')}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] font-extrabold uppercase text-[#cf1717] bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-md">Bài học</span>
            <span class="text-[11px] text-gray-400"><i class="bi bi-calendar3"></i> ${new Date(p.created_at).toLocaleDateString('vi-VN')}</span>
          </div>
          <h4 class="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white line-clamp-1 group-hover:text-[#cf1717] transition-colors">${escPost(p.title)}</h4>
          <p class="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">${escPost(p.excerpt)} <span class="text-[#cf1717] font-bold whitespace-nowrap">đọc thêm <i class="bi bi-arrow-right"></i></span></p>
        </div>
      </a>`;
  }

  function renderPostSlider() {
    const wrap = document.getElementById('postSliderWrap');
    const track = document.getElementById('postSlider');
    const dots = document.getElementById('postDots');
    if (!wrap || !track || !dots) return;

    const posts = (globalPostsList || []).slice(0, POSTS_PER_SLIDE * POST_MAX_SLIDES);
    if (!posts.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');

    const slides = [];
    for (let i = 0; i < posts.length; i += POSTS_PER_SLIDE) slides.push(posts.slice(i, i + POSTS_PER_SLIDE));
    postSlideCount = slides.length;
    postSlideIdx = 0;

    track.innerHTML = slides.map(group => `
      <div class="snap-start shrink-0 w-full space-y-3 px-0.5 py-1">
        ${group.map((p, i) => postCardHtml(p, i)).join('')}
      </div>`).join('');
    track.scrollLeft = 0;

    // Chỉ hiện dấu chấm khi có từ 2 slide trở lên
    dots.innerHTML = postSlideCount > 1
      ? slides.map((_, i) => `<button type="button" onclick="goToPostSlide(${i}, true)" aria-label="Slide ${i+1}" class="post-dot"></button>`).join('')
      : '';
    document.querySelectorAll('#postSliderWrap button[aria-label="Trước"], #postSliderWrap button[aria-label="Sau"]')
      .forEach(b => b.style.display = postSlideCount > 1 ? '' : 'none');
    updatePostDots();

    if (!track.dataset.bound) {
      track.dataset.bound = '1';
      // Người dùng vuốt tay / lăn chuột -> đồng bộ dấu chấm
      let t;
      track.addEventListener('scroll', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          const w = track.clientWidth || 1;
          postSlideIdx = Math.max(0, Math.min(postSlideCount - 1, Math.round(track.scrollLeft / w)));
          updatePostDots();
        }, 60);
      }, { passive: true });
      // Người dùng đang tương tác -> tạm dừng tự chuyển
      const pause = () => { postPausedUntil = Date.now() + 8000; };
      ['pointerdown', 'touchstart', 'wheel', 'mouseenter', 'focusin'].forEach(ev => track.addEventListener(ev, pause, { passive: true }));
      track.addEventListener('mouseleave', () => { postPausedUntil = Date.now() + 1500; });
      window.addEventListener('resize', () => { track.style.scrollBehavior = 'auto'; track.scrollLeft = postSlideIdx * track.clientWidth; track.style.scrollBehavior = ''; });
    }

    clearInterval(postSlideTimer);
    if (postSlideCount > 1) {
      postSlideTimer = setInterval(() => {
        if (document.hidden || Date.now() < postPausedUntil) return;
        goToPostSlide((postSlideIdx + 1) % postSlideCount);
      }, POST_AUTO_MS);
    }
  }

  function updatePostDots() {
    document.querySelectorAll('#postDots .post-dot').forEach((d, i) => {
      const active = i === postSlideIdx;
      d.style.width = active ? '24px' : '8px';
      d.style.background = active ? '#cf1717' : '';
      d.classList.toggle('bg-gray-300', !active);
      d.classList.toggle('dark:bg-zinc-600', !active);
    });
  }

  function goToPostSlide(i, byUser) {
    const track = document.getElementById('postSlider');
    if (!track || !postSlideCount) return;
    if (byUser) postPausedUntil = Date.now() + 8000;
    postSlideIdx = (i + postSlideCount) % postSlideCount;
    track.scrollTo({ left: postSlideIdx * track.clientWidth, behavior: 'smooth' });
    updatePostDots();
  }
  function postSliderStep(dir) { goToPostSlide(postSlideIdx + dir, true); }

  // --- 1. QUẢN LÝ TIN TỨC & THÔNG BÁO ---
  async function loadNews() {
    const newsBox = document.getElementById('newsContainer');
    if (!newsBox) return;

    const { data: newsList } = await sbClient.from('news').select('*').order('created_at', { ascending: false });

    if (!newsList || newsList.length === 0) {
      newsBox.innerHTML = `<div class="col-span-full bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-6 text-center text-gray-400 text-xs sm:text-sm">Chưa có thông báo nào.</div>`;
      if (document.getElementById('newsPagination')) document.getElementById('newsPagination').innerHTML = '';
      return;
    }

    globalNewsList = newsList;
    currentNewsPage = 1;
    renderNewsPage();
  }

  function renderNewsPage() {
    const newsBox = document.getElementById('newsContainer');
    const pagBox = document.getElementById('newsPagination');
    if (!newsBox) return;

    const start = (currentNewsPage - 1) * NEWS_PER_PAGE;
    const paginatedItems = globalNewsList.slice(start, start + NEWS_PER_PAGE);

    newsBox.innerHTML = paginatedItems.map(item => `
    <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between p-4 sm:p-5 space-y-3">
      <div>
        ${item.image_url ? `<img src="${item.image_url}" class="h-32 sm:h-44 w-full object-cover rounded-lg sm:rounded-xl mb-3">` : ''}
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase text-[#cf1717] bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded">${new Date(item.created_at).toLocaleDateString('vi-VN')}</span>
          <h3 class="font-bold text-sm sm:text-base text-gray-900 dark:text-white mt-1 line-clamp-1">${item.title}</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed line-clamp-2">${getTextPreview(item.content)}</p>
        </div>
      </div>

      <div class="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
        <span class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">ReadUp News</span>
        <button onclick="openNewsModal('${item.id}')" class="inline-flex items-center gap-1.5 text-xs font-bold text-[#cf1717] hover:text-red-700 dark:text-red-400 group transition-colors">
          <span>Đọc tiếp</span>
          <div class="w-6 h-6 rounded-full bg-red-50 dark:bg-red-950/60 flex items-center justify-center group-hover:bg-[#cf1717] group-hover:text-white transition-all">
            <i class="bi bi-arrow-right text-xs inline-block transform group-hover:translate-x-0.5 transition-transform"></i>
          </div>
        </button>
      </div>
    </div>
  `).join('');

    const totalPages = Math.ceil(globalNewsList.length / NEWS_PER_PAGE);
    renderPaginationControls(pagBox, currentNewsPage, totalPages, 'changeNewsPage');
  }

  function changeNewsPage(page) {
    currentNewsPage = page;
    renderNewsPage();
  }

  let globalTestsList = []; // Biến toàn cục lưu trữ danh sách bài thi
  let currentExamPage = 1;
  const EXAMS_PER_PAGE = 6;

  // --- 2. QUẢN LÝ DANH SÁCH BÀI THI ---
  // ===== LML: hiển thị 3 bài mới nhất (ai cũng xem được) =====
  async function loadLmlRecent() {
    const box = document.getElementById('lmlRecent'); if (!box) return;
    try {
      const { data, error } = await sbClient.from('lml_materials')
        .select('title, token, description, created_at, lml_topics(name)')
        .eq('is_published', true).order('created_at', { ascending: false }).limit(3);
      if (error) throw error;
      if (!data || !data.length) { box.innerHTML = '<p class="text-gray-500 text-xs sm:text-sm col-span-full">Chưa có tài liệu nào.</p>'; return; }
      box.innerHTML = data.map(m => `
        <a href="lml.html?token=${encodeURIComponent(m.token)}" class="group block bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-[#cf1717]/50 transition">
          <span class="text-[10px] font-bold px-2 py-0.5 bg-red-100 dark:bg-red-950 text-[#cf1717] rounded-full">${escapeHtml(m.lml_topics?.name || 'LML')}</span>
          <h3 class="mt-2 font-extrabold text-sm text-gray-900 dark:text-white group-hover:text-[#cf1717] line-clamp-2">${escapeHtml(m.title)}</h3>
          <p class="mt-1 text-xs text-gray-500 line-clamp-2">${escapeHtml(m.description || '')}</p>
          <div class="mt-3 text-[11px] text-gray-400 flex items-center justify-between"><span>${new Date(m.created_at).toLocaleDateString('vi-VN')}</span><span class="font-bold text-[#cf1717]">Làm bài <i class="bi bi-arrow-right"></i></span></div>
        </a>`).join('');
    } catch (e) {
      box.innerHTML = '<p class="text-gray-500 text-xs sm:text-sm col-span-full">Không tải được tài liệu LML.</p>';
    }
  }

  async function loadExams() {
    const examBox = document.getElementById('examsContainer');
    const { data: examList } = await sbClient.from('exams').select('*').order('created_at', { ascending: false });

    if (!examList || examList.length === 0) {
      examBox.innerHTML = `<div class="col-span-full bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-6 text-center text-gray-400 text-xs sm:text-sm">Chưa có bài thi nào.</div>`;
      const countElem = document.getElementById('examCount');
      if (countElem) countElem.innerText = '0 bài làm';
      if (document.getElementById('examsPagination')) document.getElementById('examsPagination').innerHTML = '';
      return;
    }

    globalTestsList = examList;
    const countElem = document.getElementById('examCount');
    if (countElem) countElem.innerText = `${examList.length} bài làm`;

    currentExamPage = 1;
    renderExamsPage();
  }

  function renderExamsPage() {
    const examBox = document.getElementById('examsContainer');
    const pagBox = document.getElementById('examsPagination');
    if (!examBox) return;

    const start = (currentExamPage - 1) * EXAMS_PER_PAGE;
    const paginatedItems = globalTestsList.slice(start, start + EXAMS_PER_PAGE);

    examBox.innerHTML = paginatedItems.map(exam => {
        const hasVocab = exam.vocabulary &&
        exam.vocabulary !== '[]' &&
        (Array.isArray(exam.vocabulary) ? exam.vocabulary.length > 0 : true);

        return `
      <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between">
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold text-[#cf1717] bg-red-50 dark:bg-red-950/80 px-2.5 py-1 rounded-full"><i class="bi bi-pin-angle-fill"></i> ${exam.topic || 'General'}</span>
            <span class="text-xs text-gray-400"><i class="bi bi-stopwatch"></i> ${exam.time_limit || 60} phút</span>
          </div>
          <h3 class="font-bold text-base sm:text-lg text-gray-900 dark:text-white">${exam.title}</h3>
          <p class="text-xs text-gray-500 line-clamp-2">${exam.notes || 'Không có ghi chú'}</p>
        </div>

        <div class="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] text-gray-400"><i class="bi bi-calendar-event"></i> ${new Date(exam.created_at).toLocaleDateString('vi-VN')}</span>
            ${hasVocab ? `
        <button onclick="openVocabModal('${exam.id}')" class="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-950/60 text-[#cf1717] dark:text-red-400 hover:bg-[#cf1717] hover:text-white rounded-lg text-xs font-bold transition-all shadow-sm">
        <span>Vocabulary</span>
        </button>
        ` : ''}
          </div>

          <button onclick="window.location.href='exam.html?token=${exam.token}'" class="px-3 sm:px-4 py-2 bg-[#cf1717] hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow transition whitespace-nowrap">
            Vào làm bài <i class="bi bi-arrow-right"></i>
          </button>
        </div>
      </div>
    `;
    }).join('');

    const totalPages = Math.ceil(globalTestsList.length / EXAMS_PER_PAGE);
    renderPaginationControls(pagBox, currentExamPage, totalPages, 'changeExamPage');
  }

  function changeExamPage(page) {
    currentExamPage = page;
    renderExamsPage();
  }

  // --- 3. QUẢN LÝ LỊCH SỬ KẾT QUẢ (FIX CHUẨN DARK MODE ITEM) ---
  async function loadStudentHistory() {
    const historyContainer = document.getElementById('historyList');
    if (!historyContainer) return;

    if (!currentUser) {
      historyContainer.innerHTML = "<p class='text-red-500 text-sm'>Vui lòng đăng nhập để xem lịch sử.</p>";
      return;
    }

    const { data: results, error } = await sbClient
    .from('exam_results')
    .select(`
      id,
      score,
      answers,
      submitted_at,
      exams ( title, token )
    `)
    .eq('user_id', currentUser.id)
    .order('submitted_at', { ascending: false });

    if (error) {
      console.error("Lỗi lấy lịch sử:", error);
      historyContainer.innerHTML = "<p class='text-red-500 text-sm'>Không thể tải lịch sử làm bài.</p>";
      return;
    }

    if (!results || results.length === 0) {
      historyContainer.innerHTML = "<p class='text-gray-400 text-sm'>Bạn chưa thực hiện bài thi nào.</p>";
      if (document.getElementById('historyPagination')) document.getElementById('historyPagination').innerHTML = '';
      return;
    }

    globalHistoryList = results;
    currentHistoryPage = 1;
    renderHistoryPage();
  }

  function renderHistoryPage() {
    const historyContainer = document.getElementById('historyList');
    const pagBox = document.getElementById('historyPagination');
    if (!historyContainer) return;

    const start = (currentHistoryPage - 1) * HISTORY_PER_PAGE;
    const paginatedItems = globalHistoryList.slice(start, start + HISTORY_PER_PAGE);

    // Đã bổ sung đầy đủ class dark:bg-zinc-800/80, dark:border-zinc-700/60, dark:text-white để fix lỗi khớp nền sáng/tối
    historyContainer.innerHTML = paginatedItems.map(item => {
        const date = new Date(item.submitted_at).toLocaleString('vi-VN');
        const totalAns = item.answers ? Object.keys(item.answers).length : 0;
        const examTitle = item.exams?.title || 'Bài thi Tiếng Anh';
        const examToken = item.exams?.token || '';

        return `
      <div class="p-4 bg-gray-50 dark:bg-zinc-800/70 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700/60 mb-3 flex justify-between items-center transition-all">
        <div>
          <h4 class="font-bold text-gray-800 dark:text-gray-100 text-base">${escapeHtml(examTitle)}</h4>
          <p class="text-xs text-gray-400 dark:text-gray-400 mt-1"><i class="bi bi-clock"></i> Nộp lúc: ${date}</p>
        </div>
        <div class="text-right">
          <span class="text-lg font-extrabold text-[#cf1717] dark:text-red-400">${item.score} / 10 điểm</span>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Số câu đã làm: ${totalAns}</p>
          ${examToken ? `<button onclick="window.location.href='exam.html?token=${encodeURIComponent(examToken)}&result_id=${encodeURIComponent(item.id)}'" class="mt-1.5 text-[10px] font-bold text-white bg-[#cf1717] hover:bg-red-700 px-2.5 py-1 rounded-lg transition"><i class="bi bi-pencil-square"></i> Xem đáp án</button>` : ''}
        </div>
      </div>
    `;
    }).join('');

    const totalPages = Math.ceil(globalHistoryList.length / HISTORY_PER_PAGE);
    renderPaginationControls(pagBox, currentHistoryPage, totalPages, 'changeHistoryPage');
  }

  function changeHistoryPage(page) {
    currentHistoryPage = page;
    renderHistoryPage();
  }

  // --- 4. HÀM BỔ TRỢ TẠO NÚT BẤM CHUYỂN TRANG (1, 2, 3... - TRƯỚC / SAU) ---
  function renderPaginationControls(container, currentPage, totalPages, callbackFuncName) {
    if (!container) return;
    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = `
    <button onclick="${callbackFuncName}(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}
      class="px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
        currentPage === 1
          ? 'opacity-30 cursor-not-allowed border-gray-200 dark:border-zinc-800 text-gray-400'
          : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700'
      }">
      ‹
    </button>
  `;

    for (let i = 1; i <= totalPages; i++) {
      const isActive = i === currentPage;
      html += `
      <button onclick="${callbackFuncName}(${i})"
        class="w-7 h-7 rounded-lg text-xs font-black transition ${
          isActive
            ? 'bg-[#cf1717] text-white shadow-sm'
            : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
        }">
        ${i}
      </button>
    `;
    }

    html += `
    <button onclick="${callbackFuncName}(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}
      class="px-2.5 py-1 rounded-lg border text-xs font-bold transition ${
        currentPage === totalPages
          ? 'opacity-30 cursor-not-allowed border-gray-200 dark:border-zinc-800 text-gray-400'
          : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700'
      }">
      ›
    </button>
  `;

    container.innerHTML = html;
  }

  let globalHistoryList = [];
  let currentHistoryPage = 1;
  const HISTORY_PER_PAGE = 3;

  function toggleDarkMode() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    }
  }

  // 1. Bật/Tắt Modal Đổi mật khẩu
  function togglePasswordModal(show) {
    const modal = document.getElementById('passwordModal');
    if (!modal) return;
    if (show) {
      modal.classList.remove('hidden');
      const input = document.getElementById('newPasswordInput');
      if (input) input.value = '';
    } else {
      modal.classList.add('hidden');
    }
  }

  // 2. Bật/Tắt hiển thị ký tự (Icon con mắt)
  function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon = btn.querySelector('i');
    if (!input || !icon) return;

    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'bi bi-eye-slash text-lg leading-none';
    } else {
      input.type = 'password';
      icon.className = 'bi bi-eye text-lg leading-none';
    }
  }

  // 3. Cập nhật mật khẩu mới lên Supabase
  async function handleUpdatePassword() {
    const input = document.getElementById('newPasswordInput');
    const newPassword = input ? input.value.trim() : '';

    if (!newPassword || newPassword.length < 6) {
      notify("Vui lòng nhập mật khẩu mới tối thiểu 6 ký tự!");
      return;
    }

    const { data, error } = await sbClient.auth.updateUser({
        password: newPassword
    });

    if (error) {
      notify("[error] Đổi mật khẩu thất bại: " + error.message);
    } else {
      notify("[celebrate] Đổi mật khẩu thành công!");
      togglePasswordModal(false);
    }
  }

  async function handleLogout() {
    sessionStorage.removeItem('hasShownNewUpdateToast');
    await sbClient.auth.signOut();
    window.location.href = 'index.html';
  }

  window.onload = initDashboard;

  // Hàm mở Pop-up hiển thị đầy đủ tin tức
  function openNewsModal(newsId) {
    const item = globalNewsList.find(n => n.id == newsId);
    if (!item) return;

    const date = new Date(item.created_at).toLocaleDateString('vi-VN');
    const imageHtml = item.image_url
    ? `<img src="${item.image_url}" class="w-full max-h-72 object-cover rounded-xl mb-4" alt="News Image">`
    : '';

    const parsedHtml = parseAndRenderContent(item.content);

    document.getElementById('modalNewsContent').innerHTML = `
    ${imageHtml}
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] font-bold uppercase text-[#cf1717] bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded">${date}</span>
      <span class="text-xs text-gray-400">• ReadUp Official</span>
    </div>
    <h3 class="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white mb-4">${item.title}</h3>
    <div class="text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300">
      ${parsedHtml}
    </div>
  `;

    document.getElementById('newsModal').classList.remove('hidden');
  }

  // Hàm đóng Pop-up
  function closeNewsModal() {
    document.getElementById('newsModal').classList.add('hidden');
  }

  // Hàm phân tích thông minh: hỗ trợ cả Văn bản thường và JSON
  function parseAndRenderContent(rawContent) {
    if (!rawContent) return '';

    try {
      const jsonObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;

      // Dạng JSON mảng: ["Đoạn 1", "Đoạn 2"]
      if (Array.isArray(jsonObj)) {
        return jsonObj.map(p => `<p class="mb-3">${p}</p>`).join('');
      }

      // Dạng JSON object: { intro: "...", list: ["..."], note: "..." }
      if (typeof jsonObj === 'object' && jsonObj !== null) {
        let html = '';
        if (jsonObj.intro) html += `<p class="mb-3 font-medium text-gray-800 dark:text-gray-200">${jsonObj.intro}</p>`;
        if (jsonObj.list && Array.isArray(jsonObj.list)) {
          html += `<ul class="list-disc pl-5 space-y-1.5 mb-3">`;
          jsonObj.list.forEach(li => html += `<li>${li}</li>`);
          html += `</ul>`;
        }
        if (jsonObj.link) { html += ` <div class="my-4"> <a href="${jsonObj.link}" target="_blank" rel="noopener noreferrer"  class="inline-flex items-center gap-1.5 font-semibold text-[#cf1717] dark:text-red-400 underline underline-offset-4 hover:text-red-700 dark:hover:text-red-300 active:text-red-900 dark:active:text-red-500 transition-colors">
        ${jsonObj.linkText || '<i class="bi bi-link-45deg"></i> Mở liên kết'} <i class="bi bi-arrow-right"></i> </a> </div> `;}
        if (jsonObj.note) html += `<p class="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-[#cf1717] rounded-r-lg text-xs italic text-[#cf1717] dark:text-red-300">${jsonObj.note}</p>`;
        return html;
      }
    } catch (e) {
      // Không phải JSON -> Xử lý chuỗi văn bản thường
    }

    return `<div class="whitespace-pre-line">${rawContent}</div>`;
  }

  // Hàm lấy chữ ngắn xem trước trên Card
  function getTextPreview(rawContent) {
    if (!rawContent) return '';
    try {
      const jsonObj = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
      if (Array.isArray(jsonObj)) return jsonObj[0] || '';
      if (typeof jsonObj === 'object') return jsonObj.intro || jsonObj.list?.[0] || '';
    } catch (e) {}
    return rawContent;
  }

  function openVocabModal(testId) {
    const test = globalTestsList.find(t => t.id == testId);
    if (!test || !test.vocabulary) return;

    let vocabArray = typeof test.vocabulary === 'string' ? JSON.parse(test.vocabulary) : test.vocabulary;

    const container = document.getElementById('vocabListContent');
    if (!container) return;

    container.innerHTML = vocabArray.map(v => `
    <div class="p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-2xl border border-gray-100 dark:border-zinc-700/50 space-y-2">
      <!-- Từ vựng + Phát âm + Từ loại -->
      <div class="flex items-baseline gap-2">
        <span class="font-bold text-sm sm:text-base text-gray-900 dark:text-white">${v.word || ''}</span>
        <span class="text-xs text-red-600 dark:text-red-400 font-medium">${v.ipa || ''}</span>
        <span class="text-[10px] text-gray-400 italic">(${v.type || 'Word'})</span>
      </div>

      <!-- Nghĩa tiếng Việt -->
      <p class="text-xs text-gray-800 dark:text-gray-200 font-bold">🇻🇳 ${v.meaning || ''}</p>

      <!-- Meaning in context (Nếu có mới hiện) -->
      ${v.context ? `
      <div class="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-700/80 leading-relaxed">
      <span class="font-bold text-gray-400 dark:text-gray-500 block text-[10px] uppercase mb-0.5">Meaning in context</span>
      <span>${v.context}</span>
      </div>
      ` : ''}

      <!-- Useful Collocation (Nếu có mới hiện) -->
      ${v.collocation ? `
      <div class="text-xs text-red-700 dark:text-red-300 font-medium bg-red-50/60 dark:bg-red-950/40 p-2 rounded-lg border border-red-100 dark:border-red-900/40 flex items-start gap-1.5">
      <span><i class="bi bi-pin-angle-fill"></i></span>
      <div>
      <strong class="font-bold">Collocation:</strong> ${v.collocation}
      </div>
      </div>
      ` : ''}
    </div>
  `).join('');

    document.getElementById('vocabModal')?.classList.remove('hidden');
  }

  function closeVocabModal() {
    document.getElementById('vocabModal')?.classList.add('hidden');
  }

  function renderRoomMembersList(membersList, hostUserId) {
    const container = document.getElementById('roomMembersListContainer');
    if (!container) return;

    container.innerHTML = membersList.map(member => {
        const isHost = member.user_id === hostUserId;

        return `
      <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700/60 mb-2">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 text-[#cf1717] font-black flex items-center justify-center text-xs">
            ${member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span class="font-bold text-xs text-gray-800 dark:text-gray-100">
            ${member.full_name || 'Học sinh'}
          </span>
        </div>

        <!-- HIỂN THỊ BADGE HOST -->
        ${isHost
          ? `<span class="px-2.5 py-0.5 text-[10px] font-black bg-amber-500 text-white rounded-full shadow-sm flex items-center gap-1">
        <i class="bi bi-award-fill"></i> Chủ phòng (Host)
        </span>`
          : `<span class="px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-200 dark:bg-zinc-700 rounded-full">
        Thành viên
        </span>`
        }
      </div>
    `;
    }).join('');
  }

