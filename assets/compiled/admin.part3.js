/* Source: assets/js/pages/admin.06.js */

let allPosts = [], postMode = 'word', _sel = null;
const pEsc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';
const ed = () => document.getElementById('postEditor');
const pel = id => document.getElementById(id);

/* ---------- THANH CÔNG CỤ KIỂU WORD ---------- */
function initPostEditor() {
  const B = [['bold','<b>B</b>','In đậm'],['italic','<i>I</i>','In nghiêng'],['underline','<u>U</u>','Gạch chân'],
    ['insertUnorderedList','<i class="bi bi-list-ul"></i> Danh sách','Danh sách chấm'],['insertOrderedList','<i class="bi bi-list-ol"></i> Danh sách','Danh sách số'],
    ['justifyLeft','<i class="bi bi-text-left"></i>','Căn trái'],['justifyCenter','<i class="bi bi-text-center"></i>','Căn giữa'],['justifyRight','<i class="bi bi-text-right"></i>','Căn phải'],['justifyFull','<i class="bi bi-justify"></i>','Căn đều hai bên'],['removeFormat','<i class="bi bi-eraser-fill"></i>','Xóa định dạng']];
  const btn = 'px-2 py-1 rounded bg-white dark:bg-zinc-700 border dark:border-zinc-600 hover:bg-red-50 font-bold';
  pel('postToolbar').innerHTML =
    `<select onchange="pcmd('formatBlock',this.value);this.value=''" class="p-1 rounded border dark:bg-zinc-700 dark:border-zinc-600"><option value="">Kiểu chữ</option><option value="<p>">Đoạn văn</option><option value="<h2>">Tiêu đề lớn</option><option value="<h3>">Tiêu đề nhỏ</option><option value="<blockquote>">Trích dẫn</option></select>` +
    B.map(b => `<button type="button" title="${b[2]}" onmousedown="event.preventDefault()" onclick="pcmd('${b[0]}')" class="${btn}">${b[1]}</button>`).join('') +
    `<input type="color" value="#000000" title="Màu chữ" onchange="pcmd('foreColor',this.value)" class="w-7 h-7 p-0 border rounded cursor-pointer">` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="postLink()" class="${btn}"><i class="bi bi-link-45deg"></i> Link</button>` +
    `<label class="${btn} cursor-pointer"><i class="bi bi-camera-fill"></i> Ảnh<input type="file" accept="image/*" class="hidden" onchange="postImage(this)"></label>` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="postTable()" class="${btn}"><i class="bi bi-table"></i> Bảng</button>` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="postVideo()" class="${btn}"><i class="bi bi-youtube"></i> YouTube</button>` +
    `<label class="${btn} cursor-pointer bg-blue-50 text-blue-700"><i class="bi bi-file-earmark-text-fill"></i> Nhập file .docx<input type="file" accept=".docx" class="hidden" onchange="importDocx(this)"></label>`;
  const e = ed();
  e.addEventListener('blur', () => { const s = getSelection(); if (s.rangeCount && e.contains(s.getRangeAt(0).commonAncestorContainer)) _sel = s.getRangeAt(0); });
  e.addEventListener('paste', ev => {
    const h = ev.clipboardData.getData('text/html'); if (!h) return;
    ev.preventDefault(); document.execCommand('insertHTML', false, cleanWordHtml(h));
  });
}
function cleanWordHtml(h) {
  const d = new DOMParser().parseFromString(h, 'text/html');
  d.querySelectorAll('style,meta,link,script,xml').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(n => {
    n.removeAttribute('class');
    const s = (n.getAttribute('style') || '').split(';').filter(x => /^\s*(font-weight|font-style|text-decoration|text-align|color)\s*:/i.test(x)).join(';');
    s ? n.setAttribute('style', s) : n.removeAttribute('style');
  });
  return d.body.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?o:p>/g, '');
}
function pcmd(c, v) { ed().focus(); document.execCommand(c, false, v || null); }
function insertAtCursor(html) {
  if (postMode === 'html') { pel('postHtml').value += '\n' + html; return; }
  ed().focus();
  if (_sel) { const s = getSelection(); s.removeAllRanges(); s.addRange(_sel); }
  document.execCommand('insertHTML', false, html);
}
function postLink() { const u = prompt('Nhập đường dẫn (https://...):'); if (u) { ed().focus(); if (_sel) { const s = getSelection(); s.removeAllRanges(); s.addRange(_sel); } document.execCommand('createLink', false, u); } }
function postTable() {
  const rows = parseInt(prompt('Bảng bao nhiêu HÀNG? (tính cả hàng tiêu đề)', '3'));
  if (!rows) return;
  const cols = parseInt(prompt('Bảng bao nhiêu CỘT?', '3'));
  if (!cols) return;
  const R = Math.min(Math.max(rows, 1), 50), C = Math.min(Math.max(cols, 1), 20);
  const tr = `<tr>${'<td>&nbsp;</td>'.repeat(C)}</tr>`;
  insertAtCursor(`<table><tr>${'<th>Tiêu đề</th>'.repeat(C)}</tr>${tr.repeat(R - 1)}</table><p><br></p>`);
}
function postVideo() {
  const u = prompt('Dán link YouTube:'); if (!u) return;
  const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); if (!m) return alert('Link YouTube không hợp lệ');
  insertAtCursor(`<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${m[1]}" allowfullscreen></iframe></div><p><br></p>`);
}
async function imgbbUpload(fileOrB64) {
  const fd = new FormData(); fd.append('image', fileOrB64);
  const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
  const d = await r.json(); return d.success ? d.data.url : null;
}
async function postImage(inp) {
  const f = inp.files[0]; if (!f) return; const st = pel('postEditorStatus');
  st.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang tải ảnh...';
  const url = await imgbbUpload(f);
  st.innerHTML = url ? '<i class="bi bi-check-circle-fill"></i> Đã chèn ảnh!' : '<i class="bi bi-x-circle-fill"></i> Lỗi upload ảnh!';
  if (url) insertAtCursor(`<img src="${url}" alt="">`); inp.value = '';
}
async function importDocx(inp) {
  const f = inp.files[0]; if (!f) return; const st = pel('postEditorStatus');
  if (typeof mammoth === 'undefined') return alert('Không tải được thư viện đọc Word. Hãy thử dán (Ctrl+V) nội dung trực tiếp.');
  st.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang chuyển Word → HTML (ảnh trong file sẽ được upload)...';
  try {
    const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() }, {
      convertImage: mammoth.images.imgElement(async img => {
        const b64 = await img.read('base64'); const url = await imgbbUpload(b64);
        return { src: url || `data:${img.contentType};base64,${b64}` };
      })
    });
    setPostHtml(res.value); st.innerHTML = '<i class="bi bi-check-circle-fill"></i> Đã nhập file Word thành công!';
  } catch (e) { st.innerHTML = '<i class="bi bi-x-circle-fill"></i> Không đọc được file .docx'; }
  inp.value = '';
}

