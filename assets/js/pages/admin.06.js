
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
