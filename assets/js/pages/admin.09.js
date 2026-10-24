
function apEsc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function openAdminPreview(html) {
  const m = document.getElementById('adminPreviewModal');
  document.getElementById('adminPreviewBody').innerHTML = html;
  m.classList.remove('hidden'); m.classList.add('flex'); m.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeAdminPreview() {
  const m = document.getElementById('adminPreviewModal');
  m.classList.add('hidden'); m.classList.remove('flex');
  document.getElementById('adminPreviewBody').innerHTML = '';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = document.getElementById('adminPreviewModal'); if (m && !m.classList.contains('hidden')) closeAdminPreview(); } });

// Hiển thị nội dung y hệt dashboard.html (parseAndRenderContent)
function renderNewsContent(raw) {
  if (!raw) return '';
  try {
    const j = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(j)) return j.map(p => `<p class="mb-3">${p}</p>`).join('');
    if (typeof j === 'object' && j !== null) {
      let h = '';
      if (j.intro) h += `<p class="mb-3 font-medium">${j.intro}</p>`;
      if (Array.isArray(j.list)) h += `<ul class="list-disc pl-5 space-y-1.5 mb-3">${j.list.map(li => `<li>${li}</li>`).join('')}</ul>`;
      if (j.link) h += `<div class="my-4"><a href="${j.link}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 font-semibold text-[#cf1717] underline">${j.linkText || '<i class="bi bi-link-45deg"></i> Mở liên kết'} <i class="bi bi-arrow-right"></i></a></div>`;
      if (j.note) h += `<p class="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border-l-4 border-[#cf1717] rounded-r-lg text-xs italic text-[#cf1717]">${j.note}</p>`;
      return h;
    }
  } catch (e) {}
  return `<div class="whitespace-pre-line">${raw}</div>`;
}
function showNewsPreview(n) {
  openAdminPreview(`
    <div class="space-y-4">
      ${n.image_url ? `<img src="${apEsc(n.image_url)}" class="w-full max-h-80 object-cover rounded-xl border dark:border-zinc-800">` : ''}
      <div>
        <p class="text-xs text-gray-400 mb-1"><i class="bi bi-megaphone-fill text-[#cf1717]"></i> Thông báo · ${n.created_at ? new Date(n.created_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</p>
        <h2 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">${apEsc(n.title) || '(Chưa có tiêu đề)'}</h2>
      </div>
      <div class="text-sm leading-relaxed text-gray-700 dark:text-gray-300">${renderNewsContent(n.content) || '<p class="text-gray-400 italic">Chưa có nội dung.</p>'}</div>
    </div>`);
}
function previewAnnouncement(id) {
  const n = (window.__adminNews || []).find(x => String(x.id) === String(id));
  if (!n) return alert('Không tìm thấy thông báo này, hãy tải lại trang.');
  showNewsPreview(n);
}
function previewNewsDraft() {
  let content = '';
  try { content = getNewsContent(); } catch (err) { return alert('JSON chưa đúng cú pháp: ' + err.message); }
  showNewsPreview({ title: document.getElementById('newsTitle').value, image_url: document.getElementById('newsImageUrl').value, content });
}

