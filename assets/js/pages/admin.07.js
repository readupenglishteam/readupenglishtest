
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