/* ---------- CHUYỂN CHẾ ĐỘ WORD <-> HTML ---------- */
function getPostHtml() { return (postMode === 'html' ? pel('postHtml').value : ed().innerHTML).trim(); }
function setPostHtml(h) { ed().innerHTML = h; pel('postHtml').value = h; }
function setPostMode(m) {
  if (m === postMode) return;
  if (m === 'html') pel('postHtml').value = ed().innerHTML; else ed().innerHTML = pel('postHtml').value;
  postMode = m;
  pel('postHtml').classList.toggle('hidden', m !== 'html');
  ed().classList.toggle('hidden', m === 'html'); pel('postToolbar').classList.toggle('hidden', m === 'html');
  pel('tabWord').className = 'px-3 py-1.5 font-bold ' + (m === 'word' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
  pel('tabHtml').className = 'px-3 py-1.5 font-bold ' + (m === 'html' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
}

/* ---------- LƯU / SỬA / XÓA ---------- */
function previewToken() { pel('postTokenPreview').innerText = 'post.html?token=' + (pel('postToken').value || createSlug(pel('postTitle').value) || '...'); }
function showThumb() { const u = pel('postThumb').value, i = pel('postThumbPrev'); if (u) { i.src = u; i.classList.remove('hidden'); } else i.classList.add('hidden'); }
async function savePost(e) {
  e.preventDefault();
  const id = pel('editingPostId').value, title = pel('postTitle').value.trim(), html = getPostHtml();
  if (!html || html === '<br>') return alert('Bạn chưa nhập nội dung bài học!');
  let token = pel('postToken').value || createSlug(title);
  if (!id) { // bài mới: tránh trùng token
    const { data: dup } = await sbClient.from('posts').select('id').eq('token', token).maybeSingle();
    if (dup) token += '-' + Math.random().toString(36).slice(2, 6);
  }
  let excerpt = pel('postExcerpt').value.trim();
  if (!excerpt) excerpt = (new DOMParser().parseFromString(html, 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 220);
  const row = { title, token, thumbnail_url: pel('postThumb').value || null, excerpt, content_html: html, is_published: pel('postPublished').checked, updated_at: new Date().toISOString() };
  const { error } = id ? await sbClient.from('posts').update(row).eq('id', id) : await sbClient.from('posts').insert([row]);
  if (error) return alert('Lỗi lưu bài: ' + error.message);
  alert('Đã lưu bài học! Đường dẫn: post.html?token=' + token);
  resetPostForm(); loadAdminPosts();
}
function resetPostForm() {
  ['editingPostId','postToken','postThumb','postTitle','postExcerpt','postHtml','postThumbStatus'].forEach(i => { const x = pel(i); 'value' in x ? x.value = '' : x.innerText = ''; });
  pel('postThumbStatus').innerText = ''; ed().innerHTML = ''; pel('postPublished').checked = true;
  pel('postSubmitBtn').innerText = 'Đăng Bài Học'; pel('postCancelBtn').classList.add('hidden'); showThumb(); previewToken();
}
async function loadAdminPosts() {
  const { data } = await sbClient.from('posts').select('*').order('created_at', { ascending: false });
  allPosts = data || []; pel('adminPostCount').innerText = allPosts.length + ' bài';
  ruPaginate('posts', 'adminPostList', allPosts, 4, p => `
    <div class="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-3 rounded-xl flex gap-3 items-center">
      ${p.thumbnail_url ? `<img src="${pEsc(p.thumbnail_url)}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0">` : '<div class="w-16 h-16 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0"><i class="bi bi-book-fill text-[#cf1717] text-2xl"></i></div>'}
      <div class="min-w-0 flex-1">
        <h4 class="font-bold text-sm text-gray-900 dark:text-white truncate">${pEsc(p.title)}</h4>
        <p class="text-xs text-gray-400">${new Date(p.created_at).toLocaleDateString('vi-VN')} ${p.is_published ? '' : '· <b class="text-amber-500">Đang ẩn</b>'}</p>
        <div class="flex gap-3 mt-1">
          <button onclick="editPost('${p.id}')" class="text-xs text-blue-500 font-bold hover:underline">Sửa</button>
          <button onclick="deletePost('${p.id}')" class="text-xs text-red-500 font-bold hover:underline">Xóa</button>
          <a href="post.html?token=${encodeURIComponent(p.token)}" target="_blank" class="text-xs text-amber-500 font-bold hover:underline">Xem</a>
        </div>
      </div>
    </div>`, '<p class="text-gray-400 text-sm">Chưa có bài học nào.</p>');
}
function editPost(id) {
  const p = allPosts.find(x => x.id === id); if (!p) return;
  setPostMode('word');
  pel('editingPostId').value = p.id; pel('postToken').value = p.token; pel('postThumb').value = p.thumbnail_url || '';
  pel('postTitle').value = p.title; pel('postExcerpt').value = p.excerpt || ''; setPostHtml(p.content_html || '');
  pel('postPublished').checked = p.is_published; pel('postSubmitBtn').innerText = 'Cập Nhật Bài Học';
  pel('postCancelBtn').classList.remove('hidden'); showThumb(); previewToken();
  pel('section-posts').scrollIntoView({ behavior: 'smooth' });
}
async function deletePost(id) {
  if (!confirm('Xóa bài học này?')) return;
  await sbClient.from('posts').delete().eq('id', id); loadAdminPosts();
}
function previewPost() {
  pel('ppTitle').innerText = pel('postTitle').value || '(Chưa có tiêu đề)';
  pel('ppBody').innerHTML = getPostHtml().replace(/<script[\s\S]*?<\/script>/gi, '');
  pel('postPreviewModal').classList.remove('hidden'); pel('postPreviewModal').classList.add('flex');
}
function closePostPreview() { pel('postPreviewModal').classList.add('hidden'); pel('postPreviewModal').classList.remove('flex'); }
document.addEventListener('DOMContentLoaded', () => { initPostEditor(); previewToken(); loadAdminPosts(); });

;
/* Source: assets/js/pages/admin.07.js */

/* ============ EDITOR ĐOẠN VĂN READING (giống phần Post) ============ */
let passageMode = 'word', _psel = null;
const pasEd = () => document.getElementById('passageEditor');
const pasTa = () => document.getElementById('examPassage');
const pasSt = () => document.getElementById('passageEditorStatus');

function initPassageEditor() {
  const B = [['bold','<b>B</b>','In đậm'],['italic','<i>I</i>','In nghiêng'],['underline','<u>U</u>','Gạch chân'],
    ['insertUnorderedList','<i class="bi bi-list-ul"></i> Danh sách','Danh sách chấm'],['insertOrderedList','<i class="bi bi-list-ol"></i> Danh sách','Danh sách số'],
    ['justifyLeft','<i class="bi bi-text-left"></i>','Căn trái'],['justifyCenter','<i class="bi bi-text-center"></i>','Căn giữa'],['justifyRight','<i class="bi bi-text-right"></i>','Căn phải'],['justifyFull','<i class="bi bi-justify"></i>','Căn đều hai bên'],['removeFormat','<i class="bi bi-eraser-fill"></i>','Xóa định dạng']];
  const btn = 'px-2 py-1 rounded bg-white dark:bg-zinc-700 border dark:border-zinc-600 hover:bg-red-50 font-bold text-xs';
  document.getElementById('passageToolbar').innerHTML =
    `<select onchange="pasCmd('formatBlock',this.value);this.value=''" class="p-1 text-xs rounded border dark:bg-zinc-700 dark:border-zinc-600"><option value="">Kiểu chữ</option><option value="<p>">Đoạn văn</option><option value="<h2>">Tiêu đề lớn</option><option value="<h3>">Tiêu đề nhỏ</option><option value="<blockquote>">Trích dẫn</option></select>` +
    B.map(b => `<button type="button" title="${b[2]}" onmousedown="event.preventDefault()" onclick="pasCmd('${b[0]}')" class="${btn}">${b[1]}</button>`).join('') +
    `<input type="color" value="#000000" title="Màu chữ" onchange="pasCmd('foreColor',this.value)" class="w-7 h-7 p-0 border rounded cursor-pointer">` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="passageLink()" class="${btn}"><i class="bi bi-link-45deg"></i> Link</button>` +
    `<label class="${btn} cursor-pointer"><i class="bi bi-camera-fill"></i> Ảnh<input type="file" accept="image/*" class="hidden" onchange="passageImage(this)"></label>` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="passageTable()" class="${btn}"><i class="bi bi-table"></i> Bảng</button>` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="passageVideo()" class="${btn}"><i class="bi bi-youtube"></i> YouTube</button>` +
    `<label class="${btn} cursor-pointer bg-blue-50 text-blue-700"><i class="bi bi-file-earmark-text-fill"></i> Nhập file .docx<input type="file" accept=".docx" class="hidden" onchange="importPassageDocx(this)"></label>`;

  const e = pasEd();
  // nhớ vị trí con trỏ trong editor
  document.addEventListener('selectionchange', () => {
    const s = getSelection();
    if (s.rangeCount && e.contains(s.getRangeAt(0).commonAncestorContainer)) _psel = s.getRangeAt(0).cloneRange();
  });
  // dán từ Word -> dọn HTML rác
  e.addEventListener('paste', ev => {
    const h = ev.clipboardData.getData('text/html'); if (!h) return;
    ev.preventDefault(); document.execCommand('insertHTML', false, pasClean(h));
  });
}

function pasClean(h) {
  const d = new DOMParser().parseFromString(h, 'text/html');
  d.querySelectorAll('style,meta,link,script,xml').forEach(n => n.remove());
  d.querySelectorAll('*').forEach(n => {
    n.removeAttribute('class');
    const s = (n.getAttribute('style') || '').split(';').filter(x => /^\s*(font-weight|font-style|text-decoration|text-align|color)\s*:/i.test(x)).join(';');
    s ? n.setAttribute('style', s) : n.removeAttribute('style');
  });
  return d.body.innerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?o:p>/g, '');
}

function pasRestore() {
  pasEd().focus();
  if (_psel) { const s = getSelection(); s.removeAllRanges(); s.addRange(_psel); }
}
function pasCmd(c, v) { pasRestore(); document.execCommand(c, false, v || null); }

function insertPassageHtml(html) {
  if (passageMode === 'html') {
    const t = pasTa(), a = t.selectionStart ?? t.value.length, b = t.selectionEnd ?? a;
    t.value = t.value.slice(0, a) + '\n' + html + '\n' + t.value.slice(b); return;
  }
  pasRestore(); document.execCommand('insertHTML', false, html);
}
function passageLink() {
  const u = prompt('Nhập đường dẫn (https://...):'); if (!u) return;
  pasRestore(); document.execCommand('createLink', false, u);
}
function passageTable() {
  const rows = parseInt(prompt('Bảng bao nhiêu HÀNG? (tính cả hàng tiêu đề)', '3'));
  if (!rows) return;
  const cols = parseInt(prompt('Bảng bao nhiêu CỘT?', '3'));
  if (!cols) return;
  const R = Math.min(Math.max(rows, 1), 50), C = Math.min(Math.max(cols, 1), 20);
  const td = '<td style="border:1px solid #d1d5db;padding:8px 10px">&nbsp;</td>'.repeat(C);
  const th = '<th style="border:1px solid #d1d5db;padding:8px 10px;background:#fdecec">Tiêu đề</th>'.repeat(C);
  insertPassageHtml(`<table style="width:100%;border-collapse:collapse;margin:1em 0"><tr>${th}</tr>${`<tr>${td}</tr>`.repeat(R - 1)}</table><p><br></p>`);
}
function passageVideo() {
  const u = prompt('Dán link YouTube:'); if (!u) return;
  const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); if (!m) return alert('Link YouTube không hợp lệ');
  insertPassageHtml(`<div style="position:relative;padding-top:56.25%;margin:1em 0"><iframe src="https://www.youtube.com/embed/${m[1]}" style="position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px" allowfullscreen></iframe></div><p><br></p>`);
}
async function pasUpload(fileOrB64) {
  const fd = new FormData(); fd.append('image', fileOrB64);
  const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: fd });
  const d = await r.json(); return d.success ? d.data.url : null;
}
async function passageImage(inp) {
  const f = inp.files[0]; if (!f) return; const st = pasSt();
  st.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang tải ảnh...';
  const url = await pasUpload(f);
  st.innerHTML = url ? '<i class="bi bi-check-circle-fill"></i> Đã chèn ảnh!' : '<i class="bi bi-x-circle-fill"></i> Lỗi upload ảnh!';
  if (url) insertPassageHtml(`<img src="${url}" alt="" style="max-width:100%;height:auto;border-radius:12px;display:block;margin:1em auto">`);
  inp.value = '';
}
async function importPassageDocx(inp) {
  const f = inp.files[0]; if (!f) return; const st = pasSt();
  if (typeof mammoth === 'undefined') { inp.value = ''; return alert('Không tải được thư viện đọc Word. Hãy thử dán (Ctrl+V) nội dung trực tiếp.'); }
  if (getPassageHtml() && !confirm('Nhập file Word sẽ thay thế toàn bộ đoạn văn hiện tại. Tiếp tục?')) { inp.value = ''; return; }
  st.innerHTML = '<i class="bi bi-hourglass-split"></i> Đang chuyển Word → HTML (ảnh trong file sẽ được upload)...';
  try {
    const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() }, {
      convertImage: mammoth.images.imgElement(async img => {
        const b64 = await img.read('base64'); const url = await pasUpload(b64);
        return { src: url || `data:${img.contentType};base64,${b64}` };
      })
    });
    setPassageHtml(res.value); st.innerHTML = '<i class="bi bi-check-circle-fill"></i> Đã nhập file Word thành công!';
  } catch (err) { st.innerHTML = '<i class="bi bi-x-circle-fill"></i> Không đọc được file .docx'; }
  inp.value = '';
}

/* ---------- LẤY / GÁN / CHUYỂN CHẾ ĐỘ ---------- */
function getPassageHtml() {
  const h = (passageMode === 'html' ? pasTa().value : pasEd().innerHTML).trim();
  const d = document.createElement('div'); d.innerHTML = h;
  return (!d.textContent.trim() && !d.querySelector('img,iframe,table')) ? '' : h;
}
function setPassageHtml(h) { _psel = null; pasEd().innerHTML = h || ''; pasTa().value = h || ''; }
function setPassageMode(m) {
  if (m !== passageMode) {
    if (m === 'html') pasTa().value = pasEd().innerHTML; else pasEd().innerHTML = pasTa().value;
    passageMode = m; _psel = null;
  }
  pasTa().classList.toggle('hidden', m !== 'html');
  pasEd().classList.toggle('hidden', m === 'html');
  document.getElementById('passageToolbar').classList.toggle('hidden', m === 'html');
  document.getElementById('passTabWord').className = 'px-3 py-1.5 font-bold text-xs ' + (m === 'word' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
  document.getElementById('passTabHtml').className = 'px-3 py-1.5 font-bold text-xs ' + (m === 'html' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
}
document.addEventListener('DOMContentLoaded', initPassageEditor);

;
/* Source: assets/js/pages/admin.08.js */

/* ============ TRÌNH SOẠN CÂU HỎI THEO DẠNG (giống teacher.html, không có dạng Reading chia đôi) ============ */
let qbBlocks = [], qbMode = 'blocks', qbFocus = null, qbRange = null;
const qbEl = id => document.getElementById(id);
const qbEsc = s => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const qbNewId = () => 'q_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const QB_TYPES = ['mcq', 'multi', 'tf', 'fill', 'essay', 'text'];
const QB_LABEL = { mcq: '<i class="bi bi-check2-square"></i> Trắc nghiệm 1 đáp án', multi: '<i class="bi bi-check2-square"></i><i class="bi bi-check2-square"></i> Trắc nghiệm nhiều đáp án', tf: '<i class="bi bi-check-circle-fill"></i><i class="bi bi-x-circle-fill"></i> Đúng/Sai', fill: '<i class="bi bi-pencil-fill"></i> Điền khuyết', essay: '<i class="bi bi-file-earmark-text-fill"></i> Tự luận', text: '<i class="bi bi-pin-angle-fill"></i> Văn bản / hướng dẫn' };
function qbNote(msg) { const p = qbEl('qbStatus'); if (p) p.innerHTML = msg || ''; }

/* ---------- Thanh định dạng ---------- */
document.addEventListener('focusin', e => {
  if (e.target.classList && e.target.classList.contains('qeditor') && e.target.closest('#qbBlocks')) qbFocus = e.target;
});
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || !qbFocus) return;
  const r = sel.getRangeAt(0);
  if (qbFocus.contains(r.commonAncestorContainer)) qbRange = r.cloneRange();
});
document.addEventListener('paste', e => {
  const t = e.target;
  if (!t.classList || !t.classList.contains('qeditor') || !t.closest('#qbBlocks')) return;
  const h = e.clipboardData.getData('text/html'); if (!h) return;
  e.preventDefault(); document.execCommand('insertHTML', false, typeof pasClean === 'function' ? pasClean(h) : h);
});
function qbFocusOk() { return qbFocus && document.body.contains(qbFocus); }
function qbCmd(cmd, value) {
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước.');
  qbFocus.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand(cmd, false, value === undefined || value === '' ? null : value);
}
function qbClearFormat() {
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích và bôi đen đoạn cần xóa định dạng trước.');
  qbFocus.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand('removeFormat', false, null);
  document.execCommand('unlink', false, null);
  // Gỡ luôn danh sách nếu đoạn đang là list
  if (document.queryCommandState('insertUnorderedList')) document.execCommand('insertUnorderedList', false, null);
  if (document.queryCommandState('insertOrderedList')) document.execCommand('insertOrderedList', false, null);
  // Xóa màu/cỡ chữ còn sót dạng <font> hoặc style inline trong vùng đang chọn
  const sel = window.getSelection();
  if (sel.rangeCount && !sel.isCollapsed) {
    const r = sel.getRangeAt(0);
    qbFocus.querySelectorAll('font, span[style]').forEach(el => {
      if (r.intersectsNode(el)) {
        if (el.tagName === 'FONT') { while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el); el.remove(); }
        else { el.removeAttribute('style'); }
      }
    });
  }
}
async function qbInsertImage(input) {
  const file = input.files[0]; input.value = '';
  if (!file) return;
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước, rồi chọn ảnh.');
  const target = qbFocus; qbNote('<i class="bi bi-hourglass-split"></i> Đang tải ảnh...');
  let url = null;
  try { url = await pasUpload(file); } catch (e) {}
  if (!url) url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  target.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand('insertHTML', false, `<img src="${url}" alt="">`);
  qbNote('<i class="bi bi-check-circle-fill"></i> Đã chèn ảnh!');
}
function qbInsertTable() {
  if (!qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước.');
  const rows = parseInt(prompt('Bảng bao nhiêu HÀNG?', '2')) || 2;
  const cols = parseInt(prompt('Bảng bao nhiêu CỘT?', '2')) || 2;
  let html = '<table><tbody>';
  for (let r = 0; r < Math.max(1, rows); r++) { html += '<tr>'; for (let c = 0; c < Math.max(1, cols); c++) html += '<td>&nbsp;</td>'; html += '</tr>'; }
  html += '</tbody></table><p><br></p>';
  qbFocus.focus();
  if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
  document.execCommand('insertHTML', false, html);
}
function qbInsertAudio(input) {
  const file = input.files[0]; input.value = '';
  if (!file || !qbFocusOk()) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Hãy bấm vào ô câu hỏi/giải thích trước, sau đó chọn file âm thanh.');
  if (file.size > 8 * 1024 * 1024) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> File âm thanh quá 8MB, hãy nén nhỏ hơn rồi thử lại.');
  const target = qbFocus, reader = new FileReader();
  reader.onload = () => {
    target.focus();
    if (qbRange) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(qbRange); }
    document.execCommand('insertHTML', false, `<audio controls src="${reader.result}"></audio><p><br></p>`);
  };
  reader.readAsDataURL(file);
}

/* ---------- Thêm / xóa / di chuyển khối ---------- */
function qbAdd(type) {
  const base = { id: qbNewId(), type, content: '', points: 1, explanation: '' };
  if (type === 'mcq' || type === 'multi') base.options = [{ id: 'a', text: '', correct: type === 'mcq' }, { id: 'b', text: '', correct: false }];
  if (type === 'tf') base.options = [{ id: 'true', text: 'True', correct: true }, { id: 'false', text: 'False', correct: false }];
  if (type === 'fill') base.blanks = {};
  if (type === 'text') base.points = 0;
  qbBlocks.push(base); qbRender();
}
function qbRemove(id) { qbBlocks = qbBlocks.filter(b => b.id !== id); qbRender(); }
function qbMove(id, dir) {
  const i = qbBlocks.findIndex(b => b.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= qbBlocks.length) return;
  [qbBlocks[i], qbBlocks[j]] = [qbBlocks[j], qbBlocks[i]]; qbRender();
}
const qbFind = id => qbBlocks.find(b => b.id === id) || null;
function qbUpdate(id, field, value, isNumber) { const b = qbFind(id); if (b) b[field] = isNumber ? parseFloat(value || 0) : ((field === 'content' || field === 'explanation') ? RUEditor.sanitize(value) : value); }
function qbSetOptText(bid, oid, val) { const b = qbFind(bid); const o = b && b.options.find(x => x.id === oid); if (o) o.text = val; }
function qbSetCorrect(bid, oid, checked, single) {
  const b = qbFind(bid); if (!b) return;
  if (single) b.options.forEach(o => o.correct = (o.id === oid));
  else { const o = b.options.find(x => x.id === oid); if (o) o.correct = checked; }
}
function qbAddOpt(bid) {
  const b = qbFind(bid); if (!b) return;
  b.options.push({ id: String.fromCharCode(97 + b.options.length) + Date.now().toString(36).slice(-3), text: '', correct: false }); qbRender();
}
function qbRemoveOpt(bid, oid) { const b = qbFind(bid); if (!b) return; b.options = b.options.filter(o => o.id !== oid); qbRender(); }

/* ---------- Điền khuyết nhiều chỗ trống {{1}} {{2}} ---------- */
function qbGaps(content) {
  const nums = Array.from((content || '').matchAll(/\{\{(\d+)\}\}/g)).map(m => parseInt(m[1]));
  return [...new Set(nums)].sort((a, b) => a - b);
}
function qbGrow(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
function qbUpdBlank(bid, n, v) { const b = qbFind(bid); if (!b) return; b.blanks = b.blanks || {}; b.blanks[n] = v; }
function qbInsertGap(bid) {
  const b = qbFind(bid); if (!b) return;
  const div = qbEl('qb-' + bid); if (!div) return;
  div.focus();
  const nums = qbGaps(b.content);
  document.execCommand('insertText', false, `{{${nums.length ? Math.max(...nums) + 1 : 1}}}`);
  b.content = div.innerHTML; qbRender();
}
function qbFillUI(b) {
  const gaps = qbGaps(b.content); b.blanks = b.blanks || {};
  if (!gaps.length) return `<div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="block text-[10px] font-bold uppercase text-gray-500">Chỗ trống điền khuyết</label>
      <button type="button" onclick="qbInsertGap('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Chèn chỗ trống vào nội dung</button>
    </div>
    <p class="text-[11px] text-amber-500 italic"><i class="bi bi-exclamation-triangle-fill"></i> Đặt con trỏ vào vị trí muốn tạo chỗ trống trong "Nội dung câu hỏi" ở trên, rồi bấm nút này (bấm nhiều lần nếu câu có nhiều chỗ trống).</p>
  </div>`;
  return `<div class="space-y-2">
    <div class="flex items-center justify-between">
      <label class="block text-[10px] font-bold uppercase text-gray-500">Đáp án cho từng chỗ trống (${gaps.length} chỗ — nhiều đáp án đúng cách nhau bởi dấu ;)</label>
      <button type="button" onclick="qbInsertGap('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Thêm chỗ trống</button>
    </div>
    ${gaps.map(n => `
      <div class="flex items-start gap-2">
        <span class="text-[10px] font-extrabold text-white bg-[#cf1717] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-1">${n}</span>
        <textarea rows="1" placeholder="VD: cost; costs (nhiều đáp án cách nhau bởi dấu ;)" oninput="qbUpdBlank('${b.id}',${n},this.value); qbGrow(this)"
          class="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-xs resize-none overflow-hidden leading-relaxed" style="min-height:34px">${qbEsc(b.blanks[n] || '')}</textarea>
      </div>`).join('')}
  </div>`;
}

/* ---------- Vẽ danh sách khối ---------- */
function qbRender() {
  qbEl('qbBlocks').innerHTML = qbBlocks.map((b, idx) => `
    <div class="border dark:border-zinc-700 rounded-2xl p-4 space-y-3 bg-white dark:bg-zinc-900" data-block="${b.id}">
      <div class="flex items-center justify-between">
        <span class="text-xs font-extrabold text-[#cf1717]">Câu ${b.type === 'text' ? '' : qbBlocks.slice(0, idx + 1).filter(x => x.type !== 'text').length} — ${QB_LABEL[b.type]}</span>
        <div class="flex items-center gap-2 text-xs">
          ${b.type !== 'text' ? `<label class="flex items-center gap-1">Điểm: <input type="number" min="0" step="0.5" value="${b.points}" oninput="qbUpdate('${b.id}','points',this.value,true)" class="w-14 p-1 rounded border dark:bg-zinc-800 dark:border-zinc-700"></label>` : ''}
          <button type="button" onclick="qbMove('${b.id}',-1)" title="Lên"><i class="bi bi-arrow-up"></i></button>
          <button type="button" onclick="qbMove('${b.id}',1)" title="Xuống"><i class="bi bi-arrow-down"></i></button>
          <button type="button" onclick="qbRemove('${b.id}')" class="text-red-500 font-bold" title="Xóa"><i class="bi bi-trash3-fill"></i></button>
        </div>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1">${b.type === 'text' ? 'Nội dung' : 'Nội dung câu hỏi'}</label>
        ${RUEditor.button(b.id,'qb-')}<div id="qb-${b.id}" class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" contenteditable="true" oninput="qbUpdate('${b.id}','content',this.innerHTML)">${b.content || ''}</div>
      </div>
      ${(b.type === 'mcq' || b.type === 'multi' || b.type === 'tf') ? `
        <div class="space-y-2">
          <label class="block text-[10px] font-bold uppercase text-gray-500">Các lựa chọn (tick <i class="bi bi-check-lg"></i> vào đáp án đúng)</label>
          ${b.options.map(o => `
            <div class="flex items-center gap-2">
              <input type="${b.type === 'multi' ? 'checkbox' : 'radio'}" name="qbcorrect-${b.id}" ${o.correct ? 'checked' : ''}
                onchange="qbSetCorrect('${b.id}','${o.id}', ${b.type === 'multi'} ? this.checked : true, ${b.type !== 'multi'})">
              <input type="text" value="${qbEsc(o.text)}" placeholder="Nội dung lựa chọn..." ${b.type === 'tf' ? 'readonly' : ''}
                oninput="qbSetOptText('${b.id}','${o.id}',this.value)" class="flex-1 p-2 rounded border dark:bg-zinc-800 dark:border-zinc-700 text-xs">
              ${b.type !== 'tf' && b.options.length > 2 ? `<button type="button" onclick="qbRemoveOpt('${b.id}','${o.id}')" class="text-red-400 text-xs"><i class="bi bi-x-lg"></i></button>` : ''}
            </div>`).join('')}
          ${b.type !== 'tf' ? `<button type="button" onclick="qbAddOpt('${b.id}')" class="text-xs font-bold text-[#cf1717] hover:underline">+ Thêm lựa chọn</button>` : ''}
        </div>` : ''}
      ${b.type === 'fill' ? qbFillUI(b) : ''}
      ${b.type !== 'text' ? `
        <div>
          <label class="block text-[10px] font-bold uppercase text-gray-500 mb-1"><i class="bi bi-lightbulb-fill"></i> Đáp án & giải thích (hiện ra sau khi học sinh nộp bài)</label>
          <div class="qeditor p-3 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700" contenteditable="true" oninput="qbUpdate('${b.id}','explanation',this.innerHTML)">${b.explanation || ''}</div>
        </div>` : ''}
    </div>`).join('') || '<p class="text-xs text-gray-400 italic text-center py-6">Chưa có câu hỏi nào — bấm nút bên dưới để thêm.</p>';
  qbEl('qbBlocks').querySelectorAll('textarea[oninput*="qbUpdBlank"]').forEach(qbGrow);
}

/* ---------- Dữ liệu <-> JSON ---------- */
function qbCompatible(arr) {
  return Array.isArray(arr) && arr.every(q => q && typeof q === 'object' && QB_TYPES.includes(q.type) &&
    (!['mcq', 'multi', 'tf'].includes(q.type) || (Array.isArray(q.options) && q.options.every(o => o && typeof o === 'object'))) &&
    (q.type !== 'fill' || qbGaps(q.content).length > 0));
}
function qbDenorm(arr) {
  return JSON.parse(JSON.stringify(arr)).map(b => {
    if (!b.id) b.id = qbNewId();
    if (b.options) b.options.forEach((o, i) => { if (!o.id) o.id = String.fromCharCode(97 + i); o.correct = !!o.correct; });
    if (b.type === 'fill' && Array.isArray(b.blanks)) {
      const map = {}; b.blanks.forEach(bl => { map[bl.gap] = (bl.accepted_answers || []).join('; '); }); b.blanks = map;
    }
    if (b.type === 'fill' && !b.blanks) b.blanks = {};
    if (b.points == null) b.points = b.type === 'text' ? 0 : 1;
    return b;
  });
}
function qbNormalize(b) {
  const nb = JSON.parse(JSON.stringify(b)); delete nb._needsCheck;
  if (nb.type === 'fill') {
    nb.blanks = qbGaps(nb.content).map(n => ({ gap: n, accepted_answers: ((b.blanks && b.blanks[n]) || '').split(';').map(s => s.trim()).filter(Boolean) }));
  }
  return nb;
}
function qbGetData() {
  if (qbMode === 'json') return JSON.parse(qbEl('examQuestions').value.trim() || '[]');
  return qbBlocks.map(qbNormalize);
}
function qbValidate() {
  if (qbMode !== 'blocks') return '';
  for (const b of qbBlocks) if (b.type === 'fill' && !qbGaps(b.content).length)
    return '<i class="bi bi-exclamation-triangle-fill"></i> Có câu điền khuyết chưa có chỗ trống nào — hãy bấm "+ Chèn chỗ trống" trong câu đó trước khi lưu.';
  return '';
}
function qbApplyMode(m) {
  qbMode = m;
  qbEl('qbPanel').classList.toggle('hidden', m !== 'blocks');
  qbEl('examQuestions').classList.toggle('hidden', m !== 'json');
  qbEl('qbTabBlocks').className = 'px-3 py-1.5 font-bold text-xs ' + (m === 'blocks' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
  qbEl('qbTabJson').className = 'px-3 py-1.5 font-bold text-xs ' + (m === 'json' ? 'bg-[#cf1717] text-white' : 'bg-gray-100 dark:bg-zinc-800');
}
function qbSetMode(m) {
  if (m === qbMode) return;
  if (m === 'json') {
    const err = qbValidate(); if (err) return alert(err);
    qbEl('examQuestions').value = JSON.stringify(qbGetData(), null, 2);
    qbApplyMode('json'); qbNote('');
  } else {
    let data;
    try { data = JSON.parse(qbEl('examQuestions').value.trim() || '[]'); } catch (e) { return alert('JSON đang bị lỗi cú pháp, hãy sửa trước khi chuyển sang chế độ soạn theo dạng.'); }
    if (!qbCompatible(data)) return alert('JSON này có định dạng khác trình soạn (dạng câu hỏi không nằm trong: mcq, multi, tf, fill, essay, text). Để tránh mất dữ liệu, hãy tiếp tục sửa ở chế độ JSON.');
    qbBlocks = qbDenorm(data); qbApplyMode('blocks'); qbRender(); qbNote('');
  }
}
function qbLoad(data) {
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = null; } }
  if (!Array.isArray(data)) data = [];
  qbEl('examQuestions').value = JSON.stringify(data, null, 2);
  if (qbCompatible(data)) { qbBlocks = qbDenorm(data); qbApplyMode('blocks'); qbRender(); qbNote(''); }
  else { qbBlocks = []; qbRender(); qbApplyMode('json'); qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Bài này có định dạng câu hỏi khác trình soạn theo dạng, nên được giữ ở chế độ JSON để không mất dữ liệu.'); }
}

/* ---------- Nhập câu hỏi từ Word (.docx) ---------- */
async function qbImportWord(input) {
  const file = input.files[0]; input.value = ''; if (!file) return;
  if (!window.mammoth) return qbNote('<i class="bi bi-x-circle-fill"></i> Không tải được thư viện đọc file Word, hãy tải lại trang và thử lại.');
  qbNote('<i class="bi bi-hourglass-split"></i> Đang đọc file Word...');
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    const nb = qbParseWord(result.value);
    if (!nb.length) return qbNote('<i class="bi bi-exclamation-triangle-fill"></i> Không nhận diện được câu hỏi nào. Mỗi câu phải bắt đầu bằng thẻ [MCQ] [MULTI] [TF] [FILL] hoặc [ESSAY].');
    qbBlocks.push(...nb); qbRender();
    const skipped = nb.filter(b => b._needsCheck).length;
    qbNote(`<i class="bi bi-stars"></i> Đã nhập ${nb.length} câu từ Word!${skipped ? ` (${skipped} câu chưa rõ đáp án đúng — đã tạm đánh dấu đáp án A, hãy kiểm tra lại)` : ''}`);
  } catch (err) { qbNote('<i class="bi bi-x-circle-fill"></i> Lỗi đọc file Word: ' + escapeHtml(err.message || 'không xác định')); }
}
function qbParseWord(text) {
  const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tagRe = /^\[(MCQ|MULTI|TF|FILL|ESSAY)\]\s*(.*)/i, pointsRe = /^Điểm\s*:\s*([\d.]+)/i, explainRe = /^Giải thích\s*:\s*(.*)/i,
    fillAnsRe = /^Đáp án\s*(\d+)?\s*:\s*(.*)/i, optRe = /^([A-Da-d])[\.\)]\s+(.*)/;
  const out = []; let cur = null, explainMode = false;
  function push() {
    if (!cur) return;
    if (cur.type === 'mcq' || cur.type === 'tf' || cur.type === 'multi') {
      const c = cur.options.filter(o => o.correct).length;
      if (c === 0 && cur.options.length) { cur.options[0].correct = true; cur._needsCheck = true; }
      if (cur.type !== 'multi' && c > 1) { let kept = false; cur.options.forEach(o => { if (o.correct) { if (kept) o.correct = false; else kept = true; } }); }
    }
    out.push(cur); cur = null; explainMode = false;
  }
  rawLines.forEach(line => {
    const tm = line.match(tagRe);
    if (tm) {
      push(); const type = tm[1].toLowerCase();
      cur = { id: qbNewId(), type, content: qbEsc(tm[2] || ''), points: type === 'essay' ? 5 : 1, explanation: '' };
      if (type === 'mcq' || type === 'multi' || type === 'tf') cur.options = [];
      if (type === 'fill') cur.blanks = {};
      return;
    }
    if (!cur) return;
    const pm = line.match(pointsRe); if (pm) { cur.points = parseFloat(pm[1]) || cur.points; explainMode = false; return; }
    const em = line.match(explainRe); if (em) { cur.explanation = qbEsc(em[1] || ''); explainMode = true; return; }
    if (explainMode) { cur.explanation += ' ' + qbEsc(line); return; }
    const fm = line.match(fillAnsRe);
    if (fm && cur.type === 'fill') { const g = qbGaps(cur.content); cur.blanks[fm[1] ? parseInt(fm[1]) : (g[0] || 1)] = fm[2].trim(); return; }
    if (cur.type === 'mcq' || cur.type === 'multi' || cur.type === 'tf') {
      const om = line.match(optRe); let t = om ? om[2] : line, correct = false;
      if (/\*\s*$/.test(t)) { correct = true; t = t.replace(/\*\s*$/, '').trim(); }
      cur.options.push({ id: (om ? om[1].toLowerCase() : String.fromCharCode(97 + cur.options.length)) + Math.random().toString(36).slice(2, 6), text: qbEsc(t), correct });
      return;
    }
    cur.content += ' ' + qbEsc(line);
  });
  push();
  return out.filter(b => (b.options ? b.options.length >= 2 : true) && (b.type !== 'fill' || qbGaps(b.content).length > 0));
}
document.addEventListener('DOMContentLoaded', () => { qbRender(); });


;
/* Source: assets/js/ru-preview.js */
/* ReadUp teacher/admin question preview: no submissions, no score writes. */
(function (w) {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const allowed = new Set('P BR DIV SPAN B STRONG I EM U S SUB SUP H1 H2 H3 H4 H5 H6 UL OL LI BLOCKQUOTE HR TABLE THEAD TBODY TFOOT TR TH TD IMG A FONT SMALL BIG CODE PRE MARK SECTION ARTICLE AUDIO SOURCE VIDEO FIGURE FIGCAPTION'.split(' '));
  const drop = new Set('SCRIPT STYLE IFRAME OBJECT EMBED FORM INPUT TEXTAREA BUTTON SELECT OPTION SVG MATH LINK META BASE TEMPLATE'.split(' '));
  // Allow the presentation properties required for teacher-authored lesson content, but never
  // execute scripts, load URLs from CSS, or allow unsafe HTML elements/attributes.
  const styleOK = /^(color|background|background-color|font-family|font-size|font-weight|font-style|text-decoration|text-transform|text-align|line-height|letter-spacing|border|border-(color|width|style|radius|top|bottom|left|right)|border-collapse|padding(-top|-bottom|-left|-right)?|margin(-top|-bottom|-left|-right)?|width|max-width|min-width|height|max-height|min-height|vertical-align|list-style-type|white-space|display|gap|row-gap|column-gap|flex|flex-direction|flex-wrap|align-items|justify-content|grid-template-columns|grid-template-rows|box-shadow|opacity)$/i;
  function safeDeclarations(css) {
    return String(css||'').split(';').map(piece => {
      const index=piece.indexOf(':');if(index<0)return '';
      const name=piece.slice(0,index).trim().toLowerCase(),value=piece.slice(index+1).trim();
      if(!styleOK.test(name)||!value||value.length>300||/url\s*\(|expression\s*\(|@import|[<>\\]|var\s*\(|-moz-binding|javascript:/i.test(value))return '';
      if(name==='display' && !/^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|table|table-row|table-cell|none)$/i.test(value))return '';
      return name+':'+value;
    }).filter(Boolean).join(';');
  }
  function clean(html) {
    const doc=new DOMParser().parseFromString(String(html??''),'text/html');
    // Scoped style tags are converted to safe inline declarations, so HTML+CSS pasted by
    // teachers continues to look as intended in the editor, preview and student views.
    for(const sheet of Array.from(doc.querySelectorAll('style')).slice(0,12)) {
      const css=(sheet.textContent||'').slice(0,12000);
      const rules=/([^{}]+)\{([^{}]+)\}/g;let rule,count=0;
      while((rule=rules.exec(css))&&++count<=100){
        const declarations=safeDeclarations(rule[2]);if(!declarations)continue;
        for(const sel of rule[1].split(',').slice(0,8)){
          const selector=sel.trim();
          // Only classes and plain tags within the authored fragment; never global CSS.
          if(!/^[a-zA-Z][\w-]*(?:\.[\w-]+)*(?:\s+[a-zA-Z][\w-]*(?:\.[\w-]+)*)*$|^\.[\w-]+(?:\s+[a-zA-Z][\w-]*(?:\.[\w-]+)*)*$/i.test(selector))continue;
          try{for(const el of Array.from(doc.body.querySelectorAll(selector)).slice(0,250)) el.setAttribute('style',((el.getAttribute('style')||'')+';'+declarations).replace(/^;/,''));}catch{}
        }
      }
    }
    function walk(node) {
      for(const child of Array.from(node.children)){
        if(drop.has(child.tagName)){child.remove();continue;}
        if(!allowed.has(child.tagName)){walk(child);child.replaceWith(...Array.from(child.childNodes));continue;}
        for(const attr of Array.from(child.attributes)){
          const k=attr.name.toLowerCase(),v=attr.value.trim();
          if(k.startsWith('on')||k==='srcdoc'){child.removeAttribute(attr.name);continue;}
          if(k==='style'){const safe=safeDeclarations(v);if(safe)child.setAttribute('style',safe);else child.removeAttribute('style');}
          else if(k==='href'||k==='src'){
            if(!/^(https?:\/\/|\/[^/]|#|data:image\/(png|jpeg|gif|webp);base64,|data:audio\/(mpeg|mp3|wav|ogg);base64,)/i.test(v))child.removeAttribute(attr.name);
          }else if(!['class','title','alt','width','height','colspan','rowspan','align','target','rel','controls','poster','type','start'].includes(k))child.removeAttribute(attr.name);
        }
        if(child.tagName==='A')child.setAttribute('rel','noopener noreferrer');
        walk(child);
      }
    }
    walk(doc.body);return doc.body.innerHTML;
  }
  const typeLabels = {mcq:'Trắc nghiệm',multi:'Chọn nhiều đáp án',tf:'Đúng / Sai',fill:'Điền khuyết',essay:'Tự luận',text:'Hướng dẫn',reading:'Bài đọc'};
  let current = null, mode = 'paper', oldOverflow = '';
  function answersOf(q) {
    const blanks = q.blanks;
    if (Array.isArray(blanks)) return blanks.map(b => `${b.gap}: ${(b.accepted_answers || []).join(' / ')}`).join(' · ');
    if (blanks && typeof blanks === 'object') return Object.entries(blanks).map(([key,val]) => `${key}: ${val}`).join(' · ');
    return '';
  }
  function count(qs) { return (qs||[]).reduce((n,q) => n+(q.type==='reading'?count(q.sub_blocks):q.type==='text'?0:1),0); }
  function renderOne(q, index, isAnswer) {
    if (!q || typeof q !== 'object') return '';
    if (q.type === 'reading') return `<section class="rup-reading"><div class="rup-reading__label">BÀI ĐỌC · READING</div><div class="rup-rich ${q.two_col ? 'rup-two-col' : ''}">${clean(q.content)}</div><div class="rup-reading__questions">${renderQs(q.sub_blocks || [],isAnswer)}</div></section>`;
    const name = typeLabels[q.type] || q.type || 'Câu hỏi';
    let content = clean(q.content);
    if (q.type === 'fill') content = content.replace(/\{\{(\d+)\}\}/g, (_,n) => `<span class="rup-gap" title="Chỗ trống ${n}">${isAnswer ? esc((() => { const b=q.blanks; const v=Array.isArray(b)?b.find(x=>String(x.gap)===n)?.accepted_answers?.[0]:b?.[n]; return typeof v==='string'?v.split(';')[0]:v || '_____';})()) : '________'}</span>`);
    let details='';
    if (Array.isArray(q.options)) details=`<div class="rup-options">${q.options.map((o,i) => `<div class="rup-option ${isAnswer&&o.correct?'rup-correct':''}"><span class="rup-option__marker">${String.fromCharCode(65+i)}.</span><span class="rup-rich">${clean(o.text)}</span>${isAnswer&&o.correct?'<b class="rup-correct-label">✓ Đúng</b>':''}</div>`).join('')}</div>`;
    if (q.type === 'essay') details += '<div class="rup-essay">Không gian trả lời tự luận</div>';
    if (isAnswer && q.type==='fill' && answersOf(q)) details+=`<div class="rup-answer">Đáp án: ${esc(answersOf(q))}</div>`;
    if (isAnswer && q.explanation) details+=`<div class="rup-explanation"><b>Giải thích:</b> ${clean(q.explanation)}</div>`;
    return `<article class="rup-question"><div class="rup-question__head"><b>${q.type==='text'?'Hướng dẫn':`Câu ${index}`}</b><span>${esc(name)}${q.type==='text'?'':` · ${esc(q.points ?? 1)} điểm`}</span></div><div class="rup-rich">${content}</div>${details}</article>`;
  }
  function renderQs(qs, answer) {
    let number=0;
    return (qs || []).map(q => renderOne(q, q.type === 'text' || q.type === 'reading' ? '' : ++number, answer)).join('') || '<p class="rup-empty">Chưa có câu hỏi.</p>';
  }
  function ensure() {
    let el = document.getElementById('ruPreviewOverlay'); if(el) return el;
    el = document.createElement('div'); el.id='ruPreviewOverlay'; el.className='rup-overlay';
    el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Xem trước bài thi và đáp án');
    el.innerHTML=`<div class="rup-shell"><div class="rup-header"><div><strong>ReadUp <span>English</span> · Xem thử</strong><small>Chỉ xem trước — không ghi kết quả học sinh</small></div><button type="button" class="rup-close" data-rup-close aria-label="Đóng">✕</button></div><div class="rup-toolbar"><div class="rup-modes"><button type="button" data-rup-mode="paper">📄 Xem dạng đề thi</button><button type="button" data-rup-mode="answer">✅ Xem dạng đáp án</button></div><button type="button" data-rup-print>🖨 In / PDF</button></div><div class="rup-scroll"><div id="ruPreviewContent" class="rup-document"></div></div></div>`;
    el.addEventListener('click', e => {
      if(e.target===el || e.target.closest('[data-rup-close]')) close();
      const btn = e.target.closest('[data-rup-mode]'); if(btn) setMode(btn.dataset.rupMode);
      if(e.target.closest('[data-rup-print]')) window.print();
    });
    document.body.append(el); return el;
  }
  function render() {
    if(!current) return;
    const container=document.getElementById('ruPreviewContent'), show=mode==='answer';
    container.innerHTML=`<div class="rup-doc-brand">READUP ENGLISH · ${current.is_test ? 'BÀI TEST':'BÀI TẬP / READING'}</div><h1>${esc(current.title || 'Bài chưa đặt tên')}</h1><div class="rup-metadata"><span>${count(current.questions)} câu</span>${current.time_limit ? `<span>${esc(current.time_limit)} phút</span>`:''}${current.total_points!=null?`<span>${esc(current.total_points)} điểm</span>`:''}<span>${show?'BẢN ĐÁP ÁN':'BẢN ĐỀ THI'}</span></div>${current.description?`<div class="rup-description">${esc(current.description)}</div>`:''}${current.passage_html?`<section class="rup-reading"><div class="rup-reading__label">READING PASSAGE</div><div class="rup-rich">${clean(current.passage_html)}</div></section>`:''}<div class="rup-question-list">${renderQs(current.questions,show)}</div>`;
    document.querySelectorAll('[data-rup-mode]').forEach(b=>{b.classList.toggle('rup-active',b.dataset.rupMode===mode);b.setAttribute('aria-pressed',String(b.dataset.rupMode===mode));});
  }
  function setMode(v) { mode=v==='answer'?'answer':'paper';render(); }
  function open(data) {
    if(!data || !Array.isArray(data.questions)) throw new Error('Dữ liệu câu hỏi không hợp lệ.');
    current=data;mode='paper'; ensure();oldOverflow=document.body.style.overflow;
    document.getElementById('ruPreviewOverlay').classList.add('rup-visible');document.body.style.overflow='hidden';render();
  }
  function close() { const modal=document.getElementById('ruPreviewOverlay');if(modal)modal.classList.remove('rup-visible');document.body.style.overflow=oldOverflow;current=null; }
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&document.getElementById('ruPreviewOverlay')?.classList.contains('rup-visible'))close(); });
  w.RUPreview={open,close,setMode,clean};
})(window);

;
/* Source: assets/js/ru-editor.js */
/* Safe WYSIWYG/HTML dual editor with immediately rendered HTML preview. */
(function (w) {
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clean=html=>w.RUPreview?.clean ? w.RUPreview.clean(html) : String(html||'');
 function button(id,prefix='qc-') {
   const idAttr=escape(prefix+id);
   return `<div class="rue-tabs" data-rue-for="${idAttr}"><button type="button" class="rue-selected" data-rue-visual="${idAttr}" onclick="RUEditor.toggle('${idAttr}','visual')"><i class="bi bi-palette" aria-hidden="true"></i> Trực quan</button><button type="button" data-rue-html="${idAttr}" onclick="RUEditor.toggle('${idAttr}','html')"><i class="bi bi-code-slash" aria-hidden="true"></i> HTML + Xem nhanh</button><span><i class="bi bi-info-circle" aria-hidden="true"></i> Dùng <code>style="..."</code> hoặc <code>&lt;style&gt;</code> với thuộc tính CSS an toàn; JavaScript/iframe bị chặn.</span></div>`;
 }
 function fieldUpdate(selector,value){const id=selector.slice(3),kind=selector.slice(0,2);if(kind==='qb'&&typeof w.qbUpdate==='function')w.qbUpdate(id,'content',value);if(kind==='qc'&&typeof w.updateField==='function')w.updateField(id,'content',value);}
 function workbench(visual){
   const bench=document.createElement('div');bench.className='rue-workbench';bench.hidden=true;
   bench.innerHTML=`<div class="rue-code"><div class="rue-pane-label"><i class="bi bi-code-slash"></i> Mã nguồn HTML</div><textarea class="rue-source" spellcheck="false" aria-label="Mã nguồn HTML của câu hỏi" placeholder="<section style=\"background:#fff8e1;padding:16px;border-radius:10px\">Nội dung…</section>"></textarea></div><div class="rue-preview-pane"><div class="rue-pane-label"><i class="bi bi-eye"></i> Giao diện xem trước <span>(tự cập nhật)</span></div><div class="rue-preview-content ru-rich qcontent"></div></div>`;
   visual.insertAdjacentElement('afterend',bench);return bench;
 }
 function toggle(selector,mode){
   const visual=document.getElementById(selector),tabs=document.querySelector(`[data-rue-for="${CSS.escape(selector)}"]`);if(!visual||!tabs)return;
   const bench=visual.nextElementSibling?.classList.contains('rue-workbench')?visual.nextElementSibling:workbench(visual),ta=bench.querySelector('textarea'),preview=bench.querySelector('.rue-preview-content');
   if(mode==='html'){
     ta.value=visual.innerHTML;
     preview.innerHTML=clean(ta.value);
     visual.hidden=true;visual.style.display='none';bench.hidden=false;
     ta.oninput=()=>{const safe=clean(ta.value);preview.innerHTML=safe;fieldUpdate(selector,safe);};
   }else{
     // Commit the last source edit before restoring the visual editor.
     const safe=clean(ta.value);visual.innerHTML=safe;visual.hidden=false;visual.style.display='';bench.hidden=true;
     fieldUpdate(selector,safe);
     visual.dispatchEvent(new Event('input',{bubbles:true}));
   }
   tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('rue-selected',mode==='html'?b.hasAttribute('data-rue-html'):b.hasAttribute('data-rue-visual')));
 }
 w.RUEditor={button,toggle,sanitize:clean};
})(window);

;
/* Source: assets/js/pages/admin.09.js */

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

;
/* Source: assets/js/pages/admin.10.js */

/* ============ TRÌNH SOẠN THÔNG BÁO: WORD <-> JSON ============ */
let newsMode = 'word', _nSel = null;
const nEd = () => document.getElementById('newsEditor');
const nSt = h => { const e = document.getElementById('newsEditorStatus'); if (e) e.innerHTML = h; };
function initNewsEditor() {
  const btn = 'px-2 py-1 rounded bg-white dark:bg-zinc-700 border dark:border-zinc-600 hover:bg-red-50 font-bold';
  const B = [['bold','<b>B</b>','In đậm'],['italic','<i>I</i>','In nghiêng'],['underline','<u>U</u>','Gạch chân'],
    ['insertUnorderedList','<i class="bi bi-list-ul"></i>','Danh sách chấm'],['insertOrderedList','<i class="bi bi-list-ol"></i>','Danh sách số'],
    ['justifyLeft','<i class="bi bi-text-left"></i>','Căn trái'],['justifyCenter','<i class="bi bi-text-center"></i>','Căn giữa'],['justifyRight','<i class="bi bi-text-right"></i>','Căn phải'],
    ['removeFormat','<i class="bi bi-eraser-fill"></i> Xóa định dạng','Xóa định dạng']];
  document.getElementById('newsToolbar').innerHTML =
    `<select onchange="nCmd('formatBlock',this.value);this.value=''" class="p-1 rounded border dark:bg-zinc-700 dark:border-zinc-600"><option value="">Kiểu chữ</option><option value="<p>">Đoạn văn</option><option value="<h2>">Tiêu đề lớn</option><option value="<h3>">Tiêu đề nhỏ</option><option value="<blockquote>">Trích dẫn</option></select>` +
    B.map(b => `<button type="button" title="${b[2]}" onmousedown="event.preventDefault()" onclick="nCmd('${b[0]}')" class="${btn}">${b[1]}</button>`).join('') +
    `<input type="color" value="#000000" title="Màu chữ" onchange="nCmd('foreColor',this.value)" class="w-7 h-7 p-0 border rounded cursor-pointer">` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="nLink()" class="${btn}"><i class="bi bi-link-45deg"></i> Link</button>` +
    `<label class="${btn} cursor-pointer"><i class="bi bi-camera-fill"></i> Ảnh<input type="file" accept="image/*" class="hidden" onchange="nImage(this)"></label>` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="nTable()" class="${btn}"><i class="bi bi-table"></i> Bảng</button>` +
    `<button type="button" onmousedown="event.preventDefault()" onclick="nVideo()" class="${btn}"><i class="bi bi-youtube"></i> YouTube</button>` +
    `<label class="${btn} cursor-pointer bg-blue-50 text-blue-700"><i class="bi bi-file-earmark-text-fill"></i> Nhập file .docx<input type="file" accept=".docx" class="hidden" onchange="nImportDocx(this)"></label>` +
    `<button type="button" id="newsJsonSample" onclick="nJsonSample()" class="${btn} hidden bg-amber-50 text-amber-700"><i class="bi bi-braces"></i> Chèn mẫu JSON</button>`;
  const e = nEd();
  e.addEventListener('blur', () => { const s = getSelection(); if (s.rangeCount && e.contains(s.getRangeAt(0).commonAncestorContainer)) _nSel = s.getRangeAt(0); });
  e.addEventListener('paste', ev => {
    const h = ev.clipboardData.getData('text/html'); if (!h) return;
    ev.preventDefault(); document.execCommand('insertHTML', false, cleanWordHtml(h));
  });
}
function nRestore() { nEd().focus(); if (_nSel) { const s = getSelection(); s.removeAllRanges(); s.addRange(_nSel); } }
function nCmd(c, v) { if (newsMode !== 'word') return; nRestore(); document.execCommand(c, false, v || null); }
function nInsert(html) { if (newsMode !== 'word') return; nRestore(); document.execCommand('insertHTML', false, html); }
function nLink() { const u = prompt('Nhập đường dẫn (https://...):'); if (u) { nRestore(); document.execCommand('createLink', false, u); } }
function nTable() {
  const r = parseInt(prompt('Bảng bao nhiêu HÀNG? (tính cả hàng tiêu đề)', '3')); if (!r) return;
  const c = parseInt(prompt('Bảng bao nhiêu CỘT?', '3')); if (!c) return;
  const R = Math.min(Math.max(r, 1), 30), C = Math.min(Math.max(c, 1), 10);
  nInsert(`<table><tr>${'<th>Tiêu đề</th>'.repeat(C)}</tr>${`<tr>${'<td>&nbsp;</td>'.repeat(C)}</tr>`.repeat(R - 1)}</table><p><br></p>`);
}
function nVideo() {
  const u = prompt('Dán link YouTube:'); if (!u) return;
  const m = u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/); if (!m) return alert('Link YouTube không hợp lệ');
  nInsert(`<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${m[1]}" allowfullscreen></iframe></div><p><br></p>`);
}
async function nImage(inp) {
  const f = inp.files[0]; if (!f) return;
  nSt('<i class="bi bi-hourglass-split"></i> Đang tải ảnh...');
  const url = await imgbbUpload(f);
  nSt(url ? '<i class="bi bi-check-circle-fill"></i> Đã chèn ảnh!' : '<i class="bi bi-x-circle-fill"></i> Lỗi upload ảnh!');
  if (url) nInsert(`<img src="${url}" alt="">`); inp.value = '';
}
async function nImportDocx(inp) {
  const f = inp.files[0]; if (!f) return;
  if (typeof mammoth === 'undefined') return alert('Không tải được thư viện đọc Word. Hãy thử dán (Ctrl+V) nội dung trực tiếp.');
  if (newsMode !== 'word') setNewsMode('word');
  nSt('<i class="bi bi-hourglass-split"></i> Đang chuyển Word → nội dung (ảnh trong file sẽ được upload)...');
  try {
    const res = await mammoth.convertToHtml({ arrayBuffer: await f.arrayBuffer() }, {
      convertImage: mammoth.images.imgElement(async img => {
        const b64 = await img.read('base64'); const url = await imgbbUpload(b64);
        return { src: url || `data:${img.contentType};base64,${b64}` };
      })
    });
    nEd().innerHTML = res.value; nSt('<i class="bi bi-check-circle-fill"></i> Đã nhập file Word thành công!');
  } catch (e) { nSt('<i class="bi bi-x-circle-fill"></i> Không đọc được file .docx'); }
  inp.value = '';
}

/* HTML của trình soạn -> mảng đoạn (JSON) mà dashboard.html hiển thị đúng */
function newsHtmlToArray(root) {
  const out = [];
  const has = h => { const t = document.createElement('div'); t.innerHTML = h; return !!((t.textContent || '').replace(/\u00a0/g, ' ').trim() || t.querySelector('img,iframe,table')); };
  const push = h => { h = (h || '').trim(); if (h && has(h)) out.push(h); };
  const clean = el => {
    const c = el.cloneNode(true);
    c.querySelectorAll('a').forEach(a => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); a.setAttribute('style', 'color:#cf1717;text-decoration:underline'); });
    c.querySelectorAll('img').forEach(i => i.setAttribute('style', 'max-width:100%;border-radius:8px'));
    return c;
  };
  const al = el => { const a = el.style && el.style.textAlign; return a && a !== 'left' && a !== 'start' ? a : ''; };
  const wrap = (el, h) => al(el) ? `<span style="display:block;text-align:${al(el)}">${h}</span>` : h;
  Array.from(root.childNodes).forEach(n => {
    if (n.nodeType === 3) { const d = document.createElement('div'); d.textContent = n.textContent; push(d.innerHTML); return; }
    if (n.nodeType !== 1) return;
    const tag = n.tagName;
    if (tag === 'UL' || tag === 'OL') { let i = 1; n.querySelectorAll(':scope > li').forEach(li => push((tag === 'UL' ? '• ' : (i++) + '. ') + clean(li).innerHTML)); return; }
    if (/^H[1-6]$/.test(tag)) { push(wrap(n, `<strong style="display:block;font-size:1.15em">${clean(n).innerHTML}</strong>`)); return; }
    if (tag === 'BLOCKQUOTE') { push(`<em style="display:block;border-left:3px solid #cf1717;padding-left:10px">${clean(n).innerHTML}</em>`); return; }
    if (tag === 'TABLE') {
      const c = clean(n); c.setAttribute('style', 'border-collapse:collapse;width:100%');
      c.querySelectorAll('th,td').forEach(x => x.setAttribute('style', 'border:1px solid #d1d5db;padding:4px 8px;' + (x.tagName === 'TH' ? 'background:#f3f4f6;font-weight:700;color:#111' : '')));
      push(c.outerHTML); return;
    }
    if (tag === 'IMG') { const c = n.cloneNode(true); c.setAttribute('style', 'max-width:100%;border-radius:8px'); push(c.outerHTML); return; }
    const fr = n.querySelector && n.querySelector('iframe');
    if (fr && n.classList.contains('video-wrap')) {
      push(`<span style="display:block;position:relative;padding-top:56.25%"><iframe src="${fr.src}" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border-radius:12px;border:0"></iframe></span>`); return;
    }
    push(wrap(n, clean(n).innerHTML));
  });
  return out;
}
const nEsc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function newsContentToHtml(raw) {
  if (!raw) return '';
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) return j.map(p => `<p>${p}</p>`).join('');
    if (j && typeof j === 'object') {
      let h = '';
      if (j.intro) h += `<p>${j.intro}</p>`;
      if (Array.isArray(j.list)) h += `<ul>${j.list.map(li => `<li>${li}</li>`).join('')}</ul>`;
      if (j.link) h += `<p><a href="${j.link}">${j.linkText || j.link}</a></p>`;
      if (j.note) h += `<blockquote>${j.note}</blockquote>`;
      return h;
    }
  } catch (e) {}
  if (/<[a-z][\s\S]*>/i.test(raw)) return raw;
  return String(raw).split(/\n+/).filter(l => l.trim()).map(l => `<p>${nEsc(l)}</p>`).join('');
}
function getNewsContent() {
  if (newsMode === 'json') {
    const t = document.getElementById('newsJson').value.trim();
    if (!t) return '';
    JSON.parse(t); return t;
  }
  const arr = newsHtmlToArray(nEd());
  return arr.length ? JSON.stringify(arr) : '';
}
function setNewsMode(m) {
  if (m === newsMode) return;
  if (m === 'json') {
    document.getElementById('newsJson').value = JSON.stringify(newsHtmlToArray(nEd()), null, 2).replace(/^\[\]$/, '');
  } else {
    const t = document.getElementById('newsJson').value.trim();
    if (t) {
      let j; try { j = JSON.parse(t); } catch (e) { return alert('JSON đang bị lỗi cú pháp, hãy sửa trước khi chuyển sang chế độ Word.'); }
      if (!Array.isArray(j) && !confirm('JSON dạng {intro, list, link, note} sẽ được chuyển thành các đoạn văn thường. Tiếp tục?')) return;
      nEd().innerHTML = newsContentToHtml(t);
    } else nEd().innerHTML = '';
  }
  newsMode = m;
  const on = 'px-3 py-1.5 font-bold bg-[#cf1717] text-white', off = 'px-3 py-1.5 font-bold bg-gray-100 dark:bg-zinc-800';
  document.getElementById('newsTabWord').className = m === 'word' ? on : off;
  document.getElementById('newsTabJson').className = m === 'json' ? on : off;
  nEd().classList.toggle('hidden', m === 'json');
  document.getElementById('newsJson').classList.toggle('hidden', m === 'word');
  document.getElementById('newsToolbar').classList.toggle('hidden', m === 'json');
  nSt(m === 'json'
    ? '<i class="bi bi-braces"></i> Hỗ trợ: mảng <code>["Đoạn 1","Đoạn 2"]</code> hoặc đối tượng <code>{"intro","list":[],"link","linkText","note"}</code> — đúng định dạng trang học sinh đọc.'
    : '<i class="bi bi-lightbulb-fill"></i> Dán thẳng từ Word hoặc bấm "Nhập file .docx". Khi đăng, nội dung tự lưu theo dạng JSON mà trang học sinh đọc được.');
}
function nJsonSample() {
  document.getElementById('newsJson').value = JSON.stringify({ intro: 'Nội dung mở đầu của thông báo.', list: ['Ý thứ nhất', 'Ý thứ hai'], link: 'https://', linkText: 'Bấm vào đây', note: 'Lưu ý quan trọng.' }, null, 2);
}
function setNewsContent(raw) {
  let isObj = false;
  try { const j = JSON.parse(raw); isObj = !!j && typeof j === 'object' && !Array.isArray(j); } catch (e) {}
  if (isObj) {
    if (newsMode !== 'json') { newsMode = 'word'; setNewsMode('json'); }
    document.getElementById('newsJson').value = JSON.stringify(JSON.parse(raw), null, 2);
  } else {
    if (newsMode !== 'word') { document.getElementById('newsJson').value = ''; setNewsMode('word'); }
    nEd().innerHTML = newsContentToHtml(raw);
  }
}
function resetNewsEditor() {
  nEd().innerHTML = ''; document.getElementById('newsJson').value = '';
  if (newsMode !== 'word') setNewsMode('word');
}
function resetNewsForm() {
  ['newsTitle', 'newsImageUrl', 'editingNewsId'].forEach(i => document.getElementById(i).value = '');
  const st = document.getElementById('newsImgStatus'); if (st) st.innerText = '';
  const f = document.querySelector('input[type=file][onchange*="newsImageUrl"]'); if (f) f.value = '';
  resetNewsEditor();
  document.getElementById('newsSubmitBtn').innerText = 'Đăng Thông Báo';
}
initNewsEditor();
// nút "Chèn mẫu JSON" chỉ hiện ở chế độ JSON
const _origSetNewsMode = setNewsMode;
setNewsMode = function (m) { _origSetNewsMode(m); const b = document.getElementById('newsJsonSample'); if (b) b.classList.toggle('hidden', newsMode !== 'json'); };

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
