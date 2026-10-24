
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