function previewExam(token) {
  const ex = allExams.find(e => e.token === token);
  if (!ex) return alert('Không tìm thấy bài thi này, hãy tải lại trang.');
  let qs = ex.questions;
  if (typeof qs === 'string') { try { qs = JSON.parse(qs); } catch (e) { qs = []; } }
  if (!Array.isArray(qs)) qs = [];
  let vocab = ex.vocabulary;
  if (typeof vocab === 'string') { try { vocab = JSON.parse(vocab); } catch (e) { vocab = []; } }
  const vocabCount = Array.isArray(vocab) ? vocab.length : 0;
  const typeName = { mcq: 'Trắc nghiệm 1 đáp án', multi: 'Trắc nghiệm nhiều đáp án', tf: 'Đúng / Sai', fill: 'Điền khuyết', essay: 'Tự luận', text: 'Hướng dẫn' };
  let num = 0;
  const qHtml = qs.map(q => {
    const isText = q.type === 'text';
    if (!isText) num++;
    const head = isText
      ? `<span class="text-[10px] font-bold uppercase text-gray-500"><i class="bi bi-pin-angle-fill"></i> Hướng dẫn</span>`
      : `<div class="flex items-center justify-between gap-2"><span class="font-extrabold text-[#cf1717]">Câu ${num}</span><span class="text-[10px] font-bold text-gray-400">${typeName[q.type] || apEsc(q.type)} · ${q.points != null ? q.points : 1} điểm</span></div>`;
    let body = '';
    if (q.type === 'fill') {
      const content = String(q.content || '').replace(/\{\{(\d+)\}\}/g, '<span class="inline-block min-w-[70px] mx-1 px-2 border-b-2 border-[#cf1717] text-center text-[#cf1717] font-bold text-xs">$1</span>');
      body = `<div class="leading-relaxed">${content}</div>`;
      if (Array.isArray(q.blanks) && q.blanks.length)
        body += `<div class="mt-2 text-xs text-green-700 dark:text-green-400"><b>Đáp án:</b> ${q.blanks.map(b => `(${b.gap}) ${apEsc((b.accepted_answers || []).join(' / '))}`).join(' &nbsp;·&nbsp; ')}</div>`;
    } else if (q.type === 'essay') {
      body = `<div class="leading-relaxed">${q.content || ''}</div><div class="mt-2 h-16 rounded-lg border border-dashed dark:border-zinc-700 text-xs text-gray-400 flex items-center justify-center">Ô trả lời tự luận</div>`;
    } else if (Array.isArray(q.options)) {
      const multi = q.type === 'multi';
      body = `<div class="leading-relaxed">${q.content || ''}</div><div class="mt-2 space-y-1.5">` + q.options.map(o => `
        <div class="flex items-start gap-2 p-2 rounded-lg border text-sm ${o.correct ? 'border-green-400 bg-green-50 dark:bg-green-950/30 dark:border-green-700' : 'dark:border-zinc-700'}">
          <i class="bi ${multi ? (o.correct ? 'bi-check-square-fill' : 'bi-square') : (o.correct ? 'bi-record-circle-fill' : 'bi-circle')} ${o.correct ? 'text-green-600' : 'text-gray-400'} mt-0.5"></i>
          <span>${o.text || ''}</span>
          ${o.correct ? '<span class="ml-auto text-[10px] font-bold text-green-600 shrink-0">Đáp án đúng</span>' : ''}
        </div>`).join('') + '</div>';
    } else {
      body = `<div class="leading-relaxed">${q.content || ''}</div>`;
    }
    if (q.explanation && String(q.explanation).trim())
      body += `<div class="mt-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-xs"><b><i class="bi bi-lightbulb-fill text-amber-500"></i> Giải thích:</b> ${q.explanation}</div>`;
    return `<div class="p-3.5 rounded-xl border dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-800/50 space-y-2">${head}${body}</div>`;
  }).join('') || '<p class="text-gray-400 text-sm italic">Bài thi này chưa có câu hỏi.</p>';

  openAdminPreview(`
    <div class="space-y-5">
      <div>
        <div class="flex flex-wrap items-center gap-2 mb-2">
          ${ex.topic ? `<span class="text-[10px] font-bold text-[#cf1717] bg-red-50 dark:bg-red-950 px-2 py-0.5 rounded-full">${apEsc(ex.topic)}</span>` : ''}
          <span class="text-xs text-gray-500"><i class="bi bi-clock-fill"></i> ${ex.time_limit || 60} phút</span>
          <span class="text-xs text-gray-500"><i class="bi bi-question-circle-fill"></i> ${num} câu hỏi</span>
          ${vocabCount ? `<span class="text-xs text-gray-500"><i class="bi bi-book-fill"></i> ${vocabCount} từ vựng</span>` : ''}
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">${apEsc(ex.title)}</h2>
        <a href="exam.html?token=${encodeURIComponent(ex.token)}" target="_blank" class="inline-block mt-2 text-xs font-bold text-[#cf1717] hover:underline"><i class="bi bi-box-arrow-up-right"></i> Mở trang làm bài thật (exam.html) — lưu ý: nộp bài sẽ tính là kết quả của tài khoản đang đăng nhập</a>
      </div>
      ${ex.notes ? `<div class="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-xs whitespace-pre-line"><b><i class="bi bi-info-circle-fill"></i> Ghi chú:</b> ${apEsc(ex.notes)}</div>` : ''}
      <div>
        <h3 class="font-extrabold text-sm mb-2 text-gray-900 dark:text-white"><i class="bi bi-file-text-fill text-[#cf1717]"></i> Đoạn văn Reading</h3>
        <div class="post-content p-4 rounded-xl border dark:border-zinc-800 leading-relaxed overflow-x-auto">${ex.passage_html || '<p class="text-gray-400 italic">Chưa có đoạn văn.</p>'}</div>
      </div>
      <div>
        <h3 class="font-extrabold text-sm mb-2 text-gray-900 dark:text-white"><i class="bi bi-list-check text-[#cf1717]"></i> Câu hỏi <span class="text-[10px] font-normal text-gray-400">(đáp án đúng được tô xanh — chỉ admin thấy)</span></h3>
        <div class="space-y-3">${qHtml}</div>
      </div>
    </div>`);
}
