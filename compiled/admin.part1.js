/* Source: assets/js/pages/admin.01.js */
// BẮT BUỘC: Bảo Tailwind lắng nghe class "dark" ở thẻ <html> 
    tailwind.config = {
    darkMode: 'class',
    theme: { extend: { fontFamily: {
      sans: ['Montserrat', 'sans-serif'],
      serif: ['Montserrat', 'sans-serif'],
      mono: ['Montserrat', 'sans-serif']
    } } }}

;
/* Source: assets/js/pages/admin.02.js */

  // ===== PHÂN TRANG DÙNG CHUNG: « ‹ 1 2 3 › » =====
  const RU_PAGERS = {};
  function ruPaginate(key, listId, items, perPage, renderItem, emptyHtml) {
    const list = document.getElementById(listId);
    if (!list) return;
    const st = RU_PAGERS[key] || (RU_PAGERS[key] = { page: 1 });
    Object.assign(st, { listId, items: items || [], perPage, renderItem, emptyHtml: emptyHtml || '' });
    ruPageRender(key);
  }
  function ruPageRender(key) {
    const st = RU_PAGERS[key]; if (!st) return;
    const list = document.getElementById(st.listId); if (!list) return;
    const total = st.items.length;
    const pages = Math.max(1, Math.ceil(total / st.perPage));
    st.page = Math.min(Math.max(1, st.page), pages);
    const slice = st.items.slice((st.page - 1) * st.perPage, st.page * st.perPage);
    list.innerHTML = slice.length ? slice.map(st.renderItem).join('') : st.emptyHtml;

    // Thanh số trang (tự tạo ngay sau danh sách)
    const pagerId = st.listId + 'Pager';
    let pager = document.getElementById(pagerId);
    if (!pager) {
      pager = document.createElement('div');
      pager.id = pagerId;
      const anchor = list.tagName === 'TBODY' ? (list.closest('div.overflow-x-auto') || list.closest('table')) : list;
      anchor.parentNode.insertBefore(pager, anchor.nextSibling);
    }
    pager.className = 'flex items-center justify-center flex-wrap gap-1.5 pt-2';
    const base = 'w-7 h-7 rounded-lg text-xs font-extrabold flex items-center justify-center transition select-none';
    const idle = 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 hover:border-[#cf1717] hover:text-[#cf1717]';
    const off = 'text-gray-300 dark:text-zinc-600 cursor-default';
    let start = Math.max(1, st.page - 2), end = Math.min(pages, start + 4);
    start = Math.max(1, end - 4);
    let html = '';
    html += st.page > 1
      ? `<button type="button" onclick="ruGoPage('${key}',${st.page - 1})" class="${base} ${idle}" aria-label="Trang trước"><i class="bi bi-chevron-left"></i></button>`
      : `<span class="${base} ${off}"><i class="bi bi-chevron-left"></i></span>`;
    for (let p = start; p <= end; p++) {
      html += p === st.page
        ? `<span class="${base} bg-[#cf1717] text-white shadow shadow-red-500/30">${p}</span>`
        : `<button type="button" onclick="ruGoPage('${key}',${p})" class="${base} ${idle}">${p}</button>`;
    }
    html += st.page < pages
      ? `<button type="button" onclick="ruGoPage('${key}',${st.page + 1})" class="${base} ${idle}" aria-label="Trang sau"><i class="bi bi-chevron-right"></i></button>`
      : `<span class="${base} ${off}"><i class="bi bi-chevron-right"></i></span>`;
    pager.innerHTML = html;
  }
  function ruGoPage(key, p) { RU_PAGERS[key].page = p; ruPageRender(key); }
  