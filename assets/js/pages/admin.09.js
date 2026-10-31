
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
  if (!ex) return alert('Không tìm thấy bài thi này.');
  const parse = v => { if (typeof v !== 'string') return v; try {return JSON.parse(v);} catch(e){return [];} };
  RUPreview.open({title: ex.title, description:ex.notes, passage_html:ex.passage_html,
    questions:Array.isArray(parse(ex.questions))?parse(ex.questions):[],time_limit:ex.time_limit,is_test:true});
}
// Xem bài thi đang soạn, không phụ thuộc bài đã xuất bản.
function previewDraftExam() {
  let questions;
  try { questions = qbGetData(); } catch(e){return alert('Dữ liệu câu hỏi chưa hợp lệ: '+e.message);}
  RUPreview.open({title:document.getElementById('examTitle').value || 'Bài thi mới',
    description:document.getElementById('examNotes').value,
    passage_html: getPassageHtml(),questions,time_limit:document.getElementById('examTime').value,is_test:true});
}
