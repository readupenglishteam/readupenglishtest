/* Source: assets/js/pages/preview.01.js */

    window.onload = function() {
      const rawData = sessionStorage.getItem('preview_data');
      if (!rawData) {
        document.getElementById('previewContainer').innerHTML = `<p class="text-red-500 text-center">Không tìm thấy dữ liệu xem thử!</p>`;
        return;
      }

      const { type, payload } = JSON.parse(rawData);
      const container = document.getElementById('previewContainer');

      if (type === 'announcement') {
        renderAnnouncementPreview(container, payload);
      } else if (type === 'exam') {
        renderExamPreview(container, payload);
      }
    };

    // Dựng giao diện Thông báo
    // Dựng giao diện Thông báo (Tối ưu Dark Mode & HTML)
function renderAnnouncementPreview(container, data) {
  container.innerHTML = `
    <div class="border-l-4 border-[#cf1717] bg-red-50/50 dark:bg-red-950/30 p-4 rounded-r-xl space-y-3">
      <span class="text-xs font-bold text-[#cf1717] bg-red-100 dark:bg-red-900/50 dark:text-red-300 px-2 py-0.5 rounded-full inline-block">
        ${data.tag || 'THÔNG BÁO'}
      </span>
      <h3 class="font-bold text-lg sm:text-xl text-gray-900 dark:text-white">
        ${data.title || 'Tiêu đề thông báo'}
      </h3>
      <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed prose dark:prose-invert max-w-none">
        ${data.content || 'Nội dung...'}
      </div>
    </div>`;
}

    // Dựng giao diện Đề thi / Bài đọc (Tối ưu giao diện khung chứa)
function renderExamPreview(container, data) {
  container.innerHTML = `
    <h2 class="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white mb-4">
      ${data.title || 'Đề thi xem thử'}
    </h2>
    <div class="prose dark:prose-invert max-w-none mb-6 p-4 sm:p-6 bg-gray-50 dark:bg-zinc-900/50 border dark:border-zinc-700 rounded-xl">
      ${data.passage_html || '<p class="italic text-gray-400">Nội dung bài đọc chưa được nhập...</p>'}
    </div>
    <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t dark:border-zinc-700 pt-3">
      <span>Số câu hỏi: <strong>${data.questions?.length || 0}</strong> câu</span>
      <span>Thời gian tạo: ${new Date().toLocaleDateString('vi-VN')}</span>
    </div>`;
}
  
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
